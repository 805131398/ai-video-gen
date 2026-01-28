import { describe, it, expect } from 'vitest';
import {
  transformAISceneToComplete,
  type AIGeneratedSceneContent,
} from './scene-transformer';

describe('transformAISceneToComplete', () => {
  const mockCharacters = [
    { id: 'char-1', name: '小明' },
    { id: 'char-2', name: '小红' },
  ];

  it('should transform AI generated scene with dialogue to complete structure', () => {
    const aiContent: AIGeneratedSceneContent = {
      dialogue: '大家好，今天跟大家分享一个有趣的话题',
      action: '主角面对镜头，微笑打招呼',
      camera: '正面中景，温暖光线',
      characterIds: ['char-1'],
    };

    const result = transformAISceneToComplete(aiContent, mockCharacters);

    // 验证基本字段有默认值
    expect(result.description).toBeDefined();
    expect(result.sceneType).toBe('indoor');

    // 验证台词数组转换
    expect(result.dialogues).toBeInstanceOf(Array);
    expect(result.dialogues).toHaveLength(1);
    expect(result.dialogues[0]).toMatchObject({
      characterId: 'char-1',
      text: '大家好，今天跟大家分享一个有趣的话题',
      speed: 'normal',
      tone: '自然',
    });

    // 验证角色数组
    expect(result.characters).toBeInstanceOf(Array);
    expect(result.characters).toHaveLength(1);
    expect(result.characters[0]).toMatchObject({
      characterId: 'char-1',
      characterName: '小明',
      action: '主角面对镜头，微笑打招呼',
      emotion: '自然',
      position: 'center',
    });

    // 验证镜头对象
    expect(result.camera).toMatchObject({
      type: 'medium',
      movement: 'static',
    });

    // 验证视觉对象
    expect(result.visual).toMatchObject({
      transition: '无',
      effects: [],
      subtitleStyle: '标准',
    });

    // 验证音频对象
    expect(result.audio).toMatchObject({
      bgm: '无',
      soundEffects: [],
    });
  });

  it('should handle multiple characters', () => {
    const aiContent: AIGeneratedSceneContent = {
      dialogue: '小明：你好！小红：你好啊！',
      action: '两人互相打招呼',
      camera: '双人镜头',
      characterIds: ['char-1', 'char-2'],
    };

    const result = transformAISceneToComplete(aiContent, mockCharacters);

    expect(result.characters).toHaveLength(2);
    expect(result.characters[0].characterName).toBe('小明');
    expect(result.characters[1].characterName).toBe('小红');
  });

  it('should handle empty dialogue', () => {
    const aiContent: AIGeneratedSceneContent = {
      action: '主角思考',
      camera: '特写镜头',
      characterIds: ['char-1'],
    };

    const result = transformAISceneToComplete(aiContent, mockCharacters);

    expect(result.dialogues).toHaveLength(0);
  });

  it('should parse camera description to structured camera object', () => {
    const testCases = [
      {
        camera: '特写镜头，推进',
        expected: { type: 'closeup', movement: 'push' },
      },
      {
        camera: '全景，跟随',
        expected: { type: 'full', movement: 'follow' },
      },
      {
        camera: '中景，静止',
        expected: { type: 'medium', movement: 'static' },
      },
    ];

    testCases.forEach(({ camera, expected }) => {
      const aiContent: AIGeneratedSceneContent = {
        camera,
        characterIds: ['char-1'],
      };

      const result = transformAISceneToComplete(aiContent, mockCharacters);
      expect(result.camera).toMatchObject(expected);
    });
  });
});
