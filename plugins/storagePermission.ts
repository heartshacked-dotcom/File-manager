
import { registerPlugin } from '@capacitor/core';

// Define the Native Plugin Interface
export interface StoragePermissionPlugin {
  check(): Promise<{ granted: boolean }>;
  request(): Promise<void>;
}

// Register the plugin (Must match the Java @CapacitorPlugin name)
const StoragePermissionNative = registerPlugin<StoragePermissionPlugin>('StoragePermissionPlugin');

export class StoragePermission {
  /**
   * Checks if the app has true "All Files Access" (MANAGE_EXTERNAL_STORAGE).
   */
  static async isExternalStorageManager(): Promise<{ granted: boolean }> {
    // Web/Dev Fallback
    if (typeof window !== 'undefined' && !(window as any).Capacitor?.isNative) {
       console.warn("StoragePermission: Web environment detected, simulating granted.");
       return { granted: true };
    }

    try {
      return await StoragePermissionNative.check();
    } catch (e) {
      console.error("StoragePermissionPlugin missing or failed", e);
      return { granted: false };
    }
  }

  /**
   * Opens the specific Android system settings page for All Files Access.
   */
  static async openAllFilesAccessSettings(): Promise<void> {
    if (typeof window !== 'undefined' && !(window as any).Capacitor?.isNative) return;

    try {
      await StoragePermissionNative.request();
    } catch (e) {
      console.error("Failed to request native permission", e);
    }
  }
}
