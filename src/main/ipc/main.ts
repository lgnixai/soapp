// App APIs
import "@/ipc/app/app";
import "@/ipc/app/extensions";
import "@/ipc/app/updates";
import "@/ipc/app/shortcuts";

// Browser APIs
import "@/ipc/browser/browser";
import "@/ipc/browser/tabs";
import "@/ipc/browser/page";
import "@/ipc/browser/navigation";
import "@/ipc/browser/interface";
import "@/ipc/window/omnibox";
import "@/ipc/app/new-tab";

// Session APIs
import "@/ipc/session/profiles";
import "@/ipc/session/spaces";

// Settings APIs
import "@/ipc/window/settings";
import "@/ipc/window/apps-manager";
import "@/ipc/app/icons";
import "@/ipc/app/open-external";
import "@/ipc/app/onboarding";

// Special
import "@/ipc/listeners-manager";
import "@/ipc/go-process";
import { setupAppsManagerIPC } from "@/ipc/apps-manager";
import { ipcMain } from "electron";

// Setup Apps Manager IPC
setupAppsManagerIPC();

// Add file dialog handler
ipcMain.handle("electron:show-open-dialog", async (_event, options) => {
  const { dialog } = require("electron");
  return await dialog.showOpenDialog(options);
});
