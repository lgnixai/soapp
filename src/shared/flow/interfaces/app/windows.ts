// API //
export interface FlowWindowsAPI {
  /**
   * Opens the settings window
   */
  openSettingsWindow: () => void;

  /**
   * Closes the settings window
   */
  closeSettingsWindow: () => void;

  /**
   * Opens the apps manager window
   */
  openAppsManagerWindow: () => void;

  /**
   * Closes the apps manager window
   */
  closeAppsManagerWindow: () => void;
}
