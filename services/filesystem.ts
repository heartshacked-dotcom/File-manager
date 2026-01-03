import { FileNode } from '../types';
import { INITIAL_FILES, TOTAL_STORAGE } from '../constants';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, FileInfo, ReaddirResult } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

// --- Interfaces & Utilities ---

const TRASH_FOLDER = '.nova_trash';

// Helper to determine file type from extension/mime
const getFileType = (filename: string, isDir: boolean): FileNode['type'] => {
  if (isDir) return 'folder';
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) return 'image';
  if (['mp4', 'mkv', 'avi', 'mov'].includes(ext || '')) return 'video';
  if (['mp3', 'wav', 'aac', 'flac'].includes(ext || '')) return 'audio';
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'xls', 'xlsx'].includes(ext || '')) return 'document';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return 'archive';
  return 'unknown';
};

// --- Mock Implementation (Web Fallback) ---
class MockFileSystem {
  private files: FileNode[];

  constructor() {
    const stored = localStorage.getItem('nova_fs_v2');
    if (stored) {
      this.files = JSON.parse(stored);
    } else {
      this.files = [...INITIAL_FILES];
      this.save();
    }
  }

  private save() {
    localStorage.setItem('nova_fs_v2', JSON.stringify(this.files));
  }

  async init() { return; }

  async readdir(parentId: string | null, showHidden: boolean = false): Promise<FileNode[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (parentId === 'trash') {
      return this.files.filter(f => f.isTrash);
    }

    let result = this.files.filter(f => {
      if (!parentId) return f.parentId === 'root' && !f.isTrash;
      return f.parentId === parentId && !f.isTrash;
    });

    if (!showHidden) {
      result = result.filter(f => !f.isHidden);
    }

    return result;
  }

  async stat(id: string): Promise<FileNode | undefined> {
    return this.files.find(f => f.id === id);
  }

  async getPathNodes(id: string): Promise<FileNode[]> {
    if (id === 'trash') return [{ id: 'trash', name: 'Recycle Bin', type: 'folder', parentId: null, size: 0, updatedAt: 0 }];
    
    const trail: FileNode[] = [];
    let currentId: string | null = id;

    while (currentId && currentId !== 'root' && currentId !== 'root_internal' && currentId !== 'root_sd') {
      const node: FileNode | undefined = this.files.find(f => f.id === currentId);
      if (node) {
        trail.unshift(node);
        currentId = node.parentId;
      } else {
        break;
      }
    }
    if (currentId && (currentId === 'root_internal' || currentId === 'root_sd')) {
        const rootNode = this.files.find(f => f.id === currentId);
        if(rootNode) trail.unshift(rootNode);
    }
    return trail;
  }

  async search(query: string): Promise<FileNode[]> {
    if (!query) return [];
    return this.files.filter(f => !f.isTrash && f.name.toLowerCase().includes(query.toLowerCase()));
  }

  getStorageUsage() {
    const used = this.files.reduce((acc, file) => acc + (file.type !== 'folder' ? file.size : 0), 0);
    const breakdown: Record<string, number> = {};
    this.files.forEach(file => {
      if (file.type !== 'folder') {
        breakdown[file.type] = (breakdown[file.type] || 0) + file.size;
      }
    });
    return { used, total: TOTAL_STORAGE, breakdown };
  }

  async createFolder(parentId: string, name: string): Promise<void> {
    const newNode: FileNode = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      parentId,
      name,
      type: 'folder',
      size: 0,
      updatedAt: Date.now()
    };
    this.files.push(newNode);
    this.save();
  }

  async rename(id: string, newName: string): Promise<void> {
    const file = this.files.find(f => f.id === id);
    if (file) {
      file.name = newName;
      file.updatedAt = Date.now();
      this.save();
    }
  }

  async trash(ids: string[]): Promise<void> {
    const idsToTrash = new Set(ids);
    this.files.forEach(f => {
      if (idsToTrash.has(f.id)) f.isTrash = true;
    });
    this.save();
  }

  async deletePermanent(ids: string[]): Promise<void> {
    let allIdsToDelete = new Set(ids);
    let foundNew = true;
    while(foundNew) {
      foundNew = false;
      this.files.forEach(f => {
        if (f.parentId && allIdsToDelete.has(f.parentId) && !allIdsToDelete.has(f.id)) {
          allIdsToDelete.add(f.id);
          foundNew = true;
        }
      });
    }
    this.files = this.files.filter(f => !allIdsToDelete.has(f.id));
    this.save();
  }

  async emptyTrash(): Promise<void> {
    const trashItems = this.files.filter(f => f.isTrash).map(f => f.id);
    await this.deletePermanent(trashItems);
  }

  async move(ids: string[], targetParentId: string): Promise<void> {
    const idsToMove = new Set(ids);
    this.files.forEach(f => {
      if (idsToMove.has(f.id)) {
        f.parentId = targetParentId;
        f.updatedAt = Date.now();
      }
    });
    this.save();
  }

  async copy(ids: string[], targetParentId: string): Promise<void> {
    const idsToCopy = new Set(ids);
    const idMap = new Map<string, string>();
    const newFiles: FileNode[] = [];

    this.files.forEach(f => {
      if (idsToCopy.has(f.id)) {
        const newId = `copy_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        idMap.set(f.id, newId);
        newFiles.push({
          ...f,
          id: newId,
          parentId: targetParentId,
          updatedAt: Date.now()
        });
      }
    });

    let queue = Array.from(idMap.keys());
    while(queue.length > 0) {
      const parentId = queue.shift();
      const newParentId = idMap.get(parentId!);
      const children = this.files.filter(f => f.parentId === parentId);
      children.forEach(child => {
        const newChildId = `copy_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        idMap.set(child.id, newChildId);
        queue.push(child.id);
        newFiles.push({ ...child, id: newChildId, parentId: newParentId!, updatedAt: Date.now() });
      });
    }
    this.files.push(...newFiles);
    this.save();
  }

  async openFile(file: FileNode): Promise<void> {
    alert(`Opening ${file.name} (Simulation)`);
  }
}

// --- Native Implementation (Android) ---
class NativeFileSystem {
  // We map the "Root" concept to Directory.ExternalStorage
  // Paths are relative to Directory.ExternalStorage unless absolute
  
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
          recursive: true // actually mkdir recursive creates the dir if parents exist
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
    // Construct an ID. For native, ID = Path
    // file.uri is full file:// path. We can use that or the relative path if available.
    // Filesystem readdir returns { name, uri, ... }
    // We will use the 'uri' as the unique ID for simplicity in this bridge
    
    // NOTE: 'uri' might be unique, but for navigation 'parentId' needs to be derived.
    // In our app logic, parentId is the path of the folder.
    
    const isDir = file.type === 'directory';
    // Clean uri to use as ID if needed, or simply use path concatenation
    const id = file.uri; 
    
    return {
      id: id,
      parentId: parentId, // This might be mismatched if we don't track paths carefully
      name: file.name,
      type: getFileType(file.name, isDir),
      size: file.size,
      updatedAt: file.mtime,
      isTrash: false, // We handle trash view separately
      isHidden: file.name.startsWith('.')
    };
  }

  async readdir(parentId: string | null, showHidden: boolean = false): Promise<FileNode[]> {
    // Root handling
    if (!parentId || parentId === 'root' || parentId === 'root_internal') {
       parentId = ''; // Empty string = root of ExternalStorage
    } else if (parentId === 'trash') {
       parentId = TRASH_FOLDER;
    } else {
       // Convert URI/ID back to relative path if possible, or assume ID is the URI.
       // Readdir expects a path relative to the directory option, OR we can provide no directory and a full path?
       // Capacitor 6 recommends using Directory + relative path, or full path.
       // Let's assume parentId holds the full file URI from the previous node.
       // We need to strip the base to get relative path for 'Directory.ExternalStorage' if we want to use that.
       // EASIER STRATEGY: Use `Directory.ExternalStorage` and maintain relative paths as IDs.
    }

    // Current Architecture adjustment:
    // If ID is a full file:// URI, we can't easily pass it to readdir with Directory.ExternalStorage unless we parse it.
    // We will switch IDs to be Relative Paths.
    
    // Root = ""
    // Subfolder = "DCIM"
    // SubSub = "DCIM/Camera"
    
    const path = (parentId === 'root' || parentId === 'root_internal') ? '' : parentId;
    
    try {
      if (path === 'trash') {
        const res = await Filesystem.readdir({ path: TRASH_FOLDER, directory: Directory.ExternalStorage });
        return res.files.map(f => ({
          ...this.convertToFileNode(f, 'trash'),
          isTrash: true
        }));
      }

      const res = await Filesystem.readdir({
        path: path || '',
        directory: Directory.ExternalStorage
      });

      let nodes = res.files.map(f => {
        // ID is relative path
        const relativePath = path ? `${path}/${f.name}` : f.name;
        return {
           id: relativePath,
           parentId: parentId || 'root_internal',
           name: f.name,
           type: getFileType(f.name, f.type === 'directory'),
           size: f.size,
           updatedAt: f.mtime,
           isHidden: f.name.startsWith('.')
        };
      });

      if (!showHidden) {
        nodes = nodes.filter(f => !f.isHidden);
      }
      // Filter out trash folder from normal view
      nodes = nodes.filter(f => f.name !== TRASH_FOLDER);

      return nodes;
    } catch (e) {
      console.error("Read dir error", e);
      return [];
    }
  }

  async stat(id: string): Promise<FileNode | undefined> {
    try {
      const res = await Filesystem.stat({ path: id, directory: Directory.ExternalStorage });
      // We need name, which stat doesn't strictly provide if we only passed path.
      // But we can derive it.
      const name = id.split('/').pop() || id;
      return {
        id: id,
        parentId: id.substring(0, id.lastIndexOf('/')) || 'root_internal',
        name: name,
        type: getFileType(name, res.type === 'directory'),
        size: res.size,
        updatedAt: res.mtime
      };
    } catch {
      return undefined;
    }
  }

  async getPathNodes(id: string): Promise<FileNode[]> {
    if (id === 'trash') return [{ id: 'trash', name: 'Recycle Bin', type: 'folder', parentId: null, size: 0, updatedAt: 0 }];
    if (id === 'root' || id === 'root_internal') return [];
    
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
    // Deep search not efficiently supported by simple FS API without scanning
    // We will return empty or implement shallow search
    return []; 
  }

  getStorageUsage() {
    // Requires scanning everything, too slow for sync call.
    // Return mock or calculated async
    return { used: 15 * 1024*1024*1024, total: 64 * 1024*1024*1024, breakdown: {} };
  }

  async createFolder(parentId: string, name: string): Promise<void> {
    const path = (parentId === 'root' || parentId === 'root_internal') ? '' : parentId;
    await Filesystem.mkdir({
      path: path ? `${path}/${name}` : name,
      directory: Directory.ExternalStorage
    });
  }

  async rename(id: string, newName: string): Promise<void> {
    // id is relative path
    const parentPath = id.substring(0, id.lastIndexOf('/'));
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;
    
    await Filesystem.rename({
      from: id,
      to: newPath,
      directory: Directory.ExternalStorage
    });
  }

  async trash(ids: string[]): Promise<void> {
    // Move to .nova_trash
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
      // If we are in trash view, id might be relative to ExternalStorage still?
      // Yes, if readdir returned paths like `.nova_trash/file.txt`
      await Filesystem.deleteFile({
        path: id,
        directory: Directory.ExternalStorage
      });
    }
  }

  async emptyTrash(): Promise<void> {
    // Delete .nova_trash and recreate
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
       // Collision handling would go here
       await Filesystem.copy({
         from: id,
         to: targetPath ? `${targetPath}/${name}` : name!,
         directory: Directory.ExternalStorage
       });
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
    } catch (e) {
      console.error('Error opening file', e);
      alert('Could not open file');
    }
  }

  private getMimeType(type: string, name: string): string {
     // Basic mapping
     if (type === 'image') return 'image/*';
     if (type === 'video') return 'video/*';
     if (type === 'audio') return 'audio/*';
     if (type === 'document') return 'application/pdf'; // Defaulting
     return '*/*';
  }
}

// --- Factory ---

const isNative = Capacitor.isNativePlatform();
export const fileSystem = isNative ? new NativeFileSystem() : new MockFileSystem();
