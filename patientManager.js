/**
 * 患者管理系统核心库
 * 处理患者数据的增删改查、登录验证、数据同步等功能
 */

class PatientManager {
    constructor() {
        this.storageKey = 'patientDatabase';
        this.currentUserKey = 'currentUser';
        this.init();
    }

    // 初始化系统
    init() {
        // 添加调试信息
        console.log('PatientManager 初始化中...');
        
        const patients = this.getAllPatients();
        console.log('当前患者数据:', patients);
        
        // 确保有默认患者数据
        if (!patients.length) {
            console.log('没有找到患者数据，初始化默认数据...');
            this.initDefaultPatients();
        } else {
            console.log(`找到 ${patients.length} 个患者记录`);
        }
        
        // 验证默认用户是否存在
        const defaultUser = this.getPatientByUsername('liayi');
        if (!defaultUser) {
            console.log('默认用户 liayi 不存在，重新初始化...');
            this.initDefaultPatients();
        } else {
            console.log('默认用户 liayi 存在:', defaultUser);
        }
    }

    // 初始化默认患者数据
    initDefaultPatients() {
        const defaultPatients = [
            {
                id: 102,
                username: 'liayi',
                password: '123456',
                name: '李阿姨',
                age: 65,
                gender: '女',
                phone: '138****8888',
                registrationDate: '2024-01-15',
                status: 'active',
                gameData: {
                    totalTime: '2小时30分钟',
                    thisWeekScore: 1250,
                    coordination: { time: '45分钟', score: 420 },
                    reaction: { time: '50分钟', score: 380 },
                    cognitive: { time: '55分钟', score: 450 }
                }
            }
        ];
        
        localStorage.setItem(this.storageKey, JSON.stringify(defaultPatients));
    }

    // 获取所有患者
    getAllPatients() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('获取患者数据失败:', error);
            return [];
        }
    }

    // 保存患者数据
    savePatients(patients) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(patients));
            // 触发数据同步事件
            this.triggerDataSync();
            return true;
        } catch (error) {
            console.error('保存患者数据失败:', error);
            return false;
        }
    }

    // 根据ID获取患者
    getPatientById(id) {
        const patients = this.getAllPatients();
        return patients.find(patient => patient.id === id);
    }

    // 根据用户名获取患者
    getPatientByUsername(username) {
        const patients = this.getAllPatients();
        return patients.find(patient => patient.username === username);
    }

    // 添加新患者
    addPatient(patientData) {
        const patients = this.getAllPatients();
        
        // 检查用户名是否已存在
        if (this.getPatientByUsername(patientData.username)) {
            return { success: false, message: '用户名已存在' };
        }

        // 生成新ID
        const newId = Math.max(...patients.map(p => p.id), 100) + 1;
        
        const newPatient = {
            id: newId,
            username: patientData.username,
            password: patientData.password,
            name: patientData.name,
            age: patientData.age || 0,
            gender: patientData.gender || '未知',
            phone: patientData.phone || '',
            registrationDate: new Date().toISOString().split('T')[0],
            status: 'active',
            gameData: {
                totalTime: '0分钟',
                thisWeekScore: 0,
                coordination: { time: '0分钟', score: 0 },
                reaction: { time: '0分钟', score: 0 },
                cognitive: { time: '0分钟', score: 0 }
            }
        };

        patients.push(newPatient);
        
        if (this.savePatients(patients)) {
            return { success: true, message: '患者添加成功', patient: newPatient };
        } else {
            return { success: false, message: '保存失败，请重试' };
        }
    }

    // 删除患者
    deletePatient(id) {
        const patients = this.getAllPatients();
        const index = patients.findIndex(patient => patient.id === id);
        
        if (index === -1) {
            return { success: false, message: '患者不存在' };
        }

        patients.splice(index, 1);
        
        if (this.savePatients(patients)) {
            return { success: true, message: '患者删除成功' };
        } else {
            return { success: false, message: '删除失败，请重试' };
        }
    }

    // 更新患者信息
    updatePatient(id, updateData) {
        const patients = this.getAllPatients();
        const patientIndex = patients.findIndex(patient => patient.id === id);
        
        if (patientIndex === -1) {
            return { success: false, message: '患者不存在' };
        }

        // 更新患者信息
        patients[patientIndex] = { ...patients[patientIndex], ...updateData };
        
        if (this.savePatients(patients)) {
            return { success: true, message: '患者信息更新成功', patient: patients[patientIndex] };
        } else {
            return { success: false, message: '更新失败，请重试' };
        }
    }

    // 用户登录验证
    login(username, password) {
        const patient = this.getPatientByUsername(username);
        
        if (!patient) {
            return { success: false, message: '用户名不存在' };
        }

        if (patient.password !== password) {
            return { success: false, message: '密码错误' };
        }

        if (patient.status !== 'active') {
            return { success: false, message: '账户已被禁用' };
        }

        // 保存当前登录用户
        localStorage.setItem(this.currentUserKey, JSON.stringify(patient));
        
        return { success: true, message: '登录成功', patient: patient };
    }

    // 用户注册
    register(userData) {
        // 验证必填字段
        if (!userData.username || !userData.password || !userData.name) {
            return { success: false, message: '请填写所有必填字段' };
        }

        // 验证用户名格式（字母数字下划线，3-20位）
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(userData.username)) {
            return { success: false, message: '用户名格式不正确（3-20位字母数字下划线）' };
        }

        // 验证密码长度
        if (userData.password.length < 6) {
            return { success: false, message: '密码至少6位' };
        }

        return this.addPatient(userData);
    }

    // 获取当前登录用户
    getCurrentUser() {
        try {
            const userData = localStorage.getItem(this.currentUserKey);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('获取当前用户失败:', error);
            return null;
        }
    }

    // 用户登出
    logout() {
        localStorage.removeItem(this.currentUserKey);
        return { success: true, message: '登出成功' };
    }

    // 检查是否已登录
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    }

    // 更新患者游戏数据
    updateGameData(patientId, gameType, scoreIncrease, timeIncrease) {
        const patients = this.getAllPatients();
        const patientIndex = patients.findIndex(p => p.id === patientId);
        
        if (patientIndex === -1) return false;

        const patient = patients[patientIndex];
        
        // 更新总分
        patient.gameData.thisWeekScore += scoreIncrease;
        
        // 更新对应游戏的数据
        if (patient.gameData[gameType]) {
            patient.gameData[gameType].score += scoreIncrease;
            // 简单的时间累加（实际项目中需要更复杂的时间处理）
            const currentMinutes = parseInt(patient.gameData[gameType].time) || 0;
            const newMinutes = currentMinutes + Math.floor(timeIncrease / 60);
            patient.gameData[gameType].time = `${newMinutes}分钟`;
        }

        // 更新总时长
        const totalMinutes = Object.values(patient.gameData)
            .filter(data => data.time)
            .reduce((total, data) => total + (parseInt(data.time) || 0), 0);
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        patient.gameData.totalTime = hours > 0 ? 
            `${hours}小时${minutes}分钟` : `${minutes}分钟`;

        return this.savePatients(patients);
    }

    // 触发数据同步事件
    triggerDataSync() {
        // 触发自定义事件通知其他页面数据已更新
        window.dispatchEvent(new CustomEvent('patientDataUpdated', {
            detail: { timestamp: Date.now() }
        }));

        // 也触发storage事件作为备用
        window.dispatchEvent(new StorageEvent('storage', {
            key: this.storageKey,
            newValue: localStorage.getItem(this.storageKey),
            storageArea: localStorage
        }));
    }

    // 搜索患者
    searchPatients(keyword) {
        const patients = this.getAllPatients();
        const lowerKeyword = keyword.toLowerCase();
        
        return patients.filter(patient => 
            patient.name.toLowerCase().includes(lowerKeyword) ||
            patient.username.toLowerCase().includes(lowerKeyword) ||
            patient.phone.includes(keyword)
        );
    }

    // 清理和重置所有数据（调试用）
    resetAllData() {
        console.log('重置所有患者数据...');
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.currentUserKey);
        this.initDefaultPatients();
        console.log('数据重置完成');
        return { success: true, message: '数据已重置' };
    }

    // 获取统计信息
    getStatistics() {
        const patients = this.getAllPatients();
        
        return {
            totalPatients: patients.length,
            activePatients: patients.filter(p => p.status === 'active').length,
            newPatientsThisMonth: patients.filter(p => {
                const regDate = new Date(p.registrationDate);
                const now = new Date();
                return regDate.getMonth() === now.getMonth() && 
                       regDate.getFullYear() === now.getFullYear();
            }).length
        };
    }
}

// 创建全局实例
window.PatientManager = new PatientManager();