import { useState, useEffect } from 'react';
import { AlertCircle, ImageOff } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackMessage?: string;
}

export default function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackMessage = '图片缓存已失效，请联系管理员处理',
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSrc, setCurrentSrc] = useState(src);

  // 当 src 改变时，重置状态
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    setCurrentSrc(src);
  }, [src]);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    // 关键：将 src 设置为空，避免浏览器重试
    setCurrentSrc('');
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (hasError) {
    return (
      <div
        className={`bg-slate-50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-300 ${className}`}
      >
        <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
        <div className="text-center px-3">
          <p className="text-xs text-slate-600 font-medium mb-1">图片加载失败</p>
          <p className="text-xs text-slate-500">{fallbackMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div
          className={`bg-slate-100 rounded-lg flex items-center justify-center ${className}`}
        >
          <div className="animate-pulse">
            <ImageOff className="w-8 h-8 text-slate-400" />
          </div>
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'hidden' : ''}`}
        onError={handleError}
        onLoad={handleLoad}
      />
    </>
  );
}
