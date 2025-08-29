import { ipcMain } from "electron";
import { goProcessManager } from "@/modules/go-process-manager";

export function setupGoProcessIPC() {
  // 启动yarr进程
  ipcMain.handle("go-process:start", async () => {
    try {
      await goProcessManager.startYarr();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 停止yarr进程
  ipcMain.handle("go-process:stop", async () => {
    try {
      await goProcessManager.stopYarr();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 检查进程状态
  ipcMain.handle("go-process:status", () => {
    return {
      isRunning: goProcessManager.isRunning(),
      processId: goProcessManager.getProcessId(),
    };
  });

  // 重启yarr进程
  ipcMain.handle("go-process:restart", async () => {
    try {
      await goProcessManager.stopYarr();
      await goProcessManager.startYarr();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
