"use client";

import * as React from "react";
import { Edit, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface SceneContent {
  dialogue?: string;
  action?: string;
  camera?: string;
  characterIds?: string[];
}

interface Scene {
  id: string;
  title: string;
  sortOrder: number;
  duration?: number | null;
  content: SceneContent;
}

interface Character {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface SceneCardListProps {
  scenes: Scene[];
  characters: Character[];
  onEdit?: (scene: Scene) => void;
  onDelete?: (sceneId: string) => void;
  className?: string;
}

export function SceneCardList({
  scenes,
  characters,
  onEdit,
  onDelete,
  className,
}: SceneCardListProps) {
  // 根据 characterIds 获取角色信息
  const getSceneCharacters = (characterIds?: string[]) => {
    if (!characterIds || characterIds.length === 0) return [];
    return characters.filter((char) => characterIds.includes(char.id));
  };

  if (scenes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
        <p className="text-lg">暂无场景</p>
        <p className="text-sm mt-2">使用 AI 生成场景或手动添加</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {scenes.map((scene, index) => {
        const sceneCharacters = getSceneCharacters(scene.content.characterIds);
        const description =
          scene.content.dialogue ||
          scene.content.action ||
          scene.content.camera ||
          "暂无描述";

        return (
          <Card
            key={scene.id}
            className="p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              {/* 序号 */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {index + 1}
                </span>
              </div>

              {/* 内容区 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-base">{scene.title}</h4>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(scene)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(scene.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* 描述 */}
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {description}
                </p>

                {/* 底部信息 */}
                <div className="flex items-center gap-4 flex-wrap">
                  {/* 时长 */}
                  {scene.duration && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{scene.duration}秒</span>
                    </div>
                  )}

                  {/* 出场角色 */}
                  {sceneCharacters.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground mr-1">
                        出场:
                      </span>
                      <div className="flex -space-x-2">
                        {sceneCharacters.slice(0, 3).map((char) => (
                          <Avatar
                            key={char.id}
                            className="w-6 h-6 border-2 border-background"
                          >
                            <AvatarImage src={char.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {char.name.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {sceneCharacters.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                            <span className="text-xs">
                              +{sceneCharacters.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
