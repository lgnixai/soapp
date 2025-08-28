import { IPCListener } from "~/flow/types";
import { SharedExtensionData } from "~/types/extensions";

// API //
export interface FlowExtensionsAPI {
  /**
   * Get all extensions in the current profile
   */
  getAllInCurrentProfile: () => Promise<SharedExtensionData[]>;

  /**
   * Listen for updates to the extensions in the current profile
   */
  onUpdated: IPCListener<[string, SharedExtensionData[]]>;

  /**
   * Set the enabled state of an extension
   */
  setExtensionEnabled: (extensionId: string, enabled: boolean) => Promise<boolean>;

  /**
   * Uninstall an extension
   */
  uninstallExtension: (extensionId: string) => Promise<boolean>;

  /**
   * Set the pinned state of an extension
   */
  setExtensionPinned: (extensionId: string, pinned: boolean) => Promise<boolean>;

  /**
   * Load an unpacked extension from a directory (Developer mode)
   */
  loadUnpackedExtension: (extensionPath: string) => Promise<{ success: boolean; extensionId?: string; error?: string }>;

  /**
   * Remove an unpacked extension (Developer mode)
   */
  removeUnpackedExtension: (extensionId: string) => Promise<{ success: boolean; error?: string }>;

  /**
   * Update an unpacked extension (Developer mode)
   */
  updateUnpackedExtension: (
    extensionId: string,
    newSourcePath?: string
  ) => Promise<{ success: boolean; error?: string }>;
}
