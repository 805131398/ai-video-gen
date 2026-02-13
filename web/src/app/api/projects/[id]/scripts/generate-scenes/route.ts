import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { withUsageLogging } from "@/lib/services/ai-usage-service";
import { AIModelType } from "@/generated/prisma/enums";
import { createAIClient } from "@/lib/ai/client";
import { transformAISceneToComplete } from "@/lib/utils/scene-transformer";

// Token 估算辅助函数
function estimateTokenCount(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

/**
 * 验证场景内容是否为完整结构
 */
function isCompleteSceneContent(content: any): boolean {
  return (
    content &&
    typeof content.description === 'string' &&
    typeof content.characterId === 'string' &&
    content.actions &&
    typeof content.actions.entrance === 'string' &&
    typeof content.actions.main === 'string' &&
    typeof content.actions.exit === 'string' &&
    Array.isArray(content.dialogues) &&
    content.camera &&
    typeof content.camera.type === 'string' &&
    typeof content.camera.movement === 'string' &&
    typeof content.camera.shotSize === 'string' &&
    content.visual &&
    typeof content.visual.lighting === 'string' &&
    typeof content.visual.mood === 'string' &&
    content.audio &&
    typeof content.audio.volume === 'number'
  );
}

interface SceneContent {
  description: string;
  characterId: string; // 主要角色ID
  otherCharacters?: Array<{
    characterId: string;
    role: string; // 在场景中的角色描述
  }>;
  actions: {
    entrance: string; // 入场动作
    main: string;     // 主要动作
    exit: string;     // 出场动作
  };
  dialogues: Array<{
    text: string;
    speaker: string;
  }>;
  camera: {
    type: 'fixed' | 'follow' | 'orbit' | 'handheld';
    movement: 'push' | 'pull' | 'pan' | 'tilt' | 'dolly';
    shotSize: 'closeup' | 'close' | 'medium' | 'full' | 'wide';
    description: string;
  };
  visual: {
    lighting: 'daylight' | 'night' | 'indoor' | 'golden' | 'overcast';
    mood: 'warm' | 'cool' | 'vintage' | 'vibrant' | 'muted';
    effects: string;
    description: string;
  };
  audio: {
    bgMusic: string;
    soundEffects: string; // 字符串，不是数组
    volume: number; // 0-100
  };
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
- 每个场景对象包含：title（场景标题，5-15字）、duration（预计时长，单位秒，5-60秒）、content（场景内容对象）
- content 对象必须包含以下完整结构：
  {
    "description": "场景描述（20-50字，必须具体描述场景环境、氛围、角色位置和画面主要元素，要有画面感）",
    "characterId": "主要角色ID（从角色列表中选择一个，执行主要动作的角色）",
    "otherCharacters": [
      {
        "characterId": "其他角色ID（可选，场景中出现的其他角色）",
        "role": "角色描述（如：接受治疗的患者、旁观的家人、互动的朋友等）"
      }
    ],
    "actions": {
      "entrance": "入场动作描述（可以描述多个角色的入场，如：中医从药房走出，父亲已坐在椅子上等待）",
      "main": "主要动作描述（可以描述多个角色的互动，如：将茶杯稳稳放在父亲面前，眼神温柔地注视着他，微微点头示意）",
      "exit": "出场动作描述（可以描述多个角色的出场，如：中医转身回到药房，父亲起身离开）"
    },
    "dialogues": [
      {
        "text": "台词内容（15-30字，口语化）",
        "speaker": "说话人（角色名称）"
      }
    ],
    "camera": {
      "type": "镜头类型（fixed固定/follow跟随/orbit环绕/handheld手持）",
      "movement": "运镜方式（push推镜/pull拉镜/pan摇镜/tilt俯仰/dolly移动）",
      "shotSize": "景别（closeup特写/close近景/medium中景/full全景/wide远景）",
      "description": "自定义镜头描述"
    },
    "visual": {
      "lighting": "光线条件（daylight日光/night夜晚/indoor室内/golden黄金时刻/overcast阴天）",
      "mood": "色调氛围（warm温暖/cool冷色/vintage复古/vibrant鲜艳/muted柔和）",
      "effects": "视觉效果描述（字符串，如：柔光、滤镜等）",
      "description": "自定义视觉描述"
    },
    "audio": {
      "bgMusic": "背景音乐类型（如：轻松舒缓、活力动感、戏剧紧张、浪漫温馨、史诗宏大等）",
      "soundEffects": "音效描述（字符串，如：脚步声、门铃声、风声等，多个用逗号分隔）",
      "volume": 70
    }
  }

场景创作要点：
- 场景要连贯，符合剧本大概的故事线
- **场景描述（description）必须具体生动**：
  * 描述场景的环境（如：明亮的办公室、药香四溢的小院、温馨的客厅）
  * 描述场景的氛围（如：温暖、紧张、轻松、神秘）
  * 描述角色的位置和状态（如：站在办公桌前、坐在沙发上、走在街道上）
  * 描述画面的主要元素（如：阳光洒满、灯光柔和、人来人往）
  * 要让人能够想象出具体的画面
- **多角色场景处理**：
  * characterId 是主要角色（执行主要动作的角色）
  * 如果场景中有其他角色出现，使用 otherCharacters 数组添加
  * otherCharacters 中的 role 要描述该角色在场景中的作用（如：接受治疗的患者、旁观的家人）
  * 动作描述（entrance/main/exit）可以自然地描述多个角色的互动
  * 例如："将茶杯稳稳放在父亲面前，眼神温柔地注视着他" - 这样的描述包含了两个角色的互动
- 台词要口语化，适合短视频，每句控制在 15-30 字
- 动作描述要具体生动，可以包含多个角色的互动
- 根据场景内容合理选择镜头类型、运镜方式和景别
- 为每个场景选择合适的光线条件和色调氛围
- 为每个场景选择合适的背景音乐和音效
- 音量默认设置为 70
${tone ? `- 基调风格：${tone}` : ""}
- 只输出 JSON 数组，不要其他说明

示例输出格式：
[
  {
    "title": "温情诊疗",
    "duration": 15,
    "content": {
      "description": "温馨的诊室里，老中医站在父亲身旁，灯光柔和，桌上摆放着茶具和药材，氛围宁静祥和",
      "characterId": "中医ID",
      "otherCharacters": [
        {
          "characterId": "父亲ID",
          "role": "接受治疗的患者"
        }
      ],
      "actions": {
        "entrance": "中医从药房走出，父亲已坐在椅子上等待",
        "main": "将茶杯稳稳放在父亲面前，眼神温柔地注视着他，微微点头示意",
        "exit": "中医转身回到药房，父亲起身离开"
      },
      "dialogues": [
        {
          "text": "这茶能帮你缓解疼痛，慢慢喝，别着急",
          "speaker": "老中医"
        },
        {
          "text": "谢谢您，这些天好多了",
          "speaker": "父亲"
        }
      ],
      "camera": {
        "type": "fixed",
        "movement": "push",
        "shotSize": "medium",
        "description": "从中景推进到近景，捕捉两人的互动"
      },
      "visual": {
        "lighting": "indoor",
        "mood": "warm",
        "effects": "柔光",
        "description": "温暖的室内光线"
      },
      "audio": {
        "bgMusic": "轻松舒缓",
        "soundEffects": "茶水声",
        "volume": 70
      }
    }
  }
]`;

    const prompt = `剧本大概：
${synopsis || "无（请补充剧本核心故事线）"}

角色列表：
${characterDescriptions || "无（请补充角色ID、名称、设定）"}

请严格按照要求生成${sceneCount || 3}个场景，仅输出JSON数组：`;

    // 调用 AI 生成（带日志记录）
    const response = await withUsageLogging(
      {
        tenantId: user.tenantId,
        userId: user.id,
        projectId: id,
        modelType: "TEXT",
        modelConfigId: config.id,
        taskId: `scenes-${Date.now()}`,
      },
      async () => {
        const client = createAIClient(config);
        const result = await client.generateText(prompt, systemPrompt, {
          temperature: 0.7,
        });

        return {
          result,
          inputTokens: estimateTokenCount(prompt + systemPrompt),
          outputTokens: estimateTokenCount(result),
          requestUrl: config.apiUrl,
          requestBody: { prompt, systemPrompt, synopsis, sceneCount },
          responseBody: { scenes: result },
        };
      }
    );

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

    // 验证和清理场景数据，支持降级转换
    const validScenes = scenes
      .filter((scene) => scene.title && scene.duration && scene.content)
      .slice(0, sceneCount)
      .map((scene) => {
        let content = scene.content;

        // 如果 AI 返回的不是完整结构，使用转换层降级处理
        if (!isCompleteSceneContent(content)) {
          console.warn('AI 返回简化格式，使用转换层处理:', scene.title);
          content = transformAISceneToComplete(
            content as any,
            characters.map((c) => ({ id: c.id, name: c.name }))
          );
        }

        return {
          title: scene.title,
          duration: Math.max(5, Math.min(60, scene.duration)), // 限制时长在 5-60 秒
          content,
        };
      });

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
