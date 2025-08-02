@echo off
chcp 65001 >nul
title 完整本地化服务启动器

echo.
echo ========================================================
echo        🚀 慧心一孝 - 完整本地化服务启动器
echo ========================================================
echo.

:: 检查Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到Node.js，请先安装Node.js
    pause
    exit /b 1
)

:: 检查依赖
if not exist "..\node_modules" (
    echo 📦 安装依赖包...
    cd ..
    npm install
    cd local-models
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

echo 🔧 启动服务中...
echo.

:: 启动本地API服务器（后台运行）
echo ⚡ 启动本地API服务器...
start /MIN "本地API服务器" node api-server/local-api-server.js

:: 等待API服务器启动
timeout /t 3 /nobreak >nul

:: 启动HTTPS服务器
echo 🌐 启动HTTPS服务器...
cd ..
node network-server-https.js

echo.
echo ❌ 服务器已停止
pause