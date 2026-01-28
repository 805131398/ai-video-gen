import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { AIModelType } from "@/generated/prisma/enums";
import { createAIClient } from "@/lib/ai/client";

// POST /api/projects/[id]/scripts/generate-synopsis - AI 生成脚本大概
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { characterIds, tone } = body;

    // 验证参数
    if (!characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
      return NextResponse.json(
        { error: "请至少选择一个角色" },
        { status: 400 }
      );
    }

    // 验证项目归属
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 获取角色信息
    const characters = await prisma.projectCharacter.findMany({
      where: {
        id: { in: characterIds },
        projectId: id,
      },
    });

    if (characters.length === 0) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    // 获取 AI 配置
    const config = await getEffectiveAIConfig(
      AIModelType.TEXT,
      user.id,
      user.tenantId || undefined
    );

    if (!config) {
      return NextResponse.json(
        { error: "未找到可用的文本生成 AI 配置" },
        { status: 500 }
      );
    }

    // 构建角色描述
    const characterDescriptions = characters
      .map((char) => `- ${char.name}: ${char.description}`)
      .join("\n");

    // 构建提示词
    const systemPrompt = `你是一个专业的短视频剧本创作专家。请根据项目信息和角色设定，生成一个简洁的剧本大概。

要求：
- 剧本大概应该是 100-300 字的简短描述
- 描述剧本的核心故事线和主要情节
- 体现角色特点和关系
- 符合短视频的节奏和风格
${tone ? `- 基调风格：${tone}` : ""}
- 只输出剧本大概内容，不要其他说明`;

    const prompt = `项目主题：${project.topic}
${project.themeName ? `主题名称：${project.themeName}` : ""}
${project.themeDesc ? `主题描述：${project.themeDesc}` : ""}

角色设定：
${characterDescriptions}

请生成剧本大概：`;

    // 调用 AI 生成
    const client = createAIClient(config);
    const synopsis = await client.generateText(prompt, systemPrompt, {
      temperature: 0.7,
    });

    return NextResponse.json({ synopsis: synopsis.trim() });
  } catch (error) {
    console.error("生成脚本大概失败:", error);
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
