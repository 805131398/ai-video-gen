"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Character {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string | null;
  attributes?: Record<string, unknown>;
}

interface CharacterMultiSelectProps {
  characters: Character[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  className?: string;
}

export function CharacterMultiSelect({
  characters,
  selectedIds,
  onChange,
  className,
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
      <div className="text-center py-8 text-muted-foreground">
        <p>暂无角色</p>
        <p className="text-sm mt-2">请先在项目中创建角色</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        className
      )}
    >
      {characters.map((character) => {
        const isSelected = selectedIds.includes(character.id);
        return (
          <Card
            key={character.id}
            className={cn(
              "relative cursor-pointer transition-all hover:shadow-md",
              "h-[120px] p-3",
              isSelected && "ring-2 ring-primary border-primary"
            )}
            onClick={() => handleToggle(character.id)}
          >
            {/* 选中标记 */}
            <div
              className={cn(
                "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted border border-border"
              )}
            >
              {isSelected && <Check className="w-3 h-3" />}
            </div>

            {/* 角色信息 */}
            <div className="flex flex-col h-full">
              <div className="flex items-start gap-2 mb-2">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={character.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {character.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">
                    {character.name}
                  </h4>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                {character.description}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
