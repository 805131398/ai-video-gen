import os
import re

base_dir = '/Users/zhanghao/SoftwareDevelopmentWork/ai-video-gen/client/src/pages'
app_tsx = '/Users/zhanghao/SoftwareDevelopmentWork/ai-video-gen/client/src/App.tsx'

mapping = {
    'auth': ['Login.tsx', 'Register.tsx', 'Activate.tsx', 'Profile.tsx'],
    'project': ['ProjectManagement.tsx', 'ProjectNew.tsx', 'ProjectDetail.tsx', 'ProjectDetail.part1.txt', 'ProjectScript.tsx', 'ProjectScripts.tsx'],
    'character': ['CharacterManagement.tsx', 'CharacterNew.tsx', 'CharacterEdit.tsx'],
    'script': ['ScriptManagement.tsx', 'ScriptEditor.tsx'],
    'scene': ['SceneEdit.tsx', 'SceneVideos.tsx', 'SceneVideoGenerate.tsx'],
    'system': ['AiToolManagement.tsx', 'AiChat.tsx', 'UsageStats.tsx']
}

# 1. Create directories and move files, then update their internal imports
for folder, files in mapping.items():
    folder_path = os.path.join(base_dir, folder)
    os.makedirs(folder_path, exist_ok=True)
    for file in files:
        old_path = os.path.join(base_dir, file)
        new_path = os.path.join(folder_path, file)
        if os.path.exists(old_path):
            os.rename(old_path, new_path)
            
            # Read file, update references
            if file.endswith('.tsx') or file.endswith('.ts'):
                with open(new_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # We need to replace `from '../` with `from '../../`
                # And `import '../` with `import '../../`
                new_content = re.sub(r'(from\s+[\'"])\.\./', r'\1../../', content)
                new_content = re.sub(r'(import\s+[\'"])\.\./', r'\1../../', new_content)
                
                if new_content != content:
                    with open(new_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)

# 2. Update App.tsx imports
with open(app_tsx, 'r', encoding='utf-8') as f:
    app_content = f.read()

for folder, files in mapping.items():
    for file in files:
        if file.endswith('.tsx'):
            comp_name = file[:-4]  # Remove .tsx
            # Old import: import Comp from './pages/Comp';
            # New import: import Comp from './pages/folder/Comp';
            app_content = re.sub(
                rf"import\s+{comp_name}\s+from\s+['\"]./pages/{comp_name}['\"];",
                f"import {comp_name} from './pages/{folder}/{comp_name}';",
                app_content
            )

with open(app_tsx, 'w', encoding='utf-8') as f:
    f.write(app_content)

print("Migration complete.")
