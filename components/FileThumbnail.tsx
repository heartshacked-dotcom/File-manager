
import React, { useState, useEffect, useRef } from 'react';
import { FileNode } from '../types';
import Thumbnail from '../src/plugins/ThumbnailPlugin';

// Simple in-memory LRU-like cache to prevent re-generating thumbnails during scroll
const thumbnailCache = new Map<string, string>();

interface FileThumbnailProps {
  file: FileNode;
  className?: string;
  fallbackIcon: React.ReactNode;
}

const FileThumbnail: React.FC<FileThumbnailProps> = ({ file, className, fallbackIcon }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine specific type for the plugin
  const getThumbnailType = (file: FileNode): 'image' | 'video' | 'audio' | 'apk' | null => {
    if (file.name.endsWith('.apk')) return 'apk';
    if (file.type === 'image') return 'image';
    if (file.type === 'video') return 'video';
    if (file.type === 'audio') return 'audio';
    return null;
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Preload before it enters viewport
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const type = getThumbnailType(file);
    
    if (isVisible && type && !src && !hasError) {
      // 1. Check Cache
      if (thumbnailCache.has(file.id)) {
        setSrc(thumbnailCache.get(file.id)!);
        return;
      }

      // 2. Request Native Thumbnail
      Thumbnail.getThumbnail({ 
        path: file.id, 
        type: type,
        width: 128,
        height: 128
      })
      .then(result => {
        if (result.base64) {
          thumbnailCache.set(file.id, result.base64);
          setSrc(result.base64);
        } else {
          setHasError(true);
        }
      })
      .catch((e) => {
        // console.error("Thumbnail failed for", file.name, e);
        setHasError(true);
      });
    }
  }, [isVisible, file, src, hasError]);

  // Recycle logic
  useEffect(() => {
    setSrc(null);
    setHasError(false);
    
    // Immediate cache check on recycle to prevent flash
    if (thumbnailCache.has(file.id)) {
        setSrc(thumbnailCache.get(file.id)!);
        setIsVisible(true); // Assume visible if cached to render immediately
    } else {
        setIsVisible(false);
    }
  }, [file.id]);

  const targetType = getThumbnailType(file);

  // If not a supported media type, return icon immediately
  if (!targetType) {
    return <>{fallbackIcon}</>;
  }

  return (
    <div ref={containerRef} className={`w-full h-full flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800 ${className}`}>
      {src ? (
        <img 
          src={src} 
          alt={file.name}
          className={`w-full h-full object-cover animate-in fade-in duration-300 ${targetType === 'apk' ? 'p-2 object-contain' : ''}`}
          onError={() => setHasError(true)}
        />
      ) : (
        // Loading State or Fallback while loading
        <div className="relative w-full h-full flex items-center justify-center">
           {isVisible && !hasError ? (
             <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" /> 
           ) : null}
           <div className="opacity-50 scale-75 grayscale">{fallbackIcon}</div>
        </div>
      )}
    </div>
  );
};

export default FileThumbnail;
