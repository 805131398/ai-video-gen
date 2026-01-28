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
      // 检查角色是否是主要角色
      const isMainCharacter = scene.content.characterId === character.id;

      // 检查角色是否在其他角色列表中
      const otherCharacterInfo = scene.content.otherCharacters?.find(
        (c) => c.characterId === character.id
      );

      // 如果角色不在这个场景中，跳过
      if (!isMainCharacter && !otherCharacterInfo) return [];

      // 过滤该角色的台词（通过说话人名称匹配）
      const dialogues = scene.content.dialogues?.filter(
        (d) => d.speaker === character.name
      ) || [];

      // 获取角色在场景中的角色描述
      const role = isMainCharacter ? '主要角色' : otherCharacterInfo?.role || '其他角色';

      return [{
        scene,
        dialogues,
        role,
        isMainCharacter,
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
            {charScenes.map(({ scene, dialogues, role, isMainCharacter }, index) => (
              <div
                key={`${scene.id}-${index}`}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-slate-900">{scene.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {scene.duration && (
                        <span className="text-xs text-slate-500">⏱ {scene.duration}s</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        isMainCharacter
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onEditScene(scene)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    编辑场景
                  </button>
                </div>

                {/* 显示动作 */}
                {scene.content.actions && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-slate-600 mb-1">动作：</p>
                    <div className="space-y-1">
                      {scene.content.actions.entrance && (
                        <p className="text-sm text-slate-700">
                          • 入场：{scene.content.actions.entrance}
                        </p>
                      )}
                      {scene.content.actions.main && (
                        <p className="text-sm text-slate-700">
                          • 主要：{scene.content.actions.main}
                        </p>
                      )}
                      {scene.content.actions.exit && (
                        <p className="text-sm text-slate-700">
                          • 出场：{scene.content.actions.exit}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {dialogues.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">台词：</p>
                    {dialogues.map((dialogue, i) => (
                      <div key={i} className="text-sm text-slate-700 mb-2">
                        <p className="font-medium">"{dialogue.text}"</p>
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
