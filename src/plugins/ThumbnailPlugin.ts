
import { registerPlugin } from '@capacitor/core';

export interface ThumbnailPlugin {
  getThumbnail(options: { 
    path: string; 
    type: 'image' | 'video' | 'audio' | 'apk'; 
    width?: number; 
    height?: number; 
  }): Promise<{ base64: string }>;
}

const Thumbnail = registerPlugin<ThumbnailPlugin>('Thumbnail');

export default Thumbnail;
