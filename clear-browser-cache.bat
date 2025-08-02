@echo off
chcp 65001 >nul
title 清理浏览器缓存和重启服务

echo.
echo ========================================================
echo        🧹 清理浏览器缓存和重启服务
echo ========================================================
echo.

echo 🔄 正在停止现有服务...
taskkill /F /IM node.exe >nul 2>&1

echo 🧹 清理临时文件...
del /Q /S "%TEMP%\*.*" >nul 2>&1
del /Q /S "%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache\*.*" >nul 2>&1
del /Q /S "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache\*.*" >nul 2>&1

echo 🚀 重新启动HTTPS服务器...
start /MIN "HTTPS服务器" node network-server-https.js

echo.
echo ✅ 缓存已清理，服务已重启
echo.
echo 💡 建议操作：
echo 1. 使用 Ctrl+F5 强制刷新浏览器页面
echo 2. 或者关闭浏览器重新打开
echo 3. 在浏览器中访问: https://192.168.3.119:3443
echo.
pause