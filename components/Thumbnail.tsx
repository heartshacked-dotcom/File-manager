import React, { useState, useEffect, useRef } from 'react';
import { FileNode } from '../types';
import { fileSystem, ThumbnailResult } from '../services/filesystem';
import { Capacitor } from '@capacitor/core';
import { Play } from 'lucide-react';

interface ThumbnailProps {
  file: FileNode;
  FallbackIcon: React.ElementType;
  className?: string;
}

const Thumbnail: React.FC<ThumbnailProps> = ({ file, FallbackIcon, className }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Simple formatting for video duration (mm:ss)
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Preload when 100px away
    );

    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    if (Capacitor.getPlatform() !== 'android') return;

    let mounted = true;
    
    // Check if type supports thumbnail
    const isSupported = 
      file.type === 'image' || 
      file.type === 'video' || 
      file.type === 'audio' || 
      file.name.endsWith('.apk');

    if (isSupported) {
       fileSystem.getThumbnail(file)
         .then((res: ThumbnailResult) => {
           if (mounted) {
             setSrc(res.base64);
             if (res.duration) setDuration(formatDuration(res.duration));
             // Small delay to allow browser to paint image before fading in
             requestAnimationFrame(() => setLoaded(true));
           }
         })
         .catch(() => {
           // Silently fail to fallback
         });
    }

    return () => { mounted = false; };
  }, [isVisible, file]);

  if (!src) {
    return (
      <div ref={imgRef} className={`flex items-center justify-center ${className}`}>
         <FallbackIcon size={24} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img 
        src={src} 
        alt="" 
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`} 
      />
      {/* Video Duration Overlay */}
      {file.type === 'video' && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <div className="bg-black/50 rounded-full p-1">
               <Play size={12} fill="white" className="text-white ml-0.5" />
            </div>
            {duration && (
               <div className="absolute bottom-1 right-1 bg-black/60 px-1 py-0.5 rounded text-[8px] text-white font-medium">
                  {duration}
               </div>
            )}
         </div>
      )}
      {/* Android Badge for APKs */}
      {file.name.endsWith('.apk') && (
         <div className="absolute bottom-0 right-0 p-0.5 bg-black/40 rounded-tl-md">
            <span className="text-[8px] text-white font-bold px-1">APK</span>
         </div>
      )}
    </div>
  );
};

export default React.memo(Thumbnail);
