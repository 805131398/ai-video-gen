import { Check, User } from 'lucide-react';
import { ProjectCharacter } from '../types';

interface CharacterMultiSelectProps {
  characters: ProjectCharacter[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  className?: string;
}

export function CharacterMultiSelect({
  characters,
  selectedIds,
  onChange,
  className = '',
}: CharacterMultiSelectProps) {
  const handleToggle = (characterId: string) => {
    if (selectedIds.includes(characterId)) {
      onChange(selectedIds.filter((id) => id !== characterId));
    } else {
      onChange([...selectedIds, characterId]);
    }
  };

  if (characters.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>暂无角色</p>
        <p className="text-sm mt-2">请先在项目中创建角色</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${className}`}>
      {characters.map((character) => {
        const isSelected = selectedIds.includes(character.id);
        return (
          <button
            key={character.id}
            type="button"
            onClick={() => handleToggle(character.id)}
            className={`relative p-3 border-2 rounded-lg transition-all hover:shadow-md text-left h-[120px] ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* 选中标记 */}
            <div
              className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 border border-slate-300'
              }`}
            >
              {isSelected && <Check className="w-3 h-3" />}
            </div>

            {/* 角色信息 */}
            <div className="flex flex-col h-full">
              <div className="flex items-start gap-2 mb-2">
                {character.avatarUrl ? (
                  <img
                    src={character.avatarUrl}
                    alt={character.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate text-slate-900">
                    {character.name}
                  </h4>
                </div>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2 flex-1">
                {character.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
