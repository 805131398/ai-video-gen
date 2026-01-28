import { ScriptScene } from '../../types';

interface TimelineViewProps {
  scenes: ScriptScene[];
  onEditScene: (scene: ScriptScene) => void;
}

export default function TimelineView({ scenes, onEditScene }: TimelineViewProps) {
  // 计算总时长
  const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 0), 0);

  // 计算每个场景的时间轴位置
  let currentTime = 0;
  const timelineScenes = scenes.map((scene) => {
    const startTime = currentTime;
    const duration = scene.duration || 10; // 默认 10 秒
    currentTime += duration;
    return {
      scene,
      startTime,
      duration,
      widthPercent: totalDuration > 0 ? (duration / totalDuration) * 100 : 100 / scenes.length,
    };
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 时间轴总览 */}
      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">时间轴总览</h3>
          <div className="text-sm text-slate-600">
            总时长: <span className="font-semibold">{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* 时间轴可视化 */}
        <div className="relative h-20 bg-slate-100 rounded-lg overflow-hidden">
          {timelineScenes.map(({ scene, startTime, duration, widthPercent }, index) => (
            <div
              key={scene.id}
              className="absolute top-0 h-full border-r border-white hover:opacity-80 transition-opacity cursor-pointer group"
              style={{
                left: `${(startTime / totalDuration) * 100}%`,
                width: `${widthPercent}%`,
                backgroundColor: `hsl(${(index * 360) / scenes.length}, 70%, 60%)`,
              }}
              onClick={() => onEditScene(scene)}
            >
              <div className="p-2 h-full flex flex-col justify-center">
                <p className="text-xs font-medium text-white truncate">{scene.title}</p>
                <p className="text-xs text-white opacity-90">{duration}s</p>
              </div>
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
            </div>
          ))}
        </div>

        {/* 时间刻度 */}
        <div className="relative h-6 mt-2">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <div
              key={ratio}
              className="absolute top-0 text-xs text-slate-500"
              style={{ left: `${ratio * 100}%`, transform: 'translateX(-50%)' }}
            >
              {formatTime(Math.floor(totalDuration * ratio))}
            </div>
          ))}
        </div>
      </div>

      {/* 场景详细列表 */}
      <div className="space-y-3">
        {timelineScenes.map(({ scene, startTime, duration }, index) => (
          <div
            key={scene.id}
            className="bg-white rounded-lg border-2 border-slate-200 p-4 hover:border-blue-400 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-medium text-slate-500">#{index + 1}</span>
                  <h4 className="text-lg font-semibold text-slate-900">{scene.title}</h4>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    {formatTime(startTime)} - {formatTime(startTime + duration)}
                  </span>
                </div>

                {scene.content.description && (
                  <p className="text-sm text-slate-600 mb-2">{scene.content.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>⏱ {duration}s</span>
                  {scene.content.sceneType && (
                    <span>
                      📍 {scene.content.sceneType === 'indoor' ? '室内' : scene.content.sceneType === 'outdoor' ? '室外' : '特殊场景'}
                    </span>
                  )}
                  {scene.content.characters && scene.content.characters.length > 0 && (
                    <span>👥 {scene.content.characters.length} 个角色</span>
                  )}
                  {scene.content.dialogues && scene.content.dialogues.length > 0 && (
                    <span>💬 {scene.content.dialogues.length} 条台词</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => onEditScene(scene)}
                className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                编辑
              </button>
            </div>
          </div>
        ))}
      </div>

      {scenes.length === 0 && (
        <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-500">暂无场景，请先添加场景</p>
        </div>
      )}
    </div>
  );
}
