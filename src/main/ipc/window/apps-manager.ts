import { appsManagerWindow } from "@/settings/apps-manager";
import { ipcMain } from "electron";

ipcMain.on("apps-manager:open", () => {
  appsManagerWindow.show();
});

ipcMain.on("apps-manager:close", () => {
  appsManagerWindow.hide();
});
