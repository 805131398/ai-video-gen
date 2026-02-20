
import React, { useEffect, useState } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';

const TitleBar = () => {
    const [isMaximized, setIsMaximized] = useState(false);
    const [isMac, setIsMac] = useState(false);

    useEffect(() => {
        setIsMac(window.navigator.platform.toUpperCase().indexOf('MAC') >= 0);

        const handleResize = () => {
            // This is a rough estimation. Ideally we'd listen to an IPC event.
            // But for now, just toggling state on click is enough for visual feedback,
            // or we could check window.outerWidth vs screen.availWidth if we had access.
            // For simplicity in this step, we just toggle the icon.
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleMinimize = () => {
        window.electron.app.minimize();
    };

    const handleMaximize = () => {
        window.electron.app.maximize();
        setIsMaximized(!isMaximized);
    };

    const handleClose = () => {
        window.electron.app.close();
    };

    return (
        <div
            className={`h-10 bg-white border-b border-gray-200 flex items-center justify-between select-none shrink-0 transition-colors duration-200
        ${isMac ? 'pl-20' : 'pl-4'}
      `}
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                {/* Can verify app icon later */}
                <span>AI Video Generator</span>
            </div>

            {!isMac && (
                <div
                    className="flex h-full"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                    <button
                        onClick={handleMinimize}
                        className="px-4 h-full flex items-center justify-center transition-colors hover:bg-gray-100/80 active:bg-gray-200/80"
                        title="Minimize"
                    >
                        <Minus size={18} strokeWidth={1.5} className="text-gray-600" />
                    </button>
                    <button
                        onClick={handleMaximize}
                        className="px-4 h-full flex items-center justify-center transition-colors hover:bg-gray-100/80 active:bg-gray-200/80"
                        title={isMaximized ? "Restore" : "Maximize"}
                    >
                        {isMaximized ? (
                            <Copy size={16} strokeWidth={1.5} className="text-gray-600 rotate-180" />
                        ) : (
                            <Square size={16} strokeWidth={1.5} className="text-gray-600" />
                        )}
                    </button>
                    <button
                        onClick={handleClose}
                        className="px-4 h-full flex items-center justify-center transition-colors hover:bg-red-500 active:bg-red-600 group"
                        title="Close"
                    >
                        <X size={18} strokeWidth={1.5} className="text-gray-600 group-hover:text-white" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default TitleBar;
