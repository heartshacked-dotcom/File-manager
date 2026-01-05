
import React, { useState, useEffect, useRef } from 'react';
import { FileNode } from '../types';
import { fileSystem } from '../services/filesystem';

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && file.type === 'image' && !src) {
      fileSystem.getThumbnailUrl(file.id).then(url => {
        if (url) setSrc(url);
        else setHasError(true);
      }).catch(() => setHasError(true));
    }
  }, [isVisible, file, src]);

  // Reset if file changes (recycling)
  useEffect(() => {
     if(file.type === 'image') {
        setSrc(null);
        setHasError(false);
     }
  }, [file.id]);

  // Only render thumbnail if it's an image and no error
  if (file.type !== 'image' || hasError) {
    return <>{fallbackIcon}</>;
  }

  return (
    <div ref={containerRef} className={`w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
      {isVisible && src ? (
        <img 
          src={src} 
          alt={file.name}
          className="w-full h-full object-cover animate-in fade-in duration-300"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      ) : (
        isVisible ? <div className="animate-pulse bg-slate-200 dark:bg-slate-700 w-full h-full" /> : null
      )}
    </div>
  );
};

export default FileThumbnail;
