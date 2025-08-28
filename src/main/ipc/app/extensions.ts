import { browser } from "@/index";
import { sendMessageToListeners } from "@/ipc/listeners-manager";
import { transformStringToLocale } from "@/modules/extensions/locales";
import {
  ExtensionData,
  ExtensionManager,
  getExtensionIcon,
  getExtensionSize,
  getManifest
} from "@/modules/extensions/management";
import { getPermissionWarnings } from "@/modules/extensions/permission-warnings";
import { getSpace } from "@/sessions/spaces";
import { dialog, ipcMain, IpcMainInvokeEvent, WebContents } from "electron";
import { SharedExtensionData } from "~/types/extensions";

function translateManifestString(extensionPath: string, str: string) {
  const re = /^__MSG_(.+?)__$/;
  const match = str.match(re);
  if (!match) return str;

  const [, key] = match;
  return transformStringToLocale(extensionPath, key);
}

async function generateSharedExtensionData(
  extensionsManager: ExtensionManager,
  extensionId: string,
  extensionData: ExtensionData
): Promise<SharedExtensionData | null> {
  const extensionPath = await extensionsManager.getExtensionPath(extensionId, extensionData);
  if (!extensionPath) return null;

  const manifest = await getManifest(extensionPath);
  if (!manifest) return null;

  const size = await getExtensionSize(extensionPath);
  if (!size) return null;

  const permissions: string[] = getPermissionWarnings(manifest.permissions ?? [], manifest.host_permissions ?? []);

  const translatedName = await translateManifestString(extensionPath, manifest.name);
  const translatedShortName = manifest.short_name
    ? await translateManifestString(extensionPath, manifest.short_name)
    : undefined;
  const translatedDescription = manifest.description
    ? await translateManifestString(extensionPath, manifest.description)
    : undefined;

  const iconURL = new URL("flow://extension-icon");
  iconURL.searchParams.set("id", extensionId);
  iconURL.searchParams.set("profile", extensionsManager.profileId);

  return {
    type: extensionData.type,
    id: extensionId,
    name: translatedName,
    short_name: translatedShortName,
    description: translatedDescription,
    icon: iconURL.toString(),
    enabled: extensionData.disabled ? false : true,
    pinned: extensionData.pinned ? true : false,
    version: manifest.version,
    path: extensionPath,
    size,
    permissions,
    // TODO: Add inspect views
    inspectViews: []
  };
}

async function getExtensionDataFromProfile(profileId: string): Promise<SharedExtensionData[]> {
  if (!browser) return [];

  const loadedProfile = browser.getLoadedProfile(profileId);
  if (!loadedProfile) {
    return [];
  }

  const { extensionsManager } = loadedProfile;

  const extensions = await extensionsManager.getInstalledExtensions();
  const promises = extensions.map(async (extensionData) => {
    return generateSharedExtensionData(extensionsManager, extensionData.id, extensionData);
  });

  const results = await Promise.all(promises);
  return results.filter((result) => result !== null);
}

async function getCurrentProfileIdFromWebContents(webContents: WebContents): Promise<string | null> {
  if (!browser) return null;

  const window = browser.getWindowFromWebContents(webContents);
  if (!window) return null;

  const spaceId = window.getCurrentSpace();
  if (!spaceId) return null;

  const space = await getSpace(spaceId);
  if (!space) return null;

  return space.profileId;
}

ipcMain.handle(
  "extensions:get-all-in-current-profile",
  async (event: IpcMainInvokeEvent): Promise<SharedExtensionData[]> => {
    const profileId = await getCurrentProfileIdFromWebContents(event.sender);
    if (!profileId) return [];

    return getExtensionDataFromProfile(profileId);
  }
);

ipcMain.handle(
  "extensions:set-extension-enabled",
  async (event: IpcMainInvokeEvent, extensionId: string, enabled: boolean): Promise<boolean> => {
    if (!browser) return false;

    const profileId = await getCurrentProfileIdFromWebContents(event.sender);
    if (!profileId) return false;

    const loadedProfile = browser.getLoadedProfile(profileId);
    if (!loadedProfile) return false;

    const { extensionsManager } = loadedProfile;
    if (!extensionsManager) return false;

    return await extensionsManager.setExtensionDisabled(extensionId, !enabled);
  }
);

ipcMain.handle(
  "extensions:uninstall-extension",
  async (event: IpcMainInvokeEvent, extensionId: string): Promise<boolean> => {
    if (!browser) return false;

    const profileId = await getCurrentProfileIdFromWebContents(event.sender);
    if (!profileId) return false;

    const loadedProfile = browser.getLoadedProfile(profileId);
    if (!loadedProfile) return false;

    const { extensionsManager } = loadedProfile;
    if (!extensionsManager) return false;

    const window = browser.getWindowFromWebContents(event.sender);
    if (!window) return false;

    const extensionData = extensionsManager.getExtensionDataFromCache(extensionId);
    if (!extensionData) return false;

    const sharedExtensionData = await generateSharedExtensionData(extensionsManager, extensionId, extensionData);

    if (!sharedExtensionData) return false;

    const extensionIcon = await getExtensionIcon(sharedExtensionData.path);

    const returnValue = await dialog.showMessageBox(window.window, {
      icon: extensionIcon ?? undefined,
      title: "Uninstall Extension",
      message: `Are you sure you want to uninstall "${sharedExtensionData.name}"?`,
      buttons: ["Cancel", "Uninstall"]
    });

    if (returnValue.response === 0) {
      return false;
    }

    return await extensionsManager.uninstallExtension(extensionId);
  }
);

ipcMain.handle(
  "extensions:set-extension-pinned",
  async (event: IpcMainInvokeEvent, extensionId: string, pinned: boolean): Promise<boolean> => {
    if (!browser) return false;

    const profileId = await getCurrentProfileIdFromWebContents(event.sender);
    if (!profileId) return false;

    const loadedProfile = browser.getLoadedProfile(profileId);
    if (!loadedProfile) return false;

    const { extensionsManager } = loadedProfile;
    if (!extensionsManager) return false;

    return await extensionsManager.setPinned(extensionId, pinned);
  }
);

// Developer mode APIs
ipcMain.handle(
  "extensions:load-unpacked-extension",
  async (event: IpcMainInvokeEvent, extensionPath: string): Promise<{ success: boolean; extensionId?: string; error?: string }> => {
    if (!browser) return { success: false, error: "Browser not initialized" };

    const profileId = await getCurrentProfileIdFromWebContents(event.sender);
    if (!profileId) return { success: false, error: "No profile found" };

    const loadedProfile = browser.getLoadedProfile(profileId);
    if (!loadedProfile) return { success: false, error: "Profile not loaded" };

    const { extensionsManager } = loadedProfile;
    if (!extensionsManager) return { success: false, error: "Extensions manager not available" };

    try {
      const extensionId = await extensionsManager.loadUnpackedExtension(extensionPath);
      if (extensionId) {
        return { success: true, extensionId };
      } else {
        return { success: false, error: "Failed to load extension" };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
);

ipcMain.handle(
  "extensions:remove-unpacked-extension",
  async (event: IpcMainInvokeEvent, extensionId: string): Promise<{ success: boolean; error?: string }> => {
    if (!browser) return { success: false, error: "Browser not initialized" };

    const profileId = await getCurrentProfileIdFromWebContents(event.sender);
    if (!profileId) return { success: false, error: "No profile found" };

    const loadedProfile = browser.getLoadedProfile(profileId);
    if (!loadedProfile) return { success: false, error: "Profile not loaded" };

    const { extensionsManager } = loadedProfile;
    if (!extensionsManager) return { success: false, error: "Extensions manager not available" };

    try {
      const success = await extensionsManager.removeUnpackedExtension(extensionId);
      return { success };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
);

ipcMain.handle(
  "extensions:update-unpacked-extension",
  async (event: IpcMainInvokeEvent, extensionId: string, newSourcePath?: string): Promise<{ success: boolean; error?: string }> => {
    if (!browser) return { success: false, error: "Browser not initialized" };

    const profileId = await getCurrentProfileIdFromWebContents(event.sender);
    if (!profileId) return { success: false, error: "No profile found" };

    const loadedProfile = browser.getLoadedProfile(profileId);
    if (!loadedProfile) return { success: false, error: "Profile not loaded" };

    const { extensionsManager } = loadedProfile;
    if (!extensionsManager) return { success: false, error: "Extensions manager not available" };

    try {
      const success = await extensionsManager.updateUnpackedExtension(extensionId, newSourcePath);
      return { success };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
);

export async function fireOnExtensionsUpdated(profileId: string) {
  if (!browser) return;

  const extensions = await getExtensionDataFromProfile(profileId);
  sendMessageToListeners("extensions:on-updated", profileId, extensions);
}
