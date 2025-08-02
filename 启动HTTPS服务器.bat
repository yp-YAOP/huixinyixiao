@echo off
chcp 65001 >nul
title 康复训练系统 - HTTPS服务器

echo.
echo ================================================
echo    🏥 康复训练系统 - HTTPS服务器启动器
echo ================================================
echo.

:: 检查Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到Node.js，请先运行"一键安装.bat"
    pause
    exit /b 1
)

:: 检查依赖
if not exist "node_modules" (
    echo 📦 安装依赖包...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

:: 停止已运行的服务器
echo 🧹 清理已占用的端口...
taskkill /f /im node.exe >nul 2>&1

:: 清理特定端口占用（更彻底的方法）
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 "') do (
    echo 🔄 清理端口3000占用进程%%a
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3443 "') do (
    echo 🔄 清理端口3443占用进程%%a  
    taskkill /f /pid %%a >nul 2>&1
)

:: 等待端口完全释放
echo ⏰ 等待端口释放...
timeout /t 3 >nul

echo.
echo 🚀 正在启动双协议服务器...
echo 💡 系统会自动检测并分配可用端口
echo 🔐 首次访问HTTPS需要信任自签名证书
echo ⏹️  按 Ctrl+C 停止服务器
echo.

:: 启动服务器
node network-server-https.js

pause