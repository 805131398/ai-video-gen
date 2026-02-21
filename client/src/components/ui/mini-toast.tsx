import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  exiting?: boolean;
}

type ShowToastFn = (message: string, variant?: ToastVariant) => void;

const MiniToastContext = createContext<ShowToastFn>(() => {});

let globalShowToast: ShowToastFn = () => {};
let toastId = 0;

const VARIANT_CONFIG: Record<ToastVariant, {
  icon: typeof CheckCircle2;
  bg: string;
  text: string;
  iconColor: string;
}> = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-slate-800',
    text: 'text-white',
    iconColor: 'text-green-400',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-600',
    text: 'text-white',
    iconColor: 'text-red-200',
  },
  info: {
    icon: Info,
    bg: 'bg-slate-800',
    text: 'text-white',
    iconColor: 'text-blue-400',
  },
};

export function MiniToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast: ShowToastFn = useCallback((message, variant = 'success') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, variant }]);

    // 2.5 秒后开始退出动画
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      // 退出动画 300ms 后移除
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 2500);
  }, []);

  useEffect(() => {
    globalShowToast = showToast;
    return () => { globalShowToast = () => {}; };
  }, [showToast]);

  return (
    <MiniToastContext.Provider value={showToast}>
      {children}
      {createPortal(
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
          {toasts.map((t) => {
            const config = VARIANT_CONFIG[t.variant];
            const Icon = config.icon;
            return (
              <div
                key={t.id}
                className={`
                  pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg
                  ${config.bg} ${config.text}
                  ${t.exiting
                    ? 'animate-[miniToastOut_300ms_ease-in_forwards]'
                    : 'animate-[miniToastIn_300ms_ease-out_forwards]'
                  }
                `}
                style={{ minWidth: '160px', maxWidth: '360px' }}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${config.iconColor}`} />
                <span className="text-sm font-medium whitespace-nowrap">{t.message}</span>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </MiniToastContext.Provider>
  );
}

/** Hook 方式使用 */
export function useMiniToast() {
  return useContext(MiniToastContext);
}

/** 全局函数方式使用 */
export function showToast(message: string, variant: ToastVariant = 'success') {
  globalShowToast(message, variant);
}
