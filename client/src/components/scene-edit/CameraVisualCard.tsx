import { Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { SceneContent } from '../../types';

interface CameraVisualCardProps {
  formData: {
    content?: SceneContent;
  };
  onChange: (field: string, value: any) => void;
  expanded: boolean;
  onToggle: () => void;
}

export default function CameraVisualCard({
  formData,
  onChange,
  expanded,
  onToggle,
}: CameraVisualCardProps) {
  const content = formData.content || {};

  const handleCameraChange = (field: string, value: string) => {
    onChange('content', {
      ...content,
      camera: {
        ...content.camera,
        [field]: value,
      },
    });
  };

  const handleVisualChange = (field: string, value: string) => {
    onChange('content', {
      ...content,
      visual: {
        ...content.visual,
        [field]: value,
      },
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/20">
      {/* 卡片标题栏 */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">镜头与视觉</h3>
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
          {/* 镜头设置 */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-700">镜头设置</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cameraType" className="block text-xs text-slate-600 mb-1">
                  镜头类型
                </label>
                <select
                  id="cameraType"
                  value={content.camera?.type || ''}
                  onChange={(e) => handleCameraChange('type', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-sm text-slate-900 cursor-pointer"
                >
                  <option value="">请选择</option>
                  <option value="fixed">固定镜头</option>
                  <option value="follow">跟随镜头</option>
                  <option value="orbit">环绕镜头</option>
                  <option value="handheld">手持镜头</option>
                </select>
              </div>
              <div>
                <label htmlFor="movement" className="block text-xs text-slate-600 mb-1">
                  运镜方式
                </label>
                <select
                  id="movement"
                  value={content.camera?.movement || ''}
                  onChange={(e) => handleCameraChange('movement', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-sm text-slate-900 cursor-pointer"
                >
                  <option value="">请选择</option>
                  <option value="push">推镜</option>
                  <option value="pull">拉镜</option>
                  <option value="pan">摇镜</option>
                  <option value="tilt">俯仰</option>
                  <option value="dolly">移动</option>
                </select>
              </div>
              <div>
                <label htmlFor="shotSize" className="block text-xs text-slate-600 mb-1">
                  景别
                </label>
                <select
                  id="shotSize"
                  value={content.camera?.shotSize || ''}
                  onChange={(e) => handleCameraChange('shotSize', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-sm text-slate-900 cursor-pointer"
                >
                  <option value="">请选择</option>
                  <option value="closeup">特写</option>
                  <option value="close">近景</option>
                  <option value="medium">中景</option>
                  <option value="full">全景</option>
                  <option value="wide">远景</option>
                </select>
              </div>
              <div>
                <label htmlFor="cameraDescription" className="block text-xs text-slate-600 mb-1">
                  自定义描述
                </label>
                <input
                  id="cameraDescription"
                  type="text"
                  value={content.camera?.description || ''}
                  onChange={(e) => handleCameraChange('description', e.target.value)}
                  placeholder="其他镜头说明..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-sm text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* 视觉效果 */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-700">视觉效果</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="lighting" className="block text-xs text-slate-600 mb-1">
                  光线条件
                </label>
                <select
                  id="lighting"
                  value={content.visual?.lighting || ''}
                  onChange={(e) => handleVisualChange('lighting', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-sm text-slate-900 cursor-pointer"
                >
                  <option value="">请选择</option>
                  <option value="daylight">日光</option>
                  <option value="night">夜晚</option>
                  <option value="indoor">室内</option>
                  <option value="golden">黄金时刻</option>
                  <option value="overcast">阴天</option>
                </select>
              </div>
              <div>
                <label htmlFor="mood" className="block text-xs text-slate-600 mb-1">
                  色调/氛围
                </label>
                <select
                  id="mood"
                  value={content.visual?.mood || ''}
                  onChange={(e) => handleVisualChange('mood', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-sm text-slate-900 cursor-pointer"
                >
                  <option value="">请选择</option>
                  <option value="warm">温暖</option>
                  <option value="cool">冷色</option>
                  <option value="vintage">复古</option>
                  <option value="vibrant">鲜艳</option>
                  <option value="muted">柔和</option>
                </select>
              </div>
              <div>
                <label htmlFor="effects" className="block text-xs text-slate-600 mb-1">
                  特效
                </label>
                <input
                  id="effects"
                  type="text"
                  value={content.visual?.effects || ''}
                  onChange={(e) => handleVisualChange('effects', e.target.value)}
                  placeholder="例如：慢动作、模糊、粒子"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-sm text-slate-900 placeholder-slate-400"
                />
              </div>
              <div>
                <label htmlFor="visualDescription" className="block text-xs text-slate-600 mb-1">
                  自定义描述
                </label>
                <input
                  id="visualDescription"
                  type="text"
                  value={content.visual?.description || ''}
                  onChange={(e) => handleVisualChange('description', e.target.value)}
                  placeholder="其他视觉说明..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-sm text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
