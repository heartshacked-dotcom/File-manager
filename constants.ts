
import { 
  Folder, Image, Video, Music, FileText, Archive, File
} from 'lucide-react';

export const getIconForType = (type: string) => {
  switch (type) {
    case 'folder': return Folder;
    case 'image': return Image;
    case 'video': return Video;
    case 'audio': return Music;
    case 'document': return FileText;
    case 'archive': return Archive;
    default: return File;
  }
};

export const MOCK_STORAGE_BREAKDOWN = [
  { name: 'Images', value: 25, color: '#f59e0b' }, // amber-500
  { name: 'Videos', value: 40, color: '#ef4444' }, // red-500
  { name: 'Audio', value: 15, color: '#8b5cf6' },  // violet-500
  { name: 'Docs', value: 10, color: '#3b82f6' },   // blue-500
  { name: 'Other', value: 10, color: '#94a3b8' },  // slate-400
];
