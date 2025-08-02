@echo off
chcp 65001 >nul
title 慧心一孝 - 摄像头支持服务器

echo.
echo =========================================================
echo         慧心一孝 摄像头支持服务器 (HTTP + HTTPS)
echo =========================================================
echo.

:: 检查Node.js是否已安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未检测到Node.js
    echo.
    echo 🔧 正在尝试自动安装Node.js...
    echo 📦 这可能需要几分钟时间，请耐心等待
    echo.
    
    :: 尝试使用winget安装Node.js
    winget install OpenJS.NodeJS --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Node.js安装成功！
        echo 🔄 请重新运行此脚本
        echo.
        pause
        exit /b 0
    ) else (
        echo ❌ 自动安装失败，请手动安装Node.js
        echo 📥 下载地址：https://nodejs.org/
        echo.
        echo 💡 安装完成后请重新运行此脚本
        echo.
        start https://nodejs.org/
        pause
        exit /b 1
    )
)

echo ✅ Node.js已安装
echo.

:: 检查依赖是否已安装
if not exist "node_modules" (
    echo 📦 正在安装依赖包...
    npm install express cors selfsigned
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败，请检查网络连接
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
    echo.
)

:: 获取本机IP地址
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set "ip=%%a"
    goto :found_ip
)
:found_ip
set "ip=%ip: =%"

echo 🖥️  双协议服务器将在以下地址启动:
echo     HTTP模式: http://localhost:3000 (仅本机摄像头可用)
echo     HTTP局域网: http://%ip%:3000 (摄像头不可用)
echo     HTTPS模式: https://%ip%:3443 (摄像头全面支持)
echo.
echo 📸 摄像头功能说明:
echo     • 需要使用HTTPS地址才能在局域网中使用摄像头
echo     • 首次访问需要信任自签名证书
echo     • Chrome: 点击"高级" → "继续前往..."
echo     • Firefox: 点击"高级" → "添加例外..."
echo.
echo 🔗 推荐访问地址:
echo     医护端: https://%ip%:3443
echo     患者端: https://%ip%:3443/patient
echo.
echo 🚀 正在启动双协议服务器...
echo ⏹️  按 Ctrl+C 停止服务器
echo.

:: 启动支持HTTPS的服务器
node network-server-https.js

pause