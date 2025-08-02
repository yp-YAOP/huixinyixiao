@echo off
chcp 65001 >nul
title 防火墙配置工具

echo.
echo ================================================
echo        🛡️ Windows防火墙配置工具
echo ================================================
echo.

echo 正在检查管理员权限...
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 此工具需要管理员权限
    echo 请右键点击此文件，选择"以管理员身份运行"
    pause
    exit /b 1
)

echo ✅ 管理员权限确认
echo.

echo 正在配置防火墙规则...
echo.

:: 添加HTTPS端口3443的入站规则
echo [1] 添加端口3443入站规则...
netsh advfirewall firewall delete rule name="康复训练系统-HTTPS" >nul 2>&1
netsh advfirewall firewall add rule name="康复训练系统-HTTPS" dir=in action=allow protocol=TCP localport=3443
if %errorlevel% equ 0 (
    echo ✅ HTTPS端口3443防火墙规则添加成功
) else (
    echo ❌ HTTPS端口3443防火墙规则添加失败
)

:: 添加HTTP端口3000的入站规则
echo [2] 添加端口3000入站规则...
netsh advfirewall firewall delete rule name="康复训练系统-HTTP" >nul 2>&1
netsh advfirewall firewall add rule name="康复训练系统-HTTP" dir=in action=allow protocol=TCP localport=3000
if %errorlevel% equ 0 (
    echo ✅ HTTP端口3000防火墙规则添加成功
) else (
    echo ❌ HTTP端口3000防火墙规则添加失败
)

echo.

:: 显示当前规则
echo [3] 当前防火墙规则:
netsh advfirewall firewall show rule name="康复训练系统-HTTPS"
netsh advfirewall firewall show rule name="康复训练系统-HTTP"

echo.
echo ================================================
echo                ✅ 配置完成
echo ================================================
echo.
echo 防火墙已配置完成，现在可以访问:
echo • HTTPS模式: https://192.168.3.119:3443
echo • HTTP模式:  http://192.168.3.119:3000
echo.
echo 请现在尝试重新连接系统。
echo.

pause