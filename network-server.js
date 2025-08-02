const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务
app.use('/shuiguo', express.static(path.join(__dirname, 'shuiguo')));
app.use('/dazhuankuai', express.static(path.join(__dirname, 'dazhuankuai')));
app.use('/renzhi', express.static(path.join(__dirname, 'renzhi')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(__dirname));

// 存储游戏数据
let gameDataStorage = [];
let connectedClients = new Set();

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'yihu.html'));
});

app.get('/patient', (req, res) => {
    res.sendFile(path.join(__dirname, 'huanzhe.html'));
});

// 游戏路由
app.get('/game/brick', (req, res) => {
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const redirectUrl = queryString ? 
        `/dazhuankuai/dazhuankuai.html?${queryString}&server=http://${req.hostname}:${PORT}` : 
        `/dazhuankuai/dazhuankuai.html?server=http://${req.hostname}:${PORT}`;
    res.redirect(redirectUrl);
});

app.get('/game/fruit', (req, res) => {
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const redirectUrl = queryString ? 
        `/shuiguo/index.html?${queryString}&server=http://${req.hostname}:${PORT}` : 
        `/shuiguo/index.html?server=http://${req.hostname}:${PORT}`;
    res.redirect(redirectUrl);
});

app.get('/game/cognitive', (req, res) => {
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const redirectUrl = queryString ? 
        `/renzhi/renzhi.html?${queryString}&server=http://${req.hostname}:${PORT}` : 
        `/renzhi/renzhi.html?server=http://${req.hostname}:${PORT}`;
    res.redirect(redirectUrl);
});

// SSE 实时数据推送
app.get('/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    connectedClients.add(res);
    console.log(`医护端连接，当前连接数: ${connectedClients.size}`);

    res.write(`data: ${JSON.stringify({ type: 'init', message: '医护端已连接' })}\n\n`);

    req.on('close', () => {
        connectedClients.delete(res);
        console.log(`医护端断开连接，当前连接数: ${connectedClients.size}`);
    });
});

// 接收游戏数据
app.post('/upload-game-data', (req, res) => {
    const gameData = req.body;
    gameData.timestamp = new Date().toISOString();
    gameData.serverTime = new Date().toLocaleString('zh-CN');
    
    console.log('收到游戏数据:', gameData);
    
    gameDataStorage.push(gameData);
    
    if (gameDataStorage.length > 100) {
        gameDataStorage = gameDataStorage.slice(-100);
    }
    
    const message = {
        type: 'game_data',
        data: gameData,
        totalRecords: gameDataStorage.length
    };
    
    connectedClients.forEach(client => {
        try {
            client.write(`data: ${JSON.stringify(message)}\n\n`);
        } catch (error) {
            console.error('推送数据失败:', error);
            connectedClients.delete(client);
        }
    });
    
    res.json({ 
        success: true, 
        message: '数据接收成功',
        connectedClients: connectedClients.size
    });
});

// 获取游戏数据
app.get('/get-game-data', (req, res) => {
    res.json({
        success: true,
        data: gameDataStorage,
        totalRecords: gameDataStorage.length
    });
});

// 服务器状态
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        connectedClients: connectedClients.size,
        totalRecords: gameDataStorage.length,
        serverTime: new Date().toLocaleString('zh-CN')
    });
});

// 获取本机IP地址
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const interfaceName in interfaces) {
        const networkInterface = interfaces[interfaceName];
        for (const connection of networkInterface) {
            if (connection.family === 'IPv4' && !connection.internal) {
                return connection.address;
            }
        }
    }
    return 'localhost';
}

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log('='.repeat(60));
    console.log('🚀 慧心一孝 康复训练服务器已启动');
    console.log('='.repeat(60));
    console.log(`📡 HTTP服务器: http://${localIP}:${PORT}`);
    console.log(`🏥 医护端访问: http://${localIP}:${PORT}`);
    console.log(`👨‍⚕️ 患者端访问: http://${localIP}:${PORT}/patient`);
    console.log('='.repeat(60));
    console.log('💡 说明: HTTP模式下摄像头仅localhost可用');
    console.log('⏹️  按 Ctrl+C 停止服务器');
    console.log('');
});

process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    process.exit(0);
});