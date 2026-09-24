#!/bin/bash
# 启动京东集团介绍视频的预览（Vite + Remotion Player + Malinton Studio）
#
# 前置：仓库根目录需先构建过一次（示例通过 file:../.. 引用库）
#   cd ../.. && npm install && npm run build
#
# 若 tsc 报 "No overload matches this call"：这是 file: 软链接导致 React 19
# 与库的 React 18 类型冲突，不影响 Vite 运行，可忽略。
set -e

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "[start.sh] 未检测到依赖，开始安装..."
  npm install --loglevel=error
fi

# 清单由 config.ts / script.ts / 字级时间戳生成，源码改动后需要重建
echo "[start.sh] 生成清单..."
node build-manifest.mjs

echo "[start.sh] 启动预览服务 (http://localhost:3100)..."
exec npm run start
