// config.js for local testing
// 检测是否使用本地模型
const useLocalModels = window.location.search.includes('local=true') || localStorage.getItem('useLocalModels') === 'true';

if (useLocalModels) {
  // 使用本地配置
  console.log('🔧 使用本地化模型配置');
  // 加载本地配置
  const script = document.createElement('script');
  script.src = './local-models/local-config.js';
  document.head.appendChild(script);
} else {
  // 使用原有配置
  window.config = {
    HIGHSCORE_URL: 'https://script.google.com/macros/s/AKfycbxHZTRuLhq-NDFjK4DQYEjGGU4bwNNm49LgvPLD8S-kpRSkWclM8p54i3mRaeyo_9zhig/exec'
  };
}