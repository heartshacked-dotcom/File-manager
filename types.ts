
export type FileType = 'folder' | 'image' | 'video' | 'audio' | 'document' | 'archive' | 'unknown';

export interface FileNode {
  id: string;
  parentId: string | null;
  name: string;
  type: FileType;
  size: number; // in bytes
  updatedAt: number; // timestamp
  capacity?: number; // Total storage capacity (for drives)
  isProtected?: boolean;
  isTrash?: boolean;
  isHidden?: boolean;
  isEncrypted?: boolean;
  originalPath?: string; // For restored files
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export enum ViewMode {
  GRID = 'GRID',
  LIST = 'LIST',
}

export enum SortField {
  NAME = 'NAME',
  DATE = 'DATE',
  SIZE = 'SIZE',
  TYPE = 'TYPE',
}

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export type DateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';

export type SizeFilter = 'ALL' | 'SMALL' | 'MEDIUM' | 'LARGE';

export interface ClipboardState {
  mode: 'copy' | 'cut';
  sourceIds: string[];
  sourceParentId: string | null;
}

export type ModalType = 'RENAME' | 'CREATE_FOLDER' | 'PROPERTIES' | 'DELETE_CONFIRM' | 'COMPRESS' | 'AUTH' | 'SETTINGS' | 'ENCRYPT' | 'DECRYPT' | null;

export interface ModalState {
  type: ModalType;
  targetId?: string; // For single item operations
}

export type Theme = 'dark' | 'light';
