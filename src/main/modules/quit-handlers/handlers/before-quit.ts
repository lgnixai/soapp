import { loadedProfileSessions } from "@/browser/profile-manager";
import { sleep } from "@/modules/utils";
import { goProcessManager } from "@/modules/go-process-manager";
import { appsManager } from "@/modules/apps-manager";

async function flushSessionsData() {
  const promises: Promise<void>[] = [];

  for (const session of loadedProfileSessions) {
    // Flush storage data
    session.flushStorageData();

    // Flush cookies
    const cookies = session.cookies;
    promises.push(cookies.flushStore());
  }

  console.log("Flushed data for", loadedProfileSessions.size, "sessions");

  await Promise.all(promises);
  await sleep(50);

  return true;
}

async function stopApps() {
  try {
    console.log("Stopping apps...");
    await appsManager.shutdown();
    console.log("Apps stopped successfully");
    return true;
  } catch (error) {
    console.error("Failed to stop apps:", error);
    return false;
  }
}

// Insert Logic here to handle before the app quits
// If the handler returns true, the app will quit normally
// If the handler returns false, the quit will be cancelled
export function beforeQuit(): boolean | Promise<boolean> {
  const flushSessionsDataPromise = flushSessionsData()
    .then(() => true)
    .catch(() => true);

  const stopAppsPromise = stopApps()
    .then(() => true)
    .catch(() => true);

  return Promise.all([flushSessionsDataPromise, stopAppsPromise]).then((results) => {
    return results.every((result) => result);
  });
}
