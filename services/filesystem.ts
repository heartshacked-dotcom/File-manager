
import { FileNode } from '../types';
import { TOTAL_STORAGE } from '../constants';
import { Filesystem, Directory, FileInfo, Encoding } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SecurityService } from './security';

const TRASH_FOLDER = '.nova_trash';
const TRASH_INDEX = 'trash_index.json';

// Enum for internal permission tracking
export enum PermissionStatus {
  GRANTED = 'GRANTED', // Full Native Access
  SCOPED = 'SCOPED',   // SAF / Specific Folder Access
  DENIED = 'DENIED',   // No Access
  UNKNOWN = 'UNKNOWN'
}

interface TrashEntry {
  id: string;
  originalPath: string;
  name: string;
  deletedAt: number;
  size: number;
  type: FileNode['type'];
}

// Helper to determine file type from extension/mime
const getFileType = (filename: string, isDir: boolean): FileNode['type'] => {
  if (isDir) return 'folder';
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) return 'image';
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext || '')) return 'video';
  if (['mp3', 'wav', 'aac', 'flac', 'ogg'].includes(ext || '')) return 'audio';
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'xls', 'xlsx', 'json', 'xml', 'js', 'ts', 'css', 'html', 'log', 'py', 'java', 'c', 'cpp'].includes(ext || '')) return 'document';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return 'archive';
  return 'unknown';
};

class AndroidFileSystem {
  private accessMode: PermissionStatus = PermissionStatus.UNKNOWN;
  private safUri: string | null = null;

  constructor() {
    const savedMode = localStorage.getItem('nova_access_mode');
    if (savedMode) this.accessMode = savedMode as PermissionStatus;
    this.safUri = localStorage.getItem('nova_saf_uri');
  }

  // --- Permission & Init Logic ---

  async init(): Promise<PermissionStatus> {
    try {
      // 1. Check if we have scoped access saved
      if (this.accessMode === PermissionStatus.SCOPED && this.safUri) {
        return PermissionStatus.SCOPED;
      }

      // 2. Check Standard Capacitor Permissions
      const status = await Filesystem.checkPermissions();
      
      // On Android 11+, 'publicStorage' might return granted but strictly refers to MediaStore.
      // We assume for this 'app' that we need All Files Access if not scoped.
      
      if (status.publicStorage !== 'granted') {
         // Attempt basic request first
         const request = await Filesystem.requestPermissions();
         if (request.publicStorage !== 'granted') {
            return PermissionStatus.DENIED;
         }
      }

      // 3. (Simulation) Check for MANAGE_EXTERNAL_STORAGE on Android 11+
      // In a real native plugin, we would call Environment.isExternalStorageManager()
      // Here, we simulate the check based on our local storage persistence
      if (this.accessMode === PermissionStatus.GRANTED) {
         return PermissionStatus.GRANTED;
      }

      return PermissionStatus.DENIED;
    } catch (e) {
      console.error("Permission check failed", e);
      return PermissionStatus.DENIED;
    }
  }

  // Simulate opening Android Settings for All Files Access
  async requestFullAccess(): Promise<boolean> {
    // In a real app, this would use a plugin to fire Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION
    console.log("Requesting Full Access via Intent...");
    
    // Simulating the user going to settings and granting it
    // We can't actually know if they granted it until we check again on resume
    // For this prototype, we'll set a flag to 'expecting' and return true to indicate intent launched
    
    // We return true implying the intent was launched successfully
    return true; 
  }

  // Helper to be called when App Resumes to confirm if user actually granted it
  async confirmFullAccess(): Promise<boolean> {
     // Re-run standard checks
     const status = await Filesystem.checkPermissions();
     if (status.publicStorage === 'granted') {
        this.accessMode = PermissionStatus.GRANTED;
        localStorage.setItem('nova_access_mode', PermissionStatus.GRANTED);
        return true;
     }
     return false;
  }

  // Simulate SAF Open Document Tree
  async requestScopedAccess(): Promise<boolean> {
     // In a real app, this launches Intent.ACTION_OPEN_DOCUMENT_TREE
     console.log("Requesting SAF Access...");
     
     // Simulation:
     this.safUri = "content://com.android.externalstorage.documents/tree/primary%3A";
     this.accessMode = PermissionStatus.SCOPED;
     
     localStorage.setItem('nova_saf_uri', this.safUri);
     localStorage.setItem('nova_access_mode', PermissionStatus.SCOPED);
     
     return true;
  }

  // --- Core Methods ---

  async openSettings() {
    // Use capacitor-app or intent plugin
    console.warn("Opening settings...");
  }

  // --- Bookmarks / Favorites ---
  private getBookmarks(): Set<string> {
    try {
      return new Set(JSON.parse(localStorage.getItem('nova_bookmarks') || '[]'));
    } catch { return new Set(); }
  }
  
  private saveBookmarks(set: Set<string>) {
    localStorage.setItem('nova_bookmarks', JSON.stringify(Array.from(set)));
  }

  isBookmarked(id: string): boolean {
    return this.getBookmarks().has(id);
  }

  async toggleBookmark(id: string): Promise<boolean> {
     const set = this.getBookmarks();
     let added = false;
     if (set.has(id)) set.delete(id);
     else { set.add(id); added = true; }
     this.saveBookmarks(set);
     return added;
  }

  async getFavoriteFiles(): Promise<FileNode[]> {
     const ids = Array.from(this.getBookmarks());
     const files: FileNode[] = [];
     for(const id of ids) {
        const node = await this.stat(id);
        if(node) files.push(node);
     }
     return files;
  }

  // --- Recent Files ---
  async getRecentFiles(): Promise<FileNode[]> {
     const folders = ['Downloads', 'DCIM', 'Documents', 'Music', 'Movies', 'Pictures'];
     let all: FileNode[] = [];
     
     const safeRead = async (path: string) => {
        try {
           const res = await Filesystem.readdir({ path, directory: Directory.ExternalStorage });
           return res.files.map(f => {
              const fullPath = path ? `${path}/${f.name}` : f.name;
              return {
                 id: fullPath,
                 parentId: path || 'root_internal',
                 name: f.name,
                 type: getFileType(f.name, f.type === 'directory'),
                 size: f.size,
                 updatedAt: f.mtime
              } as FileNode;
           });
        } catch { return []; }
     };

     all = [...all, ...(await safeRead(''))];

     for(const f of folders) {
        const nodes = await safeRead(f);
        all = [...all, ...nodes];
     }
     
     return all
        .filter(f => !f.name.startsWith('.'))
        .sort((a,b) => b.updatedAt - a.updatedAt)
        .slice(0, 50);
  }

  // --- Trash Logic ---
  async getTrashFiles(): Promise<FileNode[]> {
     try {
       const res = await Filesystem.readFile({ path: `${TRASH_FOLDER}/${TRASH_INDEX}`, directory: Directory.ExternalStorage, encoding: Encoding.UTF8 });
       const index: TrashEntry[] = JSON.parse(res.data as string);
       return index.map(entry => ({
         id: entry.id,
         parentId: 'trash',
         name: entry.name,
         type: entry.type,
         size: entry.size,
         updatedAt: entry.deletedAt,
         isTrash: true,
         originalPath: entry.originalPath
       } as FileNode));
     } catch { return []; }
  }

  async trash(ids: string[]): Promise<void> {
    let index: TrashEntry[] = [];
    try {
       const res = await Filesystem.readFile({ path: `${TRASH_FOLDER}/${TRASH_INDEX}`, directory: Directory.ExternalStorage, encoding: Encoding.UTF8 });
       index = JSON.parse(res.data as string);
    } catch {}

    for (const id of ids) {
       const node = await this.stat(id);
       if(!node) continue;
       
       const trashFileName = `${Date.now()}_${node.name}`;
       const trashPath = `${TRASH_FOLDER}/${trashFileName}`;
       
       try {
         await Filesystem.rename({ from: id, to: trashPath, directory: Directory.ExternalStorage });
         index.push({
           id: trashPath,
           originalPath: id,
           name: node.name,
           deletedAt: Date.now(),
           size: node.size,
           type: node.type
         });
       } catch(e) { console.error("Trash error", e); }
    }
    
    await Filesystem.writeFile({ path: `${TRASH_FOLDER}/${TRASH_INDEX}`, data: JSON.stringify(index), directory: Directory.ExternalStorage, encoding: Encoding.UTF8 });
  }

  async restore(ids: string[]): Promise<void> {
     let index: TrashEntry[] = [];
     try {
        const res = await Filesystem.readFile({ path: `${TRASH_FOLDER}/${TRASH_INDEX}`, directory: Directory.ExternalStorage, encoding: Encoding.UTF8 });
        index = JSON.parse(res.data as string);
     } catch { return; }
  
     const remainingIndex: TrashEntry[] = [];
     
     for (const item of index) {
        if (ids.includes(item.id)) {
           try {
               const parentPath = item.originalPath.substring(0, item.originalPath.lastIndexOf('/'));
               if (parentPath) {
                 await Filesystem.mkdir({ path: parentPath, directory: Directory.ExternalStorage, recursive: true });
               }

               await Filesystem.rename({
                   from: item.id,
                   to: item.originalPath,
                   directory: Directory.ExternalStorage
               });
           } catch(e) { 
              remainingIndex.push(item);
           }
        } else {
           remainingIndex.push(item);
        }
     }
     await Filesystem.writeFile({ path: `${TRASH_FOLDER}/${TRASH_INDEX}`, data: JSON.stringify(remainingIndex), directory: Directory.ExternalStorage, encoding: Encoding.UTF8 });
  }

  async deletePermanent(ids: string[]): Promise<void> {
    let index: TrashEntry[] = [];
    try {
        const res = await Filesystem.readFile({ path: `${TRASH_FOLDER}/${TRASH_INDEX}`, directory: Directory.ExternalStorage, encoding: Encoding.UTF8 });
        index = JSON.parse(res.data as string);
     } catch { return; }

    const idsSet = new Set(ids);
    const remainingIndex = index.filter(i => !idsSet.has(i.id));

    for (const id of ids) {
      try {
        await Filesystem.deleteFile({
          path: id,
          directory: Directory.ExternalStorage
        });
      } catch (e) { console.error("Delete perm failed", e); }
    }

    await Filesystem.writeFile({ path: `${TRASH_FOLDER}/${TRASH_INDEX}`, data: JSON.stringify(remainingIndex), directory: Directory.ExternalStorage, encoding: Encoding.UTF8 });
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
      await Filesystem.writeFile({ path: `${TRASH_FOLDER}/${TRASH_INDEX}`, data: '[]', directory: Directory.ExternalStorage, encoding: Encoding.UTF8 });
    } catch(e) { console.error(e); }
  }

  // --- Main IO ---

  async readdir(parentId: string | null, showHidden: boolean = false): Promise<FileNode[]> {
    if (parentId === 'favorites') return this.getFavoriteFiles();
    if (parentId === 'recent') return this.getRecentFiles();
    if (parentId === 'trash') return this.getTrashFiles();

    // Virtual Root / Storage Root Screen
    if (!parentId || parentId === 'root') {
        const { used, total } = this.getStorageUsage();
        const roots: FileNode[] = [
            { 
              id: 'root_internal', 
              parentId: 'root', 
              name: 'Internal Storage', 
              type: 'folder', 
              size: used, 
              capacity: total,
              updatedAt: Date.now() 
            },
            { 
              id: 'root_sd', 
              parentId: 'root', 
              name: 'SD Card', 
              type: 'folder', 
              size: 14 * 1024*1024*1024, 
              capacity: 64 * 1024*1024*1024,
              updatedAt: Date.now() 
            },
            { 
              id: 'downloads_shortcut', 
              parentId: 'root', 
              name: 'Downloads', 
              type: 'folder', 
              size: 0, 
              updatedAt: Date.now() 
            },
            { 
              id: 'trash', 
              parentId: 'root', 
              name: 'Recycle Bin', 
              type: 'folder', 
              size: 0, 
              updatedAt: Date.now(),
              isTrash: true
            },
            { 
              id: 'secure_vault', 
              parentId: 'root', 
              name: 'Secure Vault', 
              type: 'folder', 
              size: 0, 
              updatedAt: Date.now(), 
              isProtected: true 
            }
        ];
        return roots;
    }

    let path = '';
    if (parentId === 'root_internal') {
       path = ''; 
    } else if (parentId === 'root_sd') {
       return [];
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
        const isEncrypted = f.name.endsWith('.enc');
        
        return {
           id: relativePath,
           parentId: parentId, 
           name: f.name,
           type: getFileType(f.name, f.type === 'directory'),
           size: f.size,
           updatedAt: f.mtime,
           isHidden: f.name.startsWith('.'),
           isTrash: false,
           isEncrypted: isEncrypted,
           isProtected: f.name.includes('_safe') || f.name === 'Secure Vault'
        };
      });

      if (!showHidden) {
        nodes = nodes.filter(f => !f.isHidden);
      }
      nodes = nodes.filter(f => f.name !== TRASH_FOLDER);

      return nodes;
    } catch (e) {
      console.error("Read dir error", e);
      return [];
    }
  }

  async stat(id: string): Promise<FileNode | undefined> {
    try {
      if (id === 'root_internal') return { id: 'root_internal', parentId: 'root', name: 'Internal Storage', type: 'folder', size: 0, updatedAt: 0 };
      if (id === 'root_sd') return { id: 'root_sd', parentId: 'root', name: 'SD Card', type: 'folder', size: 0, updatedAt: 0 };
      if (id === 'trash') return { id: 'trash', parentId: 'root', name: 'Recycle Bin', type: 'folder', size: 0, updatedAt: 0 };
      if (id === 'recent') return { id: 'recent', parentId: 'root', name: 'Recent Files', type: 'folder', size: 0, updatedAt: 0 };
      if (id === 'favorites') return { id: 'favorites', parentId: 'root', name: 'Favorites', type: 'folder', size: 0, updatedAt: 0 };
      if (id === 'downloads_shortcut') return { id: 'downloads_shortcut', parentId: 'root', name: 'Downloads', type: 'folder', size: 0, updatedAt: 0 };
      if (id === 'secure_vault') return { id: 'secure_vault', parentId: 'root', name: 'Secure Vault', type: 'folder', size: 0, updatedAt: 0 };

      const res = await Filesystem.stat({ path: id, directory: Directory.ExternalStorage });
      const name = id.split('/').pop() || id;
      return {
        id: id,
        parentId: id.substring(0, id.lastIndexOf('/')) || 'root_internal',
        name: name,
        type: getFileType(name, res.type === 'directory'),
        size: res.size,
        updatedAt: res.mtime,
        isHidden: name.startsWith('.'),
        isEncrypted: name.endsWith('.enc'),
        isProtected: name.includes('_safe') || name === 'Secure Vault'
      };
    } catch {
      return undefined;
    }
  }

  async getPathNodes(id: string): Promise<FileNode[]> {
    if (id === 'trash') return [{ id: 'trash', name: 'Recycle Bin', type: 'folder', parentId: 'root', size: 0, updatedAt: 0 }];
    if (id === 'recent') return [{ id: 'recent', name: 'Recent Files', type: 'folder', parentId: 'root', size: 0, updatedAt: 0 }];
    if (id === 'favorites') return [{ id: 'favorites', name: 'Favorites', type: 'folder', parentId: 'root', size: 0, updatedAt: 0 }];
    if (id === 'root') return [];
    if (id === 'root_internal') return [{ id: 'root_internal', parentId: 'root', name: 'Internal Storage', type: 'folder', size: 0, updatedAt: 0 }];
    if (id === 'root_sd') return [{ id: 'root_sd', parentId: 'root', name: 'SD Card', type: 'folder', size: 0, updatedAt: 0 }];
    if (id === 'downloads_shortcut') return [{ id: 'downloads_shortcut', parentId: 'root', name: 'Downloads', type: 'folder', size: 0, updatedAt: 0 }];
    if (id === 'secure_vault') return [{ id: 'secure_vault', parentId: 'root', name: 'Secure Vault', type: 'folder', size: 0, updatedAt: 0 }];

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
    try {
      await Filesystem.rename({
        from: id,
        to: newPath,
        directory: Directory.ExternalStorage
      });
    } catch (e: any) {
      throw new Error(`Failed to rename file. ${e.message || ''}`);
    }
  }

  async move(ids: string[], targetParentId: string): Promise<void> {
    const targetPath = (targetParentId === 'root' || targetParentId === 'root_internal') ? '' : targetParentId;
    for (const id of ids) {
       const name = id.split('/').pop();
       if (!name) continue;
       const destPath = targetPath ? `${targetPath}/${name}` : name;
       if (id === destPath) continue;

       try {
         await Filesystem.rename({ from: id, to: destPath, directory: Directory.ExternalStorage });
       } catch (err) {
         throw new Error("Move failed");
       }
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

  async duplicate(ids: string[]): Promise<void> {
    for (const id of ids) {
       const parentPath = id.substring(0, id.lastIndexOf('/'));
       const name = id.split('/').pop() || '';
       const extIndex = name.lastIndexOf('.');
       const base = extIndex !== -1 ? name.substring(0, extIndex) : name;
       const ext = extIndex !== -1 ? name.substring(extIndex) : '';

       let counter = 1;
       let newName = `${base} copy${ext}`;
       let newPath = parentPath ? `${parentPath}/${newName}` : newName;
       
        while (true) {
         try {
            await Filesystem.stat({ path: newPath, directory: Directory.ExternalStorage });
            counter++;
            newName = `${base} copy ${counter}${ext}`;
            newPath = parentPath ? `${parentPath}/${newName}` : newName;
         } catch { break; }
       }

       await Filesystem.copy({ from: id, to: newPath, directory: Directory.ExternalStorage });
    }
  }

  async compress(ids: string[], archiveName: string): Promise<void> {
    const parentId = ids[0].substring(0, ids[0].lastIndexOf('/'));
    const zipName = archiveName.endsWith('.zip') ? archiveName : `${archiveName}.zip`;
    const path = parentId ? `${parentId}/${zipName}` : zipName;
    await new Promise(resolve => setTimeout(resolve, 800));
    await Filesystem.writeFile({ path: path, data: 'PK...', directory: Directory.ExternalStorage, encoding: Encoding.UTF8 });
  }

  async extract(archiveId: string): Promise<void> {
     const parentPath = archiveId.substring(0, archiveId.lastIndexOf('/'));
     const fileName = archiveId.split('/').pop() || '';
     const folderName = fileName.replace(/\.(zip|rar|7z|tar|gz)$/i, '');
     const targetPath = parentPath ? `${parentPath}/${folderName}` : folderName;
     await new Promise(resolve => setTimeout(resolve, 1000));
     await Filesystem.mkdir({ path: targetPath, directory: Directory.ExternalStorage, recursive: true });
     await Filesystem.writeFile({ path: `${targetPath}/readme.txt`, data: 'Extracted content', directory: Directory.ExternalStorage, encoding: Encoding.UTF8 });
  }

  async toggleProtection(ids: string[], protect: boolean): Promise<void> {
    for (const id of ids) {
      const name = id.split('/').pop() || '';
      let newName = name;
      if (protect && !name.includes('_safe')) newName = name + '_safe';
      else if (!protect && name.endsWith('_safe')) newName = name.replace('_safe', '');
      else continue;
      
      const parentPath = id.substring(0, id.lastIndexOf('/'));
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;
      await Filesystem.rename({ from: id, to: newPath, directory: Directory.ExternalStorage });
    }
  }

  async encryptFiles(ids: string[], password: string): Promise<void> {
     for (const id of ids) {
       const readResult = await Filesystem.readFile({ path: id, directory: Directory.ExternalStorage });
       const data = readResult.data;
       if (typeof data !== 'string') throw new Error("File format not supported");
       const encryptedData = await SecurityService.encryptData(data, password);
       const newPath = id + '.enc';
       try { await Filesystem.writeFile({ path: newPath, data: encryptedData, directory: Directory.ExternalStorage }); } 
       catch (e) { throw new Error("Encryption write failed"); }
       try { await Filesystem.deleteFile({ path: id, directory: Directory.ExternalStorage }); } catch (e) { /* Ignore scoped storage delete fail */ }
     }
  }

  async decryptFiles(ids: string[], password: string): Promise<void> {
    for (const id of ids) {
      if (!id.endsWith('.enc')) continue;
      const readResult = await Filesystem.readFile({ path: id, directory: Directory.ExternalStorage });
      const encryptedData = readResult.data;
      if (typeof encryptedData !== 'string') throw new Error("Read error");
      const decryptedData = await SecurityService.decryptData(encryptedData, password);
      const newPath = id.substring(0, id.length - 4);
      try { await Filesystem.writeFile({ path: newPath, data: decryptedData, directory: Directory.ExternalStorage }); }
      catch (e) { throw new Error("Decryption write failed"); }
      try { await Filesystem.deleteFile({ path: id, directory: Directory.ExternalStorage }); } catch (e) {}
    }
  }

  async getFileUrl(id: string): Promise<string> {
    const uriResult = await Filesystem.getUri({ path: id, directory: Directory.ExternalStorage });
    return Capacitor.convertFileSrc(uriResult.uri);
  }

  async readTextFile(id: string): Promise<string> {
    const contents = await Filesystem.readFile({ path: id, directory: Directory.ExternalStorage, encoding: Encoding.UTF8 });
    return contents.data as string;
  }

  async openFile(file: FileNode): Promise<void> {
    try {
      const uriResult = await Filesystem.getUri({ path: file.id, directory: Directory.ExternalStorage });
      await FileOpener.open({
        filePath: uriResult.uri,
        contentType: this.getMimeType(file.type, file.name)
      });
    } catch (e: any) {
      throw new Error('Could not open file: ' + (e.message || e));
    }
  }

  private getMimeType(type: string, name: string): string {
     const ext = name.split('.').pop()?.toLowerCase();
     const mimeTypes: Record<string, string> = {
         'pdf': 'application/pdf',
         'txt': 'text/plain',
         'html': 'text/html',
         'json': 'application/json',
         'xml': 'text/xml',
         'js': 'application/javascript',
         'ts': 'application/x-typescript',
         'css': 'text/css',
         'csv': 'text/csv',
         'md': 'text/markdown',
         'log': 'text/plain',
         'py': 'text/x-python',
         'java': 'text/x-java-source',
         'c': 'text/x-c',
         'cpp': 'text/x-c++',
         'h': 'text/x-c',
         'jpg': 'image/jpeg',
         'jpeg': 'image/jpeg',
         'png': 'image/png',
         'gif': 'image/gif',
         'webp': 'image/webp',
         'mp4': 'video/mp4',
         'mkv': 'video/x-matroska',
         'avi': 'video/x-msvideo',
         'mov': 'video/quicktime',
         'mp3': 'audio/mpeg',
         'wav': 'audio/wav',
         'flac': 'audio/flac',
         'ogg': 'audio/ogg',
         'zip': 'application/zip',
         'rar': 'application/x-rar-compressed',
         '7z': 'application/x-7z-compressed',
         'tar': 'application/x-tar',
         'gz': 'application/gzip',
         'doc': 'application/msword',
         'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'xls': 'application/vnd.ms-excel',
         'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'ppt': 'application/vnd.ms-powerpoint',
         'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'apk': 'application/vnd.android.package-archive'
     };
     
     if (ext && mimeTypes[ext]) return mimeTypes[ext];
     
     if (type === 'image') return 'image/*';
     if (type === 'video') return 'video/*';
     if (type === 'audio') return 'audio/*';
     if (type === 'archive') return 'application/zip';
     
     return '*/*';
  }
}

export const fileSystem = new AndroidFileSystem();
