@echo off
chcp 65001 >nul
title 慧心一孝 - 系统环境检查

echo.
echo =========================================================
echo                    系统环境检查工具
echo =========================================================
echo.
echo 🔍 正在检查系统运行环境...
echo.

set /a score=0
set /a total=6

:: 检查1: 操作系统版本
echo [1/6] 检查操作系统版本...
ver | find "Windows" >nul
if %errorlevel% equ 0 (
    echo ✅ Windows系统 - 支持
    set /a score+=1
) else (
    echo ❌ 非Windows系统 - 可能不支持某些功能
)

:: 检查2: Node.js是否已安装
echo [2/6] 检查Node.js安装状态...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do (
        echo ✅ Node.js已安装 - 版本: %%i
        set /a score+=1
    )
) else (
    echo ❌ Node.js未安装 - 需要安装
)

:: 检查3: npm是否可用
echo [3/6] 检查npm包管理器...
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do (
        echo ✅ npm可用 - 版本: %%i
        set /a score+=1
    )
) else (
    echo ❌ npm不可用 - 随Node.js一起安装
)

:: 检查4: 端口3000是否被占用
echo [4/6] 检查端口3000占用情况...
netstat -an | find ":3000" >nul
if %errorlevel% equ 0 (
    echo ⚠️  端口3000已被占用 - 可能影响服务器启动
) else (
    echo ✅ 端口3000可用
    set /a score+=1
)

:: 检查5: 防火墙状态
echo [5/6] 检查防火墙状态...
netsh advfirewall show allprofiles state | find "ON" >nul
if %errorlevel% equ 0 (
    echo ⚠️  防火墙已启用 - 可能需要允许端口3000
) else (
    echo ✅ 防火墙已关闭 - 网络通信无阻碍
    set /a score+=1
)

:: 检查6: 网络连接
echo [6/6] 检查网络连接...
ping -n 1 www.baidu.com >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 网络连接正常
    set /a score+=1
) else (
    echo ❌ 网络连接异常 - 检查网络设置
)

echo.
echo =========================================================
echo                      检查结果汇总
echo =========================================================
echo.
echo 📊 系统评分: %score%/%total%
echo.

if %score% geq 5 (
    echo ✅ 系统环境良好，可以正常运行！
    echo 💡 建议：运行 start-server-camera.bat 启动HTTPS服务器
) else if %score% geq 3 (
    echo ⚠️  系统环境基本满足，但有部分问题需要解决
    echo 💡 建议：按照提示解决问题后再启动服务器
) else (
    echo ❌ 系统环境不满足运行要求
    echo 💡 建议：运行 一键安装.bat 自动配置环境
)

echo.
echo =========================================================
echo                      详细说明
echo =========================================================
echo.
if %score% lss 6 (
    echo 🔧 如需解决问题：
    echo.
    node --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo • Node.js未安装：运行 一键安装.bat 或访问 https://nodejs.org/
    )
    
    netstat -an | find ":3000" >nul
    if %errorlevel% equ 0 (
        echo • 端口3000被占用：关闭占用该端口的程序
    )
    
    netsh advfirewall show allprofiles state | find "ON" >nul
    if %errorlevel% equ 0 (
        echo • 防火墙已启用：运行服务器时选择"允许访问"
    )
    
    ping -n 1 www.baidu.com >nul 2>&1
    if %errorlevel% neq 0 (
        echo • 网络连接异常：检查网络设置和连接
    )
)

echo.
echo 📋 下一步操作：
if %score% geq 4 (
    echo 1. 运行 start-server-camera.bat 启动HTTPS服务器
    echo 2. 在浏览器中访问显示的地址
    echo 3. 参考"网络传输使用说明.md"配置客户端
) else (
    echo 1. 运行 一键安装.bat 自动配置环境
    echo 2. 或手动解决上述问题
    echo 3. 重新运行此检查工具验证
)

echo.
pause