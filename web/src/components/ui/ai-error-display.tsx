"use client";

import * as React from "react";
import { ErrorMessage } from "./error-message";
import { useRouter } from "next/navigation";

export interface AIErrorDisplayProps {
  error: string | Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

interface ParsedError {
  title: string;
  message: string;
  details?: string;
  showSettings: boolean;
  variant: "default" | "warning" | "info";
}

function parseAIError(error: string | Error): ParsedError {
  const errorMessage = error instanceof Error ? error.message : error;

  // API URL 配置错误
  if (
    errorMessage.includes("HTML 而非 JSON") ||
    errorMessage.includes("API URL 配置")
  ) {
    return {
      title: "AI 服务配置错误",
      message:
        "AI 服务返回了无效的响应，这通常是因为 API 地址配置不正确。请检查 AI 模型配置中的 API URL 是否正确。",
      details: errorMessage,
      showSettings: true,
      variant: "default",
    };
  }

  // JSON 解析错误
  if (
    errorMessage.includes("无法解析为 JSON") ||
    errorMessage.includes("返回格式错误")
  ) {
    return {
      title: "AI 响应格式错误",
      message:
        "AI 服务返回的数据格式不正确。这可能是 API 配置问题或服务暂时不可用。",
      details: errorMessage,
      showSettings: true,
      variant: "default",
    };
  }

  // 未找到配置
  if (errorMessage.includes("未找到可用的") && errorMessage.includes("配置")) {
    return {
      title: "AI 配置缺失",
      message:
        "系统中没有配置可用的 AI 模型。请联系管理员在后台添加 AI 模型配置。",
      details: errorMessage,
      showSettings: true,
      variant: "warning",
    };
  }

  // API 认证错误
  if (
    errorMessage.includes("401") ||
    errorMessage.includes("Unauthorized") ||
    errorMessage.includes("API key")
  ) {
    return {
      title: "AI 服务认证失败",
      message: "API 密钥无效或已过期。请检查 AI 模型配置中的 API Key 是否正确。",
      details: errorMessage,
      showSettings: true,
      variant: "default",
    };
  }

  // API 配额/限流错误
  if (
    errorMessage.includes("429") ||
    errorMessage.includes("rate limit") ||
    errorMessage.includes("quota")
  ) {
    return {
      title: "AI 服务请求过于频繁",
      message: "当前请求过于频繁或已达到配额限制。请稍后再试。",
      details: errorMessage,
      showSettings: false,
      variant: "warning",
    };
  }

  // 网络错误
  if (
    errorMessage.includes("fetch") ||
    errorMessage.includes("network") ||
    errorMessage.includes("ECONNREFUSED") ||
    errorMessage.includes("ETIMEDOUT")
  ) {
    return {
      title: "网络连接失败",
      message: "无法连接到 AI 服务。请检查网络连接或稍后重试。",
      details: errorMessage,
      showSettings: false,
      variant: "default",
    };
  }

  // 服务器错误
  if (errorMessage.includes("500") || errorMessage.includes("Internal Server")) {
    return {
      title: "AI 服务暂时不可用",
      message: "AI 服务出现内部错误。请稍后重试，如果问题持续存在请联系管理员。",
      details: errorMessage,
      showSettings: false,
      variant: "default",
    };
  }

  // 默认错误
  return {
    title: "操作失败",
    message: errorMessage || "发生未知错误，请稍后重试。",
    details: undefined,
    showSettings: false,
    variant: "default",
  };
}

function AIErrorDisplay({
  error,
  onRetry,
  onDismiss,
  className,
}: AIErrorDisplayProps) {
  const router = useRouter();

  if (!error) return null;

  const parsed = parseAIError(error);

  const handleSettings = () => {
    router.push("/admin/ai-config");
  };

  return (
    <ErrorMessage
      className={className}
      variant={parsed.variant}
      title={parsed.title}
      message={parsed.message}
      details={parsed.details}
      onRetry={onRetry}
      onDismiss={onDismiss}
      onSettings={parsed.showSettings ? handleSettings : undefined}
    />
  );
}

export { AIErrorDisplay, parseAIError };
