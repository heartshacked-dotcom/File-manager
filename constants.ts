import { FileNode } from './types';
import { 
  Folder, Image, Video, Music, FileText, Archive, File, 
  Lock, Smartphone, HardDrive, Trash2, Eye, EyeOff,
  Copy, Scissors, Edit2, Info, Share2, CornerUpLeft
} from 'lucide-react';

export const TOTAL_STORAGE = 64 * 1024 * 1024 * 1024; // 64 GB

// Initial seed data for the virtual file system
export const INITIAL_FILES: FileNode[] = [
  // Root Folders
  { id: 'root_internal', parentId: 'root', name: 'Internal Storage', type: 'folder', size: 0, updatedAt: Date.now() },
  { id: 'root_sd', parentId: 'root', name: 'SD Card', type: 'folder', size: 0, updatedAt: Date.now() },
  
  // Internal Storage Structure
  { id: 'dcim', parentId: 'root_internal', name: 'DCIM', type: 'folder', size: 0, updatedAt: Date.now() },
  { id: 'downloads', parentId: 'root_internal', name: 'Downloads', type: 'folder', size: 0, updatedAt: Date.now() },
  { id: 'documents', parentId: 'root_internal', name: 'Documents', type: 'folder', size: 0, updatedAt: Date.now() },
  { id: 'music', parentId: 'root_internal', name: 'Music', type: 'folder', size: 0, updatedAt: Date.now() },
  { id: 'secure_vault', parentId: 'root_internal', name: 'Secure Vault', type: 'folder', size: 0, updatedAt: Date.now(), isProtected: true },

  // DCIM Content
  { id: 'cam_01', parentId: 'dcim', name: 'IMG_20230501.jpg', type: 'image', size: 2500000, updatedAt: Date.now() - 100000 },
  { id: 'cam_02', parentId: 'dcim', name: 'IMG_20230502.jpg', type: 'image', size: 2800000, updatedAt: Date.now() - 80000 },
  { id: 'vid_01', parentId: 'dcim', name: 'VID_Trip.mp4', type: 'video', size: 154000000, updatedAt: Date.now() - 50000 },

  // Downloads Content
  { id: 'doc_01', parentId: 'downloads', name: 'Project_Specs.pdf', type: 'document', size: 450000, updatedAt: Date.now() - 200000 },
  { id: 'arch_01', parentId: 'downloads', name: 'backup_assets.zip', type: 'archive', size: 54000000, updatedAt: Date.now() - 300000 },
  { id: 'app_installer', parentId: 'downloads', name: 'installer.apk', type: 'unknown', size: 15000000, updatedAt: Date.now() - 400000 },

  // Documents Content
  { id: 'note_01', parentId: 'documents', name: 'Meeting_Notes.txt', type: 'document', size: 1200, updatedAt: Date.now() - 600000 },
  { id: 'sheet_01', parentId: 'documents', name: 'Budget_2024.xlsx', type: 'document', size: 25000, updatedAt: Date.now() - 500000 },

  // Music Content
  { id: 'song_01', parentId: 'music', name: 'Synth_Wave_Mix.mp3', type: 'audio', size: 8500000, updatedAt: Date.now() - 900000 },
];

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