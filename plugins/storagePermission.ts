import { registerPlugin, Capacitor } from "@capacitor/core";

// Native Plugin Interface
export interface StoragePermissionPlugin {
  isExternalStorageManager(): Promise<{ granted: boolean }>;
  openAllFilesAccessSettings(): Promise<void>;
}

// Plugin registration
export const StoragePermissionNative =
  registerPlugin<StoragePermissionPlugin>("StoragePermission");

export class StoragePermission {
  /**
   * Checks if the app has "All Files Access" (MANAGE_EXTERNAL_STORAGE).
   * Note: This only applies to Android. Returns true on iOS/Web for logic compatibility.
   */
  static async isExternalStorageManager(): Promise<{ granted: boolean }> {
    const platform = Capacitor.getPlatform();

    if (platform !== "android") {
      console.warn(
        `StoragePermission: ${platform} platform does not support this permission. Defaulting to true.`
      );
      return { granted: true };
    }

    try {
      return await StoragePermissionNative.isExternalStorageManager();
    } catch (e) {
      console.error("StoragePermission: Native call failed", e);
      return { granted: false };
    }
  }

  /**
   * Opens Android "All Files Access" settings page.
   * On Android 16, this directs the user to the specific toggle for your app.
   */
  static async openAllFilesAccessSettings(): Promise<boolean> {
    if (Capacitor.getPlatform() !== "android") {
      return false;
    }

    try {
      await StoragePermissionNative.openAllFilesAccessSettings();
      return true;
    } catch (e) {
      console.error("StoragePermission: Could not open settings", e);
      return false;
    }
  }
}
