@echo off
chcp 65001 >nul
title 慧心一孝 - 网络诊断工具

echo.
echo =========================================================
echo                    网络诊断工具
echo =========================================================
echo.

echo 🔍 正在检查网络配置...
echo.

:: 获取本机IP地址
echo [1] 本机网络配置:
ipconfig | findstr /i "IPv4"
echo.

:: 检查网关
echo [2] 网关信息:
ipconfig | findstr /i "默认网关"
ipconfig | findstr /i "Default Gateway"
echo.

:: 检查路由表
echo [3] 网络路由:
route print 0.0.0.0
echo.

:: Ping测试
echo [4] 网络连通性测试:
echo 请输入另一台电脑的IP地址进行测试:
set /p target_ip="目标IP地址: "

if not "%target_ip%"=="" (
    echo.
    echo 正在测试连接到 %target_ip%...
    ping -n 4 %target_ip%
    echo.
    
    echo 测试端口3000连通性...
    telnet %target_ip% 3000 2>nul
    if %errorlevel% equ 0 (
        echo ✅ 端口3000可达
    ) else (
        echo ❌ 端口3000不可达
    )
)

echo.
echo =========================================================
echo                      诊断建议
echo =========================================================
echo.

echo 📋 如果两台电脑IP地址网段不同（如 192.168.48.x 和 192.168.204.x）:
echo.
echo 🔧 解决方法：
echo 1. 重启路由器，让两台电脑重新获取IP
echo 2. 手动设置相同网段的静态IP
echo 3. 检查路由器是否开启了客户端隔离
echo.
echo 📱 手动设置静态IP方法：
echo 1. 打开"网络和共享中心"
echo 2. 点击"更改适配器设置"
echo 3. 右键WiFi连接 → 属性
echo 4. 选择"Internet协议版本4" → 属性
echo 5. 选择"使用下面的IP地址"
echo    - 电脑A: 192.168.1.100, 子网掩码: 255.255.255.0, 网关: 192.168.1.1
echo    - 电脑B: 192.168.1.101, 子网掩码: 255.255.255.0, 网关: 192.168.1.1
echo.

pause