// Game state
const gameState = {
    score: 0,
    lives: 5,
    isGameActive: false,
    fruits: [],
    particles: [],
    lastFrameTime: 0,
    spawnInterval: 1500,  // Default spawn interval
    lastSpawnTime: 0,
    handLandmarks: null,
    fingerTip: { x: 0, y: 0, z: 0 },
    prevFingerTip: { x: 0, y: 0, z: 0 },
    bladeTrails: [],
    cameraWidth: 0,
    cameraHeight: 0,
    // Add default values for difficulty parameters
    defaultSpawnInterval: 1500,
    defaultLives: 5,
    // Add spawn range parameters
    desktopSpawnRange: 24,   // From -15 to +15
    mobileSpawnRange: 14,     // From -10 to +10
    // Add frame counter for hand landmark drawing
    frameCount: 0,
    // 数据上传相关变量
    gameStartTime: 0,
    dataUploader: null,
    lastUploadScore: 0,
    lastUploadTime: 0,
    uploadInterval: null,
};

// DOM elements
const videoElement = document.getElementById('video');
const gameCanvas = document.getElementById('game-canvas');
const handCanvas = document.getElementById('hand-canvas');
const handCtx = handCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const gameOverScreen = document.getElementById('game-over');
const restartButton = document.getElementById('restart-button');
const finalScoreElement = document.getElementById('final-score');
const loadingScreen = document.getElementById('loading');

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, alpha: true, antialias: false });

// Set pixel ratio based on device
if (isMobileDevice()) {
    // Use a lower pixel ratio for mobile devices (0.5 or 0.75 of the device pixel ratio)
    const lowerRatio = Math.min(0.5, window.devicePixelRatio * 0.5);
    renderer.setPixelRatio(lowerRatio);
    console.log("Mobile device detected, using pixel ratio:", lowerRatio);
} else {
    // On desktop, we can use the full pixel ratio or cap it for consistency
    const desktopRatio = Math.min(window.devicePixelRatio, 2); // Cap at 2 for performance
    renderer.setPixelRatio(desktopRatio);
    console.log("Desktop device detected, using pixel ratio:", desktopRatio);
}

renderer.setSize(window.innerWidth * 0.5, window.innerHeight);
renderer.setClearColor(0x000000, 0.2);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 10, 10);
scene.add(directionalLight);

// Camera position
camera.position.z = 20;

function isMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Regular expressions to check for iOS and Android
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isAndroid = /android/i.test(userAgent);
    
    return isIOS || isAndroid;
}

// Fruit and bomb meshes
const fruitGeometries = [
    new THREE.SphereGeometry(1.8, 16, 16), // Apple - increased from 1.0 to 1.8
    new THREE.SphereGeometry(1.6, 16, 16), // Orange - increased from 0.8 to 1.6
    new THREE.SphereGeometry(2.0, 16, 16), // Watermelon - increased from 1.2 to 2.0
    new THREE.SphereGeometry(1.5, 16, 16), // Peach - increased from 0.7 to 1.5
];

const fruitMaterials = [
    new THREE.MeshLambertMaterial({ color: 0xff0000 }), // Red (Apple)
    new THREE.MeshLambertMaterial({ color: 0xff7f00 }), // Orange
    new THREE.MeshLambertMaterial({ color: 0x00cc00 }), // Green (Watermelon)
    new THREE.MeshLambertMaterial({ color: 0xffccaa }), // Peach
];

// Add more fruit shapes and colors
fruitGeometries.push(new THREE.TorusGeometry(1.2, 0.5, 16, 32)); // Donut shape
fruitMaterials.push(new THREE.MeshLambertMaterial({ color: 0x9900ff })); // Purple

// Add another interesting shape
fruitGeometries.push(new THREE.ConeGeometry(1.2, 2.2, 16)); // Cone shape for "strawberry"
fruitMaterials.push(new THREE.MeshLambertMaterial({ color: 0xff6699 })); // Pink

// MediaPipe Hands setup
let hands;

async function setupHandTracking() {
    hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });
    
    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
    });
    
    hands.onResults(onHandResults);

    // Set default dimensions
    let width = 640;
    let height = 360;
    
    // Check if on mobile and reduce dimensions by 50% if true
    if (isMobileDevice()) {
        width = width * 0.5; // 320
        height = height * 0.5; // 180
    }
    
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: width,
        height: height,
    });
    
    camera.start();
}

// Handle hand tracking results
function onHandResults(results) {
    // Clear the hand canvas on every frame or when we're about to draw
    if (gameState.frameCount % 2 === 0) {
        handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);
    }
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        gameState.handLandmarks = results.multiHandLandmarks[0];
        
        // Draw landmarks on the hand canvas only on every other frame
        if (gameState.frameCount % 2 === 0) {
            drawHandLandmarks(results.multiHandLandmarks[0]);
        }
        
        // Always track index finger tip for gameplay (landmark 8)
        gameState.prevFingerTip = { ...gameState.fingerTip };
        
        const indexTip = gameState.handLandmarks[8];
        gameState.fingerTip = {
            x: 1 - indexTip.x,  // Mirror the x coordinate
            y: indexTip.y,
            z: indexTip.z
        };
        
        // Create blade trail effect when significant movement is detected
        // This should run every frame for smooth gameplay
        const moveThreshold = 0.02;
        const distance = Math.sqrt(
            Math.pow(gameState.fingerTip.x - gameState.prevFingerTip.x, 2) +
            Math.pow(gameState.fingerTip.y - gameState.prevFingerTip.y, 2)
        );
        
        if (distance > moveThreshold && gameState.isGameActive) {
            createBladeTrail(
                (gameState.fingerTip.x * window.innerWidth * 0.5),
                gameState.fingerTip.y * window.innerHeight,
                (gameState.prevFingerTip.x * window.innerWidth * 0.5),
                gameState.prevFingerTip.y * window.innerHeight
            );
        }
    } else {
        gameState.handLandmarks = null;
    }
    
    // Increment frame counter
    gameState.frameCount++;
}

// Draw hand landmarks
function drawHandLandmarks(landmarks) {
    const canvasWidth = handCanvas.width;
    const canvasHeight = handCanvas.height;
    
    // Mirror the x coordinates to match the mirrored video
    const mirroredLandmarks = landmarks.map(landmark => {
        return {
            x: 1 - landmark.x,  // Mirror x coordinate
            y: landmark.y,
            z: landmark.z
        };
    });
    
    // Draw connections
    const connections = [
        // Thumb
        [0, 1], [1, 2], [2, 3], [3, 4],
        // Index finger
        [0, 5], [5, 6], [6, 7], [7, 8],
        // Middle finger
        [0, 9], [9, 10], [10, 11], [11, 12],
        // Ring finger
        [0, 13], [13, 14], [14, 15], [15, 16],
        // Pinky
        [0, 17], [17, 18], [18, 19], [19, 20],
        // Palm
        [0, 5], [5, 9], [9, 13], [13, 17]
    ];
    
    // Draw connections
    handCtx.lineWidth = 3;
    handCtx.strokeStyle = 'rgba(253, 185, 39, 0.7)'; // Gold color for hand tracking
    handCtx.beginPath();
    
    for (const [i, j] of connections) {
        const start = mirroredLandmarks[i];
        const end = mirroredLandmarks[j];
        
        handCtx.moveTo(start.x * canvasWidth, start.y * canvasHeight);
        handCtx.lineTo(end.x * canvasWidth, end.y * canvasHeight);
    }
    
    handCtx.stroke();
    
    // Draw landmarks
    handCtx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // White color
    
    for (let i = 0; i < mirroredLandmarks.length; i++) {
        const x = mirroredLandmarks[i].x * canvasWidth;
        const y = mirroredLandmarks[i].y * canvasHeight;
        
        handCtx.beginPath();
        handCtx.arc(x, y, 5, 0, 2 * Math.PI);
        handCtx.fill();
    }
    
    // Highlight index fingertip (landmark 8) in different color
    const indexTip = mirroredLandmarks[8];
    handCtx.fillStyle = 'rgba(85, 37, 131, 0.9)'; // Purple color
    handCtx.beginPath();
    handCtx.arc(indexTip.x * canvasWidth, indexTip.y * canvasHeight, 8, 0, 2 * Math.PI);
    handCtx.fill();
}

function createBladeTrail(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    const trail = document.createElement('div');
    trail.className = 'blade-trail';
    trail.style.width = `${length}px`;
    trail.style.left = `${x1 + window.innerWidth * 0.5}px`; // Add offset to position on game side
    trail.style.top = `${y1}px`;
    trail.style.transform = `rotate(${angle}rad)`;
    
    // *** UPDATED: New color palette for blade trail ***
    const premiumColors = [
        'rgba(253, 185, 39, 0.9)',   // Lakers Gold
        'rgba(255, 215, 0, 0.9)',    // Standard Gold
        'rgba(255, 255, 255, 0.8)',  // White
        'rgba(255, 230, 150, 0.9)',  // Light Gold
    ];
    const randomColor = premiumColors[Math.floor(Math.random() * premiumColors.length)];
    trail.style.backgroundColor = randomColor;
    
    // Add box shadow for glow effect
    trail.style.boxShadow = `0 0 10px 2px ${randomColor}`;
    
    document.body.appendChild(trail);
    gameState.bladeTrails.push({
        element: trail,
        timestamp: Date.now()
    });
}

// Update and remove blade trails
function updateBladeTrails() {
    const now = Date.now();
    
    gameState.bladeTrails = gameState.bladeTrails.filter(trail => {
        const age = now - trail.timestamp;
        const trailDuration = 350; // Increased from 200 to 350ms for longer lasting trail
        
        if (age > trailDuration) {
            trail.element.remove();
            return false;
        } else {
            trail.element.style.opacity = 1 - (age / trailDuration);
            return true;
        }
    });
}

// Spawn a new fruit
function spawnObject() {
    spawnFruit();
}

function spawnFruit() {
    const fruitIndex = Math.floor(Math.random() * fruitGeometries.length);
    const fruit = new THREE.Mesh(fruitGeometries[fruitIndex], fruitMaterials[fruitIndex]);
    
    // Adjust spawn range based on device type
    let xRange;
    if (isMobileDevice()) {
        xRange = gameState.mobileSpawnRange; // Smaller range for mobile
    } else {
        xRange = gameState.desktopSpawnRange; // Original range for desktop
    }
    
    // Position fruit at a random x position at the bottom of the screen
    fruit.position.x = (Math.random() * xRange) - (xRange / 2);
    fruit.position.y = -10;
    fruit.position.z = 0;
    
    // Give the fruit a random velocity
    const velocity = {
        x: (Math.random() - 0.5) * 1.5,  // Reduced from 2 to 1.5
        y: 10 + Math.random() * 10,        // Reduced from 12+5 to 8+3
        z: 0,
        rotationX: Math.random() * 0.08,  // Reduced from 0.1 to 0.08
        rotationY: Math.random() * 0.08,  // Reduced from 0.1 to 0.08
        rotationZ: Math.random() * 0.08   // Reduced from 0.1 to 0.08
    };
    
    const fruitObject = {
        mesh: fruit,
        velocity: velocity,
        sliced: false,
        type: 'fruit'
    };
    
    gameState.fruits.push(fruitObject);
    scene.add(fruit);
}

// Update game objects
function updateObjects(deltaTime) {
    // Update fruits
    gameState.fruits = gameState.fruits.filter(fruit => {
        // Apply gravity
        fruit.velocity.y -= 8.0 * deltaTime; // Reduced from 9.8 to 8.0 (less gravity)
        
        // Update position
        fruit.mesh.position.x += fruit.velocity.x * deltaTime;
        fruit.mesh.position.y += fruit.velocity.y * deltaTime;
        fruit.mesh.position.z += fruit.velocity.z * deltaTime;
        
        // Update rotation
        fruit.mesh.rotation.x += fruit.velocity.rotationX;
        fruit.mesh.rotation.y += fruit.velocity.rotationY;
        fruit.mesh.rotation.z += fruit.velocity.rotationZ;
        
        // Check if fruit is out of screen
        if (fruit.mesh.position.y < -10) {
            if (!fruit.sliced) {
                // Missed a fruit
                gameState.lives--;
                livesElement.textContent = gameState.lives;
                
                if (gameState.lives <= 0) {
                    endGame();
                }
            }
            
            scene.remove(fruit.mesh);
            return false;
        }
        
        return true;
    });
}

// Update explosion particles
function updateParticles(deltaTime) {
    const now = Date.now();
    
    if (!gameState.particles) return;
    
    gameState.particles = gameState.particles.filter(particle => {
        // Apply gravity
        particle.velocity.y -= 9.8 * deltaTime;
        
        // Update position
        particle.mesh.position.x += particle.velocity.x * deltaTime;
        particle.mesh.position.y += particle.velocity.y * deltaTime;
        particle.mesh.position.z += particle.velocity.z * deltaTime;
        
        // Update rotation
        particle.mesh.rotation.x += particle.velocity.rotationX;
        particle.mesh.rotation.y += particle.velocity.rotationY;
        particle.mesh.rotation.z += particle.velocity.rotationZ;
        
        // Check if particle lifetime is over
        const age = now - particle.createTime;
        if (age > particle.lifetime) {
            scene.remove(particle.mesh);
            return false;
        }
        
        // Add fading effect as particles age
        const opacity = 1 - (age / particle.lifetime);
        if (particle.mesh.material.opacity !== undefined) {
            particle.mesh.material.transparent = true;
            particle.mesh.material.opacity = opacity;
        }
        
        return true;
    });
}

// Check collisions between hand and objects
function checkCollisions() {
    if (!gameState.handLandmarks) return;
    
    // We'll use the index finger tip position for slicing
    // Updated to use the same coordinate transformation as the blade trail
    const fingerX = (gameState.fingerTip.x * 40) - 20; // Scale to the game's coordinate system
    const fingerY = (0.5 - gameState.fingerTip.y) * 15;
    
    // Check fruit collisions
    gameState.fruits.forEach(fruit => {
        if (!fruit.sliced) {
            const dx = fruit.mesh.position.x - fingerX;
            const dy = fruit.mesh.position.y - fingerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check for sufficient hand movement speed for slicing
            const moveSpeed = calculateHandSpeed();
            const MIN_SLICE_SPEED = 0.04;  // Reduced from 0.1 to 0.05
            const SLICE_DISTANCE = 5;

            if (distance < SLICE_DISTANCE && moveSpeed > MIN_SLICE_SPEED) {  // Increased from 2.5 to 4.0
                sliceFruit(fruit);
            }
        }
    });
}

// Calculate hand movement speed
function calculateHandSpeed() {
    if (!gameState.prevFingerTip) return 0;
    
    return Math.sqrt(
        Math.pow(gameState.fingerTip.x - gameState.prevFingerTip.x, 2) +
        Math.pow(gameState.fingerTip.y - gameState.prevFingerTip.y, 2)
    );
}

// Handle fruit slicing
function sliceFruit(fruit) {
    // Mark as sliced
    fruit.sliced = true;
    
    // Create explosion particles
    createFruitExplosion(fruit);
    
    // Increase score
    gameState.score += 1;
    scoreElement.textContent = gameState.score;
    
    // Remove the original fruit mesh from the scene
    scene.remove(fruit.mesh);
}

// Create explosion effect for sliced fruit
function createFruitExplosion(fruit) {
    const fruitColor = fruit.mesh.material.color.getHex();
    const numParticles = 12; // Number of particles in explosion
    
    for (let i = 0; i < numParticles; i++) {
        // Create small particle geometry
        const size = 0.3 + Math.random() * 0.4;
        const geometry = new THREE.SphereGeometry(size, 8, 8);
        const material = new THREE.MeshLambertMaterial({ color: fruitColor });
        const particle = new THREE.Mesh(geometry, material);
        
        // Position at the fruit's location
        particle.position.x = fruit.mesh.position.x;
        particle.position.y = fruit.mesh.position.y;
        particle.position.z = fruit.mesh.position.z;
        
        // Give the particle a random velocity
        const speed = 8 + Math.random() * 8;
        const angle = Math.random() * Math.PI * 2;
        const height = -3 + Math.random() * 6;
        
        const particleObj = {
            mesh: particle,
            velocity: {
                x: Math.cos(angle) * speed,
                y: height,
                z: Math.sin(angle) * speed,
                rotationX: Math.random() * 0.2,
                rotationY: Math.random() * 0.2,
                rotationZ: Math.random() * 0.2
            },
            createTime: Date.now(),
            lifetime: 800 + Math.random() * 400 // Particle lifetime in ms
        };
        
        // Add to the scene
        scene.add(particle);
        
        // Add to a new array in gameState for tracking
        if (!gameState.particles) {
            gameState.particles = [];
        }
        gameState.particles.push(particleObj);
    }
}

// Game loop
function gameLoop(timestamp) {
    if (!gameState.lastFrameTime) {
        gameState.lastFrameTime = timestamp;
    }
    
    const deltaTime = (timestamp - gameState.lastFrameTime) / 1000; // Convert to seconds
    gameState.lastFrameTime = timestamp;
    
    if (gameState.isGameActive) {
        // Spawn new objects periodically
        if (timestamp - gameState.lastSpawnTime > gameState.spawnInterval) {
            spawnObject();
            gameState.lastSpawnTime = timestamp;
            
            // Gradually decrease spawn interval for increased difficulty
            gameState.spawnInterval = Math.max(200, gameState.spawnInterval - 50);  //faster spawn interval as game progresses
        }
        
        updateObjects(deltaTime);
        updateParticles(deltaTime);
        checkCollisions();
        updateBladeTrails();
        
        // Render the scene
        renderer.render(scene, camera);
        
        // Increment frame counter for the game loop as well
        // This ensures we have a consistent frame count even if hand tracking is slower
        gameState.frameCount++;
        
        requestAnimationFrame(gameLoop);
    }
}

// Start the game
function startGame() {
    // Reset game state
    gameState.score = 0;
    gameState.lives = gameState.defaultLives;  // Use default value
    gameState.lastSpawnTime = 0;
    gameState.spawnInterval = gameState.defaultSpawnInterval;  // Use default value
    gameState.lastFrameTime = 0;
    gameState.frameCount = 0;  // Reset frame counter
    
    // 初始化数据上传功能
    gameState.gameStartTime = Date.now();
    gameState.lastUploadScore = 0;
    gameState.lastUploadTime = Date.now();
    
    // 初始化数据上传器
    if (typeof GameDataUploader !== 'undefined') {
        gameState.dataUploader = new GameDataUploader('reaction', 102); // 反应速度训练，李阿姨
        gameState.dataUploader.setScoreCallback(() => gameState.score);
        gameState.dataUploader.startGame(gameState.score);
        console.log('反应速度训练游戏开始，数据上传已启动');
    } else {
        console.warn('GameDataUploader类未找到，使用备用数据上传方案');
        startManualDataUpload();
    }
    
    // Clear any existing objects
    gameState.fruits.forEach(fruit => scene.remove(fruit.mesh));
    if (gameState.particles) {
        gameState.particles.forEach(particle => scene.remove(particle.mesh));
    }
    gameState.fruits = [];
    gameState.particles = [];
    
    // Clear blade trails
    gameState.bladeTrails.forEach(trail => trail.element.remove());
    gameState.bladeTrails = [];
    
    // Update UI
    scoreElement.textContent = gameState.score;
    livesElement.textContent = gameState.lives;
    
    // Hide start screen and apply screen overlay class
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    startScreen.classList.add('screen-overlay');
    gameOverScreen.classList.add('screen-overlay');
    
    // Start the game
    gameState.isGameActive = true;
    requestAnimationFrame(gameLoop);
}

// End the game
function endGame() {
    gameState.isGameActive = false;
    
    // 结束数据上传
    if (gameState.dataUploader) {
        gameState.dataUploader.endGame(gameState.score);
        gameState.dataUploader = null;
        console.log('反应速度训练游戏结束，最终数据已上传');
    } else {
        // 备用上传方案 - 上传最终数据
        uploadFinalGameData();
    }
    
    // Update final score
    finalScoreElement.textContent = gameState.score;
    
    // Show game over screen
    gameOverScreen.style.display = 'flex';
}

// Handle window resize
function onWindowResize() {
    camera.aspect = (window.innerWidth * 0.5) / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth * 0.5, window.innerHeight);
    
    // Update hand canvas dimensions
    handCanvas.width = window.innerWidth * 0.5;
    handCanvas.height = window.innerHeight;
}

// Initialize the game
async function init() {
    // Setup event listeners
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    window.addEventListener('resize', onWindowResize);
    
    // Set canvas dimensions
    handCanvas.width = window.innerWidth * 0.5;
    handCanvas.height = window.innerHeight;
    
    // Store default game parameters
    gameState.defaultSpawnInterval = 1500;  // Default spawn interval
    gameState.defaultLives = 5;  // Default lives
    
    // Add screen overlay class to start screen
    startScreen.classList.add('screen-overlay');

    // Further reduce spawn range for very small screens
    if (isMobileDevice() && window.innerWidth < 500) {
        gameState.mobileSpawnRange = 11; // Even smaller range for tiny screens
    }
    
    // Setup hand tracking
    await setupHandTracking();
    
    // Hide loading screen
    loadingScreen.style.display = 'none';
}

// Start initialization
init();

// 备用数据上传方案
function startManualDataUpload() {
    // 每15秒上传一次数据
    const uploadInterval = setInterval(() => {
        if (!gameState.isGameActive) {
            clearInterval(uploadInterval);
            return;
        }
        uploadPeriodicGameData();
    }, 15000); // 15秒间隔
    
    // 存储间隔ID以便游戏结束时清除
    gameState.uploadInterval = uploadInterval;
    console.log('备用数据上传定时器已启动，每15秒上传一次');
}

function uploadPeriodicGameData() {
    const currentTime = Date.now();
    const scoreIncrease = gameState.score - gameState.lastUploadScore;
    const timeIncrease = 15; // 15秒间隔
    
    const data = {
        patientId: 102, // 李阿姨的ID
        gameType: 'reaction', // 反应速度训练
        scoreIncrease: scoreIncrease,
        timeIncrease: timeIncrease,
        timestamp: new Date().toISOString()
    };
    
    uploadGameData(data);
    
    // 更新上传记录
    gameState.lastUploadScore = gameState.score;
    gameState.lastUploadTime = currentTime;
    
    console.log(`反应速度训练数据已上传: 得分+${scoreIncrease}, 时长+${timeIncrease}秒`);
}

function uploadFinalGameData() {
    if (!gameState.gameStartTime) return;
    
    const finalGameDuration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    const finalScoreIncrease = gameState.score - gameState.lastUploadScore;
    
    // 计算剩余时长（不足15秒的部分）
    const remainingTime = finalGameDuration % 15;
    
    if (finalScoreIncrease > 0 || remainingTime > 0) {
        const data = {
            patientId: 102,
            gameType: 'reaction',
            scoreIncrease: finalScoreIncrease,
            timeIncrease: remainingTime,
            timestamp: new Date().toISOString(),
            isFinalUpload: true
        };
        
        uploadGameData(data);
        console.log(`最终数据上传: 得分+${finalScoreIncrease}, 剩余时长+${remainingTime}秒`);
    }
    
    // 清除定时器
    if (gameState.uploadInterval) {
        clearInterval(gameState.uploadInterval);
        gameState.uploadInterval = null;
    }
}

function uploadGameData(data) {
    try {
        // 方法1: 使用localStorage进行本地数据传输
        const existingData = JSON.parse(localStorage.getItem('gameUploadData') || '[]');
        existingData.push(data);
        localStorage.setItem('gameUploadData', JSON.stringify(existingData));
        
        // 触发storage事件通知医护工作站
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'gameUploadData',
            newValue: JSON.stringify(existingData),
            storageArea: localStorage
        }));
        
        // 方法2: postMessage备用方案
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'GAME_DATA_UPLOAD',
                data: data
            }, '*');
        }
        
        // 方法3: 尝试发送到opener窗口
        if (window.opener) {
            try {
                window.opener.postMessage({
                    type: 'GAME_DATA_UPLOAD',
                    data: data
                }, '*');
            } catch (e) {
                console.warn('向opener窗口发送消息失败:', e);
            }
        }
        
        // 显示上传通知
        showUploadNotification(data.scoreIncrease, data.timeIncrease);
        
    } catch (error) {
        console.error('数据上传失败:', error);
    }
}

function showUploadNotification(score, time) {
    const notification = document.createElement('div');
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
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 300px;
        animation: slideInRight 0.3s ease-out forwards;
        border-left: 4px solid #34c759;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <div style="font-size: 16px;">🎯</div>
            <div>
                <div style="font-weight: 600; margin-bottom: 2px;">反应速度训练</div>
                <div style="font-size: 12px; opacity: 0.9;">
                    李阿姨得分+${score}分，训练时长+${time}秒
                </div>
            </div>
        </div>
    `;
    
    // 添加CSS动画
    const style = document.createElement('style');
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
    
    document.body.appendChild(notification);
    
    // 3秒后移除通知
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 300);
    }, 3000);
}