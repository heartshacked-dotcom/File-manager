
import { 
  Folder, FileImage, FileVideo, FileAudio, FileText, FileArchive, File, 
  FileCode, FileJson, FileSpreadsheet, FileType2, FileBox, Box
} from 'lucide-react';

export const getFileIcon = (name: string, type: string) => {
  if (type === 'folder') return Folder;
  
  const ext = name.split('.').pop()?.toLowerCase();

  // Explicit APK Check
  if (ext === 'apk') return Box;

  switch (type) {
    case 'image': return FileImage;
    case 'video': return FileVideo;
    case 'audio': return FileAudio;
    case 'archive': return FileArchive;
    case 'document':
      if (['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'json', 'xml', 'java', 'c', 'cpp'].includes(ext || '')) return FileCode;
      if (['xls', 'xlsx', 'csv'].includes(ext || '')) return FileSpreadsheet;
      if (['pdf'].includes(ext || '')) return FileType2; 
      return FileText;
    default: return File;
  }
};

// Deprecated alias for compatibility, mapped to new function
export const getIconForType = (type: string) => getFileIcon('', type);
