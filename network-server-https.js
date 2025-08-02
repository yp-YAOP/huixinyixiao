const express = require('express');
const https = require('https');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const HTTP_PORT = 3000;
const HTTPS_PORT = 3443;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务 - 为每个游戏目录单独配置
app.use('/shuiguo', express.static(path.join(__dirname, 'shuiguo')));
app.use('/dazhuankuai', express.static(path.join(__dirname, 'dazhuankuai')));
app.use('/renzhi', express.static(path.join(__dirname, 'renzhi')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(__dirname)); // 服务其他静态文件

// 存储游戏数据
let gameDataStorage = [];
let connectedClients = new Set();

// 服务静态文件
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'yihu.html'));
});

app.get('/patient', (req, res) => {
    res.sendFile(path.join(__dirname, 'huanzhe.html'));
});

// 游戏路由 - 重定向到正确的静态文件路径
app.get('/game/brick', (req, res) => {
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const protocol = req.secure ? 'https' : 'http';
    const port = req.secure ? HTTPS_PORT : HTTP_PORT;
    const redirectUrl = queryString ? 
        `/dazhuankuai/dazhuankuai.html?${queryString}&server=${protocol}://${req.hostname}:${port}` : 
        `/dazhuankuai/dazhuankuai.html?server=${protocol}://${req.hostname}:${port}`;
    res.redirect(redirectUrl);
});

app.get('/game/fruit', (req, res) => {
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const protocol = req.secure ? 'https' : 'http';
    const port = req.secure ? HTTPS_PORT : HTTP_PORT;
    const redirectUrl = queryString ? 
        `/shuiguo/index.html?${queryString}&server=${protocol}://${req.hostname}:${port}` : 
        `/shuiguo/index.html?server=${protocol}://${req.hostname}:${port}`;
    res.redirect(redirectUrl);
});

app.get('/game/cognitive', (req, res) => {
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const protocol = req.secure ? 'https' : 'http';
    const port = req.secure ? HTTPS_PORT : HTTP_PORT;
    const redirectUrl = queryString ? 
        `/renzhi/renzhi.html?${queryString}&server=${protocol}://${req.hostname}:${port}` : 
        `/renzhi/renzhi.html?server=${protocol}://${req.hostname}:${port}`;
    res.redirect(redirectUrl);
});

// SSE (Server-Sent Events) 用于实时推送数据到医护端
app.get('/stream', (req, res) => {
    // 设置完整的CORS和SSE头部
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'false',
        'X-Accel-Buffering': 'no'  // 禁用Nginx缓冲
    });

    connectedClients.add(res);
    console.log(`医护端连接，当前连接数: ${connectedClients.size}`);

    // 发送初始数据
    try {
        res.write(`data: ${JSON.stringify({ type: 'init', message: '医护端已连接', timestamp: new Date().toISOString() })}\n\n`);
        
        // 发送心跳包以保持连接
        const heartbeat = setInterval(() => {
            try {
                res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
            } catch (error) {
                console.error('心跳发送失败:', error);
                clearInterval(heartbeat);
                connectedClients.delete(res);
            }
        }, 30000); // 每30秒发送心跳
        
        // 客户端断开连接时清理
        req.on('close', () => {
            clearInterval(heartbeat);
            connectedClients.delete(res);
            console.log(`医护端断开连接，当前连接数: ${connectedClients.size}`);
        });
        
        req.on('error', () => {
            clearInterval(heartbeat);
            connectedClients.delete(res);
        });
        
    } catch (error) {
        console.error('EventSource初始化失败:', error);
        connectedClients.delete(res);
        res.end();
    }
});

// 接收患者端游戏数据
app.post('/upload-game-data', (req, res) => {
    const gameData = req.body;
    gameData.timestamp = new Date().toISOString();
    gameData.serverTime = new Date().toLocaleString('zh-CN');
    
    console.log('收到游戏数据:', gameData);
    
    // 存储数据
    gameDataStorage.push(gameData);
    
    // 保持最近100条记录
    if (gameDataStorage.length > 100) {
        gameDataStorage = gameDataStorage.slice(-100);
    }
    
    // 实时推送到所有连接的医护端
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

// 获取所有游戏数据
app.get('/get-game-data', (req, res) => {
    res.json({
        success: true,
        data: gameDataStorage,
        totalRecords: gameDataStorage.length
    });
});

// 清空游戏数据
app.delete('/clear-game-data', (req, res) => {
    gameDataStorage = [];
    console.log('游戏数据已清空');
    
    const message = {
        type: 'data_cleared',
        message: '游戏数据已清空'
    };
    
    connectedClients.forEach(client => {
        try {
            client.write(`data: ${JSON.stringify(message)}\n\n`);
        } catch (error) {
            connectedClients.delete(client);
        }
    });
    
    res.json({ success: true, message: '数据清空成功' });
});

// 获取服务器状态
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        connectedClients: connectedClients.size,
        totalRecords: gameDataStorage.length,
        serverTime: new Date().toLocaleString('zh-CN'),
        protocols: {
            http: `http://${req.hostname}:${HTTP_PORT}`,
            https: `https://${req.hostname}:${HTTPS_PORT}`
        }
    });
});

// 生成自签名证书的函数
function generateSelfSignedCert() {
    const selfsigned = require('selfsigned');
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, { 
        days: 365,
        keySize: 2048,
        extensions: [
            {
                name: 'subjectAltName',
                altNames: [
                    { type: 2, value: 'localhost' },
                    { type: 2, value: '*.local' },
                    { type: 7, ip: '127.0.0.1' },
                    { type: 7, ip: '192.168.1.1' },
                    { type: 7, ip: '192.168.0.1' },
                    { type: 7, ip: '10.0.0.1' }
                ]
            }
        ]
    });
    
    return {
        key: pems.private,
        cert: pems.cert
    };
}

// 检查端口是否可用
function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = require('net').createServer();
        server.listen(port, (err) => {
            if (err) {
                resolve(false);
            } else {
                server.once('close', () => resolve(true));
                server.close();
            }
        });
        server.on('error', () => resolve(false));
    });
}

// 寻找可用端口
async function findAvailablePort(startPort, maxTries = 10) {
    for (let i = 0; i < maxTries; i++) {
        const port = startPort + i;
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    throw new Error(`无法找到从${startPort}开始的可用端口`);
}

// 启动服务器
async function startServers() {
    // 获取本机IP地址 - 改进的检测逻辑
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let localIP = 'localhost';
    let wlanIP = null;
    let ethernetIP = null;
    let otherIP = null;
    
    // 优先级：WLAN > 以太网 > 其他（过滤虚拟网卡）
    for (const interfaceName in interfaces) {
        const networkInterface = interfaces[interfaceName];
        for (const connection of networkInterface) {
            if (connection.family === 'IPv4' && !connection.internal) {
                // 跳过VMware虚拟网卡
                if (interfaceName.toLowerCase().includes('vmware') || 
                    interfaceName.toLowerCase().includes('virtualbox') ||
                    interfaceName.toLowerCase().includes('hyper-v')) {
                    continue;
                }
                
                // 优先选择WLAN接口
                if (interfaceName.toLowerCase().includes('wlan') || 
                    interfaceName.toLowerCase().includes('wi-fi') ||
                    interfaceName.toLowerCase().includes('wireless')) {
                    wlanIP = connection.address;
                } 
                // 其次选择以太网接口
                else if (interfaceName.toLowerCase().includes('ethernet') || 
                         interfaceName.toLowerCase().includes('以太网')) {
                    ethernetIP = connection.address;
                }
                // 最后选择其他接口
                else {
                    if (!otherIP) otherIP = connection.address;
                }
            }
        }
    }
    
    // 按优先级选择IP
    localIP = wlanIP || ethernetIP || otherIP || 'localhost';
    
    console.log(`🌐 检测到本机IP地址: ${localIP}`);

    // 使用固定端口，如果占用就跳过对应服务器
    const httpPort = HTTP_PORT;
    const httpsPort = HTTPS_PORT;

    // 启动HTTP服务器
    const httpServer = http.createServer(app);
    httpServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`❌ HTTP端口 ${httpPort} 已被占用，仅启动HTTPS服务器`);
        } else {
            console.error('❌ HTTP服务器启动失败:', err.message);
        }
    });
    
    httpServer.listen(httpPort, '0.0.0.0', () => {
        console.log('='.repeat(60));
        console.log('🚀 慧心一孝 双协议数据传输服务器已启动');
        console.log('='.repeat(60));
        console.log(`📡 HTTP服务器: http://${localIP}:${httpPort}`);
        console.log(`🏥 医护端访问: http://${localIP}:${httpPort}`);
        console.log(`👨‍⚕️ 患者端访问: http://${localIP}:${httpPort}/patient`);
    });

    // 尝试启动HTTPS服务器
    try {
        let httpsOptions;
        
        // 尝试使用现有证书文件
        if (fs.existsSync('server.key') && fs.existsSync('server.crt')) {
            httpsOptions = {
                key: fs.readFileSync('server.key'),
                cert: fs.readFileSync('server.crt')
            };
            console.log('📄 使用现有SSL证书文件');
        } else {
            // 生成自签名证书
            try {
                const cert = generateSelfSignedCert();
                httpsOptions = cert;
                
                // 保存证书文件供后续使用
                fs.writeFileSync('server.key', cert.key);
                fs.writeFileSync('server.crt', cert.cert);
                console.log('🔐 已生成自签名SSL证书');
            } catch (certError) {
                console.log('⚠️  无法生成SSL证书，跳过HTTPS服务器启动');
                console.log('💡 如需摄像头功能，请安装: npm install selfsigned');
                printUsage(localIP, httpPort, httpsPort);
                return;
            }
        }

        const httpsServer = https.createServer(httpsOptions, app);
        
        // 添加错误处理
        httpsServer.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`❌ HTTPS端口 ${httpsPort} 已被占用，跳过HTTPS服务器`);
                printUsage(localIP, httpPort, null);
            } else {
                console.error('❌ HTTPS服务器启动失败:', err.message);
                printUsage(localIP, httpPort, null);
            }
        });
        
        httpsServer.listen(httpsPort, '0.0.0.0', () => {
            console.log(`🔒 HTTPS服务器: https://${localIP}:${httpsPort}`);
            console.log(`🏥 医护端访问(HTTPS): https://${localIP}:${httpsPort}`);
            console.log(`👨‍⚕️ 患者端访问(HTTPS): https://${localIP}:${httpsPort}/patient`);
            console.log('');
            console.log('📸 摄像头功能说明:');
            console.log('  • HTTP模式: 仅localhost可用摄像头');
            console.log('  • HTTPS模式: 所有地址都可用摄像头(需要信任证书)');
            printUsage(localIP, httpPort, httpsPort);
        });

    } catch (error) {
        console.log('⚠️  HTTPS服务器启动失败:', error.message);
        printUsage(localIP, httpPort, httpsPort);
    }
}

function printUsage(localIP, httpPort = HTTP_PORT, httpsPort = HTTPS_PORT) {
    console.log('='.repeat(60));
    console.log('💡 使用说明:');
    console.log('1. 确保两台电脑在同一局域网内');
    console.log(`2. 医护端: http://${localIP}:${httpPort} 或 https://${localIP}:${httpsPort}`);
    console.log(`3. 患者端: http://${localIP}:${httpPort}/patient 或 https://${localIP}:${httpsPort}/patient`);
    console.log('4. 如需摄像头功能，请使用HTTPS地址');
    console.log('5. 首次访问HTTPS需要信任自签名证书');
    console.log('='.repeat(60));
    console.log('⏹️  按 Ctrl+C 停止服务器');
    console.log('');
}

// 检查依赖并启动
async function init() {
    try {
        await startServers();
    } catch (error) {
        console.error('服务器启动失败:', error);
        console.log('💡 请确保已安装依赖: npm install express cors selfsigned');
    }
}

init();

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    process.exit(0);
});