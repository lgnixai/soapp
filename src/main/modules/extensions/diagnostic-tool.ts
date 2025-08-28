import { Extension } from "electron";
import { ExtensionPermissionManager } from "./permission-manager";
import { debugPrint, debugError } from "@/modules/output";

/**
 * 扩展诊断工具
 * 用于检测和诊断扩展运行问题
 */
export class ExtensionDiagnosticTool {
  /**
   * 诊断扩展问题
   * @param extension - 扩展对象
   * @returns 诊断结果
   */
  public static diagnoseExtension(extension: Extension): {
    extensionId: string;
    name: string;
    version: string;
    status: "healthy" | "warning" | "error" | "critical";
    issues: Array<{
      type: "permission" | "service_worker" | "popup" | "manifest" | "runtime";
      severity: "low" | "medium" | "high" | "critical";
      message: string;
      suggestion?: string;
    }>;
    compatibilityScore: number;
    recommendations: string[];
  } {
    const manifest = extension.manifest;
    const extensionId = extension.id;
    const name = manifest.name || "Unknown Extension";
    const version = manifest.version || "Unknown Version";

    const issues: Array<{
      type: "permission" | "service_worker" | "popup" | "manifest" | "runtime";
      severity: "low" | "medium" | "high" | "critical";
      message: string;
      suggestion?: string;
    }> = [];

    // 1. 检查权限问题
    const permissionReport = ExtensionPermissionManager.generateCompatibilityReport(extension);
    if (permissionReport.unsupportedPermissions.length > 0) {
      issues.push({
        type: "permission",
        severity: permissionReport.unsupportedPermissions.includes("debugger") ? "critical" : "high",
        message: `Unsupported permissions: ${permissionReport.unsupportedPermissions.join(", ")}`,
        suggestion: "Consider using alternative permissions or contact extension developer"
      });
    }

    // 2. 检查Service Worker
    if (manifest.background?.service_worker) {
      try {
        // 检查service worker文件是否存在
        const serviceWorkerPath = manifest.background.service_worker;
        // 这里可以添加文件存在性检查
        debugPrint("EXTENSION_DIAGNOSTIC", `Service worker path: ${serviceWorkerPath}`);
      } catch (error) {
        issues.push({
          type: "service_worker",
          severity: "critical",
          message: "Service worker registration failed",
          suggestion: "Check service worker file path and syntax"
        });
      }
    }

    // 3. 检查Popup
    if (manifest.action?.default_popup) {
      try {
        const popupPath = manifest.action.default_popup;
        debugPrint("EXTENSION_DIAGNOSTIC", `Popup path: ${popupPath}`);
      } catch (error) {
        issues.push({
          type: "popup",
          severity: "medium",
          message: "Popup loading failed",
          suggestion: "Check popup HTML file path and syntax"
        });
      }
    }

    // 4. 检查Manifest版本
    if (manifest.manifest_version !== 3) {
      issues.push({
        type: "manifest",
        severity: "high",
        message: `Manifest version ${manifest.manifest_version} is not fully supported`,
        suggestion: "Update to Manifest V3 for better compatibility"
      });
    }

    // 5. 检查运行时错误
    // 这里可以添加运行时错误检测逻辑

    // 确定整体状态
    let status: "healthy" | "warning" | "error" | "critical" = "healthy";
    if (issues.some((issue) => issue.severity === "critical")) {
      status = "critical";
    } else if (issues.some((issue) => issue.severity === "high")) {
      status = "error";
    } else if (issues.some((issue) => issue.severity === "medium")) {
      status = "warning";
    }

    // 生成建议
    const recommendations = this.generateRecommendations(issues, permissionReport);

    return {
      extensionId,
      name,
      version,
      status,
      issues,
      compatibilityScore: permissionReport.score,
      recommendations
    };
  }

  /**
   * 生成修复建议
   * @param issues - 问题列表
   * @param permissionReport - 权限报告
   * @returns 建议列表
   */
  private static generateRecommendations(
    issues: Array<{
      type: "permission" | "service_worker" | "popup" | "manifest" | "runtime";
      severity: "low" | "medium" | "high" | "critical";
      message: string;
      suggestion?: string;
    }>,
    permissionReport: any
  ): string[] {
    const recommendations: string[] = [];

    // 基于问题类型生成建议
    for (const issue of issues) {
      if (issue.suggestion) {
        recommendations.push(issue.suggestion);
      }
    }

    // 权限相关建议
    if (permissionReport.score < 50) {
      recommendations.push("This extension has significant compatibility issues. Consider finding an alternative.");
    } else if (permissionReport.score < 80) {
      recommendations.push("Some features may not work as expected due to permission limitations.");
    }

    // 通用建议
    recommendations.push("Keep the extension updated to the latest version for better compatibility.");
    recommendations.push("Report compatibility issues to the extension developer.");

    return [...new Set(recommendations)]; // 去重
  }

  /**
   * 检查扩展是否可以在Flow Browser中正常运行
   * @param extension - 扩展对象
   * @returns 是否可以正常运行
   */
  public static canRunInFlowBrowser(extension: Extension): boolean {
    const diagnostic = this.diagnoseExtension(extension);
    return diagnostic.status !== "critical" && diagnostic.compatibilityScore > 30;
  }

  /**
   * 获取扩展的详细诊断信息
   * @param extension - 扩展对象
   * @returns 详细诊断信息
   */
  public static getDetailedDiagnostic(extension: Extension): {
    basic: ReturnType<typeof this.diagnoseExtension>;
    permissions: ReturnType<typeof ExtensionPermissionManager.generateCompatibilityReport>;
    manifest: {
      version: number;
      permissions: string[];
      hostPermissions: string[];
      background?: any;
      action?: any;
      contentScripts?: any[];
    };
    files: {
      serviceWorker?: string;
      popup?: string;
      contentScripts?: string[];
    };
  } {
    const manifest = extension.manifest;

    return {
      basic: this.diagnoseExtension(extension),
      permissions: ExtensionPermissionManager.generateCompatibilityReport(extension),
      manifest: {
        version: manifest.manifest_version || 2,
        permissions: manifest.permissions || [],
        hostPermissions: manifest.host_permissions || [],
        background: manifest.background,
        action: manifest.action,
        contentScripts: manifest.content_scripts
      },
      files: {
        serviceWorker: manifest.background?.service_worker,
        popup: manifest.action?.default_popup,
        contentScripts: manifest.content_scripts?.map((cs) => cs.js).flat() || []
      }
    };
  }

  /**
   * 生成扩展诊断报告
   * @param extensions - 扩展列表
   * @returns 诊断报告
   */
  public static generateDiagnosticReport(extensions: Extension[]): {
    summary: {
      total: number;
      healthy: number;
      warning: number;
      error: number;
      critical: number;
      averageCompatibilityScore: number;
    };
    extensions: Array<ReturnType<typeof this.diagnoseExtension>>;
    recommendations: string[];
  } {
    const extensionDiagnostics = extensions.map((ext) => this.diagnoseExtension(extension));

    const summary = {
      total: extensions.length,
      healthy: extensionDiagnostics.filter((d) => d.status === "healthy").length,
      warning: extensionDiagnostics.filter((d) => d.status === "warning").length,
      error: extensionDiagnostics.filter((d) => d.status === "error").length,
      critical: extensionDiagnostics.filter((d) => d.status === "critical").length,
      averageCompatibilityScore: Math.round(
        extensionDiagnostics.reduce((sum, d) => sum + d.compatibilityScore, 0) / extensions.length
      )
    };

    const allRecommendations = extensionDiagnostics
      .flatMap((d) => d.recommendations)
      .filter((rec, index, arr) => arr.indexOf(rec) === index); // 去重

    return {
      summary,
      extensions: extensionDiagnostics,
      recommendations: allRecommendations
    };
  }
}
