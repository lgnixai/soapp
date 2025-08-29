import { spawn, ChildProcess } from "child_process";
import { app } from "electron";
import path from "path";
import { debugPrint } from "./output";

export class GoProcessManager {
  private yarrProcess: ChildProcess | null = null;
  private isShuttingDown = false;

  constructor() {
    debugPrint("GO_PROCESS", "GoProcessManager constructor called");

    // 监听应用退出事件
    app.on("before-quit", () => {
      debugPrint("GO_PROCESS", "before-quit event received");
      this.shutdown();
    });

    app.on("window-all-closed", () => {
      debugPrint("GO_PROCESS", "window-all-closed event received");
      this.shutdown();
    });

    // 确保在应用退出时清理进程
    process.on("exit", () => {
      debugPrint("GO_PROCESS", "process exit event received");
      this.killProcess();
    });

    process.on("SIGINT", () => {
      debugPrint("GO_PROCESS", "SIGINT event received");
      this.shutdown();
    });

    process.on("SIGTERM", () => {
      debugPrint("GO_PROCESS", "SIGTERM event received");
      this.shutdown();
    });
  }

  /**
   * 启动yarr程序
   */
  async startYarr(): Promise<void> {
    debugPrint("GO_PROCESS", "startYarr called");

    if (this.yarrProcess) {
      debugPrint("GO_PROCESS", "yarr process already running");
      return;
    }

    try {
      // 获取yarr可执行文件的路径
      const yarrPath = this.getYarrPath();

      debugPrint("GO_PROCESS", "starting yarr process", yarrPath);

      // 启动yarr进程
      this.yarrProcess = spawn(yarrPath, [], {
        stdio: ["pipe", "pipe", "pipe"],
        detached: false // 设置为false，这样父进程退出时子进程也会退出
      });

      // 监听进程输出
      this.yarrProcess.stdout?.on("data", (data) => {
        debugPrint("YARR_STDOUT", data.toString().trim());
      });

      this.yarrProcess.stderr?.on("data", (data) => {
        debugPrint("YARR_STDERR", data.toString().trim());
      });

      // 监听进程退出
      this.yarrProcess.on("exit", (code, signal) => {
        debugPrint("GO_PROCESS", "yarr process exited", { code, signal });
        this.yarrProcess = null;
      });

      this.yarrProcess.on("error", (error) => {
        debugPrint("GO_PROCESS", "yarr process error", error.message);
        this.yarrProcess = null;
      });

      debugPrint("GO_PROCESS", "yarr process started successfully", { pid: this.yarrProcess.pid });
    } catch (error) {
      debugPrint("GO_PROCESS", "failed to start yarr process", error);
      throw error;
    }
  }

  /**
   * 获取yarr可执行文件的路径
   */
  private getYarrPath(): string {
    if (app.isPackaged) {
      // 生产环境：可执行文件在app.asar解压后的目录中
      return path.join(process.resourcesPath, "apps", "main", "yarr");
    } else {
      // 开发环境：可执行文件在项目根目录
      // __dirname 指向 out/main，需要回到项目根目录
      // 从 /Users/leven/space/shop/flow-browser/out/main 回到 /Users/leven/space/shop/flow-browser
      const projectRoot = path.join(__dirname, "..", "..");
      const yarrPath = path.join(projectRoot, "apps", "main", "yarr");
      debugPrint("GO_PROCESS", "project root", projectRoot);
      debugPrint("GO_PROCESS", "yarr path resolved", yarrPath);
      return yarrPath;
    }
  }

  /**
   * 停止yarr程序
   */
  async stopYarr(): Promise<void> {
    if (!this.yarrProcess) {
      debugPrint("GO_PROCESS", "yarr process not running");
      return;
    }

    debugPrint("GO_PROCESS", "stopping yarr process");

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        debugPrint("GO_PROCESS", "force killing yarr process");
        this.killProcess();
        resolve();
      }, 5000); // 5秒超时

      this.yarrProcess?.on("exit", () => {
        clearTimeout(timeout);
        this.yarrProcess = null;
        debugPrint("GO_PROCESS", "yarr process stopped gracefully");
        resolve();
      });

      // 发送SIGTERM信号
      this.yarrProcess?.kill("SIGTERM");
    });
  }

  /**
   * 强制杀掉进程
   */
  private killProcess(): void {
    if (this.yarrProcess) {
      try {
        this.yarrProcess.kill("SIGKILL");
        debugPrint("GO_PROCESS", "yarr process killed");
      } catch (error) {
        debugPrint("GO_PROCESS", "failed to kill yarr process", error);
      }
      this.yarrProcess = null;
    }
  }

  /**
   * 关闭管理器
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    debugPrint("GO_PROCESS", "shutting down go process manager");

    await this.stopYarr();
  }

  /**
   * 检查yarr进程是否正在运行
   */
  isRunning(): boolean {
    return this.yarrProcess !== null && !this.yarrProcess.killed;
  }

  /**
   * 获取进程ID
   */
  getProcessId(): number | null {
    return this.yarrProcess?.pid || null;
  }
}

// 创建全局实例
export const goProcessManager = new GoProcessManager();
