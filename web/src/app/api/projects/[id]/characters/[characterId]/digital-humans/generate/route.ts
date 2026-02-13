import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { generateSingleImage } from "@/lib/ai/image-generator";
import { logAIUsage } from "@/lib/services/ai-usage-service";
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { AIModelType } from "@prisma/client";
import { randomUUID } from "crypto";

// 存储正在进行的任务（内存中，用于取消功能）
const runningTasks = new Map<string, { cancelled: boolean }>();

type RouteContext = {
  params: Promise<{ id: string; characterId: string }>;
};

// POST /api/projects/[id]/characters/[characterId]/digital-humans/generate - 生成数字人（异步）
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId, characterId } = await context.params;

    // 验证项目所有权
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "项目不存在或无权访问" },
        { status: 404 }
      );
    }

    // 获取角色信息
    const character = await prisma.projectCharacter.findFirst({
      where: {
        id: characterId,
        projectId,
      },
    });

    if (!character) {
      return NextResponse.json(
        { error: "角色不存在" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { count = 1, size = "1024x1792" } = body;

    if (count < 1 || count > 10) {
      return NextResponse.json(
        { error: "生成数量必须在 1-10 之间" },
        { status: 400 }
      );
    }

    console.log("[digital-humans/generate] 开始生成数字人", {
      projectId,
      characterId,
      characterName: character.name,
      count,
      size,
      userId: user.id,
    });

    // 构建提示词
    const prompt = buildDigitalHumanPrompt(
      character.name,
      character.description,
      character.avatarUrl,
      size
    );

    // 创建批次ID
    const batchId = randomUUID();

    // 注册任务
    runningTasks.set(batchId, { cancelled: false });

    // 异步生成数字人（不等待）
    generateDigitalHumansAsync(
      projectId,
      characterId,
      prompt,
      count,
      user.id,
      user.tenantId,
      batchId,
      size
    );

    // 立即返回，告诉前端正在生成中
    return NextResponse.json({
      success: true,
      status: "generating",
      batchId,
      message: "数字人正在生成中，请稍后查询",
    });
  } catch (error) {
    console.error("生成数字人失败:", error);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/characters/[characterId]/digital-humans/generate - 取消生成任务
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const url = new URL(request.url);
    const batchId = url.searchParams.get("batchId");

    if (batchId && runningTasks.has(batchId)) {
      // 标记任务为已取消
      runningTasks.get(batchId)!.cancelled = true;
      console.log("[digital-humans/generate] 任务已取消:", batchId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("取消任务失败:", error);
    return NextResponse.json({ error: "取消失败" }, { status: 500 });
  }
}

/**
 * 异步生成数字人并保存到数据库（并发生成，实时保存）
 */
async function generateDigitalHumansAsync(
  projectId: string,
  characterId: string,
  prompt: string,
  count: number,
  userId: string,
  tenantId: string | undefined,
  batchId: string,
  size: string = "1024x1792"
) {
  let generatedCount = 0;
  const overallStartTime = Date.now();

  try {
    // 获取 AI 配置（用于日志记录）
    const config = await getEffectiveAIConfig(AIModelType.IMAGE, userId, tenantId);

    // 检查任务是否已取消
    const task = runningTasks.get(batchId);
    if (task?.cancelled) {
      console.log("[digital-humans/generate] 任务已取消，跳过生成:", batchId);
      runningTasks.delete(batchId);
      return;
    }

    console.log(`[digital-humans/generate] 开始并发生成 ${count} 张数字人图片，尺寸: ${size}...`);

    // 并发生成图片
    const generatePromises = Array.from({ length: count }, async (_, i) => {
      // 检查是否取消
      if (runningTasks.get(batchId)?.cancelled) {
        console.log(`[digital-humans/generate] 任务已取消，跳过第 ${i + 1} 张`);
        return null;
      }

      console.log(`[digital-humans/generate] 开始生成第 ${i + 1}/${count} 张数字人...`);
      const imageStartTime = Date.now();

      try {
        const image = await generateSingleImage(
          {
            prompt,
            negativePrompt: "low quality, blurry, distorted, deformed, ugly, bad anatomy",
            size: size as "1024x1024" | "1024x1792" | "1792x1024",
          },
          userId,
          tenantId
        );

        if (image) {
          // 立即保存到数据库
          const digitalHuman = await prisma.digitalHuman.create({
            data: {
              characterId,
              imageUrl: image.imageUrl,
              prompt,
              isSelected: false,
            },
          });

          const imageElapsed = Date.now() - imageStartTime;
          console.log(
            `[digital-humans/generate] 第 ${i + 1}/${count} 张数字人已保存，耗时: ${imageElapsed}ms`
          );

          // 记录成功日志
          if (config) {
            await logAIUsage({
              tenantId: tenantId || null,
              userId,
              projectId,
              modelType: "IMAGE",
              modelConfigId: config.id,
              inputTokens: prompt.length,
              outputTokens: 1,
              cost: 0.02,
              latencyMs: imageElapsed,
              status: "SUCCESS",
              taskId: `digital-human-${batchId}-${i}`,
              requestUrl: config.apiUrl,
              requestBody: { prompt, characterId, size },
              responseBody: { imageUrl: image.imageUrl, digitalHumanId: digitalHuman.id },
            });
          }

          return digitalHuman;
        }
      } catch (error) {
        console.error(`[digital-humans/generate] 第 ${i + 1}/${count} 张生成失败:`, error);

        // 记录失败日志
        if (config) {
          await logAIUsage({
            tenantId: tenantId || null,
            userId,
            projectId,
            modelType: "IMAGE",
            modelConfigId: config.id,
            inputTokens: prompt.length,
            outputTokens: 0,
            cost: 0,
            latencyMs: Date.now() - imageStartTime,
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            taskId: `digital-human-${batchId}-${i}`,
            requestUrl: config.apiUrl,
            requestBody: { prompt, characterId, size },
          });
        }

        return null;
      }
      return null;
    });

    // 等待所有任务完成
    const results = await Promise.all(generatePromises);
    generatedCount = results.filter((r) => r !== null).length;

    const overallElapsed = Date.now() - overallStartTime;
    console.log(
      `[digital-humans/generate] 批次完成，共生成 ${generatedCount}/${count} 张数字人，总耗时: ${overallElapsed}ms`
    );

    // 清理任务记录
    runningTasks.delete(batchId);
  } catch (error) {
    console.error("[digital-humans/generate] 异步生成数字人失败:", error);
    // 清理任务记录
    runningTasks.delete(batchId);
  }
}

// 构建数字人生成提示词
function buildDigitalHumanPrompt(
  name: string,
  description: string,
  referenceImageUrl?: string | null,
  size?: string
): string {
  let prompt = `professional portrait of ${name}, ${description}, `;
  prompt += "high quality, detailed, 4k, studio lighting, ";
  prompt += "professional photography, realistic, ";
  prompt += "front facing, neutral expression, ";
  prompt += "clean background";

  // 根据尺寸添加方向提示
  if (size) {
    if (size === "1792x1024") {
      prompt += ", landscape orientation, wide format, 16:9 aspect ratio";
    } else if (size === "1024x1792") {
      prompt += ", portrait orientation, vertical format, 9:16 aspect ratio";
    }
  }

  return prompt;
}
