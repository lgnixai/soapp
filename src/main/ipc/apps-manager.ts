import { ipcMain } from "electron";
import { appsManager } from "@/modules/apps-manager";

export function setupAppsManagerIPC() {
  // 获取所有应用程序状态
  ipcMain.handle("apps-manager:get-all-statuses", () => {
    return appsManager.getAllAppStatuses();
  });

  // 获取单个应用程序状态
  ipcMain.handle("apps-manager:get-app-status", async (_event, appId: string) => {
    return appsManager.getAppStatus(appId);
  });

  // 启动应用程序
  ipcMain.handle("apps-manager:start-app", async (_event, appId: string) => {
    try {
      await appsManager.startApp(appId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 停止应用程序
  ipcMain.handle("apps-manager:stop-app", async (_event, appId: string) => {
    try {
      await appsManager.stopApp(appId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 重启应用程序
  ipcMain.handle("apps-manager:restart-app", async (_event, appId: string) => {
    try {
      await appsManager.stopApp(appId);
      await appsManager.startApp(appId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 检查应用程序是否正在运行
  ipcMain.handle("apps-manager:is-app-running", (_event, appId: string) => {
    return appsManager.isAppRunning(appId);
  });

  // 获取配置
  ipcMain.handle("apps-manager:get-config", () => {
    return appsManager.getConfig();
  });

  // 重新加载配置
  ipcMain.handle("apps-manager:reload-config", async () => {
    try {
      const before = appsManager.getConfig();
      // 使用 AppsManager 的私有加载逻辑：通过公开一个轻量入口
      if ((appsManager as any).initialize) {
        // 这里只重载配置，不启动应用
        if ((appsManager as any).loadConfig) {
          await (appsManager as any).loadConfig();
        }
      }
      const after = appsManager.getConfig();
      return { success: true, before, after };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  });
}
