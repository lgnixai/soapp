import { FLOW_DATA_DIR } from "@/modules/paths";
import path from "path";
import fs from "fs/promises";
import { DataStoreData, getDatastore } from "@/saving/datastore";
import z from "zod";
import { debugError } from "@/modules/output";
import { getSpacesFromProfile, deleteSpace, createSpace } from "./spaces";
import { generateID } from "@/modules/utils";

const PROFILES_DIR = path.join(FLOW_DATA_DIR, "Profiles");

// Private
function getProfileDataStore(profileId: string) {
  return getDatastore("main", ["profiles", profileId]);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ProfileDataSchema = z.object({
  name: z.string(),
  createdAt: z.number()
});
export type ProfileData = z.infer<typeof ProfileDataSchema>;

function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function reconcileProfileData(profileId: string, data: DataStoreData): ProfileData {
  let defaultName = profileId;
  if (profileId === "main") {
    defaultName = "Main";
  }

  return {
    name: data.name ?? defaultName,
    createdAt: data.createdAt ?? getCurrentTimestamp()
  };
}

// Utilities
export function getProfilePath(profileId: string): string {
  return path.join(PROFILES_DIR, profileId);
}

// CRUD Operations
export async function getProfile(profileId: string) {
  const profileDir = path.join(PROFILES_DIR, profileId);

  const stats = await fs.stat(profileDir).catch(() => null);
  if (!stats) return null;
  if (!stats.isDirectory()) return null;

  const profileStore = getProfileDataStore(profileId);
  const profileData = await profileStore.getFullData().then((data) => reconcileProfileData(profileId, data));

  return {
    id: profileId,
    ...profileData
  };
}

export async function createProfile(profileId: string, profileName: string, shouldCreateSpace: boolean = true) {
  // Validate profileId to prevent directory traversal attacks or invalid characters
  if (!/^[a-zA-Z0-9_-]+$/.test(profileId)) {
    debugError("PROFILES", `Invalid profile ID: ${profileId}`);
    return false;
  }

  // Check if profile already exists
  const existingProfile = await getProfile(profileId);
  if (existingProfile) {
    debugError("PROFILES", `Profile ${profileId} already exists`);
    return false;
  }

  try {
    const profilePath = getProfilePath(profileId);
    await fs.mkdir(profilePath, { recursive: true });

    const profileStore = getProfileDataStore(profileId);
    await profileStore.set("name", profileName);
    await profileStore.set("createdAt", getCurrentTimestamp());

    if (shouldCreateSpace) {
      await createSpace(profileId, generateID(), profileName).then((success) => {
        if (!success) {
          debugError("PROFILES", `Error creating default space for profile ${profileId}`);
        }
      });
    }

    return true;
  } catch (error) {
    debugError("PROFILES", `Error creating profile ${profileId}:`, error);
    return false;
  }
}

export async function updateProfile(profileId: string, profileData: Partial<ProfileData>) {
  try {
    const profileStore = getProfileDataStore(profileId);

    if (profileData.name) {
      await profileStore.set("name", profileData.name);
    }

    return true;
  } catch (error) {
    debugError("PROFILES", `Error updating profile ${profileId}:`, error);
    return false;
  }
}

export async function deleteProfile(profileId: string) {
  try {
    // Delete all spaces associated with this profile
    const spaces = await getSpacesFromProfile(profileId);
    await Promise.all(spaces.map((space) => deleteSpace(profileId, space.id)));

    // Delete Chromium Profile
    const profilePath = getProfilePath(profileId);
    await fs.rm(profilePath, { recursive: true, force: true });

    // Delete Profile Data
    const profileStore = getProfileDataStore(profileId);
    await profileStore.wipe();

    return true;
  } catch (error) {
    debugError("PROFILES", `Error deleting profile ${profileId}:`, error);
    return false;
  }
}

export async function getProfiles() {
  try {
    // Check if directory exists first
    const dirExists = await fs
      .stat(PROFILES_DIR)
      .then((stats) => {
        return stats.isDirectory();
      })
      .catch(() => false);

    if (!dirExists) {
      await fs.mkdir(PROFILES_DIR, { recursive: true });
      return [];
    }

    const profileDatas = await fs.readdir(PROFILES_DIR).then((profileIds) => {
      const promises = profileIds.map((profileId) => getProfile(profileId));
      return Promise.all(promises);
    });

    const profiles = profileDatas
      .filter((profile) => profile !== null)
      .sort((a, b) => {
        const transformedA = reconcileProfileData(a.id, a);
        const transformedB = reconcileProfileData(b.id, b);
        return transformedA.createdAt - transformedB.createdAt;
      });
    return profiles;
  } catch (error) {
    console.error("Error reading profiles directory:", error);
    return [];
  }
}

// Onboarding
function setupInitialProfile() {
  const profileId = "main";
  const profileName = "Main";

  const profileCreated = createProfile(profileId, profileName, false);
  if (!profileCreated) {
    debugError("PROFILES", `Error creating initial profile ${profileId}`);
    return false;
  }

  return true;
}

setupInitialProfile();
