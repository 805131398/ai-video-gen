import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Edit, Trash2, Video } from 'lucide-react';
import { ScriptScene } from '../../types';

interface DraggableSceneCardProps {
  scene: ScriptScene;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onGenerateVideo: () => void;
}

function DraggableSceneCard({ scene, index, onEdit, onDelete, onGenerateVideo }: DraggableSceneCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 w-64 bg-slate-50 rounded-lg border-2 border-slate-200 p-4 hover:border-blue-400 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-move p-1 hover:bg-slate-200 rounded"
          >
            <GripVertical className="w-4 h-4 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-900">场景 {index + 1}</h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors text-sm"
        >
          <Trash2 className="w-3.5 h-3.5" />
          删除
        </button>
      </div>
      <p className="text-sm text-slate-700 mb-2 truncate">{scene.title}</p>
      {scene.duration && (
        <p className="text-xs text-slate-500 mb-2">⏱ {scene.duration}s</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          <Edit className="w-3.5 h-3.5" />
          编辑
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onGenerateVideo();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
        >
          <Video className="w-3.5 h-3.5" />
          生成视频
        </button>
      </div>
    </div>
  );
}

interface DraggableSceneListProps {
  scenes: ScriptScene[];
  onScenesReorder: (scenes: ScriptScene[]) => void;
  onAddScene: () => void;
  onEditScene: (scene: ScriptScene) => void;
  onDeleteScene: (sceneId: string) => void;
  onGenerateVideo: (sceneId: string) => void;
}

export default function DraggableSceneList({
  scenes,
  onScenesReorder,
  onAddScene,
  onEditScene,
  onDeleteScene,
  onGenerateVideo,
}: DraggableSceneListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = scenes.findIndex((s) => s.id === active.id);
      const newIndex = scenes.findIndex((s) => s.id === over.id);
      const newScenes = arrayMove(scenes, oldIndex, newIndex);
      onScenesReorder(newScenes);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-center gap-4 overflow-x-auto pb-4">
        <SortableContext
          items={scenes.map((s) => s.id)}
          strategy={horizontalListSortingStrategy}
        >
          {scenes.map((scene, index) => (
            <DraggableSceneCard
              key={scene.id}
              scene={scene}
              index={index}
              onEdit={() => onEditScene(scene)}
              onDelete={() => onDeleteScene(scene.id)}
              onGenerateVideo={() => onGenerateVideo(scene.id)}
            />
          ))}
        </SortableContext>

        <button
          onClick={onAddScene}
          className="flex-shrink-0 w-64 h-40 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <Plus className="w-8 h-8 text-slate-400" />
          <span className="text-sm text-slate-600">添加场景</span>
        </button>
      </div>
    </DndContext>
  );
}
