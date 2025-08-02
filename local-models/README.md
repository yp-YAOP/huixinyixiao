# 本地化模型部署文档

## 📋 概述

本项目已完成所有外部依赖的本地化部署，包括：

- **前端框架**: TailwindCSS, Font Awesome, Google Fonts
- **JavaScript库**: Chart.js, Three.js  
- **API服务**: 本地API服务器替代Google Apps Script
- **自动网络检测**: 支持多网络环境自动适应

## 🗂️ 目录结构

```
local-models/
├── api-server/                    # 本地API服务器
│   ├── local-api-server.js        # 主服务器文件
│   └── highscores.json           # 数据存储文件（自动生成）
├── css-frameworks/               # CSS框架
│   ├── tailwind.min.css          # TailwindCSS
│   └── font-awesome.min.css      # Font Awesome图标
├── js-libraries/                 # JavaScript库
│   ├── chart.min.js              # Chart.js图表库
│   └── three.min.js              # Three.js 3D库
├── fonts/                        # 字体文件
│   ├── inter-font.css            # Inter字体样式
│   ├── fa-solid-900.woff2        # Font Awesome字体
│   ├── fa-regular-400.woff2      # Font Awesome字体
│   └── ...                       # 其他字体文件
├── local-config.js               # 本地化配置文件
├── download-resources.ps1        # 资源下载脚本
├── start-local-api.bat           # 启动本地API服务器
├── start-all-services.bat        # 启动所有服务
├── local-deployment-template.html # 本地化演示页面
└── README.md                     # 本文档
```

## 🚀 快速开始

### 1. 启动所有服务（推荐）

```bash
cd local-models
./start-all-services.bat
```

这将自动启动：
- 本地API服务器 (端口 8888)
- HTTPS网络服务器 (端口 3443)
- HTTP网络服务器 (端口 3000)

### 2. 单独启动API服务器

```bash
cd local-models
./start-local-api.bat
```

### 3. 验证部署

访问演示页面验证所有功能：
```
http://localhost:3000/local-models/local-deployment-template.html
```

## 🌐 使用本地化版本

### 方式1: URL参数
在任何项目页面URL后添加 `?local=true`：
```
http://localhost:3000/yihu.html?local=true
```

### 方式2: 永久启用
在浏览器控制台执行：
```javascript
localStorage.setItem('useLocalModels', 'true');
```

## 📡 本地API服务器

### 端点说明

| 端点 | 方法 | 说明 | 示例 |
|------|------|------|------|
| `/api/health` | GET | 健康检查 | `GET /api/health` |
| `/api/highscores` | GET | 获取高分榜 | `GET /api/highscores` |
| `/api/submit-score` | POST | 提交分数 | `POST /api/submit-score` |
| `/api/stats` | GET | 获取统计信息 | `GET /api/stats` |

### 提交分数格式
```json
{
  "playerName": "玩家名称",
  "score": 100,
  "gameType": "游戏类型",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔧 配置说明

### 本地化配置 (local-config.js)
```javascript
window.localConfig = {
    // 本地API服务器地址
    API_BASE_URL: 'http://localhost:8888',
    
    // 本地资源路径
    LOCAL_RESOURCES: {
        TAILWIND_CSS: './local-models/css-frameworks/tailwind.min.css',
        CHART_JS: './local-models/js-libraries/chart.min.js',
        // ... 其他资源
    }
};
```

### 自动网络检测配置
```javascript
// 在 yihu.html 中的网络配置
let networkConfig = {
    serverUrl: '',
    autoDetection: true,  // 启用自动检测
    // ... 其他配置
};
```

## 🌍 多网络环境支持

系统支持以下网络环境的自动检测：

- **家庭网络**: 192.168.1.x, 192.168.0.x
- **学校网络**: 192.168.2.x, 192.168.3.x  
- **办公网络**: 10.0.0.x, 172.16.x.x
- **其他局域网**: 自动检测IP段

### 网络切换使用方法

1. **第一次使用**: 系统自动检测并连接
2. **更换网络**: 点击"重新检测"按钮
3. **手动配置**: 取消只读模式，手动输入地址

## 📊 功能特性

### ✅ 已实现功能

- [x] 外部CDN资源本地化
- [x] 本地API服务器替代Google Apps Script
- [x] 自动网络检测和连接
- [x] 多网络环境自适应
- [x] 离线运行支持
- [x] 完整的数据存储和高分榜功能

### 🎯 优势

1. **完全离线运行**: 无需互联网连接
2. **零配置使用**: 自动检测网络环境
3. **跨网络兼容**: 支持家庭、学校、办公等环境
4. **数据持久化**: 本地存储游戏数据和高分榜
5. **高性能**: 本地资源加载速度快

## 🔍 故障排除

### 常见问题

**1. API服务器无法启动**
```bash
# 检查端口占用
netstat -an | findstr 8888
# 如果被占用，终止进程或更换端口
```

**2. 字体无法加载**
- 确保 `local-models/fonts/` 目录包含所有字体文件
- 检查CSS中的字体路径是否正确

**3. 网络自动检测失败**
- 确保HTTPS服务器正在运行
- 检查防火墙设置是否阻止了连接
- 手动点击"重新检测"按钮

**4. 本地化资源加载失败**
- 确认URL包含 `?local=true` 参数
- 或设置 `localStorage.setItem('useLocalModels', 'true')`

### 日志查看

- **HTTPS服务器日志**: 查看命令行输出
- **API服务器日志**: 查看API服务器窗口
- **浏览器日志**: 打开开发者工具查看Console

## 🔄 更新说明

如需更新外部资源：

1. 运行资源下载脚本：
```powershell
./download-resources.ps1
```

2. 重启服务：
```bash
./start-all-services.bat
```

## 📞 技术支持

如遇到问题，请检查：

1. Node.js 版本是否兼容
2. 所有依赖是否正确安装
3. 防火墙和端口设置
4. 网络连接状态

系统现已完全本地化，可在任何网络环境下稳定运行！🎉