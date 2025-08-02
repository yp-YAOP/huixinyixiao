/**
 * 本地API服务器 - 替代Google Apps Script
 * 提供高分榜和数据存储功能
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 8888;
const DATA_FILE = path.join(__dirname, 'highscores.json');

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 初始化数据文件
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ highscores: [] }, null, 2));
}

// 读取数据
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取数据失败:', error);
        return { highscores: [] };
    }
}

// 写入数据
function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('写入数据失败:', error);
        return false;
    }
}

// API路由

// 获取高分榜
app.get('/api/highscores', (req, res) => {
    const data = readData();
    res.json({
        success: true,
        data: data.highscores
    });
});

// 提交高分
app.post('/api/submit-score', (req, res) => {
    const { playerName, score, gameType, timestamp } = req.body;
    
    if (!playerName || !score || !gameType) {
        return res.status(400).json({
            success: false,
            error: '缺少必要参数'
        });
    }
    
    const data = readData();
    
    // 添加新分数
    const newScore = {
        id: Date.now(),
        playerName: playerName.substring(0, 20), // 限制用户名长度
        score: parseInt(score),
        gameType: gameType,
        timestamp: timestamp || new Date().toISOString(),
        submittedAt: new Date().toISOString()
    };
    
    data.highscores.push(newScore);
    
    // 按分数排序并保留前100名
    data.highscores.sort((a, b) => b.score - a.score);
    data.highscores = data.highscores.slice(0, 100);
    
    if (writeData(data)) {
        res.json({
            success: true,
            message: '分数提交成功',
            rank: data.highscores.findIndex(item => item.id === newScore.id) + 1
        });
    } else {
        res.status(500).json({
            success: false,
            error: '数据保存失败'
        });
    }
});

// 获取游戏统计
app.get('/api/stats', (req, res) => {
    const data = readData();
    const stats = {
        totalScores: data.highscores.length,
        topScore: data.highscores.length > 0 ? data.highscores[0].score : 0,
        gameTypes: [...new Set(data.highscores.map(item => item.gameType))],
        lastUpdate: data.highscores.length > 0 ? data.highscores[0].submittedAt : null
    };
    
    res.json({
        success: true,
        data: stats
    });
});

// 清空高分榜 (仅开发时使用)
app.delete('/api/highscores', (req, res) => {
    if (writeData({ highscores: [] })) {
        res.json({
            success: true,
            message: '高分榜已清空'
        });
    } else {
        res.status(500).json({
            success: false,
            error: '清空失败'
        });
    }
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 兼容Google Apps Script的端点
app.get('/exec', (req, res) => {
    // 重定向到对应的API端点
    if (req.query.action === 'get') {
        return res.redirect('/api/highscores');
    } else {
        return res.redirect('/api/submit-score');
    }
});

app.post('/exec', (req, res) => {
    // 兼容原有的提交格式
    return res.redirect(308, '/api/submit-score');
});

// 启动服务器
app.listen(PORT, () => {
    console.log('🚀 本地API服务器已启动');
    console.log(`📡 HTTP服务器: http://localhost:${PORT}`);
    console.log('📊 可用端点:');
    console.log(`   - 高分榜: http://localhost:${PORT}/api/highscores`);
    console.log(`   - 提交分数: http://localhost:${PORT}/api/submit-score`);
    console.log(`   - 统计信息: http://localhost:${PORT}/api/stats`);
    console.log(`   - 健康检查: http://localhost:${PORT}/api/health`);
    console.log('📁 数据文件:', DATA_FILE);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭API服务器...');
    process.exit(0);
});