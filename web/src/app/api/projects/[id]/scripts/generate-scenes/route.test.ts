import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { getEffectiveAIConfig } from '@/lib/services/ai-config-service';
import { createAIClient } from '@/lib/ai/client';

// Mock dependencies
vi.mock('@/lib/auth-middleware');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
    },
    projectCharacter: {
      findMany: vi.fn(),
    },
  },
}));
vi.mock('@/lib/services/ai-config-service');
vi.mock('@/lib/ai/client');

describe('POST /api/projects/[id]/scripts/generate-scenes', () => {
  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-123',
  };

  const mockProject = {
    id: 'project-123',
    userId: 'user-123',
  };

  const mockCharacters = [
    {
      id: 'char-1',
      name: '小明',
      description: '一个活泼的年轻人',
      projectId: 'project-123',
    },
  ];

  const mockAIConfig = {
    id: 'config-123',
    provider: 'openai',
    apiKey: 'test-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUser).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.projectCharacter.findMany).mockResolvedValue(mockCharacters as any);
    vi.mocked(getEffectiveAIConfig).mockResolvedValue(mockAIConfig as any);
  });

  it('should generate scenes with complete SceneContent structure', async () => {
    // Mock AI response with complete scene data
    const mockAIResponse = JSON.stringify([
      {
        title: '开场引入',
        duration: 10,
        content: {
          description: '主角在明亮的办公室里',
          sceneType: 'indoor',
          characters: [
            {
              characterId: 'char-1',
              characterName: '小明',
              action: '面对镜头微笑',
              emotion: '开心',
              position: 'center',
            },
          ],
          dialogues: [
            {
              characterId: 'char-1',
              text: '大家好，今天跟大家分享一个有趣的话题',
              speed: 'normal',
              tone: '热情',
            },
          ],
          camera: {
            type: 'medium',
            movement: 'static',
          },
          visual: {
            transition: '淡入',
            effects: ['柔光'],
            subtitleStyle: '标准',
          },
          audio: {
            bgm: '轻松舒缓',
            soundEffects: ['环境音'],
          },
        },
      },
    ]);

    const mockClient = {
      generateText: vi.fn().mockResolvedValue(mockAIResponse),
    };
    vi.mocked(createAIClient).mockReturnValue(mockClient as any);

    const request = new NextRequest('http://localhost/api/projects/project-123/scripts/generate-scenes', {
      method: 'POST',
      body: JSON.stringify({
        characterIds: ['char-1'],
        synopsis: '一个关于分享的故事',
        sceneCount: 1,
        tone: '轻松',
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: 'project-123' }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.scenes).toHaveLength(1);

    const scene = data.scenes[0];

    // 验证基本字段
    expect(scene.title).toBe('开场引入');
    expect(scene.duration).toBe(10);

    // 验证 content 结构完整性
    expect(scene.content).toBeDefined();
    expect(scene.content.description).toBe('主角在明亮的办公室里');
    expect(scene.content.sceneType).toBe('indoor');

    // 验证角色数组
    expect(scene.content.characters).toBeInstanceOf(Array);
    expect(scene.content.characters).toHaveLength(1);
    expect(scene.content.characters[0]).toMatchObject({
      characterId: 'char-1',
      characterName: '小明',
      action: '面对镜头微笑',
      emotion: '开心',
      position: 'center',
    });

    // 验证台词数组
    expect(scene.content.dialogues).toBeInstanceOf(Array);
    expect(scene.content.dialogues).toHaveLength(1);
    expect(scene.content.dialogues[0]).toMatchObject({
      characterId: 'char-1',
      text: '大家好，今天跟大家分享一个有趣的话题',
      speed: 'normal',
      tone: '热情',
    });

    // 验证镜头对象
    expect(scene.content.camera).toMatchObject({
      type: 'medium',
      movement: 'static',
    });

    // 验证视觉对象
    expect(scene.content.visual).toMatchObject({
      transition: '淡入',
      effects: ['柔光'],
      subtitleStyle: '标准',
    });

    // 验证音频对象
    expect(scene.content.audio).toMatchObject({
      bgm: '轻松舒缓',
      soundEffects: ['环境音'],
    });
  });
});
