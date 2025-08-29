import { spawn, ChildProcess } from "child_process";
import { app } from "electron";
import path from "path";
import fs from "fs";
import { debugPrint } from "./output";
import { AppsConfig, AppConfig, AppStatus } from "@/shared/types/apps-config";

export class AppsManager {
  private config: AppsConfig | null = null;
  private appProcesses: Map<string, ChildProcess> = new Map();
  private appStatuses: Map<string, AppStatus> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isShuttingDown = false;
  private stoppingApps: Set<string> = new Set();

  constructor() {
    debugPrint("APPS_MANAGER", "AppsManager constructor called");

    // 监听应用退出事件
    app.on("before-quit", () => {
      debugPrint("APPS_MANAGER", "before-quit event received");
      this.shutdown();
    });

    app.on("window-all-closed", () => {
      debugPrint("APPS_MANAGER", "window-all-closed event received");
      this.shutdown();
    });

    // 确保在应用退出时清理进程
    process.on("exit", () => {
      debugPrint("APPS_MANAGER", "process exit event received");
      this.killAllProcesses();
    });

    process.on("SIGINT", () => {
      debugPrint("APPS_MANAGER", "SIGINT event received");
      this.shutdown();
    });

    process.on("SIGTERM", () => {
      debugPrint("APPS_MANAGER", "SIGTERM event received");
      this.shutdown();
    });
  }

  /**
   * 初始化应用程序管理器
   */
  async initialize(): Promise<void> {
    debugPrint("APPS_MANAGER", "initializing apps manager");

    try {
      await this.loadConfig();
      await this.startEnabledApps();
      debugPrint("APPS_MANAGER", "apps manager initialized successfully");
    } catch (error) {
      debugPrint("APPS_MANAGER", "failed to initialize apps manager", error);
      throw error;
    }
  }

  /**
   * 加载配置文件（按子目录聚合 apps/[subdir]/app.json）
   */
  private async loadConfig(): Promise<void> {
    const appsRoot = this.getAppsRootDir();
    debugPrint("APPS_MANAGER", "loading per-app configs from", appsRoot);

    try {
      const apps = await this.scanPerAppConfigs(appsRoot);
      this.config = {
        version: "1.0.0",
        description: "Aggregated from per-app configs",
        apps,
        global: {
          logDirectory: "logs",
          maxConcurrentApps: 10,
          defaultTimeout: 30000,
          autoRestartEnabled: true,
          healthCheckEnabled: true,
          loggingEnabled: true
        }
      } as AppsConfig;

      debugPrint("APPS_MANAGER", "config loaded successfully", {
        appsCount: Object.keys(this.config.apps).length
      });
    } catch (error) {
      debugPrint("APPS_MANAGER", "failed to load per-app configs", error);
      throw error;
    }
  }

  /** 获取 apps 根目录 */
  private getAppsRootDir(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "apps");
    }
    // __dirname 指向 out/main，回到项目根并进入 apps 目录
    return path.join(__dirname, "..", "..", "apps");
  }

  /** 扫描 apps/[subdir]/app.json */
  private async scanPerAppConfigs(appsRoot: string): Promise<Record<string, AppConfig>> {
    const map: Record<string, AppConfig> = {};
    const entries = await fs.promises.readdir(appsRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const appId = entry.name;
      const cfgPath = path.join(appsRoot, appId, "app.json");
      try {
        const stat = await fs.promises.stat(cfgPath);
        if (!stat.isFile()) continue;
        const txt = await fs.promises.readFile(cfgPath, "utf-8");
        const cfg = JSON.parse(txt) as AppConfig;
        map[appId] = cfg;
        debugPrint("APPS_MANAGER", "loaded app config", { appId, cfgPath });
      } catch {
        // 忽略没有配置文件的子目录
      }
    }
    return map;
  }

  /**
   * 启动所有启用的应用程序
   */
  private async startEnabledApps(): Promise<void> {
    if (!this.config) {
      debugPrint("APPS_MANAGER", "config not loaded");
      return;
    }

    const enabledApps = Object.entries(this.config.apps).filter(
      ([_, appConfig]) => appConfig.enabled && appConfig.autostart
    );

    debugPrint("APPS_MANAGER", "starting enabled apps", enabledApps.length);

    for (const [appId, appConfig] of enabledApps) {
      try {
        await this.startApp(appId, appConfig);
      } catch (error) {
        debugPrint("APPS_MANAGER", `failed to start app ${appId}`, error);
      }
    }
  }

  /**
   * 启动单个应用程序
   */
  async startApp(appId: string, appConfig?: AppConfig): Promise<void> {
    if (!this.config) {
      throw new Error("Config not loaded");
    }

    const config = appConfig || this.config.apps[appId];
    if (!config) {
      throw new Error(`App ${appId} not found in config`);
    }

    if (!config.enabled) {
      debugPrint("APPS_MANAGER", `app ${appId} is disabled`);
      return;
    }

    if (this.appProcesses.has(appId)) {
      debugPrint("APPS_MANAGER", `app ${appId} is already running`);
      return;
    }

    debugPrint("APPS_MANAGER", `starting app ${appId}`);

    try {
      const executablePath = this.getExecutablePath(appId, config);
      debugPrint("APPS_MANAGER", `executable path for ${appId}`, executablePath);

      const childProcess = spawn(executablePath, config.executable.args, {
        stdio: ["pipe", "pipe", "pipe"],
        detached: false,
        env: { ...process.env, ...config.executable.env }
      });

      this.appProcesses.set(appId, childProcess);

      // 初始化应用状态
      const status: AppStatus = {
        id: appId,
        name: config.name,
        isRunning: true,
        pid: childProcess.pid,
        startTime: new Date(),
        restartCount: 0,
        lastHealthCheck: null,
        healthStatus: "unknown"
      };
      this.appStatuses.set(appId, status);

      // 监听进程输出
      childProcess.stdout?.on("data", (data) => {
        debugPrint(`${appId.toUpperCase()}_STDOUT`, data.toString().trim());
      });

      childProcess.stderr?.on("data", (data) => {
        debugPrint(`${appId.toUpperCase()}_STDERR`, data.toString().trim());
      });

      // 监听进程退出
      childProcess.on("exit", (code, signal) => {
        debugPrint("APPS_MANAGER", `app ${appId} exited`, { code, signal });
        this.handleAppExit(appId, code, signal);
      });

      childProcess.on("error", (error) => {
        debugPrint("APPS_MANAGER", `app ${appId} error`, error.message);
        this.handleAppError(appId, error);
      });

      // 启动健康检查
      if (config.healthCheck.enabled) {
        this.startHealthCheck(appId, config);
      }

      debugPrint("APPS_MANAGER", `app ${appId} started successfully`, { pid: childProcess.pid });
    } catch (error) {
      debugPrint("APPS_MANAGER", `failed to start app ${appId}`, error);
      throw error;
    }
  }

  /**
   * 获取可执行文件路径
   */
  private getExecutablePath(appId: string, appConfig: AppConfig): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "apps", appConfig.executable.path);
    }
    return path.join(this.getAppsRootDir(), appConfig.executable.path);
  }

  /**
   * 处理应用程序退出
   */
  private handleAppExit(appId: string, code: number | null, signal: string | null): void {
    // 如果是我们主动停止，则不重启
    if (this.stoppingApps.has(appId)) {
      this.stoppingApps.delete(appId);
    }

    const status = this.appStatuses.get(appId);
    if (status) {
      status.isRunning = false;
      status.pid = null;
    }

    this.appProcesses.delete(appId);
    this.stopHealthCheck(appId);

    // 检查是否需要重启：仅当非主动停止、非关机、配置允许、且非正常退出(code===0视为正常)
    if (!this.stoppingApps.has(appId) && !this.isShuttingDown && status && this.config) {
      const appConfig = this.config.apps[appId];
      const abnormalExit = !(code === 0 || signal === "SIGTERM");
      if (
        appConfig &&
        appConfig.restartOnFailure &&
        abnormalExit &&
        status.restartCount < appConfig.maxRestartAttempts
      ) {
        debugPrint("APPS_MANAGER", `scheduling restart for app ${appId}`);
        setTimeout(() => {
          if (!this.isShuttingDown && !this.stoppingApps.has(appId)) {
            status.restartCount++;
            this.startApp(appId);
          }
        }, appConfig.restartDelay);
      }
    }
  }

  /**
   * 处理应用程序错误
   */
  private handleAppError(appId: string, error: Error): void {
    const status = this.appStatuses.get(appId);
    if (status) {
      status.error = error.message;
      status.healthStatus = "unhealthy";
    }
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(appId: string, appConfig: AppConfig): void {
    const interval = setInterval(async () => {
      if (this.isShuttingDown) {
        clearInterval(interval);
        return;
      }

      try {
        const response = await fetch(appConfig.healthCheck.url, {
          method: "GET",
          signal: AbortSignal.timeout(appConfig.healthCheck.timeout)
        });

        const status = this.appStatuses.get(appId);
        if (status) {
          status.lastHealthCheck = new Date();
          status.healthStatus = response.ok ? "healthy" : "unhealthy";
        }
      } catch (error) {
        const status = this.appStatuses.get(appId);
        if (status) {
          status.lastHealthCheck = new Date();
          status.healthStatus = "unhealthy";
        }
      }
    }, appConfig.healthCheck.interval);

    this.healthCheckIntervals.set(appId, interval);
  }

  /**
   * 停止健康检查
   */
  private stopHealthCheck(appId: string): void {
    const interval = this.healthCheckIntervals.get(appId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(appId);
    }
  }

  /**
   * 停止应用程序
   */
  async stopApp(appId: string): Promise<void> {
    const process = this.appProcesses.get(appId);
    if (!process) {
      debugPrint("APPS_MANAGER", `app ${appId} not running`);
      return;
    }

    debugPrint("APPS_MANAGER", `stopping app ${appId}`);
    this.stoppingApps.add(appId);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        debugPrint("APPS_MANAGER", `force killing app ${appId}`);
        this.killProcess(appId);
        this.stoppingApps.delete(appId);
        resolve();
      }, 5000);

      process.on("exit", () => {
        clearTimeout(timeout);
        this.appProcesses.delete(appId);
        this.stopHealthCheck(appId);
        debugPrint("APPS_MANAGER", `app ${appId} stopped gracefully`);
        this.stoppingApps.delete(appId);
        resolve();
      });

      process.kill("SIGTERM");
    });
  }

  /**
   * 强制杀掉进程
   */
  private killProcess(appId: string): void {
    const process = this.appProcesses.get(appId);
    if (process) {
      try {
        process.kill("SIGKILL");
        debugPrint("APPS_MANAGER", `app ${appId} killed`);
      } catch (error) {
        debugPrint("APPS_MANAGER", `failed to kill app ${appId}`, error);
      }
      this.appProcesses.delete(appId);
      this.stopHealthCheck(appId);
    }
  }

  /**
   * 杀掉所有进程
   */
  private killAllProcesses(): void {
    for (const appId of this.appProcesses.keys()) {
      this.killProcess(appId);
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
    debugPrint("APPS_MANAGER", "shutting down apps manager");

    const stopPromises = Array.from(this.appProcesses.keys()).map((appId) => this.stopApp(appId));

    await Promise.all(stopPromises);
  }

  /**
   * 获取应用程序状态
   */
  getAppStatus(appId: string): AppStatus | null {
    return this.appStatuses.get(appId) || null;
  }

  /**
   * 获取所有应用程序状态
   */
  getAllAppStatuses(): AppStatus[] {
    return Array.from(this.appStatuses.values());
  }

  /**
   * 检查应用程序是否正在运行
   */
  isAppRunning(appId: string): boolean {
    return this.appProcesses.has(appId);
  }

  /**
   * 获取配置
   */
  getConfig(): AppsConfig | null {
    return this.config;
  }
}

// 创建全局实例
export const appsManager = new AppsManager();
