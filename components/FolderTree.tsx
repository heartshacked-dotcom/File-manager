import React, { useState, useEffect } from 'react';
import { FileNode } from '../types';
import { fileSystem } from '../services/filesystem';
import { ChevronRight, ChevronDown, Folder, HardDrive, Smartphone } from 'lucide-react';

interface FolderTreeProps {
  rootId?: string; // Optional entry point (defaults to 'root')
  onNavigate: (id: string) => void;
  activePathIds: Set<string>; // Set of IDs currently in the navigation path
}

const FolderTree: React.FC<FolderTreeProps> = ({ rootId = 'root', onNavigate, activePathIds }) => {
  const [roots, setRoots] = useState<FileNode[]>([]);

  useEffect(() => {
    const loadRoots = async () => {
      // Load top level volumes (Internal Storage, SD Card)
      const res = await fileSystem.readdir(rootId);
      setRoots(res);
    };
    loadRoots();
  }, [rootId]);

  return (
    <div className="flex flex-col select-none pb-4">
      {roots.map(node => (
        <FolderTreeNode 
          key={node.id} 
          node={node} 
          onNavigate={onNavigate} 
          activePathIds={activePathIds} 
          level={0} 
        />
      ))}
    </div>
  );
};

interface TreeNodeProps {
  node: FileNode;
  onNavigate: (id: string) => void;
  activePathIds: Set<string>;
  level: number;
}

const FolderTreeNode: React.FC<TreeNodeProps> = ({ node, onNavigate, activePathIds, level }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const isActive = activePathIds.has(node.id);
  const isVolume = level === 0;

  // Auto-expand if part of the active path
  useEffect(() => {
    if (activePathIds.has(node.id) && !isOpen) {
      setIsOpen(true);
    }
  }, [activePathIds, node.id]);

  useEffect(() => {
    if (isOpen && !hasLoaded) {
      loadChildren();
    }
  }, [isOpen]);

  const loadChildren = async () => {
    setLoading(true);
    try {
      const allFiles = await fileSystem.readdir(node.id);
      // Only show folders in the tree
      setChildren(allFiles.filter(f => f.type === 'folder'));
      setHasLoaded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(node.id);
    if (!isOpen) setIsOpen(true);
  };

  // Determine Icon
  let Icon = Folder;
  if (node.id === 'root_internal') Icon = Smartphone;
  else if (node.id === 'root_sd') Icon = HardDrive;

  const iconColor = isActive ? 'text-blue-400' : (isVolume ? 'text-slate-400' : 'text-amber-500');

  return (
    <div>
      <div 
        className={`flex items-center py-1.5 px-2 cursor-pointer transition-colors rounded-lg mb-0.5 mx-2 ${
           isActive ? 'bg-blue-600/10 text-blue-100' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleSelect}
      >
        <button 
           onClick={handleToggle}
           className="p-1 hover:bg-slate-700/50 rounded mr-1 flex-shrink-0"
        >
           {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        
        <Icon size={18} className={`mr-2 flex-shrink-0 ${iconColor}`} strokeWidth={2} />
        
        <span className={`text-sm truncate ${isActive ? 'font-medium' : ''}`}>
          {node.name}
        </span>
      </div>

      {isOpen && (
        <div className="animate-in slide-in-from-top-1 duration-200">
          {loading ? (
             <div className="pl-8 py-1 text-xs text-slate-600 italic" style={{ paddingLeft: `${(level + 1) * 12 + 20}px` }}>Loading...</div>
          ) : children.length === 0 ? (
             <div className="pl-8 py-1 text-xs text-slate-600 italic" style={{ paddingLeft: `${(level + 1) * 12 + 20}px` }}>Empty</div>
          ) : (
            children.map(child => (
              <FolderTreeNode 
                key={child.id}
                node={child}
                onNavigate={onNavigate}
                activePathIds={activePathIds}
                level={level + 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FolderTree;