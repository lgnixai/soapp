export interface AppExecutable {
  path: string;
  args: string[];
  env: Record<string, string>;
}

export interface AppWeb {
  port: number;
  host: string;
  url: string;
  openInBrowser: boolean;
}

export interface AppIcon {
  path: string;
  fallback: string;
}

export interface AppHealthCheck {
  enabled: boolean;
  url: string;
  interval: number;
  timeout: number;
}

export interface AppLogging {
  enabled: boolean;
  level: "debug" | "info" | "warn" | "error";
  file: string;
}

export interface AppConfig {
  name: string;
  description: string;
  enabled: boolean;
  type: "executable" | "script" | "service";
  executable: AppExecutable;
  web: AppWeb;
  icon: AppIcon;
  autostart: boolean;
  restartOnFailure: boolean;
  maxRestartAttempts: number;
  restartDelay: number;
  healthCheck: AppHealthCheck;
  logging: AppLogging;
}

export interface GlobalConfig {
  logDirectory: string;
  maxConcurrentApps: number;
  defaultTimeout: number;
  autoRestartEnabled: boolean;
  healthCheckEnabled: boolean;
  loggingEnabled: boolean;
}

export interface AppsConfig {
  version: string;
  description: string;
  apps: Record<string, AppConfig>;
  global: GlobalConfig;
}

export interface AppStatus {
  id: string;
  name: string;
  isRunning: boolean;
  pid: number | null;
  startTime: Date | null;
  restartCount: number;
  lastHealthCheck: Date | null;
  healthStatus: "healthy" | "unhealthy" | "unknown";
  error?: string;
}
