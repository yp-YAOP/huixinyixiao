/**
 * 游戏数据上传工具库
 * 为康复训练游戏提供统一的数据上传接口
 */

class GameDataUploader {
  constructor(gameType, patientId = 102) {
    this.gameType = gameType; // 'coordination', 'reaction', 'cognitive'
    this.patientId = patientId; // 默认是李阿姨的ID
    this.uploadInterval = null;
    this.lastUploadScore = 0;
    this.gameStartTime = 0;
    this.isGameActive = false;
    
    // 网络配置
    this.networkConfig = {
      serverUrl: 'http://localhost:3000',
      enabled: false,
      connected: false
    };
    
    // 绑定方法
    this.startPeriodicUpload = this.startPeriodicUpload.bind(this);
    this.stopPeriodicUpload = this.stopPeriodicUpload.bind(this);
    this.uploadGameData = this.uploadGameData.bind(this);
    this.initNetworkConfig = this.initNetworkConfig.bind(this);
    this.uploadToNetwork = this.uploadToNetwork.bind(this);
    
    // 初始化网络配置
    this.initNetworkConfig();
  }

  /**
   * 启动游戏并开始数据上传
   * @param {number} currentScore 当前游戏得分
   */
  startGame(currentScore = 0) {
    this.gameStartTime = Date.now();
    this.lastUploadScore = currentScore;
    this.isGameActive = true;
    this.startPeriodicUpload();
    
    console.log(`${this.getGameTypeName()}游戏开始，数据上传已启动`);
  }

  /**
   * 结束游戏并上传最终数据
   * @param {number} finalScore 最终得分
   */
  endGame(finalScore = 0) {
    this.isGameActive = false;
    this.stopPeriodicUpload();
    
    // 上传最终数据
    const finalScoreIncrease = finalScore - this.lastUploadScore;
    const totalGameTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
    const remainingTime = totalGameTime % 15;
    
    if (remainingTime > 0 || finalScoreIncrease > 0) {
      this.uploadGameData({
        scoreIncrease: finalScoreIncrease,
        timeIncrease: remainingTime,
        isFinalUpload: true
      });
    }
    
    console.log(`${this.getGameTypeName()}游戏结束，最终数据已上传`);
  }

  /**
   * 更新当前得分（用于实时得分更新）
   * @param {number} currentScore 当前得分
   */
  updateScore(currentScore) {
    // 这个方法可以用于实时更新得分，但不立即上传
    // 得分会在下次定期上传时一起上传
  }

  /**
   * 启动定期数据上传（每15秒）
   */
  startPeriodicUpload() {
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
    }
    
    this.uploadInterval = setInterval(() => {
      if (this.isGameActive) {
        this.periodicUpload();
      }
    }, 15000); // 每15秒上传一次
  }

  /**
   * 停止定期数据上传
   */
  stopPeriodicUpload() {
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }
  }

  /**
   * 定期上传数据
   */
  periodicUpload() {
    if (!this.isGameActive) return;
    
    // 这里需要游戏提供当前得分，默认为0
    const currentScore = this.getCurrentScore ? this.getCurrentScore() : 0;
    const scoreIncrease = currentScore - this.lastUploadScore;
    
    this.uploadGameData({
      scoreIncrease: scoreIncrease,
      timeIncrease: 15, // 15秒时间增量
      isFinalUpload: false
    });
    
    this.lastUploadScore = currentScore;
  }

  /**
   * 初始化网络配置
   */
  initNetworkConfig() {
    // 从URL参数获取服务器地址
    const urlParams = new URLSearchParams(window.location.search);
    const serverUrl = urlParams.get('server');
    
    if (serverUrl) {
      this.networkConfig.serverUrl = serverUrl;
      this.networkConfig.enabled = true;
      console.log('从URL参数获取服务器地址:', serverUrl);
    } else {
      // 尝试从localStorage获取
      const savedConfig = localStorage.getItem('gameNetworkConfig');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        this.networkConfig = { ...this.networkConfig, ...config };
      }
    }
    
    // 测试网络连接
    if (this.networkConfig.enabled) {
      this.testNetworkConnection();
    }
  }

  /**
   * 测试网络连接
   */
  async testNetworkConnection() {
    try {
      const response = await fetch(`${this.networkConfig.serverUrl}/status`, {
        method: 'GET'
      });
      
      if (response.ok) {
        this.networkConfig.connected = true;
        console.log('✅ 网络连接成功，启用局域网数据传输');
      } else {
        this.networkConfig.connected = false;
        console.log('❌ 网络连接失败，使用本地模式');
      }
    } catch (error) {
      this.networkConfig.connected = false;
      console.log('❌ 网络连接失败，使用本地模式:', error.message);
    }
  }

  /**
   * 上传数据到网络服务器
   * @param {Object} uploadData 要上传的数据
   */
  async uploadToNetwork(uploadData) {
    if (!this.networkConfig.connected) {
      return false;
    }

    try {
      const response = await fetch(`${this.networkConfig.serverUrl}/upload-game-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🌐 数据已成功上传到网络:', result.message);
        return true;
      } else {
        console.error('网络上传失败，HTTP状态:', response.status);
        return false;
      }
    } catch (error) {
      console.error('网络上传出错:', error);
      this.networkConfig.connected = false;
      setTimeout(() => this.testNetworkConnection(), 5000);
      return false;
    }
  }

  /**
   * 上传游戏数据到医护工作站
   * @param {Object} data 包含scoreIncrease, timeIncrease等的数据对象
   */
  async uploadGameData(data) {
    const uploadData = {
      patientId: this.patientId,
      gameType: this.gameType,
      scoreIncrease: data.scoreIncrease || 0,
      timeIncrease: data.timeIncrease || 0,
      timestamp: new Date().toISOString(),
      isFinalUpload: data.isFinalUpload || false,
      source: 'patient'
    };

    try {
      // 优先尝试网络传输
      const networkSuccess = await this.uploadToNetwork(uploadData);
      
      // 仅在网络传输失败时才使用本地备用方案（避免重复发送）
      if (!networkSuccess) {
        console.log('网络传输失败，使用本地备用方案');
        
        // 本地部署依赖localStorage进行数据传输（作为备用）
        this.saveDataToLocalStorage(uploadData);
        
        // 尝试postMessage作为备用方案（如果在iframe中）
        if (window.parent && window.parent !== window) {
          try {
            window.parent.postMessage({
              type: 'GAME_DATA_UPLOAD',
              data: uploadData
            }, '*');
          } catch (postError) {
            console.warn('PostMessage发送失败:', postError);
          }
        }
        
        // 尝试发送到opener窗口（如果是弹出窗口）
        if (window.opener) {
          try {
            window.opener.postMessage({
              type: 'GAME_DATA_UPLOAD',
              data: uploadData
            }, '*');
          } catch (openerError) {
            console.warn('Opener PostMessage发送失败:', openerError);
          }
        }
      }
      
      console.log(`${this.getGameTypeName()}数据已上传:`, uploadData);
      
      // 显示上传确认通知
      if (networkSuccess) {
        this.showUploadNotification(uploadData.scoreIncrease, uploadData.timeIncrease, '🌐 已传输到医护端');
      } else {
        this.showUploadNotification(uploadData.scoreIncrease, uploadData.timeIncrease, '💾 已保存到本地');
      }
      
    } catch (error) {
      console.error('数据上传失败:', error);
      this.showErrorNotification(error.message);
    }
  }

  /**
   * 保存数据到localStorage（本地部署优化版）
   * @param {Object} uploadData 要保存的数据
   */
  saveDataToLocalStorage(uploadData) {
    try {
      // 获取现有数据
      const existingData = JSON.parse(localStorage.getItem('gameUploadData') || '[]');
      
      // 添加新数据
      existingData.push(uploadData);
      
      // 限制数据量，避免localStorage过大（保留最近100条记录）
      if (existingData.length > 100) {
        existingData.splice(0, existingData.length - 100);
      }
      
      // 保存到localStorage
      localStorage.setItem('gameUploadData', JSON.stringify(existingData));
      
      // 触发存储事件，通知医护工作站有新数据
      window.dispatchEvent(new Event('storage'));
      
    } catch (error) {
      console.error('localStorage保存失败:', error);
      throw new Error('数据存储失败: ' + error.message);
    }
  }

  /**
   * 显示数据上传通知
   * @param {number} scoreIncrease 得分增量
   * @param {number} timeIncrease 时间增量
   * @param {string} statusText 状态文本
   */
  showUploadNotification(scoreIncrease, timeIncrease, statusText = '💾 已保存') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'upload-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(52, 199, 89, 0.9);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10000;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 300px;
      animation: slideInRight 0.3s ease-out forwards;
      border-left: 4px solid #34c759;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div>
          <strong>${this.getGameTypeName()}</strong>
          <p style="margin: 2px 0 0 0; font-size: 12px;">得分+${scoreIncrease}, 时长+${timeIncrease}秒</p>
          <p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.9;">${statusText}</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 确保样式存在
    this.ensureNotificationStyles();
    
    // 3秒后移除通知
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  /**
   * 显示错误通知
   * @param {string} errorMessage 错误消息
   */
  showErrorNotification(errorMessage) {
    const notification = document.createElement('div');
    notification.className = 'upload-error-notification';
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: rgba(255, 59, 48, 0.9);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10001;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 300px;
      animation: slideInRight 0.3s ease-out forwards;
      border-left: 4px solid #ff3b30;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-exclamation-triangle" style="font-size: 16px;"></i>
        <div>
          <strong>上传失败</strong>
          <p style="margin: 2px 0 0 0; font-size: 12px;">${errorMessage}</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 确保样式存在
    this.ensureNotificationStyles();
    
    // 4秒后移除错误通知
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  /**
   * 确保通知样式存在
   */
  ensureNotificationStyles() {
    if (!document.getElementById('upload-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'upload-notification-styles';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * 获取游戏类型的中文名称
   * @returns {string}
   */
  getGameTypeName() {
    const gameNames = {
      'coordination': '手眼协调训练', // 打砖块游戏
      'reaction': '反应速度训练',     // 水果忍者游戏
      'cognitive': '认知能力训练'     // 数字认知游戏
    };
    return gameNames[this.gameType] || '未知游戏';
  }

  /**
   * 设置获取当前得分的回调函数
   * @param {Function} callback 返回当前得分的函数
   */
  setScoreCallback(callback) {
    this.getCurrentScore = callback;
  }

  /**
   * 手动触发数据上传（用于特殊情况）
   * @param {number} score 当前得分
   * @param {number} timeIncrease 时间增量
   */
  manualUpload(score = 0, timeIncrease = 0) {
    const scoreIncrease = score - this.lastUploadScore;
    this.uploadGameData({
      scoreIncrease: scoreIncrease,
      timeIncrease: timeIncrease,
      isFinalUpload: false
    });
    this.lastUploadScore = score;
  }
}

// 导出类供其他文件使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameDataUploader;
} else if (typeof window !== 'undefined') {
  window.GameDataUploader = GameDataUploader;
}