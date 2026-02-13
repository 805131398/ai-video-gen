/**
 * 视频生成轮询服务
 *
 * 负责管理视频生成任务的后台轮询，支持：
 * - 服务启动时恢复未完成的任务
 * - 定期检查"卡住"的任务
 * - 防止重复轮询同一个任务
 */

import { prisma } from "@/lib/prisma";
import { createVideoClient } from "@/lib/ai/video-client";
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { logAIUsage } from "@/lib/services/ai-usage-service";

// 正在轮询的任务集合（防止重复轮询）
const activePollingTasks = new Set<string>();

// 定时检查任务的定时器
let checkStuckTasksInterval: NodeJS.Timeout | null = null;

/**
 * 启动视频轮询服务
 * 在应用启动时调用
 */
export async function startVideoPollingService() {
  console.log("[VideoPollingService] Starting video polling service...");

  // 1. 恢复未完成的任务
  await recoverUnfinishedTasks();

  // 2. 启动定时检查（每 2 分钟检查一次）
  if (!checkStuckTasksInterval) {
    checkStuckTasksInterval = setInterval(async () => {
      await checkStuckTasks();
    }, 120000); // 2 分钟
  }

  console.log("[VideoPollingService] Video polling service started");
}

/**
 * 停止视频轮询服务
 * 在应用关闭时调用
 */
export function stopVideoPollingService() {
  if (checkStuckTasksInterval) {
    clearInterval(checkStuckTasksInterval);
    checkStuckTasksInterval = null;
  }
  console.log("[VideoPollingService] Video polling service stopped");
}

/**
 * 恢复未完成的任务
 * 查询所有 status = "pending" 或 "generating" 的任务，重新启动轮询
 */
async function recoverUnfinishedTasks() {
  try {
    const unfinishedVideos = await prisma.sceneVideo.findMany({
      where: {
        status: {
          in: ["pending", "generating"],
        },
        taskId: {
          not: null,
        },
      },
      include: {
        scene: {
          include: {
            script: {
              include: {
                project: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log(
      `[VideoPollingService] Found ${unfinishedVideos.length} unfinished tasks to recover`
    );

    for (const video of unfinishedVideos) {
      if (!video.taskId) continue;

      // 检查是否已经在轮询中
      if (activePollingTasks.has(video.id)) {
        console.log(
          `[VideoPollingService] Task ${video.id} is already being polled, skipping`
        );
        continue;
      }

      // 获取视频配置
      const userId = video.scene.script.project.userId;
      const tenantId = video.scene.script.project.user.tenantId;

      try {
        const videoConfig = await getEffectiveAIConfig(
          "VIDEO",
          userId,
          tenantId
        );
        if (!videoConfig) {
          console.error(
            `[VideoPollingService] No video config found for task ${video.id}`
          );
          continue;
        }

        // 创建视频客户端
        const videoClient = createVideoClient({
          apiUrl: videoConfig.apiUrl,
          apiKey: videoConfig.apiKey,
          modelName: videoConfig.modelName,
          config: videoConfig.config as any,
        });

        // 启动轮询
        console.log(
          `[VideoPollingService] Recovering polling for task ${video.id} (taskId: ${video.taskId})`
        );
        pollVideoStatus(video.id, video.taskId, videoClient).catch((error) => {
          console.error(
            `[VideoPollingService] Error polling recovered task ${video.id}:`,
            error
          );
        });
      } catch (error) {
        console.error(
          `[VideoPollingService] Error recovering task ${video.id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error(
      "[VideoPollingService] Error recovering unfinished tasks:",
      error
    );
  }
}

/**
 * 检查"卡住"的任务
 * 查询所有 status = "generating" 且 updatedAt 超过 3 分钟的任务
 */
async function checkStuckTasks() {
  try {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    const stuckVideos = await prisma.sceneVideo.findMany({
      where: {
        status: "generating",
        taskId: {
          not: null,
        },
        updatedAt: {
          lt: threeMinutesAgo,
        },
      },
      include: {
        scene: {
          include: {
            script: {
              include: {
                project: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (stuckVideos.length > 0) {
      console.log(
        `[VideoPollingService] Found ${stuckVideos.length} stuck tasks`
      );

      for (const video of stuckVideos) {
        if (!video.taskId) continue;

        // 检查是否已经在轮询中
        if (activePollingTasks.has(video.id)) {
          continue;
        }

        // 获取视频配置
        const userId = video.scene.script.project.userId;
        const tenantId = video.scene.script.project.user.tenantId;

        try {
          const videoConfig = await getEffectiveAIConfig(
            "VIDEO",
            userId,
            tenantId
          );
          if (!videoConfig) {
            console.error(
              `[VideoPollingService] No video config found for stuck task ${video.id}`
            );
            continue;
          }

          // 创建视频客户端
          const videoClient = createVideoClient({
            apiUrl: videoConfig.apiUrl,
            apiKey: videoConfig.apiKey,
            modelName: videoConfig.modelName,
            config: videoConfig.config as any,
          });

          // 重新启动轮询
          console.log(
            `[VideoPollingService] Restarting polling for stuck task ${video.id} (taskId: ${video.taskId})`
          );
          pollVideoStatus(video.id, video.taskId, videoClient).catch(
            (error) => {
              console.error(
                `[VideoPollingService] Error polling stuck task ${video.id}:`,
                error
              );
            }
          );
        } catch (error) {
          console.error(
            `[VideoPollingService] Error restarting stuck task ${video.id}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    console.error("[VideoPollingService] Error checking stuck tasks:", error);
  }
}

/**
 * 启动单个任务的轮询
 *
 * @param videoId - SceneVideo 记录 ID
 * @param taskId - AI 服务返回的任务 ID
 * @param videoClient - 视频客户端实例
 */
export async function pollVideoStatus(
  videoId: string,
  taskId: string,
  videoClient: any
) {
  // 防止重复轮询
  if (activePollingTasks.has(videoId)) {
    console.log(
      `[VideoPollingService] Task ${videoId} is already being polled`
    );
    return;
  }

  activePollingTasks.add(videoId);
  console.log(
    `[VideoPollingService] Started polling for task ${videoId} (taskId: ${taskId})`
  );

  // 获取视频记录信息（用于日志记录）
  const videoRecord = await prisma.sceneVideo.findUnique({
    where: { id: videoId },
    include: {
      scene: {
        include: {
          script: {
            include: {
              project: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!videoRecord) {
    console.error(`[VideoPollingService] Video record ${videoId} not found`);
    activePollingTasks.delete(videoId);
    return;
  }

  const userId = videoRecord.scene.script.project.userId;
  const tenantId = videoRecord.scene.script.project.user.tenantId;
  const projectId = videoRecord.scene.script.projectId;
  const videoStartTime = videoRecord.createdAt.getTime();

  // 获取 AI 配置
  const config = await getEffectiveAIConfig("VIDEO" as any, userId, tenantId);

  const maxAttempts = 120; // 最多轮询 120 次（10 分钟，每 5 秒一次）
  let attempts = 0;

  try {
    while (attempts < maxAttempts) {
      try {
        // 等待 5 秒
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;

        // 查询状态
        const status = await videoClient.getStatus(taskId);

        // 更新进度（无论什么状态都更新）
        await prisma.sceneVideo.update({
          where: { id: videoId },
          data: {
            progress: status.progress || 0,
          },
        });

        if (status.status === "completed") {
          // 生成成功，先读取原始 metadata 再合并
          const existingVideo = await prisma.sceneVideo.findUnique({
            where: { id: videoId },
            select: { metadata: true },
          });
          const originalMetadata = (existingVideo?.metadata as Record<string, unknown>) || {};
          const aiMetadata = status.metadata || {};

          await prisma.sceneVideo.update({
            where: { id: videoId },
            data: {
              status: "completed",
              progress: 100,
              videoUrl: status.videoUrl,
              thumbnailUrl: status.thumbnailUrl,
              duration: status.duration,
              metadata: {
                ...originalMetadata,
                ...aiMetadata,
              },
            },
          });

          console.log(
            `[VideoPollingService] Video generated successfully for task ${videoId}`
          );

          // 记录成功日志
          if (config) {
            const duration = status.duration || 10;
            await logAIUsage({
              tenantId: tenantId || null,
              userId,
              projectId,
              modelType: "VIDEO",
              modelConfigId: config.id,
              inputTokens: videoRecord.prompt.length,
              outputTokens: duration, // 以秒数作为输出
              cost: duration <= 10 ? 0.05 : 0.075, // 10s=$0.05, 15s=$0.075
              latencyMs: Date.now() - videoStartTime,
              status: "SUCCESS",
              taskId: taskId,
              requestUrl: config.apiUrl,
              requestBody: { prompt: videoRecord.prompt, duration },
              responseBody: {
                videoUrl: status.videoUrl,
                duration: status.duration,
              },
            });
          }

          break;
        } else if (status.status === "failed") {
          // 生成失败
          await prisma.sceneVideo.update({
            where: { id: videoId },
            data: {
              status: "failed",
              progress: 0,
              errorMessage: status.message || "视频生成失败",
            },
          });

          console.error(
            `[VideoPollingService] Video generation failed for task ${videoId}`
          );

          // 记录失败日志
          if (config) {
            await logAIUsage({
              tenantId: tenantId || null,
              userId,
              projectId,
              modelType: "VIDEO",
              modelConfigId: config.id,
              inputTokens: videoRecord.prompt.length,
              outputTokens: 0,
              cost: 0,
              latencyMs: Date.now() - videoStartTime,
              status: "FAILED",
              errorMessage: status.message || "视频生成失败",
              taskId: taskId,
              requestUrl: config.apiUrl,
              requestBody: { prompt: videoRecord.prompt },
            });
          }

          break;
        }

        // 状态为 pending 或 processing，继续轮询
      } catch (error) {
        console.error(
          `[VideoPollingService] Polling error for task ${videoId}:`,
          error
        );

        // 如果是最后一次尝试，标记为失败
        if (attempts >= maxAttempts) {
          await prisma.sceneVideo.update({
            where: { id: videoId },
            data: {
              status: "failed",
              progress: 0,
              errorMessage: "视频生成超时",
            },
          });
        }
      }
    }

    // 超时
    if (attempts >= maxAttempts) {
      await prisma.sceneVideo.update({
        where: { id: videoId },
        data: {
          status: "failed",
          progress: 0,
          errorMessage: "视频生成超时（超过 10 分钟）",
        },
      });

      // 记录超时失败日志
      if (config) {
        await logAIUsage({
          tenantId: tenantId || null,
          userId,
          projectId,
          modelType: "VIDEO",
          modelConfigId: config.id,
          inputTokens: videoRecord.prompt.length,
          outputTokens: 0,
          cost: 0,
          latencyMs: Date.now() - videoStartTime,
          status: "FAILED",
          errorMessage: "视频生成超时（超过 10 分钟）",
          taskId: taskId,
          requestUrl: config.apiUrl,
          requestBody: { prompt: videoRecord.prompt },
        });
      }
    }
  } finally {
    // 移除活跃任务标记
    activePollingTasks.delete(videoId);
    console.log(
      `[VideoPollingService] Stopped polling for task ${videoId}`
    );
  }
}
