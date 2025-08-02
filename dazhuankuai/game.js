/*
苹果风格 Manual Brick Breaker Game
设计目标：极简干净 + 质感高级 + 交互流畅 + 一致性
*/

let cachedHighScores = null;
let allScores = null;
let highScoresFetched = false;

let screenWidth = window.innerWidth;
console.log("screen width: " + screenWidth);
let widthThreshold = 700;
const CANVAS_WIDTH = screenWidth >= widthThreshold ? 700 : 350;
const CANVAS_HEIGHT = CANVAS_WIDTH;

const canvas = document.getElementById("gameCanvas");
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext("2d", { alpha: false });

const handCanvas = document.getElementById("handCanvas");
const handCtx = handCanvas.getContext("2d");

const video = document.getElementById("videoElement");
const scoreElement = document.getElementById("scoreElement");
const levelElement = document.getElementById("levelElement");
const livesElement = document.getElementById("livesElement");
const levelUpIndicator = document.getElementById("levelUpIndicator");
const timeElement = document.getElementById("timeElement");

let lastTime = 0;
const FPS = 60;
const frameDelay = 1000 / FPS;
let processFrameID;

const VIDEO_WIDTH = 320;
const VIDEO_HEIGHT = 240;
video.width = VIDEO_WIDTH;
video.height = VIDEO_HEIGHT;
handCanvas.width = VIDEO_WIDTH;
handCanvas.height = VIDEO_HEIGHT;

const INITIAL_PADDLE_WIDTH = screenWidth >= widthThreshold ? 150 : 75;
const PADDLE_HEIGHT = screenWidth >= widthThreshold ? 15 : 8;
const BALL_RADIUS = screenWidth >= widthThreshold ? 8 : 6;
const BRICK_ROW_COUNT = 3;
const BRICK_COLUMN_COUNT = 8;
const BRICK_WIDTH = screenWidth >= widthThreshold ? 65 : 32;
const BRICK_HEIGHT = screenWidth >= widthThreshold ? 20 : 10;
const BRICK_PADDING = screenWidth >= widthThreshold ? 8 : 4;
const BRICK_OFFSET_TOP = screenWidth >= widthThreshold ? 50 : 25;
const BRICK_OFFSET_LEFT = screenWidth >= widthThreshold ? 58 : 29;
const PADDLE_BOTTOM_OFFSET = screenWidth >= widthThreshold ? 30 : 15;
const BALL_BOTTOM_OFFSET = screenWidth >= widthThreshold ? 40 : 20;

const INITIAL_BALL_SPEED = screenWidth >= widthThreshold ? 4 : 3;
const LEVEL_SPEED_INCREASE = 1.1;
const LEVEL_WIDTH_DECREASE = 0.9;

let timerInterval = null;

// 添加数据上传相关变量
let dataUploader = null; // 使用新的数据上传器
let gameStartTime = 0;

const gameState = {
  level: 1,
  paddle: {
    width: INITIAL_PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    x: CANVAS_WIDTH / 2 - INITIAL_PADDLE_WIDTH / 2,
    y: CANVAS_HEIGHT - PADDLE_BOTTOM_OFFSET,
  },
  ball: {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - BALL_BOTTOM_OFFSET,
    radius: BALL_RADIUS,
    dx: INITIAL_BALL_SPEED,
    dy: -INITIAL_BALL_SPEED,
    speed: INITIAL_BALL_SPEED,
    active: true,
  },
  stats: {
    score: 0,
    bricksRemaining: 0,
    elapsedTime: 0,
  },
  notification: {
    text: "",
    opacity: 0,
    fadeStart: 0,
  },
  gameStarted: false,
  modalDismissed: false,
  gameOver: false,
};

const bricks = new Float32Array(BRICK_ROW_COUNT * BRICK_COLUMN_COUNT * 3);

// 苹果风格：主题系统
class AppleThemeSystem {
  constructor() {
    this.themes = {
      "#1d1d1f": "深空灰",
      "#6c7b7f": "银白",
      "#ff6b8a": "玫瑰金",
      "#007aff": "浅蓝",
      "#34c759": "浅绿",
    };
    this.currentTheme = localStorage.getItem("theme-color") || "#1d1d1f";
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.bindEvents();
    this.updateActiveOption();
  }

  bindEvents() {
    const themeToggle = document.getElementById("themeToggle");
    const themePanel = document.getElementById("themePanel");
    const themeOptions = document.querySelectorAll(".theme-option");

    // 苹果风格：控制中心交互
    themeToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      themePanel.classList.toggle("visible");
      // 苹果风格：触觉反馈
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    });

    // 点击外部关闭面板
    document.addEventListener("click", (e) => {
      if (!themePanel.contains(e.target) && !themeToggle.contains(e.target)) {
        themePanel.classList.remove("visible");
      }
    });

    // 主题选项点击
    themeOptions.forEach((option) => {
      option.addEventListener("click", () => {
        const color = option.dataset.color;
        this.applyTheme(color);
        this.updateActiveOption();
        // 苹果风格：触觉反馈
        if (navigator.vibrate) {
          navigator.vibrate(100);
        }
        // 苹果风格：提示反馈
        this.showThemeChangeNotification(option.dataset.name);
        // 延迟关闭面板，让用户看到选中效果
        setTimeout(() => {
          themePanel.classList.remove("visible");
        }, 300);
      });
    });
  }

  applyTheme(color) {
    // 苹果风格：CSS变量全局更新
    document.documentElement.style.setProperty("--primary-color", color);
    localStorage.setItem("theme-color", color);
    this.currentTheme = color;
  }

  updateActiveOption() {
    const themeOptions = document.querySelectorAll(".theme-option");
    themeOptions.forEach((option) => {
      option.classList.toggle(
        "active",
        option.dataset.color === this.currentTheme
      );
    });
  }

  showThemeChangeNotification(themeName) {
    showAppleAlert(`已切换到${themeName}主题`, 2000);
  }
}

// 苹果风格：提示框系统
function showAppleAlert(message, duration = 3000) {
  const alertContainer = document.getElementById("alertContainer");

  // 移除现有提示框
  const existingAlert = alertContainer.querySelector(".alert-box");
  if (existingAlert) {
    existingAlert.remove();
  }

  const alertBox = document.createElement("div");
  alertBox.className = "alert-box";
  alertBox.textContent = message;

  alertContainer.appendChild(alertBox);

  // 苹果风格：自动消失动画
  setTimeout(() => {
    alertBox.style.animation =
      "alertSlideDown 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards";
    setTimeout(() => {
      if (alertBox.parentNode) {
        alertBox.remove();
      }
    }, 300);
  }, duration);
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    gameState.stats.elapsedTime++;
    timeElement.textContent = `${gameState.stats.elapsedTime}s`;
  }, 1000);

  // 启动数据上传器
  if (!dataUploader) {
    dataUploader = new GameDataUploader('coordination', 102); // 手眼协调训练，李阿姨
    dataUploader.setScoreCallback(() => gameState.stats.score);
  }
  dataUploader.startGame(gameState.stats.score);
}

function stopTimer() {
  clearInterval(timerInterval);
  
  // 停止数据上传
  if (dataUploader) {
    dataUploader.endGame(gameState.stats.score);
  }
}

function resetTimer() {
  stopTimer();
  gameState.stats.elapsedTime = 0;
  timeElement.textContent = "0s";
}

function getBrickRowCount(level) {
  if (level === 1) return 1;
  if (level === 2) return 2;
  return 3;
}

function initBricks() {
  const rowCount = getBrickRowCount(gameState.level);
  gameState.stats.bricksRemaining = rowCount * BRICK_COLUMN_COUNT;
  bricks.fill(0);
  for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
    for (let r = 0; r < rowCount; r++) {
      const idx = (c * BRICK_ROW_COUNT + r) * 3;
      bricks[idx] = c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT;
      bricks[idx + 1] = r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP;
      bricks[idx + 2] = 1;
    }
  }
}

function updateLivesDisplay() {
  return;
}

function drawNotification() {
  if (gameState.notification.opacity <= 0) return;
  const currentTime = performance.now();
  const elapsed = currentTime - gameState.notification.fadeStart;
  const duration = 2000;
  gameState.notification.opacity = Math.max(0, 1 - elapsed / duration);
  if (gameState.notification.opacity > 0) {
    ctx.save();
    ctx.globalAlpha = gameState.notification.opacity;
    // 苹果风格：获取当前主题色用于通知文本
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary-color")
      .trim();
    ctx.fillStyle = primaryColor;
    ctx.font = "bold 24px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      gameState.notification.text,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2
    );
    ctx.restore();
  }
}

async function setupHandTracking() {
  let hands;
  let noHandFrames = 0;
  const NO_HAND_THRESHOLD = 60;
  let positionBuffer = new Array(5).fill(null);
  let lastProcessedTime = 0;
  const PROCESS_INTERVAL = 1000 / 30;
  let videoStream = null;
  let isProcessingFrame = false;
  let handTrackingActive = false;
  let wasGameRunning = false;
  let pauseOverlay = null;

  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;

  function createPauseOverlay() {
    if (pauseOverlay) return pauseOverlay;
    pauseOverlay = document.createElement("div");
    pauseOverlay.className = "pause-overlay";
    pauseOverlay.innerHTML = `
      <p style="color: #ff4444; margin-bottom: 10px;">手势追踪丢失</p>
      <p>请确保手掌清晰可见</p>
      <p>尝试稍微远离摄像头或调整角度</p>
      <p>追踪恢复后游戏将自动继续</p>
    `;
    document.querySelector(".game-container").appendChild(pauseOverlay);
    return pauseOverlay;
  }

  function pauseGame() {
    if (gameState.gameStarted && !gameState.gameOver) {
      wasGameRunning = true;
      gameState.gameStarted = false;
      stopTimer();
      createPauseOverlay().style.display = "block";
      showAppleAlert("手势追踪丢失，游戏已暂停", 3000);
    }
  }

  function resumeGame() {
    if (wasGameRunning && !gameState.gameOver) {
      gameState.gameStarted = true;
      wasGameRunning = false;
      startTimer();
      if (pauseOverlay) {
        pauseOverlay.style.display = "none";
      }
      showAppleAlert("手势追踪恢复，游戏继续", 2000);
    }
  }

  async function initializeHandTracking() {
    try {
      showAppleAlert("正在初始化手势识别...", 2000);

      const mediapipeCDNs = [
        "https://cdn.jsdelivr.net/npm/@mediapipe/hands/",
        "https://unpkg.com/@mediapipe/hands/",
        "https://www.gstatic.com/mediapipe/hands/",
      ];
      let loadError;
      for (const cdn of mediapipeCDNs) {
        try {
          hands = new window.Hands({
            locateFile: (file) => `${cdn}${file}`,
          });
          loadError = null;
          break;
        } catch (error) {
          loadError = error;
          console.warn(`Failed to load from ${cdn}:`, error);
          continue;
        }
      }
      if (loadError) throw loadError;

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results) => {
        const now = performance.now();
        if (now - lastProcessedTime < PROCESS_INTERVAL) return;
        lastProcessedTime = now;

        handCtx.save();
        handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);

        if (
          results.multiHandLandmarks &&
          results.multiHandLandmarks.length > 0
        ) {
          noHandFrames = 0;

          for (const landmarks of results.multiHandLandmarks) {
            // 苹果风格：使用主题色绘制手势线条
            const primaryColor = getComputedStyle(document.documentElement)
              .getPropertyValue("--primary-color")
              .trim();
            window.drawConnectors(
              handCtx,
              landmarks,
              window.Hands.HAND_CONNECTIONS,
              { color: primaryColor, lineWidth: 3 }
            );
            window.drawLandmarks(handCtx, landmarks, {
              color: "#ffffff",
              lineWidth: 2,
              radius: 4,
            });
          }

          const rawX = results.multiHandLandmarks[0][0].x;
          const palmX = 1.4 - rawX * 1.8;
          positionBuffer.shift();
          positionBuffer.push(palmX);
          const weights = [0.1, 0.15, 0.2, 0.25, 0.3];
          let smoothedX = 0;
          let totalWeight = 0;
          for (let i = 0; i < positionBuffer.length; i++) {
            if (positionBuffer[i] !== null) {
              smoothedX += positionBuffer[i] * weights[i];
              totalWeight += weights[i];
            }
          }
          if (totalWeight > 0) {
            smoothedX /= totalWeight;
            const alpha = 0.5;
            const currentPaddleX =
              (gameState.paddle.x + gameState.paddle.width / 2) / CANVAS_WIDTH;
            smoothedX = alpha * smoothedX + (1 - alpha) * currentPaddleX;
            const targetX =
              smoothedX * CANVAS_WIDTH - gameState.paddle.width / 2;
            gameState.paddle.x = Math.max(
              -65,
              Math.min(CANVAS_WIDTH - gameState.paddle.width + 65, targetX)
            );
          }

          // 苹果风格：使用主题色边框表示追踪状态
          const primaryColor = getComputedStyle(document.documentElement)
            .getPropertyValue("--primary-color")
            .trim();
          video.style.borderColor = primaryColor;
          handTrackingActive = true;
          if (
            !gameState.gameStarted &&
            gameState.modalDismissed &&
            !wasGameRunning
          ) {
            gameState.gameStarted = true;
            gameStartTime = Date.now(); // 记录游戏开始时间
            dataUploader.startGame(0); // 重置上传分数
            startTimer();
            showAppleAlert("手势识别成功，游戏开始！", 2000);
          } else if (handTrackingActive && wasGameRunning) {
            resumeGame();
          }
        } else {
          noHandFrames++;
          if (noHandFrames > NO_HAND_THRESHOLD) {
            video.style.borderColor = "#ff4444";
            if (handTrackingActive) {
              handTrackingActive = false;
              pauseGame();
            }
          }
        }
        handCtx.restore();
      });

      showAppleAlert("手势识别初始化完成", 2000);
      return hands;
    } catch (error) {
      console.error("Error initializing hand tracking:", error);
      showAppleAlert("手势识别初始化失败", 3000);
      return null;
    }
  }

  async function startCamera() {
    try {
      showAppleAlert("正在启动摄像头...", 2000);

      const permission = await navigator.permissions.query({ name: "camera" });
      if (permission.state === "denied")
        throw new Error("Camera permission denied");
      const constraints = {
        video: {
          width: { ideal: VIDEO_WIDTH },
          height: { ideal: VIDEO_HEIGHT },
          frameRate: { min: 15, ideal: 30, max: 60 },
          facingMode: "user",
        },
      };
      videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = videoStream;
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });
      await video.play();
      hands = await initializeHandTracking();
      processFrameID = requestAnimationFrame(processFrame);

      showAppleAlert("摄像头启动成功", 2000);
      return true;
    } catch (error) {
      console.error("Error starting camera:", error);

      // 提供更详细的错误信息
      if (
        error.name === "NotAllowedError" ||
        error.message.includes("permission")
      ) {
        showAppleAlert(
          "摄像头权限被拒绝！请点击地址栏摄像头图标允许访问",
          6000
        );
      } else if (error.name === "NotFoundError") {
        showAppleAlert("未检测到摄像头设备，请连接摄像头后重试", 4000);
      } else if (location.protocol === "file:") {
        showAppleAlert(
          "请使用本地服务器访问！直接打开HTML文件无法使用摄像头",
          6000
        );
      } else {
        showAppleAlert("摄像头启动失败，请检查设备连接和权限设置", 4000);
      }

      throw error;
    }
  }

  async function processFrame() {
    if (!hands || !videoStream || isProcessingFrame) {
      requestAnimationFrame(processFrame);
      return;
    }
    isProcessingFrame = true;
    try {
      await hands.send({ image: video });
    } catch (error) {
      console.error("Error processing frame:", error);
      cancelAnimationFrame(processFrameID);
      await startCamera();
    }
    isProcessingFrame = false;
    processFrameID = requestAnimationFrame(processFrame);
  }

  try {
    const success = await startCamera();
    if (!success) throw new Error("Failed to initialize camera");
  } catch (error) {
    console.error("摄像头初始化失败:", error);

    // 在控制台显示详细的解决方案
    console.log("=================================");
    console.log("摄像头无法访问的解决方案：");
    console.log("1. 确保使用本地服务器访问（localhost）");
    console.log("2. 双击'启动服务器.bat'启动本地服务器");
    console.log("3. 在浏览器中允许摄像头权限");
    console.log("4. 确保摄像头设备连接正常");
    console.log("=================================");
  }
}

function levelUp() {
  gameState.level++;
  levelElement.textContent = gameState.level;
  gameState.ball.speed *= LEVEL_SPEED_INCREASE;
  gameState.ball.dx = gameState.ball.speed * (gameState.ball.dx > 0 ? 1 : -1);
  gameState.ball.dy = gameState.ball.speed * (gameState.ball.dy > 0 ? 1 : -1);
  gameState.paddle.width *= LEVEL_WIDTH_DECREASE;

  // 苹果风格：等级提升动画
  levelUpIndicator.style.opacity = "1";
  setTimeout(() => {
    levelUpIndicator.style.opacity = "0";
  }, 2000);

  gameState.ball.active = true;
  gameState.ball.x = gameState.paddle.x + gameState.paddle.width / 2;
  gameState.ball.y = gameState.paddle.y - BALL_RADIUS;
  initBricks();

  // 苹果风格：等级提升提示
  showAppleAlert(`恭喜升级到第${gameState.level}关！`, 3000);

  // 苹果风格：触觉反馈
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }
}

function handleBallMiss() {
  gameState.ball.active = true;
  gameState.ball.x = gameState.paddle.x + gameState.paddle.width / 2;
  gameState.ball.y = gameState.paddle.y - BALL_RADIUS;
  gameState.ball.dx = gameState.ball.speed * (Math.random() > 0.5 ? 1 : -1);
  gameState.ball.dy = -gameState.ball.speed;
}

function drawBricks() {
  // 苹果风格：使用主题色绘制砖块
  const primaryColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary-color")
    .trim();
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  for (let i = 0; i < bricks.length; i += 3) {
    if (bricks[i + 2] === 1) {
      ctx.roundRect(bricks[i], bricks[i + 1], BRICK_WIDTH, BRICK_HEIGHT, 4);
    }
  }
  ctx.fill();
}

function drawGame() {
  // 苹果风格：使用次要色绘制挡板
  const secondaryColor =
    getComputedStyle(document.documentElement).getPropertyValue(
      "--secondary-color"
    ) || "#6c7b7f";
  ctx.fillStyle = secondaryColor;
  ctx.fillRect(
    gameState.paddle.x,
    gameState.paddle.y,
    gameState.paddle.width,
    PADDLE_HEIGHT
  );

  if (gameState.ball.active) {
    // 苹果风格：使用主题色绘制球
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary-color")
      .trim();
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

function checkWinCondition() {
  if (gameState.stats.bricksRemaining === 0) {
    return true;
  }
  return false;
}

function collisionDetection() {
  if (!gameState.ball.active) return;
  const ballGridX = Math.floor(
    (gameState.ball.x - BRICK_OFFSET_LEFT) / (BRICK_WIDTH + BRICK_PADDING)
  );
  const ballGridY = Math.floor(
    (gameState.ball.y - BRICK_OFFSET_TOP) / (BRICK_HEIGHT + BRICK_PADDING)
  );
  for (
    let c = Math.max(0, ballGridX - 1);
    c <= Math.min(BRICK_COLUMN_COUNT - 1, ballGridX + 1);
    c++
  ) {
    for (
      let r = Math.max(0, ballGridY - 1);
      r <= Math.min(BRICK_ROW_COUNT - 1, ballGridY + 1);
      r++
    ) {
      const idx = (c * BRICK_ROW_COUNT + r) * 3;
      if (bricks[idx + 2] === 1) {
        if (
          gameState.ball.x > bricks[idx] &&
          gameState.ball.x < bricks[idx] + BRICK_WIDTH &&
          gameState.ball.y > bricks[idx + 1] &&
          gameState.ball.y < bricks[idx + 1] + BRICK_HEIGHT
        ) {
          gameState.ball.dy = -gameState.ball.dy;
          bricks[idx + 2] = 0;
          gameState.stats.score += 1;
          gameState.stats.bricksRemaining--;
          scoreElement.textContent = gameState.stats.score;

          // 苹果风格：砖块击破触觉反馈
          if (navigator.vibrate) {
            navigator.vibrate(30);
          }

          if (checkWinCondition()) {
            levelUp();
          }
        }
      }
    }
  }
}

function gameLoop(timestamp) {
  if (timestamp - lastTime >= frameDelay) {
    lastTime = timestamp;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // 苹果风格：使用CSS变量背景色
    const backgroundColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--background-secondary")
      .trim();
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (gameState.gameStarted && gameState.ball.active && !gameState.gameOver) {
      if (
        gameState.ball.x + gameState.ball.dx > CANVAS_WIDTH - BALL_RADIUS ||
        gameState.ball.x + gameState.ball.dx < BALL_RADIUS
      ) {
        gameState.ball.dx = -gameState.ball.dx;
      }
      if (gameState.ball.y + gameState.ball.dy < BALL_RADIUS) {
        gameState.ball.dy = -gameState.ball.dy;
      }
      if (
        gameState.ball.dy > 0 &&
        gameState.ball.y + gameState.ball.dy >
          gameState.paddle.y - BALL_RADIUS / 2
      ) {
        if (
          gameState.ball.x > gameState.paddle.x &&
          gameState.ball.x < gameState.paddle.x + gameState.paddle.width
        ) {
          const hitPoint =
            (gameState.ball.x - gameState.paddle.x) / gameState.paddle.width;
          const maxAngle = Math.PI / 3;
          const angle = (hitPoint * 2 - 1) * maxAngle;
          const speed = Math.sqrt(
            gameState.ball.dx * gameState.ball.dx +
              gameState.ball.dy * gameState.ball.dy
          );
          gameState.ball.dx = Math.sin(angle) * speed;
          gameState.ball.dy = -Math.cos(angle) * speed;
        } else if (gameState.ball.y > CANVAS_HEIGHT + BALL_RADIUS) {
          handleBallMiss();
        }
      }
      gameState.ball.x += gameState.ball.dx;
      gameState.ball.y += gameState.ball.dy;
    } else {
      gameState.ball.x = gameState.paddle.x + gameState.paddle.width / 2;
      gameState.ball.y = gameState.paddle.y - BALL_RADIUS;
    }
    drawBricks();
    drawGame();
    drawNotification();
    collisionDetection();
  }
  requestAnimationFrame(gameLoop);
}

const HIGHSCORE_URL = window.config.HIGHSCORE_URL;

async function getHighScores() {
  if (!cachedHighScores) {
    await fetchHighScoresInBackground();
  }
  return cachedHighScores;
}

function insertCurrentScore(currentScore, playerName, level) {
  if (!cachedHighScores) {
    cachedHighScores = [];
  }
  const newScore = [playerName, currentScore, level];
  let insertIndex = cachedHighScores.findIndex(
    (score) => currentScore > score[1]
  );
  if (insertIndex === -1) {
    insertIndex = cachedHighScores.length;
  }
  cachedHighScores.splice(insertIndex, 0, newScore);
  if (cachedHighScores.length > 10) {
    cachedHighScores = cachedHighScores.slice(0, 10);
  }
  return cachedHighScores;
}

async function submitScore(name, score, level) {
  try {
    const response = await fetch(HIGHSCORE_URL, {
      method: "POST",
      body: JSON.stringify({
        name: name.substring(0, 20),
        score: score,
        level: level,
      }),
    });
    if (!response.ok) throw new Error("Network response was not ok");
    return true;
  } catch (error) {
    console.error("Error submitting score:", error);
    return false;
  }
}

async function handleGameOver() {
  stopTimer();
  
  // 停止数据上传
  if (dataUploader) {
    dataUploader.endGame(gameState.stats.score);
  }
  
  const gameOverModal = document.getElementById("gameOverModal");
  document.getElementById(
    "finalTime"
  ).textContent = `${gameState.stats.elapsedTime}s`;
  document.getElementById("finalLevel").textContent = gameState.level;
  document.getElementById("finalScore").textContent = gameState.stats.score;
  let highScoreTable = document.querySelector(".high-scores");
  if (highScoreTable) {
    highScoreTable.classList.add("hidden");
  }
  gameOverModal.style.display = "flex";

  // 苹果风格：优化的用户输入体验
  let playerName;
  setTimeout(() => {
    playerName = prompt("请输入您的名字用于排行榜:", "玩家");
    if (playerName) {
      handleHighScores(playerName);
    }
  }, 500);

  gameState.gameStarted = false;
  gameState.gameOver = true;

  showAppleAlert("游戏结束！", 2000);
}

async function handleHighScores(playerName) {
  const loadingText = document.querySelector(".loading-text");
  loadingText.classList.remove("hidden");

  showAppleAlert("正在提交分数...", 2000);

  if (!cachedHighScores) {
    await fetchHighScoresInBackground();
  }
  const updatedScores = insertCurrentScore(
    gameState.stats.score,
    playerName,
    gameState.level
  );
  displayHighScores(updatedScores);
  document.querySelector(".high-scores").classList.remove("hidden");
  loadingText.classList.add("hidden");

  const submitResult = await submitScore(
    playerName,
    gameState.stats.score,
    gameState.level
  );
  if (submitResult) {
    showAppleAlert("分数提交成功！", 2000);
  } else {
    showAppleAlert("分数提交失败，请检查网络连接", 3000);
  }
}

function calculatePercentileRank(currentScore, scores) {
  if (!scores || scores.length === 0) return 0;
  currentScore = Number(currentScore);
  const scoreValues = scores.map((score) => Number(score[1]));
  const scoresBelow = scoreValues.filter(
    (score) => score < currentScore
  ).length;
  if (scoresBelow === 0) return 0;
  if (scoresBelow === scoreValues.length) return 100;
  const percentile = (scoresBelow / scoreValues.length) * 100;
  return percentile;
}

function createPercentileMessage(percentile, currentScore) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "percentile-message";
  messageDiv.textContent = `您的分数 ${currentScore} 超过了 ${parseFloat(
    percentile
  ).toFixed(1)}% 的玩家`;
  return messageDiv;
}

function displayHighScores(topScores) {
  if (!topScores) return;
  const percentile = calculatePercentileRank(gameState.stats.score, allScores);
  const highScoresHTML = `
      <div class="high-scores">
          <h3>排行榜 TOP 10</h3>
          <div class="scores-list">
              ${topScores
                .map(
                  (score, index) => `
                  <div class="score-entry ${
                    gameState.stats.score === score[1] ? "current-score" : ""
                  }">
                      <span class="rank">${index + 1}</span>
                      <span class="name">${score[0]}</span>
                      <span class="level">L${score[2]}</span>
                      <span class="score">${score[1]}</span>
                  </div>
              `
                )
                .join("")}
          </div>
      </div>
  `;
  let highScoresContainer = document.querySelector(".high-scores");
  const modalContent = document.querySelector("#gameOverModal .modal-content");
  if (!highScoresContainer) {
    const container = document.createElement("div");
    container.innerHTML = highScoresHTML;
    const restartButton = modalContent.querySelector(".apple-button");
    modalContent.insertBefore(container, restartButton);
    highScoresContainer = container.querySelector(".high-scores");
  } else {
    highScoresContainer.outerHTML = highScoresHTML;
    highScoresContainer = document.querySelector(".high-scores");
  }
  const existingMessage = modalContent.querySelector(".percentile-message");
  if (existingMessage) {
    existingMessage.remove();
  }
  const percentileMessage = createPercentileMessage(
    percentile,
    gameState.stats.score
  );
  if (highScoresContainer) {
    highScoresContainer.appendChild(percentileMessage);
  }
}

function closeGameOverModal() {
  const gameOverModal = document.getElementById("gameOverModal");
  gameOverModal.style.display = "none";
}

function restartGame() {
  resetTimer();
  
  // 停止数据上传
  if (dataUploader) {
    dataUploader.endGame(gameState.stats.score);
  }
  gameStartTime = Date.now();
  
  gameState.level = 1;
  levelElement.textContent = "1";
  gameState.paddle.width = INITIAL_PADDLE_WIDTH;
  gameState.ball.speed = INITIAL_BALL_SPEED;
  gameState.ball.dx = INITIAL_BALL_SPEED;
  gameState.ball.dy = -INITIAL_BALL_SPEED;
  gameState.stats.score = 0;
  scoreElement.textContent = "0";
  gameState.notification = {
    text: "",
    opacity: 0,
    fadeStart: 0,
  };
  gameState.ball.active = true;
  gameState.ball.x = gameState.paddle.x + gameState.paddle.width / 2;
  gameState.ball.y = gameState.paddle.y - BALL_RADIUS;
  gameState.gameOver = false;
  initBricks();
  document.getElementById("gameOverModal").style.display = "none";
  gameState.gameStarted = true;
  startTimer();
  dataUploader.startGame(0); // 重新启动定期数据上传（15秒间隔）
  gameState.modalDismissed = true;
  gameState.ball.dx = INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
  gameState.ball.dy = -INITIAL_BALL_SPEED;

  showAppleAlert("游戏重新开始！", 2000);
}

function startGame() {
  document.getElementById("startModal").style.display = "none";
  gameState.modalDismissed = true;

  // 重置累计数据
  // totalGameTime = 0; // 移除旧的累计数据
  // totalGameScore = 0; // 移除旧的累计数据
  // lastUploadTime = 0; // 移除旧的累计数据

  showAppleAlert("将手掌对准摄像头开始游戏", 3000);

  // 立即发送一次测试数据以确保连接正常
  setTimeout(() => {
    // uploadGameData(); // 移除旧的数据上传
  }, 2000);
}

// 苹果风格：平滑滚动
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

async function fetchHighScoresInBackground() {
  if (highScoresFetched) return;
  try {
    const response = await fetch(HIGHSCORE_URL);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    allScores = data.scores;
    cachedHighScores = data.scores.slice(0, 10);
    highScoresFetched = true;
    console.log("排行榜数据加载完成");
  } catch (error) {
    console.error("Error fetching high scores:", error);
    highScoresFetched = false;
  }
}

// 苹果风格：添加roundRect polyfill（为了支持圆角矩形）
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (
    x,
    y,
    width,
    height,
    radius
  ) {
    if (typeof radius === "undefined") {
      radius = 5;
    }
    if (typeof radius === "number") {
      radius = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
      var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
      for (var side in defaultRadius) {
        radius[side] = radius[side] || defaultRadius[side];
      }
    }
    this.beginPath();
    this.moveTo(x + radius.tl, y);
    this.lineTo(x + width - radius.tr, y);
    this.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    this.lineTo(x + width, y + height - radius.br);
    this.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius.br,
      y + height
    );
    this.lineTo(x + radius.bl, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    this.lineTo(x, y + radius.tl);
    this.quadraticCurveTo(x, y, x + radius.tl, y);
    this.closePath();
    return this;
  };
}

// 苹果风格：页面加载完成初始化
document.addEventListener("DOMContentLoaded", () => {
  // 初始化主题系统
  new AppleThemeSystem();

  // 后台获取排行榜
  fetchHighScoresInBackground();

  // 显示欢迎消息
  setTimeout(() => {
    showAppleAlert("欢迎使用手势控制打砖块游戏！", 3000);
  }, 1000);
});

// 游戏初始化
updateLivesDisplay();
initBricks();
setupHandTracking().catch(console.error);
requestAnimationFrame(gameLoop);
