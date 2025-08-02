/**
 * 本地化配置文件
 * 将所有外部依赖重定向到本地资源
 */

// 本地API服务器配置
window.localConfig = {
    // 本地API服务器地址
    API_BASE_URL: 'http://localhost:8888',
    
    // 替代Google Apps Script的本地API端点
    HIGHSCORE_URL: 'http://localhost:8888/api/submit-score',
    
    // 本地资源路径
    LOCAL_RESOURCES: {
        // CSS框架
        TAILWIND_CSS: './local-models/css-frameworks/tailwind.min.css',
        FONT_AWESOME_CSS: './local-models/css-frameworks/font-awesome.min.css',
        
        // JavaScript库
        CHART_JS: './local-models/js-libraries/chart.min.js',
        THREE_JS: './local-models/js-libraries/three.min.js',
        
        // 字体文件
        INTER_FONT_CSS: './local-models/fonts/inter-font.css',
        
        // 字体文件路径
        FONTS_PATH: './local-models/fonts/'
    },
    
    // 开发模式标志
    DEVELOPMENT_MODE: true,
    
    // 调试选项
    DEBUG: {
        API_CALLS: true,
        RESOURCE_LOADING: true
    }
};

// 兼容性配置，保持原有的config对象
window.config = {
    HIGHSCORE_URL: window.localConfig.HIGHSCORE_URL
};

console.log('🔧 本地化配置已加载');
console.log('📍 API服务器:', window.localConfig.API_BASE_URL);
console.log('📁 本地资源路径:', window.localConfig.LOCAL_RESOURCES);