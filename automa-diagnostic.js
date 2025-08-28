#!/usr/bin/env node

/**
 * Automa扩展诊断脚本
 * 用于诊断Automa扩展在Flow Browser中的运行问题
 */

const path = require("path");
const fs = require("fs").promises;

class AutomaDiagnostic {
  constructor() {
    this.logs = [];
    this.extensionId = "fnffdnijloammfoopdipfghmaekdddhe"; // Automa的扩展ID
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    this.logs.push(logEntry);
    console.log(`[${timestamp}] [${level}] ${message}`);

    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  info(message, data = null) {
    this.log("INFO", message, data);
  }

  error(message, data = null) {
    this.log("ERROR", message, data);
  }

  warn(message, data = null) {
    this.log("WARN", message, data);
  }

  async runDiagnostic() {
    this.info("开始Automa扩展诊断...");

    try {
      // 1. 检查扩展文件是否存在
      await this.checkExtensionFiles();

      // 2. 分析manifest.json
      await this.analyzeManifest();

      // 3. 检查权限问题
      await this.checkPermissions();

      // 4. 检查Service Worker
      await this.checkServiceWorker();

      // 5. 检查Popup
      await this.checkPopup();

      // 6. 生成诊断报告
      await this.generateReport();
    } catch (error) {
      this.error("诊断过程中发生错误", error);
    }
  }

  async checkExtensionFiles() {
    this.info("检查Automa扩展文件...");

    const extensionPath = path.join(
      process.env.HOME || process.env.USERPROFILE,
      "Library/Application Support/Flow/Profiles/main/Extensions",
      this.extensionId
    );

    try {
      const stats = await fs.stat(extensionPath);
      this.info(`扩展目录存在: ${extensionPath}`);

      const files = await fs.readdir(extensionPath);
      this.info("扩展文件列表:", files);

      // 检查关键文件
      const requiredFiles = ["manifest.json", "background.bundle.js"];
      for (const file of requiredFiles) {
        const filePath = path.join(extensionPath, file);
        try {
          await fs.access(filePath);
          this.info(`✓ ${file} 存在`);
        } catch {
          this.error(`✗ ${file} 不存在`);
        }
      }
    } catch (error) {
      this.error(`扩展目录不存在: ${extensionPath}`, error);
    }
  }

  async analyzeManifest() {
    this.info("分析manifest.json...");

    const manifestPath = path.join(
      process.env.HOME || process.env.USERPROFILE,
      "Library/Application Support/Flow/Profiles/main/Extensions",
      this.extensionId,
      "manifest.json"
    );

    try {
      const manifestContent = await fs.readFile(manifestPath, "utf8");
      const manifest = JSON.parse(manifestContent);

      this.info("Manifest信息:", {
        name: manifest.name,
        version: manifest.version,
        manifest_version: manifest.manifest_version,
        permissions: manifest.permissions,
        host_permissions: manifest.host_permissions,
        background: manifest.background,
        action: manifest.action
      });

      // 检查Manifest版本
      if (manifest.manifest_version !== 3) {
        this.warn(`Manifest版本 ${manifest.manifest_version} 不是最新的V3版本`);
      }

      // 检查权限
      if (manifest.permissions) {
        this.info("权限列表:", manifest.permissions);

        const unsupportedPermissions = [
          "proxy",
          "debugger",
          "webNavigation",
          "cookies",
          "downloads",
          "contextMenus",
          "notifications"
        ];

        const foundUnsupported = manifest.permissions.filter((p) => unsupportedPermissions.includes(p));

        if (foundUnsupported.length > 0) {
          this.warn(`发现不支持的权限: ${foundUnsupported.join(", ")}`);
        }
      }
    } catch (error) {
      this.error("读取manifest.json失败", error);
    }
  }

  async checkPermissions() {
    this.info("检查权限兼容性...");

    // 模拟扩展对象
    const mockExtension = {
      id: this.extensionId,
      manifest: {
        name: "Automa",
        version: "1.29.12",
        manifest_version: 3,
        permissions: [
          "proxy",
          "debugger",
          "webNavigation",
          "cookies",
          "downloads",
          "contextMenus",
          "notifications",
          "storage",
          "tabs",
          "activeTab"
        ],
        host_permissions: ["<all_urls>"]
      }
    };

    // 支持的权限列表
    const supportedPermissions = [
      "activeTab",
      "storage",
      "tabs",
      "bookmarks",
      "history",
      "geolocation",
      "clipboardRead",
      "clipboardWrite",
      "alarms",
      "identity",
      "scripting",
      "webRequest",
      "webRequestAuthProvider",
      "declarativeNetRequest",
      "sidePanel",
      "tabGroups",
      "sessions",
      "topSites",
      "favicon",
      "fontSettings",
      "gcm",
      "idle",
      "management",
      "nativeMessaging",
      "power",
      "privacy",
      "system.cpu",
      "system.display",
      "system.memory",
      "system.storage",
      "unlimitedStorage"
    ];

    const unsupportedPermissions = mockExtension.manifest.permissions.filter((p) => !supportedPermissions.includes(p));

    const supportedCount = mockExtension.manifest.permissions.filter((p) => supportedPermissions.includes(p)).length;

    const totalCount = mockExtension.manifest.permissions.length;
    const compatibilityScore = Math.round((supportedCount / totalCount) * 100);

    this.info("权限兼容性报告:", {
      score: compatibilityScore,
      supportedPermissions: mockExtension.manifest.permissions.filter((p) => supportedPermissions.includes(p)),
      unsupportedPermissions: unsupportedPermissions,
      warnings: unsupportedPermissions.map((p) => `Permission '${p}' is not supported`),
      recommendations: [
        "Consider using alternative permissions or contact extension developer",
        "Some features may not work as expected due to permission limitations"
      ]
    });

    if (compatibilityScore < 50) {
      this.error(`权限兼容性分数过低: ${compatibilityScore}/100`);
    } else if (compatibilityScore < 80) {
      this.warn(`权限兼容性分数较低: ${compatibilityScore}/100`);
    } else {
      this.info(`权限兼容性良好: ${compatibilityScore}/100`);
    }
  }

  async checkServiceWorker() {
    this.info("检查Service Worker...");

    const swPath = path.join(
      process.env.HOME || process.env.USERPROFILE,
      "Library/Application Support/Flow/Profiles/main/Extensions",
      this.extensionId,
      "background.bundle.js"
    );

    try {
      const stats = await fs.stat(swPath);
      this.info(`Service Worker文件存在，大小: ${stats.size} bytes`);

      if (stats.size === 0) {
        this.error("Service Worker文件为空");
      }

      // 检查文件内容（前1000字符）
      const content = await fs.readFile(swPath, "utf8");
      const preview = content.substring(0, 1000);

      this.info("Service Worker文件预览:", preview);

      // 检查是否有明显的语法错误
      if (content.includes("Cannot read properties of undefined")) {
        this.error("Service Worker中存在运行时错误: Cannot read properties of undefined");
      }
    } catch (error) {
      this.error("Service Worker检查失败", error);
    }
  }

  async checkPopup() {
    this.info("检查Popup文件...");

    const popupPath = path.join(
      process.env.HOME || process.env.USERPROFILE,
      "Library/Application Support/Flow/Profiles/main/Extensions",
      this.extensionId,
      "popup.html"
    );

    try {
      await fs.access(popupPath);
      this.info("Popup文件存在");

      const content = await fs.readFile(popupPath, "utf8");
      this.info("Popup文件内容预览:", content.substring(0, 500));
    } catch (error) {
      this.error("Popup文件不存在或无法访问", error);
    }
  }

  async generateReport() {
    this.info("生成诊断报告...");

    const report = {
      timestamp: new Date().toISOString(),
      extensionId: this.extensionId,
      extensionName: "Automa",
      summary: {
        totalIssues: this.logs.filter((log) => log.level === "ERROR" || log.level === "WARN").length,
        errors: this.logs.filter((log) => log.level === "ERROR").length,
        warnings: this.logs.filter((log) => log.level === "WARN").length,
        info: this.logs.filter((log) => log.level === "INFO").length
      },
      issues: this.logs.filter((log) => log.level === "ERROR" || log.level === "WARN"),
      recommendations: this.generateRecommendations()
    };

    this.info("诊断报告:", report);

    // 保存报告到文件
    const reportPath = path.join(process.cwd(), "automa-diagnostic-report.json");
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    this.info(`诊断报告已保存到: ${reportPath}`);

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    // 基于日志生成建议
    const hasPermissionIssues = this.logs.some(
      (log) => log.message.includes("不支持的权限") || log.message.includes("权限兼容性")
    );

    const hasServiceWorkerIssues = this.logs.some(
      (log) => log.message.includes("Service Worker") || log.message.includes("background.bundle.js")
    );

    const hasPopupIssues = this.logs.some((log) => log.message.includes("Popup") || log.message.includes("popup.html"));

    if (hasPermissionIssues) {
      recommendations.push({
        type: "permission",
        priority: "high",
        title: "权限兼容性问题",
        description: "Automa扩展使用了Flow Browser不完全支持的权限",
        actions: [
          "联系Automa开发者，请求提供Flow Browser兼容版本",
          "考虑使用其他自动化扩展替代",
          "在Chrome浏览器中测试扩展功能"
        ]
      });
    }

    if (hasServiceWorkerIssues) {
      recommendations.push({
        type: "service_worker",
        priority: "critical",
        title: "Service Worker问题",
        description: "Service Worker启动失败，这会导致扩展无法正常工作",
        actions: ["重新安装Automa扩展", "检查扩展文件是否完整", "尝试使用开发者模式加载扩展"]
      });
    }

    if (hasPopupIssues) {
      recommendations.push({
        type: "popup",
        priority: "medium",
        title: "Popup界面问题",
        description: "扩展的弹出界面可能无法正常显示",
        actions: ["检查扩展的popup.html文件", "尝试重新加载扩展", "使用扩展的快捷键而不是点击图标"]
      });
    }

    // 通用建议
    recommendations.push({
      type: "general",
      priority: "low",
      title: "通用建议",
      description: "提高扩展兼容性的建议",
      actions: [
        "保持Flow Browser和扩展都更新到最新版本",
        "在扩展管理页面中启用开发者模式",
        "查看Flow Browser的扩展兼容性文档",
        "向Flow Browser团队报告兼容性问题"
      ]
    });

    return recommendations;
  }
}

// 运行诊断
async function main() {
  const diagnostic = new AutomaDiagnostic();
  await diagnostic.runDiagnostic();

  console.log("\n=== Automa扩展诊断完成 ===");
  console.log("请查看上面的日志和生成的报告文件获取详细信息。");
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { AutomaDiagnostic };
