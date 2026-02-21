#!/usr/bin/env python3
"""
Icon Generation Script
======================
This script generates macOS and Windows application icons (PNG, ICNS, ICO) from a source image.
It automatically handles rounding corners (Squircle) and sizing.

Usage:
  1. Standard generation (applies squircle mask and resizes):
     python scripts/generate_icons.py source_image.png

  2. Fix AI-generated dark icons (removes noise edges and forces solid black background):
     python scripts/generate_icons.py source_image.png --black-bg

  3. Keep the original square shape (disables squircle mask):
     python scripts/generate_icons.py source_image.png --no-squircle

The generated files are automatically copied to your 'build/' and 'public/' directories.
"""
import os
import sys
import math
import subprocess
import shutil
import argparse
from PIL import Image, ImageDraw

def create_squircle_mask(size, padding=90):
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    n = 5
    
    # Calculate radius accounting for padding
    outer_rx, outer_ry = size//2, size//2
    rx, ry = outer_rx - padding, outer_ry - padding
    cx, cy = outer_rx, outer_ry

    points = []
    steps = 2000
    for i in range(steps):
        t = 2 * math.pi * i / steps
        x = cx + (abs(math.cos(t)) ** (2/n)) * rx * (1 if math.cos(t) >= 0 else -1)
        y = cy + (abs(math.sin(t)) ** (2/n)) * ry * (1 if math.sin(t) >= 0 else -1)
        points.append((x, y))

    draw.polygon(points, fill=255)
    return mask

def process_png(input_path, output_png_path, apply_squircle=True, make_black_bg=False):
    print(f"Processing source image: {input_path}")
    source_img = Image.open(input_path).convert("RGBA")
    source_img = source_img.resize((1024, 1024), Image.LANCZOS)
    
    # 第一步：如果是要求纯黑底色，我们必须先用黑框覆盖掉 AI 原图中四周（四个角落）的杂色和白角。
    if make_black_bg:
        draw = ImageDraw.Draw(source_img)
        b = 150 # 边框清理范围（足够大以盖住四个角的白色残留）
        w, h = 1024, 1024
        draw.rectangle([0, 0, w, b], fill=(0,0,0,255))
        draw.rectangle([0, h-b, w, h], fill=(0,0,0,255))
        draw.rectangle([0, b, b, h-b], fill=(0,0,0,255))
        draw.rectangle([w-b, b, w, h-b], fill=(0,0,0,255))
        
    # 第二步：确定有效主体内容的边界 (去掉所有杂色和大部分纯黑)
    pixels = source_img.load()
    w, h = 1024, 1024
    top, bottom, left, right = h, 0, w, 0
    
    for y in range(h):
        for x in range(w):
            r, g, b_val, a = pixels[x, y]
            brightness = (r + g + b_val) / 3
            if brightness > 30 and a > 0:
                if y < top: top = y
                if y > bottom: bottom = y
                if x < left: left = x
                if x > right: right = x
                    
    # 如果没找到有效主体（很罕见），保守设置
    if top >= bottom or left >= right:
        print("Warning: Could not detect content bounding box. Using default bounds.")
        left, top, right, bottom = 50, 50, 974, 974
        
    print(f"Detected graphic bounds: left={left}, top={top}, right={right}, bottom={bottom}")
    
    # 第三步：将主体切出来
    logo = source_img.crop((left, top, right, bottom))
    logo_w, logo_h = logo.size
    
    # 第四步：按要求将主体严格缩放到 1024 画布的 65% 视觉占比 (完美 macOS HIG 比例)
    target_max_size = int(1024 * 0.65)
    scale = target_max_size / max(logo_w, logo_h)
    new_w = int(logo_w * scale)
    new_h = int(logo_h * scale)
    logo = logo.resize((new_w, new_h), Image.LANCZOS)
    
    # 第五步：创建纯净的主画布
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 255 if make_black_bg else 0))
    paste_x = (1024 - new_w) // 2
    paste_y = (1024 - new_h) // 2
    
    # 第六步：如果需要纯黑背景，我们把缩放后的 logo 中的暗灰底色滤掉，揉进纯黑画布里
    if make_black_bg:
        logo_pixels = logo.load()
        for y in range(new_h):
            for x in range(new_w):
                r, g, b_val, a = logo_pixels[x, y]
                brightness = (r + g + b_val) / 3
                if brightness < 20: 
                    logo_pixels[x, y] = (0, 0, 0, 0) # 太暗的直接变透明
                elif brightness < 60:
                    alpha = int((brightness - 20) * (255 / 40))
                    logo_pixels[x, y] = (r, g, b_val, alpha)
                    
    # 居中贴上处理好的主体
    canvas.paste(logo, (paste_x, paste_y), logo)

    if apply_squircle:
        print("Applying perfect squircle mask...")
        mask = create_squircle_mask(1024)
        canvas.putalpha(mask)
        
    canvas.save(output_png_path, "PNG")
    print(f"Saved base transparent PNG to {output_png_path}")

def generate_ico(png_path, ico_path):
    print("Generating ICO format...")
    img = Image.open(png_path)
    sizes = [(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)]
    img.save(ico_path, format='ICO', sizes=sizes)
    print(f"Saved ICO to {ico_path}")

def generate_icns(png_path, icns_path):
    print("Generating ICNS format (macOS)...")
    if sys.platform != 'darwin':
        print("Skipping ICNS generation (not on macOS).")
        return
        
    iconset_dir = "/tmp/AppIcon.iconset"
    if os.path.exists(iconset_dir):
        shutil.rmtree(iconset_dir)
    os.makedirs(iconset_dir)
    
    sizes = [16, 32, 64, 128, 256, 512]
    for size in sizes:
        # Standard resolution
        subprocess.run(['sips', '-z', str(size), str(size), png_path, '--out', f"{iconset_dir}/icon_{size}x{size}.png"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # High resolution (@2x)
        subprocess.run(['sips', '-z', str(size*2), str(size*2), png_path, '--out', f"{iconset_dir}/icon_{size}x{size}@2x.png"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
    subprocess.run(['iconutil', '-c', 'icns', iconset_dir, '-o', icns_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    shutil.rmtree(iconset_dir)
    print(f"Saved ICNS to {icns_path}")

def main():
    parser = argparse.ArgumentParser(description="Generate App Icons (PNG, ICO, ICNS) from a source image.")
    parser.add_argument("source", help="Path to the source image (e.g., source.png)")
    parser.add_argument("--no-squircle", action="store_true", help="Disable macOS squircle mask applied to the PNG")
    parser.add_argument("--black-bg", action="store_true", help="Force a solid pure black background (useful for cleaning AI generated dark icons)")
    
    args = parser.parse_args()
    source_img = args.source
    
    if not os.path.exists(source_img):
        print(f"Error: Source image '{source_img}' not found.")
        sys.exit(1)
        
    # Project paths setup relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    client_dir = os.path.dirname(script_dir)
    build_dir = os.path.join(client_dir, "build")
    public_dir = os.path.join(client_dir, "public")
    
    os.makedirs(build_dir, exist_ok=True)
    os.makedirs(public_dir, exist_ok=True)
    
    # Target files
    build_png = os.path.join(build_dir, "icon.png")
    public_png = os.path.join(public_dir, "icon.png")
    build_ico = os.path.join(build_dir, "icon.ico")
    build_icns = os.path.join(build_dir, "icon.icns")
    public_icns = os.path.join(public_dir, "icon.icns")
    
    # 1. Process base PNG
    process_png(source_img, build_png, apply_squircle=not args.no_squircle, make_black_bg=args.black_bg)
    shutil.copy2(build_png, public_png)
    print(f"Copied PNG to {public_png}")
    
    # 2. Generate ICO for Windows
    generate_ico(build_png, build_ico)
    
    # 3. Generate ICNS for macOS
    generate_icns(build_png, build_icns)
    if os.path.exists(build_icns):
        shutil.copy2(build_icns, public_icns)
        print(f"Copied ICNS to {public_icns}")
        
    print("\n✨ All icon formats successfully generated and deployed to build/ and public/ directories!")

if __name__ == "__main__":
    main()
