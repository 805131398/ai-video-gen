import { ScriptScene, ProjectCharacter } from '../../types';

interface CharacterViewProps {
  scenes: ScriptScene[];
  characters: ProjectCharacter[];
  onEditScene: (scene: ScriptScene) => void;
}

export default function CharacterView({
  scenes,
  characters,
  onEditScene,
}: CharacterViewProps) {
  // 按角色分组场景数据
  const characterScenes = characters.map((character) => {
    const characterDialogues = scenes.flatMap((scene) => {
      const dialogues = scene.content.dialogues?.filter(
        (d) => d.characterId === character.id
      ) || [];
      const actions = scene.content.characters?.filter(
        (c) => c.characterId === character.id
      ) || [];

      if (dialogues.length === 0 && actions.length === 0) return [];

      return [{
        scene,
        dialogues,
        actions,
      }];
    });

    return {
      character,
      scenes: characterDialogues,
    };
  });

  return (
    <div className="space-y-6">
      {characterScenes.map(({ character, scenes: charScenes }) => (
        <div key={character.id} className="bg-white rounded-lg border-2 border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-4">
            {character.avatarUrl && (
              <img
                src={character.avatarUrl}
                alt={character.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{character.name}</h3>
              <p className="text-sm text-slate-600">{charScenes.length} 个场景</p>
            </div>
          </div>

          <div className="space-y-4">
            {charScenes.map(({ scene, dialogues, actions }, index) => (
              <div
                key={`${scene.id}-${index}`}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-slate-900">{scene.title}</h4>
                    {scene.duration && (
                      <span className="text-xs text-slate-500">⏱ {scene.duration}s</span>
                    )}
                  </div>
                  <button
                    onClick={() => onEditScene(scene)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    编辑场景
                  </button>
                </div>

                {actions.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-slate-600 mb-1">动作：</p>
                    {actions.map((action, i) => (
                      <p key={i} className="text-sm text-slate-700">
                        • {action.action} ({action.emotion}) - {action.position === 'left' ? '左侧' : action.position === 'center' ? '中间' : '右侧'}
                      </p>
                    ))}
                  </div>
                )}

                {dialogues.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">台词：</p>
                    {dialogues.map((dialogue, i) => (
                      <div key={i} className="text-sm text-slate-700 mb-2">
                        <p className="font-medium">"{dialogue.text}"</p>
                        <p className="text-xs text-slate-500">
                          语速：{dialogue.speed === 'slow' ? '慢速' : dialogue.speed === 'fast' ? '快速' : '正常'}
                          {dialogue.tone && ` | 语气：${dialogue.tone}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {charScenes.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">该角色暂无场景</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
