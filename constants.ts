
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
