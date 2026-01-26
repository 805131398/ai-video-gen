"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  AlertCircle,
  RefreshCw,
  Settings,
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const errorMessageVariants = cva(
  "relative w-full rounded-lg border p-4 transition-all",
  {
    variants: {
      variant: {
        default:
          "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-900 dark:text-red-200",
        warning:
          "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-900 dark:text-amber-200",
        info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-900 dark:text-blue-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ErrorMessageProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof errorMessageVariants> {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  onSettings?: () => void;
  retryLabel?: string;
  showHelp?: boolean;
  helpLink?: string;
}

function ErrorMessage({
  className,
  variant,
  title,
  message,
  details,
  onRetry,
  onDismiss,
  onSettings,
  retryLabel = "重试",
  showHelp = false,
  helpLink,
  ...props
}: ErrorMessageProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  const iconMap = {
    default: AlertCircle,
    warning: AlertCircle,
    info: HelpCircle,
  };

  const Icon = iconMap[variant || "default"];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(errorMessageVariants({ variant }), className)}
      {...props}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          {title && (
            <h4 className="font-medium text-sm leading-tight pr-6">{title}</h4>
          )}

          {/* Message */}
          <p className="text-sm opacity-90 leading-relaxed">{message}</p>

          {/* Details (collapsible) */}
          {details && (
            <div className="mt-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
              >
                {showDetails ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                {showDetails ? "隐藏详情" : "查看详情"}
              </button>
              {showDetails && (
                <pre className="mt-2 p-2 text-xs bg-black/5 dark:bg-white/5 rounded overflow-x-auto whitespace-pre-wrap break-all">
                  {details}
                </pre>
              )}
            </div>
          )}

          {/* Actions */}
          {(onRetry || onSettings || showHelp) && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="h-8 bg-white dark:bg-transparent"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  {retryLabel}
                </Button>
              )}
              {onSettings && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSettings}
                  className="h-8"
                >
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  检查配置
                </Button>
              )}
              {showHelp && helpLink && (
                <a
                  href={helpLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs opacity-70 hover:opacity-100 transition-opacity"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  帮助文档
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { ErrorMessage, errorMessageVariants };
