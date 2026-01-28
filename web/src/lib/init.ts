/**
 * 应用初始化
 *
 * 在应用启动时执行的初始化逻辑
 */

import { startVideoPollingService } from "@/lib/services/video-polling-service";

let initialized = false;

/**
 * 初始化应用
 */
export async function initializeApp() {
  if (initialized) {
    console.log("[App] Already initialized, skipping");
    return;
  }

  console.log("[App] Initializing application...");

  try {
    // 启动视频轮询服务
    await startVideoPollingService();

    initialized = true;
    console.log("[App] Application initialized successfully");
  } catch (error) {
    console.error("[App] Error initializing application:", error);
    throw error;
  }
}

/**
 * 检查应用是否已初始化
 */
export function isInitialized(): boolean {
  return initialized;
}
