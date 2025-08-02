/**
 * 游戏数据上传器 - 集成患者管理系统
 * 处理游戏数据的实时上传，确保数据同步到医护工作站
 */

class GameDataUploader {
    constructor(gameType, patientId = null) {
        this.gameType = gameType;
        this.patientId = patientId;
        this.uploadInterval = null;
        this.lastUploadScore = 0;
        this.lastUploadTime = 0;
        this.gameStartTime = 0;
        this.isActive = false;
        
        // 初始化时检查登录状态
        this.initializeUser();
    }

    // 初始化用户状态
    initializeUser() {
        try {
            // 检查是否有患者管理系统
            if (typeof PatientManager !== 'undefined') {
                const currentUser = PatientManager.getCurrentUser();
                if (currentUser && !this.patientId) {
                    this.patientId = currentUser.id;
                    console.log(`游戏数据上传器已绑定到患者: ${currentUser.name} (ID: ${currentUser.id})`);
                }
            } else {
                console.warn('患者管理系统未加载，使用传入的患者ID:', this.patientId);
            }
        } catch (error) {
            console.error('初始化用户状态失败:', error);
        }
    }

    // 开始游戏数据上传
    startGame(currentScore = 0) {
        // 再次检查用户状态（可能在游戏开始时用户已登录）
        this.initializeUser();
        
        if (!this.patientId) {
            console.warn('未找到有效的患者ID，数据上传可能失败');
            return false;
        }

        this.gameStartTime = Date.now();
        this.lastUploadScore = currentScore;
        this.lastUploadTime = 0;
        this.isActive = true;

        // 开始定期上传（每15秒）
        this.uploadInterval = setInterval(() => {
            if (this.isActive) {
                this.periodicUpload();
            }
        }, 15000);

        console.log(`开始${this.getGameTypeName()}数据上传，患者ID: ${this.patientId}`);
        return true;
    }

    // 结束游戏数据上传
    endGame(finalScore) {
        this.isActive = false;
        
        if (this.uploadInterval) {
            clearInterval(this.uploadInterval);
            this.uploadInterval = null;
        }

        // 上传最终数据
        const finalTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
        const scoreIncrease = finalScore - this.lastUploadScore;
        const timeIncrease = finalTime - this.lastUploadTime;

        this.uploadGameData({
            type: 'final',
            scoreIncrease: scoreIncrease,
            timeIncrease: timeIncrease,
            finalScore: finalScore,
            totalTime: finalTime
        });

        console.log(`结束${this.getGameTypeName()}数据上传，最终得分: ${finalScore}, 总时长: ${finalTime}秒`);
    }

    // 定期上传数据
    periodicUpload(currentScore = null) {
        if (!this.isActive || !this.patientId) return;

        const currentTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
        const timeIncrease = currentTime - this.lastUploadTime;
        
        // 如果没有传入当前分数，尝试从游戏状态获取
        if (currentScore === null) {
            currentScore = this.getCurrentGameScore();
        }
        
        const scoreIncrease = currentScore - this.lastUploadScore;

        // 只有时间或分数有变化时才上传
        if (timeIncrease > 0 || scoreIncrease > 0) {
            this.uploadGameData({
                type: 'periodic',
                scoreIncrease: scoreIncrease,
                timeIncrease: timeIncrease,
                currentScore: currentScore,
                currentTime: currentTime
            });

            this.lastUploadScore = currentScore;
            this.lastUploadTime = currentTime;
        }
    }

    // 手动上传数据（供游戏主动调用）
    manualUpload(scoreIncrease, timeIncrease) {
        if (!this.isActive || !this.patientId) return;

        this.uploadGameData({
            type: 'manual',
            scoreIncrease: scoreIncrease,
            timeIncrease: timeIncrease,
            currentScore: this.lastUploadScore + scoreIncrease,
            currentTime: this.lastUploadTime + timeIncrease
        });

        this.lastUploadScore += scoreIncrease;
        this.lastUploadTime += timeIncrease;
    }

    // 获取当前游戏分数（尝试从全局游戏状态获取）
    getCurrentGameScore() {
        try {
            // 尝试从不同的全局变量获取分数
            if (typeof gameState !== 'undefined' && gameState.score !== undefined) {
                return gameState.score;
            }
            if (typeof score !== 'undefined') {
                return score;
            }
            if (typeof currentScore !== 'undefined') {
                return currentScore;
            }
            // 默认返回上次上传的分数
            return this.lastUploadScore;
        } catch (error) {
            console.warn('无法获取当前游戏分数:', error);
            return this.lastUploadScore;
        }
    }

    // 上传游戏数据到系统
    uploadGameData(data) {
        try {
            // 检查患者管理系统是否可用
            if (typeof PatientManager !== 'undefined') {
                // 使用患者管理系统更新游戏数据
                const success = PatientManager.updateGameData(
                    this.patientId,
                    this.gameType,
                    data.scoreIncrease || 0,
                    data.timeIncrease || 0
                );

                if (success) {
                    console.log(`游戏数据上传成功: 分数+${data.scoreIncrease}, 时间+${data.timeIncrease}秒`);
                    
                    // 显示上传通知
                    this.showUploadNotification(data.scoreIncrease || 0, data.timeIncrease || 0);
                    
                    // 触发数据同步事件
                    this.triggerDataSync(data);
                } else {
                    console.error('游戏数据上传失败');
                }
            } else {
                // 使用localStorage作为备用方案
                this.uploadToLocalStorage(data);
            }
        } catch (error) {
            console.error('上传游戏数据时发生错误:', error);
            // 使用localStorage作为备用方案
            this.uploadToLocalStorage(data);
        }
    }

    // 备用的localStorage上传方法
    uploadToLocalStorage(data) {
        try {
            const gameData = {
                patientId: this.patientId,
                gameType: this.gameType,
                scoreIncrease: data.scoreIncrease || 0,
                timeIncrease: data.timeIncrease || 0,
                timestamp: new Date().toISOString(),
                type: data.type || 'periodic'
            };

            // 存储到localStorage
            const existingData = JSON.parse(localStorage.getItem('gameUploads') || '[]');
            existingData.push(gameData);
            
            // 只保留最近100条记录
            if (existingData.length > 100) {
                existingData.splice(0, existingData.length - 100);
            }
            
            localStorage.setItem('gameUploads', JSON.stringify(existingData));
            localStorage.setItem('latestGameData', JSON.stringify(gameData));

            console.log('游戏数据已存储到本地存储');
            this.showUploadNotification(data.scoreIncrease || 0, data.timeIncrease || 0);
            
            // 触发存储事件
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'latestGameData',
                newValue: JSON.stringify(gameData),
                storageArea: localStorage
            }));
        } catch (error) {
            console.error('存储游戏数据到localStorage失败:', error);
        }
    }

    // 触发数据同步事件
    triggerDataSync(data) {
        try {
            // 创建自定义事件
            const syncEvent = new CustomEvent('gameDataSync', {
                detail: {
                    patientId: this.patientId,
                    gameType: this.gameType,
                    data: data,
                    timestamp: Date.now()
                }
            });
            
            window.dispatchEvent(syncEvent);
        } catch (error) {
            console.warn('触发数据同步事件失败:', error);
        }
    }

    // 显示上传通知
    showUploadNotification(scoreIncrease, timeIncrease) {
        try {
            // 创建通知元素
            const notification = document.createElement('div');
            notification.className = 'upload-notification';
            
            const gameTypeName = this.getGameTypeName();
            const scoreText = scoreIncrease > 0 ? `得分+${scoreIncrease}` : '';
            const timeText = timeIncrease > 0 ? `时间+${timeIncrease}秒` : '';
            const separator = scoreText && timeText ? ', ' : '';
            
            notification.innerHTML = `
                <div class="notification-content">
                    <span class="notification-icon">📊</span>
                    <span class="notification-text">${gameTypeName}: ${scoreText}${separator}${timeText}</span>
                </div>
            `;

            // 添加样式
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                font-size: 14px;
                font-weight: 500;
                animation: slideInNotification 0.3s ease-out;
                max-width: 300px;
            `;

            // 添加动画
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideInNotification {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            
            if (!document.querySelector('style[data-upload-notification]')) {
                style.setAttribute('data-upload-notification', 'true');
                document.head.appendChild(style);
            }

            // 添加到页面
            document.body.appendChild(notification);

            // 3秒后自动移除
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideInNotification 0.3s ease-out reverse';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }
            }, 3000);
        } catch (error) {
            console.warn('显示上传通知失败:', error);
        }
    }

    // 获取游戏类型的中文名称
    getGameTypeName() {
        const gameNames = {
            'coordination': '手眼协调训练',
            'reaction': '反应速度训练',
            'cognitive': '认知能力训练',
            'hand': '手眼协调训练',  // 兼容旧版本
            'fruit': '反应速度训练', // 兼容旧版本
            'number': '认知能力训练' // 兼容旧版本
        };
        
        return gameNames[this.gameType] || this.gameType;
    }

    // 获取患者信息
    getPatientInfo() {
        try {
            if (typeof PatientManager !== 'undefined' && this.patientId) {
                return PatientManager.getPatientById(this.patientId);
            }
        } catch (error) {
            console.warn('获取患者信息失败:', error);
        }
        return null;
    }

    // 检查是否已初始化
    isInitialized() {
        return this.patientId !== null && this.patientId !== undefined;
    }

    // 停止上传
    stop() {
        this.isActive = false;
        if (this.uploadInterval) {
            clearInterval(this.uploadInterval);
            this.uploadInterval = null;
        }
    }

    // 重启上传
    restart() {
        this.stop();
        this.startGame(this.lastUploadScore);
    }
}

// 创建全局实例工厂方法
window.createGameDataUploader = function(gameType, patientId = null) {
    return new GameDataUploader(gameType, patientId);
};

// 兼容旧版本的全局实例
if (typeof window !== 'undefined') {
    window.GameDataUploader = GameDataUploader;
}