import { useState, useEffect } from 'react';
import { Edit2, Trash2, Image as ImageIcon, Sparkles, Check } from 'lucide-react';
import { ProjectCharacter } from '../../types';
import ImageWithFallback from '../ImageWithFallback';

interface CharacterCardProps {
  character: ProjectCharacter;
  onEdit: (character: ProjectCharacter) => void;
  onDelete: (id: string) => void;
  onGenerateDigitalHuman?: (character: ProjectCharacter) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function CharacterCard({
  character,
  onEdit,
  onDelete,
  onGenerateDigitalHuman,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
}: CharacterCardProps) {
  // 获取选中的数字人形象
  const selectedDigitalHumanId = character.attributes?.digitalHumanId as string | undefined;
  const selectedDigitalHuman = character.digitalHumans?.find(
    (dh) => dh.id === selectedDigitalHumanId
  );

  // 加载数字人的本地图片路径
  const [localImageUrl, setLocalImageUrl] = useState<string>('');

  useEffect(() => {
    if (!selectedDigitalHumanId || !selectedDigitalHuman) {
      setLocalImageUrl('');
      return;
    }

    const loadLocalPath = async () => {
      try {
        const status = await window.electron.resources.getStatus('digital_human', selectedDigitalHumanId);
        if (status && status.status === 'completed' && status.localPath) {
          setLocalImageUrl(`local-resource://${status.localPath}`);
        } else {
          setLocalImageUrl(selectedDigitalHuman.imageUrl);
        }
      } catch {
        setLocalImageUrl(selectedDigitalHuman.imageUrl);
      }
    };

    loadLocalPath();
  }, [selectedDigitalHumanId, selectedDigitalHuman]);

  // 过滤掉技术性属性，只显示有意义的用户属性
  const displayAttributes = character.attributes
    ? Object.entries(character.attributes).filter(([key]) =>
        !['digitalHumanId', 'id', 'createdAt', 'updatedAt'].includes(key)
      )
    : [];

  return (
    <div
      className={`bg-white border rounded-xl p-5 transition-all flex flex-col relative ${
        isSelectMode
          ? 'cursor-pointer hover:shadow-lg'
          : 'hover:shadow-lg'
      } ${
        isSelected
          ? 'border-blue-500 border-2 shadow-lg ring-2 ring-blue-200'
          : 'border-slate-200'
      }`}
      onClick={() => {
        if (isSelectMode && onToggleSelect) {
          onToggleSelect(character.id);
        }
      }}
    >
      {/* 选中标记 */}
      {isSelectMode && (
        <div className="absolute top-3 right-3 z-10">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-400'
            }`}
          >
            {isSelected && <Check className="w-4 h-4" />}
          </div>
        </div>
      )}

      {/* 内容区域 - 自动填充剩余空间 */}
      <div className="flex-1">

      {/* 角色名称 */}
      <h3 className="font-bold text-lg mb-3 text-slate-900">{character.name}</h3>

      {/* 角色形象 - 优先显示数字人 */}
      <div className="mb-3">
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">
          {selectedDigitalHuman ? '数字人形象' : '角色参考图'}
        </label>
        {selectedDigitalHuman ? (
          <div className="relative w-32 h-40 mx-auto">
            <ImageWithFallback
              src={localImageUrl || selectedDigitalHuman.imageUrl}
              alt={`${character.name}的数字人`}
              className="w-full h-full object-cover rounded-lg border-2 border-blue-200 shadow-sm"
              fallbackMessage="数字人图片缓存已失效，请联系管理员处理"
            />
          </div>
        ) : character.avatarUrl ? (
          <div className="w-32 h-40 mx-auto">
            <ImageWithFallback
              src={character.avatarUrl}
              alt={character.name}
              className="w-full h-full object-cover rounded-lg border-2 border-slate-200"
              fallbackMessage="角色图片缓存已失效，请联系管理员处理"
            />
          </div>
        ) : (
          <div className="w-32 h-40 mx-auto bg-slate-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-300">
            <ImageIcon className="w-8 h-8 text-slate-400 mb-1" />
            <span className="text-xs text-slate-500">暂无形象</span>
          </div>
        )}
      </div>

      {/* 角色描述 */}
      <div className="mb-3">
        <label className="text-xs font-medium text-slate-600 mb-1 block">
          角色描述
        </label>
        <p className="text-slate-700 text-sm leading-relaxed line-clamp-3">
          {character.description}
        </p>
      </div>

        {/* 角色属性 */}
        {displayAttributes.length > 0 && (
          <div className="mb-3">
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
              角色属性
            </label>
            <div className="flex flex-wrap gap-2">
              {displayAttributes.map(([key, value]) => (
                <span
                  key={key}
                  className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200"
                >
                  {String(value)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部操作按钮区域 - 固定在卡片底部 */}
      {!isSelectMode && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
          {/* 生成/更换数字人按钮 */}
          {onGenerateDigitalHuman && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateDigitalHuman(character);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {selectedDigitalHuman ? '更换数字人形象' : '生成角色数字人'}
            </button>
          )}

          {/* 编辑和删除按钮 */}
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(character);
              }}
              className="flex-1 py-2 px-3 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              title="编辑"
            >
              <Edit2 className="w-3.5 h-3.5" />
              编辑
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(character.id);
              }}
              className="flex-1 py-2 px-3 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              title="删除"
            >
              <Trash2 className="w-3.5 h-3.5" />
              删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
