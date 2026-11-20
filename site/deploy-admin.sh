#!/bin/bash
# ============================================================
# 部署 admin 文件到 Railway 服务器
# 使用方法: bash deploy-admin.sh
# ============================================================
set -e

echo "=== 1. 检查 Railway CLI ==="
if ! command -v railway &> /dev/null; then
    echo "正在安装 Railway CLI..."
    npm install -g @railway/cli
fi

echo "=== 2. 登录 Railway ==="
railway login

echo "=== 3. 链接项目 ==="
railway link

echo "=== 4. 上传 admin 文件 ==="
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUTS_DIR="$(cd "$SCRIPT_DIR/../../../2026-07-30/https-cms-admin-production-e768-up/outputs" && pwd)"
echo "源文件目录: $OUTPUTS_DIR"

railway run "mkdir -p admin/static"

# 使用 base64 编码确保文件完整传输
railway run "cat > admin/static/admin.html << 'ENDOFFILE'
$(cat "$OUTPUTS_DIR/admin.html")
ENDOFFILE"

railway run "cat > admin/static/admin.css << 'ENDOFFILE'
$(cat "$OUTPUTS_DIR/admin.css")
ENDOFFILE"

railway run "cat > admin/static/admin.js << 'ENDOFFILE'
$(cat "$OUTPUTS_DIR/admin.js")
ENDOFFILE"

echo "=== ✅ admin 文件已上传到 Railway 服务器 ==="
echo "=== 刷新页面即可看到效果 ==="
