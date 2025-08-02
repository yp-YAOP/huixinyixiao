@echo off
chcp 65001 >nul
title 本地API服务器

echo.
echo ================================================
echo        🚀 启动本地API服务器
echo ================================================
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

echo 🔧 启动本地API服务器...
echo.

node api-server/local-api-server.js

pause