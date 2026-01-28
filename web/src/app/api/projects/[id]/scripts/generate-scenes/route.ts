import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { AIModelType } from "@/generated/prisma/enums";
import { createAIClient } from "@/lib/ai/client";

interface SceneContent {
  dialogue?: string;
  action?: string;
  camera?: string;
  characterIds?: string[];
}

interface GeneratedScene {
  title: string;
  duration: number;
  content: SceneContent;
}

// POST /api/projects/[id]/scripts/generate-scenes - AI 生成场景
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
    const { characterIds, tone, synopsis, sceneCount } = body;

    // 验证参数
    if (!characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
      return NextResponse.json(
        { error: "请至少选择一个角色" },
        { status: 400 }
      );
    }

    if (!synopsis || synopsis.trim().length === 0) {
      return NextResponse.json(
        { error: "请先生成或输入脚本大概" },
        { status: 400 }
      );
    }

    if (!sceneCount || sceneCount < 1 || sceneCount > 20) {
      return NextResponse.json(
        { error: "场景数量必须在 1-20 之间" },
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
      .map((char) => `- ${char.name} (ID: ${char.id}): ${char.description}`)
      .join("\n");

    // 构建提示词
    const systemPrompt = `你是一个专业的短视频剧本创作专家。请根据剧本大概，生成${sceneCount}个场景。

要求：
- 返回一个 JSON 数组，包含${sceneCount}个场景对象
- 每个场景对象包含：title（场景标题，5-15字）、duration（预计时长，单位秒，5-30秒）、content（场景内容对象）
- content 对象包含：dialogue（台词）、action（动作描述）、camera（镜头描述）、characterIds（出场角色ID数组）
- 场景要连贯，符合剧本大概的故事线
- 台词要口语化，适合短视频
${tone ? `- 基调风格：${tone}` : ""}
- 只输出 JSON 数组，不要其他说明

示例输出格式：
[
  {
    "title": "开场引入",
    "duration": 10,
    "content": {
      "dialogue": "大家好，今天跟大家分享...",
      "action": "主角面对镜头，微笑打招呼",
      "camera": "正面中景，温暖光线",
      "characterIds": ["角色ID"]
    }
  }
]`;

    const prompt = `剧本大概：
${synopsis}

角色列表：
${characterDescriptions}

请生成${sceneCount}个场景：`;

    // 调用 AI 生成
    const client = createAIClient(config);
    const response = await client.generateText(prompt, systemPrompt, {
      temperature: 0.7,
    });

    // 解析 JSON 响应
    let scenes: GeneratedScene[] = [];
    try {
      // 尝试从响应中提取 JSON 数组
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        scenes = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("无法从响应中提取 JSON 数组");
      }
    } catch (error) {
      console.error("解析场景 JSON 失败:", error);
      console.error("AI 响应:", response);
      return NextResponse.json(
        { error: "生成场景失败：AI 返回格式错误" },
        { status: 500 }
      );
    }

    // 验证和清理场景数据
    const validScenes = scenes
      .filter((scene) => scene.title && scene.duration && scene.content)
      .slice(0, sceneCount)
      .map((scene) => ({
        title: scene.title,
        duration: Math.max(5, Math.min(60, scene.duration)), // 限制时长在 5-60 秒
        content: {
          dialogue: scene.content.dialogue || "",
          action: scene.content.action || "",
          camera: scene.content.camera || "",
          characterIds: Array.isArray(scene.content.characterIds)
            ? scene.content.characterIds.filter((id) =>
                characterIds.includes(id)
              )
            : characterIds,
        },
      }));

    if (validScenes.length === 0) {
      return NextResponse.json(
        { error: "生成场景失败：未生成有效场景" },
        { status: 500 }
      );
    }

    return NextResponse.json({ scenes: validScenes });
  } catch (error) {
    console.error("生成场景失败:", error);
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
