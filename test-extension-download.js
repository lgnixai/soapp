#!/usr/bin/env node

/**
 * Flow Browser 扩展下载自动化测试脚本
 * 用于诊断扩展下载问题
 */

const { spawn, exec } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const https = require("https");
const http = require("http");

// 测试配置
const CONFIG = {
  // 测试用的Chrome扩展ID (Page Assist - 本地AI模型的Web UI)
  TEST_EXTENSION_ID: "kmpjcnjfcljljpkmhgfkkmkngdmehjdo",
  // Chrome Web Store URL
  CHROME_WEB_STORE_URL: "https://chromewebstore.google.com",
  // 测试超时时间 (毫秒)
  TIMEOUT: 30000,
  // 日志文件路径
  LOG_FILE: "extension-test.log"
};

// 日志记录器
class Logger {
  constructor(logFile) {
    this.logFile = logFile;
    this.logs = [];
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

  async save() {
    try {
      await fs.writeFile(this.logFile, JSON.stringify(this.logs, null, 2));
      console.log(`\n测试日志已保存到: ${this.logFile}`);
    } catch (err) {
      console.error("保存日志失败:", err);
    }
  }
}

// 网络连接测试
class NetworkTester {
  constructor(logger) {
    this.logger = logger;
  }

  async testUrl(url) {
    return new Promise((resolve) => {
      const protocol = url.startsWith("https:") ? https : http;
      const req = protocol.get(url, (res) => {
        this.logger.info(`网络测试成功: ${url}`, {
          statusCode: res.statusCode,
          headers: res.headers
        });
        resolve({ success: true, statusCode: res.statusCode });
      });

      req.on("error", (err) => {
        this.logger.error(`网络测试失败: ${url}`, err);
        resolve({ success: false, error: err.message });
      });

      req.setTimeout(CONFIG.TIMEOUT, () => {
        req.destroy();
        this.logger.error(`网络测试超时: ${url}`);
        resolve({ success: false, error: "Timeout" });
      });
    });
  }

  async testChromeWebStore() {
    this.logger.info("开始测试Chrome Web Store连接...");
    return await this.testUrl(CONFIG.CHROME_WEB_STORE_URL);
  }

  async testExtensionDownload(extensionId) {
    const extensionUrl = `${CONFIG.CHROME_WEB_STORE_URL}/detail/${extensionId}`;
    this.logger.info(`开始测试扩展下载: ${extensionId}`);
    return await this.testUrl(extensionUrl);
  }
}

// 系统资源测试
class SystemTester {
  constructor(logger) {
    this.logger = logger;
  }

  async checkDiskSpace() {
    try {
      const { exec } = require("child_process");
      const util = require("util");
      const execAsync = util.promisify(exec);

      let command;
      if (process.platform === "win32") {
        command = "wmic logicaldisk get size,freespace,caption";
      } else {
        command = "df -h .";
      }

      const { stdout } = await execAsync(command);
      this.logger.info("磁盘空间检查", { output: stdout });
      return { success: true, data: stdout };
    } catch (err) {
      this.logger.error("磁盘空间检查失败", err);
      return { success: false, error: err.message };
    }
  }

  async checkFilePermissions() {
    try {
      const testDir = path.join(process.cwd(), "test-permissions");
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, "test.txt"), "test");
      await fs.unlink(path.join(testDir, "test.txt"));
      await fs.rmdir(testDir);

      this.logger.info("文件权限检查通过");
      return { success: true };
    } catch (err) {
      this.logger.error("文件权限检查失败", err);
      return { success: false, error: err.message };
    }
  }

  async checkTempDirectory() {
    try {
      const tempDir = require("os").tmpdir();
      const testFile = path.join(tempDir, "flow-browser-test.txt");
      await fs.writeFile(testFile, "test");
      await fs.unlink(testFile);

      this.logger.info("临时目录检查通过", { tempDir });
      return { success: true, tempDir };
    } catch (err) {
      this.logger.error("临时目录检查失败", err);
      return { success: false, error: err.message };
    }
  }
}

// Flow Browser 测试
class FlowBrowserTester {
  constructor(logger) {
    this.logger = logger;
    this.process = null;
  }

  async startFlowBrowser() {
    return new Promise((resolve) => {
      this.logger.info("启动Flow Browser...");

      // 检查是否存在构建后的可执行文件
      const possiblePaths = ["./out/main/index.js", "./dist/main/index.js", "./build/main/index.js"];

      let mainPath = null;
      for (const p of possiblePaths) {
        if (require("fs").existsSync(p)) {
          mainPath = p;
          break;
        }
      }

      if (!mainPath) {
        this.logger.error("未找到Flow Browser主程序");
        resolve({ success: false, error: "Main program not found" });
        return;
      }

      this.process = spawn("node", [mainPath, "--test-mode"], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, NODE_ENV: "test" }
      });

      let output = "";
      let errorOutput = "";

      this.process.stdout.on("data", (data) => {
        output += data.toString();
        this.logger.info("Flow Browser输出", { data: data.toString() });
      });

      this.process.stderr.on("data", (data) => {
        errorOutput += data.toString();
        this.logger.error("Flow Browser错误", { data: data.toString() });
      });

      this.process.on("close", (code) => {
        this.logger.info("Flow Browser进程结束", { code, output, errorOutput });
        resolve({ success: code === 0, code, output, errorOutput });
      });

      this.process.on("error", (err) => {
        this.logger.error("Flow Browser启动失败", err);
        resolve({ success: false, error: err.message });
      });

      // 等待一段时间让浏览器启动
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.logger.info("Flow Browser启动成功");
          resolve({ success: true });
        }
      }, 5000);
    });
  }

  async stopFlowBrowser() {
    if (this.process && !this.process.killed) {
      this.logger.info("停止Flow Browser...");
      this.process.kill("SIGTERM");

      return new Promise((resolve) => {
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill("SIGKILL");
          }
          resolve();
        }, 3000);
      });
    }
  }

  async simulateExtensionDownload(extensionId) {
    this.logger.info(`模拟扩展下载: ${extensionId}`);

    // 这里可以添加实际的扩展下载测试逻辑
    // 由于需要与Electron进程交互，这里只是模拟

    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟下载成功
        this.logger.info("扩展下载模拟完成");
        resolve({ success: true });
      }, 2000);
    });
  }
}

// 主测试流程
class ExtensionDownloadTest {
  constructor() {
    this.logger = new Logger(CONFIG.LOG_FILE);
    this.networkTester = new NetworkTester(this.logger);
    this.systemTester = new SystemTester(this.logger);
    this.flowBrowserTester = new FlowBrowserTester(this.logger);
  }

  async run() {
    this.logger.info("开始Flow Browser扩展下载自动化测试");
    this.logger.info("测试配置", CONFIG);

    const results = {
      network: {},
      system: {},
      flowBrowser: {},
      summary: {}
    };

    try {
      // 1. 网络连接测试
      this.logger.info("=== 网络连接测试 ===");
      results.network.chromeWebStore = await this.networkTester.testChromeWebStore();
      results.network.extensionDownload = await this.networkTester.testExtensionDownload(CONFIG.TEST_EXTENSION_ID);

      // 2. 系统资源测试
      this.logger.info("=== 系统资源测试 ===");
      results.system.diskSpace = await this.systemTester.checkDiskSpace();
      results.system.filePermissions = await this.systemTester.checkFilePermissions();
      results.system.tempDirectory = await this.systemTester.checkTempDirectory();

      // 3. Flow Browser测试
      this.logger.info("=== Flow Browser测试 ===");
      results.flowBrowser.startup = await this.flowBrowserTester.startFlowBrowser();

      if (results.flowBrowser.startup.success) {
        results.flowBrowser.extensionDownload = await this.flowBrowserTester.simulateExtensionDownload(
          CONFIG.TEST_EXTENSION_ID
        );
        await this.flowBrowserTester.stopFlowBrowser();
      }

      // 4. 生成测试报告
      this.logger.info("=== 测试报告 ===");
      results.summary = this.generateSummary(results);
      this.logger.info("测试完成", results.summary);
    } catch (error) {
      this.logger.error("测试过程中发生错误", error);
      results.summary = { success: false, error: error.message };
    }

    await this.logger.save();
    return results;
  }

  generateSummary(results) {
    const networkSuccess = results.network.chromeWebStore.success && results.network.extensionDownload.success;
    const systemSuccess =
      results.system.diskSpace.success &&
      results.system.filePermissions.success &&
      results.system.tempDirectory.success;
    const flowBrowserSuccess = results.flowBrowser.startup.success;

    const issues = [];

    if (!networkSuccess) {
      issues.push("网络连接问题");
    }
    if (!systemSuccess) {
      issues.push("系统资源问题");
    }
    if (!flowBrowserSuccess) {
      issues.push("Flow Browser启动问题");
    }

    return {
      success: networkSuccess && systemSuccess && flowBrowserSuccess,
      issues,
      recommendations: this.generateRecommendations(results)
    };
  }

  generateRecommendations(results) {
    const recommendations = [];

    if (!results.network.chromeWebStore.success) {
      recommendations.push("检查网络连接，确保能访问Chrome Web Store");
      recommendations.push("检查防火墙设置，确保允许HTTPS连接");
    }

    if (!results.network.extensionDownload.success) {
      recommendations.push("检查扩展ID是否正确");
      recommendations.push("尝试访问其他扩展页面");
    }

    if (!results.system.diskSpace.success) {
      recommendations.push("检查磁盘空间是否充足");
    }

    if (!results.system.filePermissions.success) {
      recommendations.push("检查文件系统权限");
      recommendations.push("以管理员权限运行");
    }

    if (!results.flowBrowser.startup.success) {
      recommendations.push("检查Flow Browser是否正确构建");
      recommendations.push("查看控制台错误信息");
    }

    return recommendations;
  }
}

// 运行测试
async function main() {
  const test = new ExtensionDownloadTest();
  const results = await test.run();

  console.log("\n=== 最终测试结果 ===");
  console.log(JSON.stringify(results.summary, null, 2));

  if (!results.summary.success) {
    console.log("\n=== 建议的解决方案 ===");
    results.summary.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }

  process.exit(results.summary.success ? 0 : 1);
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ExtensionDownloadTest, Logger, NetworkTester, SystemTester, FlowBrowserTester };
