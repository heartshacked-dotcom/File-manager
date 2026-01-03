import { FileNode } from '../types';
import { INITIAL_FILES, TOTAL_STORAGE } from '../constants';

class MockFileSystem {
  private files: FileNode[];

  constructor() {
    const stored = localStorage.getItem('nova_fs_v2');
    if (stored) {
      this.files = JSON.parse(stored);
    } else {
      // Migrate or seed
      this.files = [...INITIAL_FILES];
      this.save();
    }
  }

  private save() {
    localStorage.setItem('nova_fs_v2', JSON.stringify(this.files));
  }

  // --- Read Operations ---

  async readdir(parentId: string | null, showHidden: boolean = false): Promise<FileNode[]> {
    await new Promise(resolve => setTimeout(resolve, 50)); // Tiny latency
    
    // Trash view
    if (parentId === 'trash') {
      return this.files.filter(f => f.isTrash);
    }

    // Normal view
    let result = this.files.filter(f => {
      // Root special handling
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
    // Add the root itself if we stopped at one
    if (currentId && (currentId === 'root_internal' || currentId === 'root_sd')) {
        const rootNode = this.files.find(f => f.id === currentId);
        if(rootNode) trail.unshift(rootNode);
    }
    return trail;
  }

  async search(query: string): Promise<FileNode[]> {
    if (!query) return [];
    return this.files.filter(f => 
      !f.isTrash && 
      f.name.toLowerCase().includes(query.toLowerCase())
    );
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

  // --- Write Operations ---

  async createFolder(parentId: string, name: string): Promise<FileNode> {
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
    return newNode;
  }

  async rename(id: string, newName: string): Promise<void> {
    const file = this.files.find(f => f.id === id);
    if (file) {
      file.name = newName;
      file.updatedAt = Date.now();
      this.save();
    }
  }

  // Move to trash
  async trash(ids: string[]): Promise<void> {
    const idsToTrash = new Set(ids);
    this.files.forEach(f => {
      if (idsToTrash.has(f.id)) {
        f.isTrash = true;
      }
      // Note: In a real FS, we might recursively trash children or just hide them. 
      // Here, if we view a trashed folder, we might want to see its content.
      // For simplicity, we only mark the top level item as trash.
    });
    this.save();
  }

  async restore(ids: string[]): Promise<void> {
    const idsToRestore = new Set(ids);
    this.files.forEach(f => {
      if (idsToRestore.has(f.id)) {
        f.isTrash = false;
      }
    });
    this.save();
  }

  async deletePermanent(ids: string[]): Promise<void> {
    // Recursive delete logic
    let allIdsToDelete = new Set(ids);
    
    // Find all descendants
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
    // Validation: prevent moving a folder into itself
    // Simple check: check if targetParentId is a child of any id in idsToMove
    // (Omitted for brevity in mock, but important in real app)

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
    const newFiles: FileNode[] = [];

    // Map old ID to new ID for parent referencing
    const idMap = new Map<string, string>();

    // 1. Copy top level items
    this.files.forEach(f => {
      if (idsToCopy.has(f.id)) {
        const newId = `copy_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        idMap.set(f.id, newId);
        newFiles.push({
          ...f,
          id: newId,
          parentId: targetParentId,
          name: f.name, // In real app, handle name collision (e.g. "Copy of...")
          updatedAt: Date.now()
        });
      }
    });

    // 2. Recursively copy children
    // We need to find all descendants of the copied folders
    let remainingFiles = this.files.filter(f => !idsToCopy.has(f.id)); // Optimization: only look at non-copied
    
    // We iterate until we find no more children to copy
    // A simplified approach for the mock:
    // Just loop through all files and if their parent matches a key in idMap, copy them.
    // Since this is a flat array, we might need multiple passes or a proper tree traversal.
    // Implementation: iterative BFS
    
    let queue = Array.from(idMap.keys());
    
    while(queue.length > 0) {
      const parentId = queue.shift();
      const newParentId = idMap.get(parentId!);
      
      const children = this.files.filter(f => f.parentId === parentId);
      children.forEach(child => {
        const newChildId = `copy_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        idMap.set(child.id, newChildId);
        queue.push(child.id);
        
        newFiles.push({
          ...child,
          id: newChildId,
          parentId: newParentId!,
          updatedAt: Date.now()
        });
      });
    }

    this.files.push(...newFiles);
    this.save();
  }
}

export const fileSystem = new MockFileSystem();
