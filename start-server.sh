#!/bin/bash

# 慧心一孝 局域网数据传输服务器启动脚本 (Linux/Mac)

echo "========================================================="
echo "                慧心一孝 局域网数据传输服务器"
echo "========================================================="
echo

# 检查Node.js是否已安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未检测到Node.js，请先安装Node.js"
    echo "📥 下载地址：https://nodejs.org/"
    echo
    exit 1
fi

echo "✅ Node.js已安装"
echo

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖包..."
    npm install express cors
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败，请检查网络连接"
        exit 1
    fi
    echo "✅ 依赖安装完成"
    echo
fi

# 获取本机IP地址
if command -v ip &> /dev/null; then
    # Linux
    LOCAL_IP=$(ip route get 8.8.8.8 | awk -F"src " 'NR==1{split($2,a," ");print a[1]}')
elif command -v ifconfig &> /dev/null; then
    # Mac/BSD
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
else
    LOCAL_IP="localhost"
fi

echo "🖥️  服务器将在以下地址启动:"
echo "     本机访问: http://localhost:3000"
echo "     局域网访问: http://$LOCAL_IP:3000"
echo
echo "📋 使用说明:"
echo "     医护端: http://$LOCAL_IP:3000"
echo "     患者端: http://$LOCAL_IP:3000/patient"
echo
echo "🚀 正在启动服务器..."
echo "⏹️  按 Ctrl+C 停止服务器"
echo

# 启动服务器
node network-server.js