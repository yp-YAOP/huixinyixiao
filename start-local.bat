@echo off
title Rehab Training Center

cls
echo.
echo ===============================================
echo           Rehab Training Center
echo              Local Server Startup
echo ===============================================
echo.

echo Game List:
echo   Medical Station  - http://localhost:8080/yihu.html
echo   Patient Hub      - http://localhost:8080/huanzhe.html
echo   Coordination     - http://localhost:8080/dazhuankuai/dazhuankuai.html
echo   Reaction Speed   - http://localhost:8080/shuiguo/index.html
echo   Cognitive        - http://localhost:8080/renzhi/renzhi.html
echo.

echo Data Sync:
echo   Auto upload every 15 seconds
echo   Real-time progress tracking
echo   Medical station notifications
echo.

echo -------------------------------------------------------
echo.

echo Checking Python...
python --version >nul 2>&1
if errorlevel 1 goto check_node

echo Python found! Starting server...
echo.
echo Server: http://localhost:8080
echo Stop: Press Ctrl+C
echo.
echo -----------------------------------------------
echo.
python -m http.server 8080
echo.
echo Server stopped.
pause
goto end

:check_node
echo Python not found. Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 goto no_tools

echo Node.js found! Starting server...
echo.
echo Server: http://localhost:8080
echo Stop: Press Ctrl+C
echo.
echo -----------------------------------------------
echo.
npx http-server -p 8080
echo.
echo Server stopped.
pause
goto end

:no_tools
echo.
echo No server tools found.
echo.
echo Please install:
echo   1. Python - https://www.python.org/downloads/
echo   2. Node.js - https://nodejs.org/
echo.
echo -----------------------------------------------
echo.
echo Press any key to exit...
pause >nul

:end