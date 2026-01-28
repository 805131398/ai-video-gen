import { useState } from 'react';
import { Users, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { ProjectCharacter, SceneContent } from '../../types';

interface CharacterDialogueCardProps {
  formData: {
    content?: SceneContent;
  };
  characters: ProjectCharacter[];
  onChange: (field: string, value: any) => void;
  expanded: boolean;
  onToggle: () => void;
}

export default function CharacterDialogueCard({
  formData,
  characters,
  onChange,
  expanded,
  onToggle,
}: CharacterDialogueCardProps) {
  const content = (formData.content || {}) as SceneContent;
  const dialogues = (content.dialogues || []) as Array<{ text: string; speaker: string }>;
  const otherCharacters = (content.otherCharacters || []) as Array<{ characterId: string; role: string }>;
  const actions = (content.actions || { entrance: '', main: '', exit: '' }) as { entrance: string; main: string; exit: string };

  const handleCharacterChange = (characterId: string) => {
    onChange('content', {
      ...content,
      characterId,
    });
  };

  const handleAddOtherCharacter = () => {
    onChange('content', {
      ...content,
      otherCharacters: [...otherCharacters, { characterId: '', role: '' }],
    });
  };

  const handleOtherCharacterChange = (index: number, field: string, value: string) => {
    const newOtherCharacters = [...otherCharacters];
    newOtherCharacters[index] = { ...newOtherCharacters[index], [field]: value };
    onChange('content', {
      ...content,
      otherCharacters: newOtherCharacters,
    });
  };

  const handleDeleteOtherCharacter = (index: number) => {
    const newOtherCharacters = otherCharacters.filter((_, i) => i !== index);
    onChange('content', {
      ...content,
      otherCharacters: newOtherCharacters,
    });
  };

  const handleActionChange = (field: string, value: string) => {
    onChange('content', {
      ...content,
      actions: {
        ...content.actions,
        [field]: value,
      },
    });
  };

  const handleAddDialogue = () => {
    onChange('content', {
      ...content,
      dialogues: [...dialogues, { text: '', speaker: '' }],
    });
  };

  const handleDialogueChange = (index: number, text: string) => {
    const newDialogues = [...dialogues];
    newDialogues[index] = { ...newDialogues[index], text };
    onChange('content', {
      ...content,
      dialogues: newDialogues,
    });
  };

  const handleDeleteDialogue = (index: number) => {
    const newDialogues = dialogues.filter((_, i) => i !== index);
    onChange('content', {
      ...content,
      dialogues: newDialogues,
    });
  };

  const selectedCharacter = characters.find((c) => c.id === content.characterId);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/20">
      {/* 卡片标题栏 */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">角色与台词</h3>
          </div>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-slate-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      {/* 卡片内容 */}
      {expanded && (
        <div className="p-6 space-y-6">
          {/* 角色选择 */}
          <div>
            <label htmlFor="character" className="block text-sm font-medium text-slate-700 mb-2">
              主要角色
            </label>
            <select
              id="character"
              value={content.characterId || ''}
              onChange={(e) => handleCharacterChange(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-slate-900 cursor-pointer"
            >
              <option value="">请选择角色</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
            {selectedCharacter && (
              <p className="mt-2 text-sm text-slate-600">{selectedCharacter.description}</p>
            )}
          </div>

          {/* 其他角色 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-700">其他角色</h4>
              <button
                onClick={handleAddOtherCharacter}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                添加角色
              </button>
            </div>
            {otherCharacters.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-sm bg-slate-50 rounded-lg">
                暂无其他角色，点击"添加角色"添加场景中的其他角色
              </div>
            ) : (
                <div className="space-y-3">
                {otherCharacters.map((otherChar: { characterId: string; role: string }, index: number) => {
                  const character = characters.find((c) => c.id === otherChar.characterId);
                  return (
                  <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600">
                    {index + 1}
                    </div>
                    <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">角色</label>
                      <select
                      value={otherChar.characterId || ''}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleOtherCharacterChange(index, 'characterId', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-sm text-slate-900 cursor-pointer"
                      >
                      <option value="">请选择角色</option>
                      {characters.map((character) => (
                        <option key={character.id} value={character.id}>
                        {character.name}
                        </option>
                      ))}
                      </select>
                      {character && (
                      <p className="mt-1 text-xs text-slate-500">{character.description}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">在场景中的角色</label>
                      <input
                      type="text"
                      value={otherChar.role || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOtherCharacterChange(index, 'role', e.target.value)}
                      placeholder="例如：接受治疗的患者、旁观的家人"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-sm text-slate-900 placeholder-slate-400"
                      />
                    </div>
                    </div>
                    <button
                    onClick={() => handleDeleteOtherCharacter(index)}
                    className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                    <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  );
                })}
                </div>
            )}
          </div>

          {/* 动作配置 */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-700">角色动作</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="entrance" className="block text-xs text-slate-600 mb-1">
                  入场动作
                </label>
                <input
                  id="entrance"
                  type="text"
                  value={actions.entrance || ''}
                  onChange={(e) => handleActionChange('entrance', e.target.value)}
                  placeholder="例如：从左侧走入"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-sm text-slate-900 placeholder-slate-400"
                />
              </div>
              <div>
                <label htmlFor="main" className="block text-xs text-slate-600 mb-1">
                  主要动作
                </label>
                <input
                  id="main"
                  type="text"
                  value={actions.main || ''}
                  onChange={(e) => handleActionChange('main', e.target.value)}
                  placeholder="例如：坐下交谈"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-sm text-slate-900 placeholder-slate-400"
                />
              </div>
              <div>
                <label htmlFor="exit" className="block text-xs text-slate-600 mb-1">
                  出场动作
                </label>
                <input
                  id="exit"
                  type="text"
                  value={actions.exit || ''}
                  onChange={(e) => handleActionChange('exit', e.target.value)}
                  placeholder="例如：挥手告别"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-sm text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* 台词列表 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-700">台词</h4>
              <button
                onClick={handleAddDialogue}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                添加台词
              </button>
            </div>
            {dialogues.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                暂无台词，点击"添加台词"开始编辑
              </div>
            ) : (
                <div className="space-y-3">
                {dialogues.map((dialogue: SceneContent['dialogues'][number], index: number) => (
                  <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                    {index + 1}
                  </div>
                  <textarea
                    value={dialogue.text}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleDialogueChange(index, e.target.value)}
                    placeholder="输入台词内容..."
                    rows={2}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-sm text-slate-900 placeholder-slate-400 resize-none"
                  />
                  <button
                    onClick={() => handleDeleteDialogue(index)}
                    className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  </div>
                ))}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
