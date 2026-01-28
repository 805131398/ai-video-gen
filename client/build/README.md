# 应用图标

请将应用图标文件放置在此目录下：

- **icon.png** - Linux 图标（推荐尺寸：512x512 或 1024x1024）
- **icon.ico** - Windows 图标（包含多个尺寸：16x16, 32x32, 48x48, 256x256）
- **icon.icns** - macOS 图标（包含多个尺寸）

## 图标要求

### PNG (Linux)
- 格式：PNG
- 推荐尺寸：512x512 或 1024x1024
- 透明背景

### ICO (Windows)
- 格式：ICO
- 包含多个尺寸：16x16, 32x32, 48x48, 256x256
- 可以使用在线工具将 PNG 转换为 ICO：https://www.icoconverter.com/

### ICNS (macOS)
- 格式：ICNS
- 包含多个尺寸（16x16 到 1024x1024）
- 可以使用 `iconutil` 命令行工具或在线工具转换

## 快速生成图标

如果你有一个高质量的 PNG 图标（1024x1024），可以使用以下工具生成所有平台的图标：

```bash
# 使用 electron-icon-builder
npm install -g electron-icon-builder
electron-icon-builder --input=./icon-source.png --output=./build
```

或者使用在线工具：
- https://www.electron.build/icons
- https://icon.kitchen/
