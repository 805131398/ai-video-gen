import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Plus } from 'lucide-react';
import { getProjects } from '../services/project';
import { getCharacters, deleteCharacter, getDigitalHumans } from '../services/character';
import { Project, ProjectCharacter } from '../types';
import CharacterCard from '../components/project/CharacterCard';

export default function CharacterManagement() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [characters, setCharacters] = useState<ProjectCharacter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter states
    const [searchWord, setSearchWord] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [projectsData, allChars] = await Promise.all([
                getProjects(),
                getCharacters()
            ]);
            setProjects(projectsData);

            // Enrich each character with digital humans if not already present
            const charsEnriched: ProjectCharacter[] = await Promise.all(
                allChars.map(async (char) => {
                    let digitalHumans = char.digitalHumans || [];
                    if (!digitalHumans.length) {
                        try {
                            digitalHumans = await getDigitalHumans(char.id);
                        } catch {
                            digitalHumans = [];
                        }
                    }
                    return { ...char, digitalHumans };
                })
            );

            // Sort by update time
            charsEnriched.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            setCharacters(charsEnriched);
        } catch (err: any) {
            setError(err.response?.data?.message || '加载失败');
        } finally {
            setLoading(false);
        }
    };

    const handleNewCharacter = () => {
        navigate('/characters/new');
    };

    const handleEditCharacter = (character: ProjectCharacter) => {
        if (character.projectId) {
            navigate(`/projects/${character.projectId}/characters/${character.id}/edit`);
        } else {
            navigate(`/characters/${character.id}/edit`);
        }
    };

    const handleGenerateDigitalHuman = (character: ProjectCharacter) => {
        if (character.projectId) {
            navigate(`/projects/${character.projectId}/characters/${character.id}/edit#digital-human`);
        } else {
            navigate(`/characters/${character.id}/edit#digital-human`);
        }
    };

    const handleDeleteCharacter = async (character: ProjectCharacter) => {
        if (!confirm(`确定要删除角色 "${character.name}" 吗？此操作不可恢复。`)) return;

        try {
            await deleteCharacter(character.id);
            setCharacters(characters.filter(c => c.id !== character.id));
        } catch (err: any) {
            alert(err.response?.data?.error || '删除失败');
        }
    };

    const filteredCharacters = useMemo(() => {
        return characters.filter(char => {
            const matchProject = selectedProjectId === 'all' || char.projectId === selectedProjectId || (selectedProjectId === 'independent' && !char.projectId);
            const matchSearch = char.name.toLowerCase().includes(searchWord.toLowerCase()) ||
                (char.description && char.description.toLowerCase().includes(searchWord.toLowerCase()));
            return matchProject && matchSearch;
        });
    }, [characters, selectedProjectId, searchWord]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-gray-600">加载中...</div>
            </div>
        );
    }

    return (
        <div className="px-6 py-6 h-full flex flex-col">
            {/* 标题 + 新增按钮 */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#1E293B] mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        角色管理
                    </h1>
                    <p className="text-[#64748B]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                        管理所有项目中的角色
                    </p>
                </div>
                <button
                    onClick={handleNewCharacter}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    新增角色
                </button>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                    {error}
                </div>
            )}

            {/* 筛选过滤区 */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="搜索角色名称或描述..."
                        value={searchWord}
                        onChange={(e) => setSearchWord(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-64 flex items-center gap-2">
                    <Filter className="w-5 h-5 text-slate-500" />
                    <select
                        className="block w-full py-2 px-3 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                    >
                        <option value="all">所有状态</option>
                        <option value="independent">独立角色</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.title || p.topic}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 角色列表 */}
            {filteredCharacters.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center flex-1 flex flex-col items-center justify-center">
                    <div className="text-slate-400 mb-4">
                        <Users className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    </div>
                    <p className="text-slate-600 mb-4 font-medium">没有找到匹配的角色</p>
                    <button
                        onClick={handleNewCharacter}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        新增角色
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 overflow-y-auto">
                    {filteredCharacters.map((character) => (
                        <CharacterCard
                            key={character.id}
                            character={character}
                            onEdit={handleEditCharacter}
                            onDelete={() => handleDeleteCharacter(character)}
                            onGenerateDigitalHuman={handleGenerateDigitalHuman}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
