/**
 * 构建故事板格式的 prompt
 *
 * 格式示例：
 * Shot 1:
 * duration: 7.5sec
 * Scene: 飞机起飞
 *
 * Shot 2:
 * duration: 7.5sec
 * Scene: 飞机降落
 */
export function buildStoryboardPrompt(
  scenes: Array<{
    title: string;
    duration?: number | null;
    prompt: string;
  }>
): string {
  const shots = scenes.map((scene, index) => {
    const duration = scene.duration || 10; // 默认 10 秒
    return `Shot ${index + 1}:\nduration: ${duration}sec\nScene: ${scene.prompt}`;
  });

  return shots.join("\n\n");
}
