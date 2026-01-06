import React, { useState } from "react";
import {
  Shield,
  FolderOpen,
  AlertCircle,
  ChevronRight,
  Settings,
  ExternalLink,
} from "lucide-react";
import { fileSystem } from "../services/filesystem";

interface PermissionScreenProps {
  onGrantFull: () => Promise<boolean>; // must CHECK permission after request
  onGrantScoped: () => Promise<boolean>;
  isChecking: boolean;
}

const PermissionScreen: React.FC<PermissionScreenProps> = ({
  onGrantFull,
  onGrantScoped,
  isChecking,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [showSettingsBtn, setShowSettingsBtn] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const handleFullAccess = async () => {
    if (isRequesting) return;

    setIsRequesting(true);
    setError(null);
    setShowSettingsBtn(false);

    try {
      const granted = await onGrantFull();

      if (!granted) {
        setError(
          "All Files access was not granted. Please allow it from system settings."
        );
        setShowSettingsBtn(true);
      }
    } catch (err) {
      setError("Unable to request permission. Please try again.");
      setShowSettingsBtn(true);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleScopedAccess = async () => {
    if (isRequesting) return;

    setIsRequesting(true);
    setError(null);
    setShowSettingsBtn(false);

    try {
      const granted = await onGrantScoped();
      if (!granted) {
        setError("No folder selected. Access is required to continue.");
      }
    } catch {
      setError("Failed to open folder picker.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenSettings = async () => {
    await fileSystem.openSettings(); // MUST open app settings
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-center">
      <div className="w-full max-w-md space-y-8">
        {/* Icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse"></div>
          <div className="relative bg-white dark:bg-slate-900 border rounded-full w-24 h-24 flex items-center justify-center">
            {isChecking || isRequesting ? (
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Shield size={40} className="text-blue-600" />
            )}
          </div>
        </div>

        {/* Text */}
        <div>
          <h1 className="text-2xl font-bold">Storage Access Required</h1>
          <p className="text-sm text-slate-500 mt-2">
            Nova Explorer requires file access. Android 11+ restricts storage by
            default.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>

            {showSettingsBtn && (
              <button
                onClick={handleOpenSettings}
                className="mt-2 text-xs underline flex items-center gap-1"
              >
                Open Settings <ExternalLink size={10} />
              </button>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-4">
          {/* Full Access */}
          <button
            onClick={handleFullAccess}
            disabled={isChecking || isRequesting}
            className="w-full bg-blue-600 text-white rounded-xl p-4 text-left"
          >
            <div className="flex items-center gap-4">
              <Settings size={24} />
              <div className="flex-1">
                <div className="font-bold">Grant All Files Access</div>
                <div className="text-xs text-blue-100">
                  Required for full file manager functionality
                </div>
              </div>
              <ChevronRight />
            </div>
          </button>

          {/* Scoped */}
          <button
            onClick={handleScopedAccess}
            disabled={isChecking || isRequesting}
            className="w-full border rounded-xl p-4 text-left"
          >
            <div className="flex items-center gap-4">
              <FolderOpen size={24} />
              <div className="flex-1">
                <div className="font-bold">Choose Folder</div>
                <div className="text-xs text-slate-500">
                  Limited access via system picker
                </div>
              </div>
              <ChevronRight />
            </div>
          </button>
        </div>

        <p className="text-xs text-slate-400">No data leaves your device.</p>
      </div>
    </div>
  );
};

export default PermissionScreen;
