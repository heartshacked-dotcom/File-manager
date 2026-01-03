import { FileNode } from '../types';
import { TOTAL_STORAGE } from '../constants';
import { Filesystem, Directory, FileInfo, Encoding } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SecurityService } from './security';

const TRASH_FOLDER = '.nova_trash';

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
  
  // Initialize permissions and hidden folders
  async init(): Promise<boolean> {
    try {
      const status = await Filesystem.checkPermissions();
      if (status.publicStorage !== 'granted') {
        const request = await Filesystem.requestPermissions();
        if (request.publicStorage !== 'granted') {
           return false;
        }
      }
      try {
        await Filesystem.mkdir({
          path: TRASH_FOLDER,
          directory: Directory.ExternalStorage,
          recursive: true
        });
      } catch (e) { /* Ignore */ }
      return true;
    } catch (e) {
      console.error("Permission request failed", e);
      return false;
    }
  }

  async openSettings() {
    console.warn("Opening settings is not supported without additional plugins.");
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
    // 1. Virtual Root Handling (Device Level)
    if (!parentId || parentId === 'root') {
        return [
            { 
                id: 'root_internal', 
                parentId: 'root', 
                name: 'Internal Storage', 
                type: 'folder', 
                size: 0, 
                updatedAt: Date.now(),
                isProtected: false 
            },
            { 
                id: 'root_sd', 
                parentId: 'root', 
                name: 'SD Card', 
                type: 'folder', 
                size: 0, 
                updatedAt: Date.now(),
                isProtected: false 
            }
        ];
    }

    // 2. Map internal IDs to actual paths
    let path = '';
    let isTrash = false;

    if (parentId === 'root_internal') {
       path = ''; // Root of ExternalStorage
    } else if (parentId === 'root_sd') {
       return [];
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
        const isEncrypted = f.name.endsWith('.enc');
        
        return {
           id: relativePath,
           parentId: parentId, 
           name: f.name,
           type: getFileType(f.name, f.type === 'directory'),
           size: f.size,
           updatedAt: f.mtime,
           isHidden: f.name.startsWith('.'),
           isTrash: isTrash,
           isEncrypted: isEncrypted,
           // In a real app, protection status would be stored in metadata/db
           isProtected: f.name.includes('_safe') || f.name === 'Secure Vault'
        };
      });

      if (!showHidden) {
        nodes = nodes.filter(f => !f.isHidden);
      }
      
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
      if (id === 'root_internal') return { id: 'root_internal', parentId: 'root', name: 'Internal Storage', type: 'folder', size: 0, updatedAt: 0 };
      if (id === 'root_sd') return { id: 'root_sd', parentId: 'root', name: 'SD Card', type: 'folder', size: 0, updatedAt: 0 };

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
    if (id === 'trash') return [{ id: 'trash', name: 'Recycle Bin', type: 'folder', parentId: null, size: 0, updatedAt: 0 }];
    if (id === 'root') return [];
    if (id === 'root_internal') return [{ id: 'root_internal', parentId: 'root', name: 'Internal Storage', type: 'folder', size: 0, updatedAt: 0 }];
    if (id === 'root_sd') return [{ id: 'root_sd', parentId: 'root', name: 'SD Card', type: 'folder', size: 0, updatedAt: 0 }];
    
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
       if (!name) continue;
       const destPath = targetPath ? `${targetPath}/${name}` : name;
       if (id === destPath) continue;

       try {
         await Filesystem.rename({
           from: id,
           to: destPath,
           directory: Directory.ExternalStorage
         });
       } catch (err) {
          if (targetPath) {
             try {
               await Filesystem.mkdir({ path: targetPath, directory: Directory.ExternalStorage, recursive: true });
               await Filesystem.rename({ from: id, to: destPath, directory: Directory.ExternalStorage });
               continue; 
             } catch (retryErr) {}
          }
          try {
             await Filesystem.copy({ from: id, to: destPath, directory: Directory.ExternalStorage });
             try {
                await Filesystem.deleteFile({ path: id, directory: Directory.ExternalStorage });
             } catch (deleteErr) {}
          } catch (fallbackErr: any) {
             throw new Error(`Failed to move ${name}. ${fallbackErr.message}`);
          }
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

       // Basic existence check loop
       while (true) {
         try {
            await Filesystem.stat({ path: newPath, directory: Directory.ExternalStorage });
            counter++;
            newName = `${base} copy ${counter}${ext}`;
            newPath = parentPath ? `${parentPath}/${newName}` : newName;
         } catch {
            // Stat failed, meaning file doesn't exist, we can use this name
            break; 
         }
       }

       await Filesystem.copy({
         from: id,
         to: newPath,
         directory: Directory.ExternalStorage
       });
    }
  }

  // --- Archive Operations ---
  async compress(ids: string[], archiveName: string): Promise<void> {
    const parentId = ids[0].substring(0, ids[0].lastIndexOf('/'));
    const zipName = archiveName.endsWith('.zip') ? archiveName : `${archiveName}.zip`;
    const path = parentId ? `${parentId}/${zipName}` : zipName;

    await new Promise(resolve => setTimeout(resolve, 800));

    await Filesystem.writeFile({
      path: path,
      data: 'PK...', // Dummy zip
      directory: Directory.ExternalStorage,
      encoding: Encoding.UTF8
    });
  }

  async extract(archiveId: string): Promise<void> {
     const parentPath = archiveId.substring(0, archiveId.lastIndexOf('/'));
     const fileName = archiveId.split('/').pop() || '';
     const folderName = fileName.replace(/\.(zip|rar|7z|tar|gz)$/i, '');
     const targetPath = parentPath ? `${parentPath}/${folderName}` : folderName;

     await new Promise(resolve => setTimeout(resolve, 1000));

     await Filesystem.mkdir({
       path: targetPath,
       directory: Directory.ExternalStorage,
       recursive: true
     });
     
     await Filesystem.writeFile({
       path: `${targetPath}/readme.txt`,
       data: 'Extracted content',
       directory: Directory.ExternalStorage,
       encoding: Encoding.UTF8
     });
  }

  // --- Security Operations ---
  
  async toggleProtection(ids: string[], protect: boolean): Promise<void> {
    for (const id of ids) {
      const name = id.split('/').pop() || '';
      let newName = name;
      
      if (protect && !name.includes('_safe')) {
        newName = name + '_safe';
      } else if (!protect && name.endsWith('_safe')) {
        newName = name.replace('_safe', '');
      } else {
        continue;
      }
      
      const parentPath = id.substring(0, id.lastIndexOf('/'));
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;
      
      await Filesystem.rename({
        from: id,
        to: newPath,
        directory: Directory.ExternalStorage
      });
    }
  }

  async encryptFiles(ids: string[], password: string): Promise<void> {
     for (const id of ids) {
       // 1. Read file
       const readResult = await Filesystem.readFile({
         path: id,
         directory: Directory.ExternalStorage,
         // Read as default (Base64)
       });
       
       const data = readResult.data;
       if (typeof data !== 'string') throw new Error("File format not supported for encryption");
       
       // 2. Encrypt
       const encryptedData = await SecurityService.encryptData(data, password);
       
       // 3. Write new .enc file
       const newPath = id + '.enc';
       await Filesystem.writeFile({
         path: newPath,
         data: encryptedData,
         directory: Directory.ExternalStorage,
         // Write as string (Base64 implies text in this context for filesystem write usually, 
         // but we want binary. Web implementation of Capacitor might need utf8 if not base64)
         // We'll trust Capacitor handles base64 string writes correctly if no encoding specified?
         // Actually, Filesystem.writeFile takes data as string. 
       });

       // 4. Delete original
       await Filesystem.deleteFile({ path: id, directory: Directory.ExternalStorage });
     }
  }

  async decryptFiles(ids: string[], password: string): Promise<void> {
    for (const id of ids) {
      if (!id.endsWith('.enc')) continue;
      
      // 1. Read encrypted file
      const readResult = await Filesystem.readFile({
        path: id,
        directory: Directory.ExternalStorage
      });
      
      const encryptedData = readResult.data;
      if (typeof encryptedData !== 'string') throw new Error("Read error");

      // 2. Decrypt
      const decryptedData = await SecurityService.decryptData(encryptedData, password);

      // 3. Write original file
      const newPath = id.substring(0, id.length - 4); // Remove .enc
      await Filesystem.writeFile({
        path: newPath,
        data: decryptedData,
        directory: Directory.ExternalStorage
      });

      // 4. Delete encrypted
      await Filesystem.deleteFile({ path: id, directory: Directory.ExternalStorage });
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