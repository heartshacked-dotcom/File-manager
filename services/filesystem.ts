import { FileNode } from '../types';
import { TOTAL_STORAGE } from '../constants';
import { Filesystem, Directory, FileInfo, Encoding } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Capacitor } from '@capacitor/core';

const TRASH_FOLDER = '.nova_trash';

// Helper to determine file type from extension/mime
const getFileType = (filename: string, isDir: boolean): FileNode['type'] => {
  if (isDir) return 'folder';
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) return 'image';
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext || '')) return 'video';
  if (['mp3', 'wav', 'aac', 'flac', 'ogg'].includes(ext || '')) return 'audio';
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'xls', 'xlsx', 'json', 'xml', 'js', 'ts', 'css', 'html'].includes(ext || '')) return 'document';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return 'archive';
  return 'unknown';
};

class AndroidFileSystem {
  
  // Initialize permissions and hidden folders
  async init() {
    try {
      const status = await Filesystem.checkPermissions();
      if (status.publicStorage !== 'granted') {
        await Filesystem.requestPermissions();
      }
      // Create trash folder if not exists
      try {
        await Filesystem.mkdir({
          path: TRASH_FOLDER,
          directory: Directory.ExternalStorage,
          recursive: true
        });
      } catch (e) {
        // Ignore if exists
      }
    } catch (e) {
      console.error("Permission request failed", e);
    }
  }

  // Helper to convert Capacitor FileInfo to FileNode
  private convertToFileNode(file: FileInfo, parentId: string): FileNode {
    const isDir = file.type === 'directory';
    
    return {
      id: '', // Placeholder
      parentId: parentId,
      name: file.name,
      type: getFileType(file.name, isDir),
      size: file.size,
      updatedAt: file.mtime,
      isTrash: false,
      isHidden: file.name.startsWith('.')
    };
  }

  async readdir(parentId: string | null, showHidden: boolean = false): Promise<FileNode[]> {
    // Root handling
    let path = '';
    let isTrash = false;

    if (!parentId || parentId === 'root' || parentId === 'root_internal') {
       path = ''; 
    } else if (parentId === 'trash') {
       path = TRASH_FOLDER;
       isTrash = true;
    } else {
       path = parentId;
    }
    
    try {
      const res = await Filesystem.readdir({
        path: path,
        directory: Directory.ExternalStorage
      });

      let nodes: FileNode[] = res.files.map(f => {
        const relativePath = path ? `${path}/${f.name}` : f.name;
        
        return {
           id: relativePath,
           parentId: parentId || 'root_internal',
           name: f.name,
           type: getFileType(f.name, f.type === 'directory'),
           size: f.size,
           updatedAt: f.mtime,
           isHidden: f.name.startsWith('.'),
           isTrash: isTrash
        };
      });

      if (!showHidden) {
        nodes = nodes.filter(f => !f.isHidden);
      }
      
      // Filter out trash folder from normal view
      if (!isTrash) {
        nodes = nodes.filter(f => f.name !== TRASH_FOLDER);
      }

      return nodes;
    } catch (e) {
      console.error("Read dir error", e);
      return [];
    }
  }

  async stat(id: string): Promise<FileNode | undefined> {
    try {
      const res = await Filesystem.stat({ path: id, directory: Directory.ExternalStorage });
      const name = id.split('/').pop() || id;
      return {
        id: id,
        parentId: id.substring(0, id.lastIndexOf('/')) || 'root_internal',
        name: name,
        type: getFileType(name, res.type === 'directory'),
        size: res.size,
        updatedAt: res.mtime,
        isHidden: name.startsWith('.')
      };
    } catch {
      return undefined;
    }
  }

  async getPathNodes(id: string): Promise<FileNode[]> {
    if (id === 'trash') return [{ id: 'trash', name: 'Recycle Bin', type: 'folder', parentId: null, size: 0, updatedAt: 0 }];
    if (id === 'root' || id === 'root_internal') return [];
    
    // id is a relative path like "DCIM/Camera"
    const parts = id.split('/');
    const trail: FileNode[] = [];
    let currentPath = '';

    for (const part of parts) {
      if (!part) continue;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      trail.push({
        id: currentPath,
        parentId: currentPath.includes('/') ? currentPath.substring(0, currentPath.lastIndexOf('/')) : 'root_internal',
        name: part,
        type: 'folder',
        size: 0,
        updatedAt: 0
      });
    }
    
    // Add Internal Storage Root
    trail.unshift({ id: 'root_internal', parentId: 'root', name: 'Internal Storage', type: 'folder', size: 0, updatedAt: 0 });
    
    return trail;
  }

  async search(query: string): Promise<FileNode[]> {
    return []; 
  }

  getStorageUsage() {
    return { used: 15 * 1024*1024*1024, total: TOTAL_STORAGE, breakdown: {} };
  }

  async createFolder(parentId: string, name: string): Promise<void> {
    const path = (parentId === 'root' || parentId === 'root_internal') ? '' : parentId;
    await Filesystem.mkdir({
      path: path ? `${path}/${name}` : name,
      directory: Directory.ExternalStorage
    });
  }

  async rename(id: string, newName: string): Promise<void> {
    const parentPath = id.substring(0, id.lastIndexOf('/'));
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;
    
    await Filesystem.rename({
      from: id,
      to: newPath,
      directory: Directory.ExternalStorage
    });
  }

  async trash(ids: string[]): Promise<void> {
    for (const id of ids) {
       const name = id.split('/').pop();
       await Filesystem.rename({
         from: id,
         to: `${TRASH_FOLDER}/${name}`,
         directory: Directory.ExternalStorage
       });
    }
  }

  async deletePermanent(ids: string[]): Promise<void> {
    for (const id of ids) {
      await Filesystem.deleteFile({
        path: id,
        directory: Directory.ExternalStorage
      });
    }
  }

  async emptyTrash(): Promise<void> {
    try {
      await Filesystem.rmdir({
        path: TRASH_FOLDER,
        directory: Directory.ExternalStorage,
        recursive: true
      });
      await Filesystem.mkdir({
         path: TRASH_FOLDER,
         directory: Directory.ExternalStorage
      });
    } catch(e) { console.error(e); }
  }

  async move(ids: string[], targetParentId: string): Promise<void> {
    const targetPath = (targetParentId === 'root' || targetParentId === 'root_internal') ? '' : targetParentId;
    for (const id of ids) {
       const name = id.split('/').pop();
       await Filesystem.rename({
         from: id,
         to: targetPath ? `${targetPath}/${name}` : name!,
         directory: Directory.ExternalStorage
       });
    }
  }

  async copy(ids: string[], targetParentId: string): Promise<void> {
    const targetPath = (targetParentId === 'root' || targetParentId === 'root_internal') ? '' : targetParentId;
    for (const id of ids) {
       const name = id.split('/').pop();
       await Filesystem.copy({
         from: id,
         to: targetPath ? `${targetPath}/${name}` : name!,
         directory: Directory.ExternalStorage
       });
    }
  }

  // --- Preview Helpers ---

  async getFileUrl(id: string): Promise<string> {
    try {
      const uriResult = await Filesystem.getUri({
        path: id,
        directory: Directory.ExternalStorage
      });
      return Capacitor.convertFileSrc(uriResult.uri);
    } catch (e) {
      console.error('Failed to get file URI', e);
      throw e;
    }
  }

  async readTextFile(id: string): Promise<string> {
    try {
      const contents = await Filesystem.readFile({
        path: id,
        directory: Directory.ExternalStorage,
        encoding: Encoding.UTF8
      });
      return contents.data as string;
    } catch (e) {
      console.error('Failed to read text file', e);
      throw e;
    }
  }

  async openFile(file: FileNode): Promise<void> {
    try {
      const uriResult = await Filesystem.getUri({
        path: file.id,
        directory: Directory.ExternalStorage
      });
      
      await FileOpener.open({
        filePath: uriResult.uri,
        contentType: this.getMimeType(file.type, file.name)
      });
    } catch (e: any) {
      console.error('Error opening file', e);
      alert('Could not open file: ' + (e.message || e));
    }
  }

  private getMimeType(type: string, name: string): string {
     const ext = name.split('.').pop()?.toLowerCase();
     if (ext === 'pdf') return 'application/pdf';
     if (ext === 'txt') return 'text/plain';
     if (ext === 'html') return 'text/html';
     if (ext === 'json') return 'application/json';
     if (ext === 'js') return 'application/javascript';
     if (ext === 'css') return 'text/css';
     
     if (type === 'image') return 'image/*';
     if (type === 'video') return 'video/*';
     if (type === 'audio') return 'audio/*';
     
     return '*/*';
  }
}

export const fileSystem = new AndroidFileSystem();
