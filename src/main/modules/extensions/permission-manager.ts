import { Extension } from "electron";

/**
 * 扩展权限管理器
 * 处理Flow Browser中不支持的Chrome扩展权限
 */
export class ExtensionPermissionManager {
  // 支持的权限列表
  private static readonly SUPPORTED_PERMISSIONS = [
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
    "declarativeNetRequestFeedback",
    "declarativeNetRequestWithHostAccess",
    "declarativeNetRequestWithHostAccess",
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
    "proxy",
    "system.cpu",
    "system.display",
    "system.memory",
    "system.storage",
    "unlimitedStorage",
    "webNavigation",
    "cookies",
    "downloads",
    "contextMenus",
    "notifications",
    "debugger"
  ];

  // 权限映射 - 将不支持的权限映射到支持的权限
  private static readonly PERMISSION_MAPPINGS = {
    // 将一些高级权限映射到基础权限
    "proxy": ["webRequest"],
    "debugger": ["scripting"],
    "webNavigation": ["tabs"],
    "cookies": ["storage"],
    "downloads": ["storage"],
    "contextMenus": ["activeTab"],
    "notifications": ["storage"]
  };

  /**
   * 验证扩展权限
   * @param extension - 扩展对象
   * @returns 验证结果
   */
  public static validateExtensionPermissions(extension: Extension): {
    valid: boolean;
    warnings: string[];
    errors: string[];
    mappedPermissions: string[];
  } {
    const manifest = extension.manifest;
    const permissions = manifest.permissions || [];
    const hostPermissions = manifest.host_permissions || [];
    
    const warnings: string[] = [];
    const errors: string[] = [];
    const mappedPermissions: string[] = [];

    // 检查每个权限
    for (const permission of permissions) {
      if (typeof permission === 'string') {
        if (!this.SUPPORTED_PERMISSIONS.includes(permission)) {
          warnings.push(`Permission '${permission}' is not fully supported in Flow Browser`);
          
          // 尝试映射权限
          const mapped = this.PERMISSION_MAPPINGS[permission as keyof typeof this.PERMISSION_MAPPINGS];
          if (mapped) {
            mappedPermissions.push(...mapped);
            warnings.push(`Permission '${permission}' mapped to: ${mapped.join(', ')}`);
          }
        } else {
          mappedPermissions.push(permission);
        }
      }
    }

    // 检查host permissions
    for (const hostPermission of hostPermissions) {
      if (typeof hostPermission === 'string') {
        // 验证host permission格式
        if (!this.isValidHostPermission(hostPermission)) {
          errors.push(`Invalid host permission: ${hostPermission}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
      mappedPermissions: [...new Set(mappedPermissions)] // 去重
    };
  }

  /**
   * 验证host permission格式
   * @param hostPermission - host permission字符串
   * @returns 是否有效
   */
  private static isValidHostPermission(hostPermission: string): boolean {
    // 支持的模式
    const validPatterns = [
      /^https?:\/\/\*\.\w+\.\w+/,
      /^https?:\/\/(\*\.)?[\w\-\.]+/,
      /^<all_urls>/,
      /^file:\/\/\*$/,
      /^chrome-extension:\/\/\*$/
    ];

    return validPatterns.some(pattern => pattern.test(hostPermission));
  }

  /**
   * 获取扩展的权限警告信息
   * @param extension - 扩展对象
   * @returns 警告信息数组
   */
  public static getPermissionWarnings(extension: Extension): string[] {
    const result = this.validateExtensionPermissions(extension);
    return [...result.warnings, ...result.errors];
  }

  /**
   * 检查扩展是否需要特殊处理
   * @param extension - 扩展对象
   * @returns 是否需要特殊处理
   */
  public static needsSpecialHandling(extension: Extension): boolean {
    const manifest = extension.manifest;
    const permissions = manifest.permissions || [];
    
    // 检查是否有不支持的权限
    return permissions.some(permission => 
      typeof permission === 'string' && 
      !this.SUPPORTED_PERMISSIONS.includes(permission)
    );
  }

  /**
   * 获取扩展的兼容性分数
   * @param extension - 扩展对象
   * @returns 兼容性分数 (0-100)
   */
  public static getCompatibilityScore(extension: Extension): number {
    const manifest = extension.manifest;
    const permissions = manifest.permissions || [];
    
    if (permissions.length === 0) {
      return 100; // 没有权限要求，完全兼容
    }

    const supportedCount = permissions.filter(permission => 
      typeof permission === 'string' && 
      this.SUPPORTED_PERMISSIONS.includes(permission)
    ).length;

    const totalCount = permissions.length;
    return Math.round((supportedCount / totalCount) * 100);
  }

  /**
   * 生成权限兼容性报告
   * @param extension - 扩展对象
   * @returns 兼容性报告
   */
  public static generateCompatibilityReport(extension: Extension): {
    score: number;
    supportedPermissions: string[];
    unsupportedPermissions: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const manifest = extension.manifest;
    const permissions = manifest.permissions || [];
    
    const supportedPermissions: string[] = [];
    const unsupportedPermissions: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    for (const permission of permissions) {
      if (typeof permission === 'string') {
        if (this.SUPPORTED_PERMISSIONS.includes(permission)) {
          supportedPermissions.push(permission);
        } else {
          unsupportedPermissions.push(permission);
          warnings.push(`Permission '${permission}' is not supported`);
          
          // 提供建议
          const mapped = this.PERMISSION_MAPPINGS[permission as keyof typeof this.PERMISSION_MAPPINGS];
          if (mapped) {
            recommendations.push(`Consider using ${mapped.join(' or ')} instead of ${permission}`);
          }
        }
      }
    }

    const score = this.getCompatibilityScore(extension);

    return {
      score,
      supportedPermissions,
      unsupportedPermissions,
      warnings,
      recommendations
    };
  }
}
