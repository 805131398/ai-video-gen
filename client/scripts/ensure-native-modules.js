#!/usr/bin/env node

/**
 * 确保 Electron 原生模块已构建
 * 检查 better-sqlite3 是否已为当前 Electron 版本编译
 * 如果没有，则运行 electron-rebuild
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ELECTRON_VERSION = '28.3.3';
const MODULE_NAME = 'better-sqlite3';
// 注意：.node 文件名使用下划线而不是连字符
const NATIVE_MODULE_FILE = 'better_sqlite3.node';

// 检查原生模块是否存在
function checkNativeModule() {
  const possiblePaths = [
    // pnpm .pnpm 目录
    path.join(process.cwd(), 'node_modules', '.pnpm', `${MODULE_NAME}@12.6.2`, 'node_modules', MODULE_NAME, 'build', 'Release', NATIVE_MODULE_FILE),
    path.join(process.cwd(), 'node_modules', '.pnpm', `${MODULE_NAME}@12.6.2`, 'node_modules', MODULE_NAME, 'build', 'Debug', NATIVE_MODULE_FILE),
    // 传统位置
    path.join(process.cwd(), 'node_modules', MODULE_NAME, 'build', 'Release', NATIVE_MODULE_FILE),
    path.join(process.cwd(), 'node_modules', MODULE_NAME, 'build', 'Debug', NATIVE_MODULE_FILE),
    // .ignored 目录（pnpm）
    path.join(process.cwd(), 'node_modules', '.ignored', MODULE_NAME, 'build', 'Release', NATIVE_MODULE_FILE),
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      console.log(`✓ 找到原生模块: ${filePath}`);
      return true;
    }
  }

  return false;
}

// 运行 electron-rebuild
function runRebuild() {
  console.log('\n正在为 Electron 重新构建原生模块...');
  console.log(`Electron 版本: ${ELECTRON_VERSION}`);
  console.log(`模块: ${MODULE_NAME}\n`);

  try {
    execSync(`npx electron-rebuild -f -w ${MODULE_NAME}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('\n✓ 原生模块构建完成！');
    return true;
  } catch (error) {
    console.error('\n✗ 构建失败:', error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('检查 Electron 原生模块...');

  if (checkNativeModule()) {
    console.log('✓ 原生模块已就绪，无需重新构建');
    process.exit(0);
  }

  console.log('⚠ 原生模块未找到，需要重新构建');

  const success = runRebuild();
  process.exit(success ? 0 : 1);
}

// 只在直接运行时执行
if (require.main === module) {
  main();
}

module.exports = { checkNativeModule, runRebuild };
