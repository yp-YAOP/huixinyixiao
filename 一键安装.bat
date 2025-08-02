@echo off
chcp 65001 >nul
title 慧心一孝 - 一键安装

echo.
echo =========================================================
echo                    慧心一孝 一键安装工具
echo =========================================================
echo.
echo 🚀 此工具将自动安装运行环境并启动服务器
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  需要管理员权限来安装Node.js
    echo 🔄 正在以管理员身份重新启动...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ✅ 已获得管理员权限
echo.

:: 检查Windows版本和包管理器
echo 🔍 检查系统环境...

:: 尝试使用winget
winget --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 检测到Windows包管理器 (winget)
    goto :install_with_winget
)

:: 尝试使用chocolatey
choco --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 检测到Chocolatey包管理器
    goto :install_with_choco
)

:: 手动安装提示
echo ❌ 未检测到包管理器，需要手动安装
goto :manual_install

:install_with_winget
echo.
echo 📦 使用winget安装Node.js...
winget install OpenJS.NodeJS --silent --accept-package-agreements --accept-source-agreements
if %errorlevel% equ 0 (
    echo ✅ Node.js安装成功！
    goto :start_server
) else (
    echo ❌ winget安装失败，尝试其他方法...
    goto :manual_install
)

:install_with_choco
echo.
echo 📦 使用Chocolatey安装Node.js...
choco install nodejs -y
if %errorlevel% equ 0 (
    echo ✅ Node.js安装成功！
    goto :start_server
) else (
    echo ❌ Chocolatey安装失败，尝试其他方法...
    goto :manual_install
)

:manual_install
echo.
echo 🔧 手动安装Node.js:
echo 1. 正在打开Node.js官方下载页面...
echo 2. 请下载并安装最新版本的Node.js
echo 3. 安装完成后重新运行此脚本
echo.
start https://nodejs.org/
echo ⏳ 等待您完成Node.js安装...
pause
goto :check_node

:check_node
echo.
echo 🔍 检查Node.js安装状态...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js尚未安装或未正确配置
    echo 💡 请确保Node.js已安装并重启命令提示符
    pause
    exit /b 1
)

:start_server
echo.
echo ✅ Node.js环境就绪！
echo.
echo 🚀 正在启动服务器...
call start-server-camera.bat

pause