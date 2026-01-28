/**
 * 场景内容数据转换工具
 * 将 AI 生成的简化场景数据转换为完整的场景编辑器数据结构
 */

// AI 生成的简化场景内容结构
export interface AIGeneratedSceneContent {
  dialogue?: string;
  action?: string;
  camera?: string;
  characterIds?: string[];
}

// 完整的场景内容结构（编辑器需要的格式）
export interface CompleteSceneContent {
  description: string;
  sceneType: 'indoor' | 'outdoor' | 'special';
  characters: Array<{
    characterId: string;
    characterName: string;
    action: string;
    emotion: string;
    position: 'left' | 'center' | 'right';
  }>;
  dialogues: Array<{
    characterId: string;
    text: string;
    speed: 'slow' | 'normal' | 'fast';
    tone: string;
  }>;
  camera: {
    type: 'closeup' | 'medium' | 'full' | 'wide';
    movement: 'static' | 'push' | 'pull' | 'follow';
  };
  visual: {
    transition: string;
    effects: string[];
    subtitleStyle: string;
  };
  audio: {
    bgm: string;
    soundEffects: string[];
  };
}

interface Character {
  id: string;
  name: string;
}

/**
 * 解析镜头描述文本，提取镜头类型和运镜方式
 */
function parseCameraDescription(cameraDesc: string = ''): {
  type: 'closeup' | 'medium' | 'full' | 'wide';
  movement: 'static' | 'push' | 'pull' | 'follow';
} {
  const desc = cameraDesc.toLowerCase();

  // 解析镜头类型
  let type: 'closeup' | 'medium' | 'full' | 'wide' = 'medium';
  if (desc.includes('特写') || desc.includes('closeup')) {
    type = 'closeup';
  } else if (desc.includes('全景') || desc.includes('full')) {
    type = 'full';
  } else if (desc.includes('远景') || desc.includes('wide')) {
    type = 'wide';
  }

  // 解析运镜方式
  let movement: 'static' | 'push' | 'pull' | 'follow' = 'static';
  if (desc.includes('推进') || desc.includes('push')) {
    movement = 'push';
  } else if (desc.includes('拉远') || desc.includes('pull')) {
    movement = 'pull';
  } else if (desc.includes('跟随') || desc.includes('follow')) {
    movement = 'follow';
  }

  return { type, movement };
}

/**
 * 将 AI 生成的简化场景内容转换为完整的场景内容结构
 */
export function transformAISceneToComplete(
  aiContent: AIGeneratedSceneContent,
  characters: Character[]
): CompleteSceneContent {
  const { dialogue = '', action = '', camera = '', characterIds = [] } = aiContent;

  // 构建角色数组
  const sceneCharacters = characterIds.map((charId) => {
    const character = characters.find((c) => c.id === charId);
    return {
      characterId: charId,
      characterName: character?.name || '未知角色',
      action: action || '无动作',
      emotion: '自然',
      position: 'center' as const,
    };
  });

  // 构建台词数组
  const dialogues = dialogue.trim()
    ? [
        {
          characterId: characterIds[0] || '',
          text: dialogue,
          speed: 'normal' as const,
          tone: '自然',
        },
      ]
    : [];

  // 解析镜头描述
  const cameraObj = parseCameraDescription(camera);

  return {
    description: action || '场景描述',
    sceneType: 'indoor',
    characters: sceneCharacters,
    dialogues,
    camera: cameraObj,
    visual: {
      transition: '无',
      effects: [],
      subtitleStyle: '标准',
    },
    audio: {
      bgm: '无',
      soundEffects: [],
    },
  };
}
