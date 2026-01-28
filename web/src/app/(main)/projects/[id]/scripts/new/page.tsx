"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToneCombobox } from "@/components/studio/script/ToneCombobox";
import { CharacterMultiSelect } from "@/components/studio/script/CharacterMultiSelect";
import { SceneCardList } from "@/components/studio/script/SceneCardList";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Character {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string | null;
}

interface SceneContent {
  dialogue?: string;
  action?: string;
  camera?: string;
  characterIds?: string[];
}

interface Scene {
  id?: string;
  title: string;
  sortOrder: number;
  duration?: number | null;
  content: SceneContent;
}

interface FormData {
  name: string;
  tone: string;
  synopsis: string;
  characterIds: string[];
  scenes: Scene[];
}

export default function ScriptEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const scriptId = params.scriptId as string | undefined;
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSynopsis, setIsGeneratingSynopsis] = useState(false);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    tone: "",
    synopsis: "",
    characterIds: [],
    scenes: [],
  });

  const [sceneCount, setSceneCount] = useState(5);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 加载数据
  useEffect(() => {
    loadData();
  }, [id, scriptId]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // 加载角色列表
      const charsRes = await fetch(`/api/projects/${id}/characters`);
      if (charsRes.ok) {
        const charsData = await charsRes.json();
        setCharacters(charsData.data || []);
      }

      // 如果是编辑模式，加载剧本数据
      if (scriptId) {
        const scriptRes = await fetch(
          `/api/projects/${id}/scripts/${scriptId}`
        );
        if (scriptRes.ok) {
          const scriptData = await scriptRes.json();
          const script = scriptData.data;
          setFormData({
            name: script.name || "",
            tone: script.tone || "",
            synopsis: script.synopsis || "",
            characterIds:
              script.scriptCharacters?.map((sc: any) => sc.characterId) || [],
            scenes: script.scenes || [],
          });
        }
      }
    } catch (error) {
      console.error("加载数据失败:", error);
      toast({
        title: "加载失败",
        description: "无法加载数据，请刷新页面重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 表单验证
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "请输入剧本名称";
    } else if (formData.name.length > 50) {
      newErrors.name = "剧本名称不能超过 50 个字符";
    }

    if (formData.characterIds.length === 0) {
      newErrors.characters = "请至少选择一个角色";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // AI 生成脚本大概
  const handleGenerateSynopsis = async () => {
    if (formData.characterIds.length === 0) {
      toast({
        title: "请先选择角色",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGeneratingSynopsis(true);
      const res = await fetch(
        `/api/projects/${id}/scripts/generate-synopsis`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterIds: formData.characterIds,
            tone: formData.tone || undefined,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "生成失败");
      }

      setFormData((prev) => ({ ...prev, synopsis: data.synopsis }));
      toast({
        title: "生成成功",
        description: "脚本大概已生成",
      });
    } catch (error) {
      console.error("生成脚本大概失败:", error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "生成失败",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSynopsis(false);
    }
  };

  // AI 生成场景
  const handleGenerateScenes = async () => {
    if (!formData.synopsis.trim()) {
      toast({
        title: "请先生成或输入脚本大概",
        variant: "destructive",
      });
      return;
    }

    if (sceneCount < 1 || sceneCount > 20) {
      toast({
        title: "场景数量必须在 1-20 之间",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGeneratingScenes(true);
      const res = await fetch(
        `/api/projects/${id}/scripts/generate-scenes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterIds: formData.characterIds,
            tone: formData.tone || undefined,
            synopsis: formData.synopsis,
            sceneCount,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "生成失败");
      }

      // 添加 sortOrder
      const newScenes = data.scenes.map((scene: any, index: number) => ({
        ...scene,
        sortOrder: formData.scenes.length + index,
      }));

      setFormData((prev) => ({
        ...prev,
        scenes: [...prev.scenes, ...newScenes],
      }));

      toast({
        title: "生成成功",
        description: `已生成 ${newScenes.length} 个场景`,
      });
    } catch (error) {
      console.error("生成场景失败:", error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "生成失败",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingScenes(false);
    }
  };

  // 保存剧本
  const handleSave = async () => {
    if (!validate()) {
      toast({
        title: "请检查表单",
        description: "请填写所有必填项",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      const url = scriptId
        ? `/api/projects/${id}/scripts/${scriptId}`
        : `/api/projects/${id}/scripts`;

      const method = scriptId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          tone: formData.tone || undefined,
          synopsis: formData.synopsis || undefined,
          characterIds: formData.characterIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "保存失败");
      }

      toast({
        title: "保存成功",
      });

      // 如果有场景，保存场景
      if (formData.scenes.length > 0) {
        const savedScriptId = scriptId || data.data.id;
        await saveScenes(savedScriptId);
      }

      // 跳转回剧本列表
      router.push(`/projects/${id}/scripts`);
    } catch (error) {
      console.error("保存失败:", error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "保存失败",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 保存场景
  const saveScenes = async (savedScriptId: string) => {
    for (const scene of formData.scenes) {
      if (!scene.id) {
        // 新场景
        await fetch(
          `/api/projects/${id}/scripts/${savedScriptId}/scenes`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scene),
          }
        );
      }
    }
  };

  // 删除场景
  const handleDeleteScene = (sceneId: string) => {
    setFormData((prev) => ({
      ...prev,
      scenes: prev.scenes.filter((s) => s.id !== sceneId),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <h1 className="text-2xl font-bold">
            {scriptId ? "编辑剧本" : "创建剧本"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isSaving}
          >
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            保存
          </Button>
        </div>
      </div>

      {/* 基本信息卡片 */}
      <Card className="p-6 backdrop-blur-sm bg-background/95">
        <h2 className="text-lg font-semibold mb-4">基本信息</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">
              剧本名称 <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, name: e.target.value }));
                  setErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="请输入剧本名称（最多50字符）"
                maxLength={50}
                className={errors.name ? "border-destructive" : ""}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {formData.name.length}/50
              </span>
            </div>
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="tone">脚本基调</Label>
            <div className="mt-1.5">
              <ToneCombobox
                value={formData.tone}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, tone: value }))
                }
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 角色选择卡片 */}
      <Card className="p-6 backdrop-blur-sm bg-background/95">
        <h2 className="text-lg font-semibold mb-4">
          选择角色 <span className="text-destructive">*</span>
        </h2>
        <CharacterMultiSelect
          characters={characters}
          selectedIds={formData.characterIds}
          onChange={(ids) => {
            setFormData((prev) => ({ ...prev, characterIds: ids }));
            setErrors((prev) => ({ ...prev, characters: "" }));
          }}
        />
        {errors.characters && (
          <p className="text-sm text-destructive mt-2">{errors.characters}</p>
        )}
      </Card>

      {/* 脚本大概卡片 */}
      <Card className="p-6 backdrop-blur-sm bg-background/95">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">脚本大概</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateSynopsis}
            disabled={
              isGeneratingSynopsis || formData.characterIds.length === 0
            }
          >
            {isGeneratingSynopsis ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            AI 生成脚本大概
          </Button>
        </div>
        <Textarea
          value={formData.synopsis}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, synopsis: e.target.value }))
          }
          placeholder="描述剧本的核心故事线和主要情节（100-300字）"
          rows={6}
          className="resize-none"
        />
      </Card>

      {/* 场景管理卡片 */}
      <Card className="p-6 backdrop-blur-sm bg-background/95">
        <h2 className="text-lg font-semibold mb-4">场景管理</h2>

        {/* AI 生成场景控制区 */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <Label htmlFor="sceneCount" className="text-sm">
              场景数量
            </Label>
            <Input
              id="sceneCount"
              type="number"
              min={1}
              max={20}
              value={sceneCount}
              onChange={(e) => setSceneCount(parseInt(e.target.value) || 1)}
              className="mt-1.5 w-32"
            />
          </div>
          <Button
            onClick={handleGenerateScenes}
            disabled={isGeneratingScenes || !formData.synopsis.trim()}
            className="mt-6"
          >
            {isGeneratingScenes ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            AI 生成场景
          </Button>
        </div>

        {/* 场景列表 */}
        <SceneCardList
          scenes={formData.scenes}
          characters={characters}
          onDelete={handleDeleteScene}
        />
      </Card>
    </div>
  );
}
