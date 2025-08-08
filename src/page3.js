import * as THREE from 'three';

// 高饱和度颜色数组
const highSaturationColors = [
  0xFF0000, // 红色
  0x00FF00, // 绿色
  0x0000FF, // 蓝色
  0xFFFF00, // 黄色
  0xFF00FF, // 洋红色
  0x00FFFF, // 青色
  0xFF8000, // 橙色
  0x8000FF, // 紫色
  0xFF0080, // 粉红色
  0x80FF00, // 青绿色
  0x0080FF, // 天蓝色
  0xFF4000, // 橙红色
  0x4000FF, // 蓝紫色
  0xFF0040, // 玫红色
  0x40FF00, // 青绿色
  0x0040FF, // 深蓝色
  0xFF2000, // 红橙色
  0x2000FF  // 深紫色
];

// 获取随机高饱和度颜色
function getRandomHighSaturationColor() {
  return highSaturationColors[Math.floor(Math.random() * highSaturationColors.length)];
}

// 创建场景
const scene = new THREE.Scene();
// scene.background = new THREE.Color(getRandomHighSaturationColor()); // 注释掉原来的背景

// 创建相机
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// 创建渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// 动画参数
let playerAngle = 0; // 玩家在轨道上的角度
let playerSpeed = 0.003; // 玩家移动速度（从0.02降低到0.005）
let trackRadius = 300; // 轨道半径（从50增大到100）
let trackHeight = 40; // 轨道高度变化（减小起伏）
let trackSegments = 100; // 轨道段数
let skyboxRotation = 0; // skybox旋转角度
let currentLane = Math.floor(Math.random() * 4); // 当前轨道（0-3）
let targetLane = currentLane; // 目标轨道
let laneSwitchProgress = 0; // 轨道切换进度
let lanePosition = 0; // 在轨道内的位置（-1到1，-1为左边缘，1为右边缘）

// 新增：sphere相关变量
let spheres = []; // 存储所有sphere
let collectedSpheres = []; // 存储已收集的sphere
let sphereGroup = new THREE.Group(); // sphere组
scene.add(sphereGroup);

// 新增：游戏状态变量
let score = 0; // 分数
let totalSpheresCollected = 0; // 总收集球数
let trackCurve; // 存储轨道曲线引用

// 新增：速度分值系统
let baseScore = 50; // 基础分值从10增加到50
let speedMultiplier = 1.0; // 速度倍数
let minSpeed = 0.002; // 最小速度
let maxSpeed = 0.02; // 最大速度

// 新增：按键状态跟踪
let keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  KeyA: false,
  KeyD: false
};

// 新增：奖励反馈UI
let rewardEffects = []; // 存储奖励效果

// 新增：粒子爆炸效果
let explosionParticles = []; // 存储爆炸粒子

// 新增：路障系统
let obstacles = []; // 存储路障
let obstacleGroup = new THREE.Group(); // 路障组
scene.add(obstacleGroup);

// 新增：碰撞冷却系统
let collisionCooldowns = new Map(); // 存储每个路障的碰撞冷却时间
let cooldownDuration = 1000; // 冷却时间1秒（毫秒）

// 新增：训练系统
let isTrainingStarted = false; // 训练是否开始
let isTrainingPaused = true; // 训练是否暂停
let trainingStartTime = 0; // 训练开始时间
let trainingDuration = 15 * 60 * 1000; // 15分钟训练时间（毫秒）
let trainingTimer = null; // 训练计时器

// 新增：球数量管理
let targetSphereCount = 30; // 目标球数量

// 创建旋转条纹skybox
function createRotatingSkybox() {
  const skyboxSize = 1000; // skybox大小（从300增大到600）
  const stripeWidth = 20; // 条纹宽度
  
  // 创建skybox几何体
  const skyboxGeometry = new THREE.BoxGeometry(skyboxSize, skyboxSize, skyboxSize);
  
  // 创建条纹材质
  const stripeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      stripeWidth: { value: stripeWidth },
      skyboxSize: { value: skyboxSize }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float stripeWidth;
      uniform float skyboxSize;
      varying vec3 vWorldPosition;
      
      // 高斯模糊函数
      float gaussian(float x, float sigma) {
        return exp(-(x * x) / (70.0 * sigma * sigma));
      }
      
      void main() {
        // 计算旋转后的坐标
        float cosTime = cos(time * 0.01);
        float sinTime = sin(time * 0.01);
        
        vec3 rotatedPos;
        rotatedPos.x = vWorldPosition.x * cosTime - vWorldPosition.z * sinTime;
        rotatedPos.y = vWorldPosition.y;
        rotatedPos.z = vWorldPosition.x * sinTime + vWorldPosition.z * cosTime;
        
        // 创建条纹图案
        float stripe = mod(rotatedPos.x + rotatedPos.y + rotatedPos.z, stripeWidth * 1.0);
        float distanceFromStripe = abs(stripe - stripeWidth);
        
        // 应用高斯模糊
        float sigma = 2.0; // 模糊强度
        float blurredColor = gaussian(distanceFromStripe, sigma);
        
        // 调整对比度，让黑白更分明
        blurredColor = smoothstep(0.2, 0.8, blurredColor);
        
        gl_FragColor = vec4(blurredColor, blurredColor, blurredColor, 1.0);
      }
    `,
    side: THREE.BackSide // 内部渲染
  });
  
  const skybox = new THREE.Mesh(skyboxGeometry, stripeMaterial);
  skybox.name = 'skybox'; // 给skybox添加名称
  scene.add(skybox);
  
  return stripeMaterial;
}

// 创建环形轨道
function createTrack() {
  const trackGeometry = new THREE.BufferGeometry();
  const trackMaterial = new THREE.MeshLambertMaterial({ 
    color: getRandomHighSaturationColor(), // 随机高饱和度颜色
    transparent: true,
    opacity: 0.9
  });
  
  const trackPoints = [];
  const trackWidth = 10; // 轨道总宽度，用于创建轨道几何体
  const trackThickness = 2;
  
  // 生成轨道点
  for (let i = 0; i <= trackSegments; i++) {
    const angle = (i / trackSegments) * Math.PI * 2;
    const height = Math.sin(angle * 3) * trackHeight; // 波浪形高度变化
    const radius = trackRadius + Math.sin(angle * 2) * 5; // 半径变化
    
    // 轨道中心线
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = height;
    
    trackPoints.push(new THREE.Vector3(x, y, z));
  }
  
  // 创建轨道几何体
  const trackCurve = new THREE.CatmullRomCurve3(trackPoints);
  const trackTubeGeometry = new THREE.TubeGeometry(trackCurve, trackSegments, trackWidth, trackThickness, false);
  
  const track = new THREE.Mesh(trackTubeGeometry, trackMaterial);
  track.castShadow = true;
  track.receiveShadow = true;
  scene.add(track);
  
  return trackCurve;
}

// 创建轨道花纹
function createTrackPattern() {
  const patternGroup = new THREE.Group();
  
  for (let i = 0; i < trackSegments; i++) {
    const angle = (i / trackSegments) * Math.PI * 2;
    const height = Math.sin(angle * 3) * trackHeight;
    const radius = trackRadius + Math.sin(angle * 2) * 5;
    
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = height + 1; // 稍微高于轨道
    
    // 创建花纹块
    if (i % 5 === 0) { // 每5段放置一个花纹
      const patternGeometry = new THREE.BoxGeometry(2, 0.5, 2);
      const patternMaterial = new THREE.MeshLambertMaterial({ 
        color: getRandomHighSaturationColor()
      });
      const pattern = new THREE.Mesh(patternGeometry, patternMaterial);
      pattern.position.set(x, y, z);
      
      // 让花纹朝向轨道中心
      pattern.lookAt(0, y, 0);
      pattern.rotateY(Math.PI / 2);
      
      patternGroup.add(pattern);
    }
  }
  
  scene.add(patternGroup);
}

// 创建玩家立方体
function createPlayer() {
  const playerGeometry = new THREE.BoxGeometry(2, 2, 2); // 立方体大小从3x3x3缩小到2x2x2
  const playerMaterial = new THREE.MeshLambertMaterial({ 
    color: getRandomHighSaturationColor(), // 随机高饱和度颜色
    emissive: getRandomHighSaturationColor(),
    emissiveIntensity: 0.3
  });
  
  const player = new THREE.Mesh(playerGeometry, playerMaterial);
  player.castShadow = true;
  scene.add(player);
  
  return player;
}

// 创建sphere
function createSphere(trackCurve, lane, lanePos) {
  const sphereGeometry = new THREE.SphereGeometry(1, 16, 16); // 半径为1的sphere
  const sphereMaterial = new THREE.MeshLambertMaterial({ 
    color: getRandomHighSaturationColor(),
    emissive: getRandomHighSaturationColor(),
    emissiveIntensity: 0.2
  });
  
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.castShadow = true;
  
  // 随机生成sphere在轨道上的位置
  const randomAngle = Math.random() * Math.PI * 2;
  const t = randomAngle / (Math.PI * 2);
  const position = trackCurve.getPointAt(t);
  const tangent = trackCurve.getTangentAt(t);
  
  // 计算轨道的法向量
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
  const trackNormal = new THREE.Vector3().crossVectors(right, tangent).normalize();
  
  // 计算sphere在指定轨道上的位置
  const totalTrackWidth = 20;
  const laneWidth = totalTrackWidth / 4;
  const laneCenterOffset = (lane * laneWidth) - (totalTrackWidth / 2) + (laneWidth / 2);
  const laneInnerOffset = lanePos * (laneWidth / 2);
  const finalOffset = laneCenterOffset + laneInnerOffset;
  
  // 设置sphere位置
  const finalPosition = position.clone();
  finalPosition.add(right.clone().multiplyScalar(finalOffset));
  finalPosition.add(trackNormal.clone().multiplyScalar(3)); // 在轨道上方3单位
  
  sphere.position.copy(finalPosition);
  
  // 存储sphere信息
  sphere.userData = {
    lane: lane,
    lanePosition: lanePos,
    angle: randomAngle,
    collected: false
  };
  
  sphereGroup.add(sphere);
  spheres.push(sphere);
  
  return sphere;
}

// 生成随机sphere
function generateRandomSpheres(trackCurve) {
  const sphereCount = 30; // 从15增加到30个sphere
  
  for (let i = 0; i < sphereCount; i++) {
    const randomLane = Math.floor(Math.random() * 4); // 随机轨道
    const randomLanePos = (Math.random() - 0.5) * 2; // 随机轨道内位置 (-1 到 1)
    createSphere(trackCurve, randomLane, randomLanePos);
  }
}

// 检测碰撞
function checkCollision(player, sphere) {
  const distance = player.position.distanceTo(sphere.position);
  return distance < 2; // 碰撞距离为2单位
}

// 更新已收集的sphere位置
function updateCollectedSpheres(player) {
  collectedSpheres.forEach((sphere, index) => {
    // 计算sphere在玩家上方的位置
    const offsetY = 3 + index * 2; // 每个sphere间隔2单位
    sphere.position.x = player.position.x;
    sphere.position.y = player.position.y + offsetY;
    sphere.position.z = player.position.z;
  });
}

// 创建UI元素
function createUI() {
  // 创建分数显示
  const scoreElement = document.createElement('div');
  scoreElement.id = 'score';
  scoreElement.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    color: white;
    font-size: 24px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    background: rgba(0, 0, 0, 0.7);
    padding: 10px 20px;
    border-radius: 8px;
    border: 2px solid #FFD700;
  `;
  scoreElement.innerHTML = '分数: 0 | 收集球数: 0 | 当前分值: 50';
  document.body.appendChild(scoreElement);
  
  // 创建速度指示器
  const speedIndicator = document.createElement('div');
  speedIndicator.id = 'speedIndicator';
  speedIndicator.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    color: white;
    font-size: 18px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    background: rgba(0, 0, 0, 0.7);
    padding: 8px 16px;
    border-radius: 6px;
    border: 2px solid #00FF00;
  `;
  speedIndicator.innerHTML = '速度: 正常';
  document.body.appendChild(speedIndicator);
  
  // 创建训练时间显示
  const timeElement = document.createElement('div');
  timeElement.id = 'timeDisplay';
  timeElement.style.cssText = `
    position: fixed;
    top: 140px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    color: white;
    font-size: 18px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    background: rgba(0, 0, 0, 0.7);
    padding: 8px 16px;
    border-radius: 6px;
    border: 2px solid #4ECDC4;
  `;
  timeElement.innerHTML = '训练时间: 00:00 / 15:00';
  document.body.appendChild(timeElement);
  
  return { scoreElement, speedIndicator, timeElement };
}

// 更新UI显示
function updateUI() {
  const scoreElement = document.getElementById('score');
  const speedIndicator = document.getElementById('speedIndicator');
  const timeElement = document.getElementById('timeDisplay');
  
  if (scoreElement) {
    const currentScore = getCurrentScore();
    scoreElement.innerHTML = `分数: ${score} | 收集球数: ${totalSpheresCollected} | 当前分值: ${currentScore}`;
  }
  
  if (speedIndicator) {
    const speedRatio = (playerSpeed - minSpeed) / (maxSpeed - minSpeed);
    let speedText = '速度: 正常';
    let borderColor = '#00FF00';
    
    if (speedRatio < 0.3) {
      speedText = '速度: 慢速';
      borderColor = '#FF6B6B';
    } else if (speedRatio > 0.7) {
      speedText = '速度: 快速';
      borderColor = '#4ECDC4';
    }
    
    speedIndicator.innerHTML = speedText;
    speedIndicator.style.borderColor = borderColor;
  }
  
  if (timeElement) {
    if (isTrainingStarted) {
      const elapsedTime = Date.now() - trainingStartTime;
      const remainingTime = Math.max(0, trainingDuration - elapsedTime);
      
      const elapsedMinutes = Math.floor(elapsedTime / 60000);
      const elapsedSeconds = Math.floor((elapsedTime % 60000) / 1000);
      
      timeElement.innerHTML = `训练时间: ${elapsedMinutes.toString().padStart(2, '0')}:${elapsedSeconds.toString().padStart(2, '0')} / 15:00`;
    } else {
      timeElement.innerHTML = '训练时间: 00:00 / 15:00';
    }
  }
}

// 生成单个新sphere
function generateNewSphere() {
  const randomLane = Math.floor(Math.random() * 4); // 随机轨道
  const randomLanePos = (Math.random() - 0.5) * 2; // 随机轨道内位置 (-1 到 1)
  createSphere(trackCurve, randomLane, randomLanePos);
}

// 生成单个新路障
function generateNewObstacle() {
  const randomLane = Math.floor(Math.random() * 4); // 随机轨道
  const randomLanePos = (Math.random() - 0.5) * 2; // 随机轨道内位置 (-1 到 1)
  createObstacle(trackCurve, randomLane, randomLanePos);
}

// 创建路障
function createObstacle(trackCurve, lane, lanePos) {
  const obstacleGeometry = new THREE.BoxGeometry(6, 4, 1); // 更窄更高，与轨道方向平行
  const obstacleMaterial = new THREE.MeshLambertMaterial({ 
    color: 0xFF0000, // 红色路障
    emissive: 0x660000,
    emissiveIntensity: 0.3
  });
  
  const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
  obstacle.castShadow = true;
  obstacle.receiveShadow = true;
  
  // 随机生成路障在轨道上的位置
  const randomAngle = Math.random() * Math.PI * 2;
  const t = randomAngle / (Math.PI * 2);
  const position = trackCurve.getPointAt(t);
  const tangent = trackCurve.getTangentAt(t);
  
  // 计算轨道的法向量
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
  const trackNormal = new THREE.Vector3().crossVectors(right, tangent).normalize();
  
  // 计算路障在指定轨道上的位置
  const totalTrackWidth = 20;
  const laneWidth = totalTrackWidth / 4;
  const laneCenterOffset = (lane * laneWidth) - (totalTrackWidth / 2) + (laneWidth / 2);
  const laneInnerOffset = lanePos * (laneWidth / 2);
  const finalOffset = laneCenterOffset + laneInnerOffset;
  
  // 设置路障位置
  const finalPosition = position.clone();
  finalPosition.add(right.clone().multiplyScalar(finalOffset));
  finalPosition.add(trackNormal.clone().multiplyScalar(2)); // 在轨道上方2单位
  
  obstacle.position.copy(finalPosition);
  
  // 让路障朝向与轨道方向平行
  obstacle.lookAt(finalPosition.clone().add(tangent));
  
  // 存储路障信息
  obstacle.userData = {
    lane: lane,
    lanePosition: lanePos,
    angle: randomAngle,
    type: 'obstacle'
  };
  
  obstacleGroup.add(obstacle);
  obstacles.push(obstacle);
  
  return obstacle;
}

// 生成随机路障
function generateRandomObstacles(trackCurve) {
  const obstacleCount = 15; // 从8增加到15个路障
  
  for (let i = 0; i < obstacleCount; i++) {
    const randomLane = Math.floor(Math.random() * 4); // 随机轨道
    const randomLanePos = (Math.random() - 0.5) * 2; // 随机轨道内位置 (-1 到 1)
    createObstacle(trackCurve, randomLane, randomLanePos);
  }
}

// 检测路障碰撞
function checkObstacleCollision(player, obstacle) {
  const distance = player.position.distanceTo(obstacle.position);
  
  // 路障尺寸：6x4x1（宽x高x深）
  // 玩家尺寸：2x2x2（立方体）
  // 使用更敏感的碰撞检测
  const obstacleHalfWidth = 3; // 路障宽度的一半
  const obstacleHalfHeight = 2; // 路障高度的一半
  const obstacleHalfDepth = 0.5; // 路障深度的一半
  const playerHalfSize = 1; // 玩家立方体的一半
  const extraTolerance = 1.0; // 增加额外容差，让碰撞更敏感
  
  // 计算碰撞距离：只要碰到路障的任何部分就触发
  const collisionDistance = Math.max(obstacleHalfWidth, obstacleHalfHeight, obstacleHalfDepth) + playerHalfSize + extraTolerance;
  
  return distance < collisionDistance; // 更敏感的碰撞检测
}

// 创建环境
function createEnvironment() {
  // 添加环境光
  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 2); // 更亮的环境光
  scene.add(ambientLight);
  
  // 添加方向光
  const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.2); // 更亮的方向光
  directionalLight.position.set(50, 50, 50);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);
  
  // 添加点光源跟随玩家
  const pointLight = new THREE.PointLight(getRandomHighSaturationColor(), 1.5, 100); // 随机高饱和度点光源
  pointLight.position.set(0, 10, 0);
  scene.add(pointLight);
  
  // 创建地面（注释掉）
  // const groundGeometry = new THREE.PlaneGeometry(2000, 2000); // 地面大小从400x400增大到2000x2000
  // const groundMaterial = new THREE.MeshLambertMaterial({ color: getRandomHighSaturationColor() }); // 随机高饱和度地面
  // const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  // ground.rotation.x = -Math.PI / 2;
  // ground.position.y = -200; // 地面位置从-60调整到-200
  // ground.receiveShadow = true;
  // scene.add(ground);
  
  return pointLight;
}

// 更新玩家位置
function updatePlayer(player, trackCurve, pointLight) {
  // 计算玩家在轨道上的位置
  const t = (playerAngle % (Math.PI * 2)) / (Math.PI * 2);
  const position = trackCurve.getPointAt(t);
  const tangent = trackCurve.getTangentAt(t);
  
  // 计算轨道的法向量（垂直于轨道方向）
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
  const trackNormal = new THREE.Vector3().crossVectors(right, tangent).normalize();
  
  // 计算轨道切换
  if (currentLane !== targetLane) {
    laneSwitchProgress += 0.15; // 轨道切换速度从0.05增加到0.15，更快切换
    if (laneSwitchProgress >= 1) {
      currentLane = targetLane;
      laneSwitchProgress = 0;
    }
  }
  
  // 计算当前轨道位置（四条轨道）
  const totalTrackWidth = 20; // 轨道总宽度
  const laneWidth = totalTrackWidth / 4; // 每条轨道宽度 = 20 / 4 = 5
  // 计算每条轨道中线的位置：轨道0在最左边，轨道3在最右边
  const laneCenterOffset = (currentLane * laneWidth) - (totalTrackWidth / 2) + (laneWidth / 2);
  // 在轨道内的偏移（-1到1，-1为左边缘，1为右边缘）
  const laneInnerOffset = lanePosition * (laneWidth / 2);
  // 最终偏移 = 轨道中线 + 轨道内偏移
  const finalOffset = laneCenterOffset + laneInnerOffset;
  
  // 如果正在切换轨道，插值计算位置
  if (currentLane !== targetLane) {
    const currentCenterOffset = (currentLane * laneWidth) - (totalTrackWidth / 2) + (laneWidth / 2);
    const targetCenterOffset = (targetLane * laneWidth) - (totalTrackWidth / 2) + (laneWidth / 2);
    const interpolatedCenterOffset = currentCenterOffset + (targetCenterOffset - currentCenterOffset) * laneSwitchProgress;
    const interpolatedInnerOffset = lanePosition * (laneWidth / 2);
    const interpolatedOffset = interpolatedCenterOffset + interpolatedInnerOffset;
    
    // 计算最终位置
    const finalPosition = position.clone();
    finalPosition.add(right.clone().multiplyScalar(interpolatedOffset));
    finalPosition.add(trackNormal.clone().multiplyScalar(3)); // 在轨道上方3单位
    
    // 设置玩家位置和朝向
    player.position.copy(finalPosition);
    player.lookAt(finalPosition.clone().add(tangent));
  } else {
    // 计算最终位置
    const finalPosition = position.clone();
    finalPosition.add(right.clone().multiplyScalar(finalOffset));
    finalPosition.add(trackNormal.clone().multiplyScalar(3)); // 在轨道上方3单位
    
    // 设置玩家位置和朝向
    player.position.copy(finalPosition);
    player.lookAt(finalPosition.clone().add(tangent));
  }
  
  // 更新点光源位置
  pointLight.position.copy(player.position);
  pointLight.position.y += 10;
  
  // 更新玩家角度
  playerAngle += playerSpeed;
}

// 更新相机位置
function updateCamera(player, trackCurve) {
  // 计算玩家在轨道上的位置
  const t = (playerAngle % (Math.PI * 2)) / (Math.PI * 2);
  const position = trackCurve.getPointAt(t);
  const tangent = trackCurve.getTangentAt(t);
  
  // 计算轨道的法向量（垂直于轨道方向）
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
  const trackNormal = new THREE.Vector3().crossVectors(right, tangent).normalize();
  
  // 相机位置：在玩家后方、上方，稍微偏右
  const cameraDistance = 12; // 相机距离玩家的距离（从18减小到12，更近）
  const cameraHeight = 6; // 相机高度（从8降低到6，更低）
  const cameraOffset = 2; // 相机水平偏移（从3减小到2，更聚焦）
  
  // 计算相机位置（跟随玩家在轨道上的实际位置）
  const cameraPosition = new THREE.Vector3();
  cameraPosition.copy(player.position); // 从玩家实际位置开始
  cameraPosition.add(tangent.clone().multiplyScalar(-cameraDistance)); // 后方
  cameraPosition.add(trackNormal.clone().multiplyScalar(cameraHeight)); // 上方
  cameraPosition.add(right.clone().multiplyScalar(cameraOffset)); // 稍微偏右
  
  // 设置相机位置
  camera.position.copy(cameraPosition);
  
  // 相机始终看向玩家位置
  camera.lookAt(player.position);
  
  // 确保相机不会到轨道下面
  if (camera.position.y < player.position.y + 2) {
    camera.position.y = player.position.y + 2;
  }
}

// 添加粒子效果
function createParticles() {
  const particleCount = 200; // 粒子数量从100增加到200
  const particles = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = trackRadius + (Math.random() - 0.5) * 60; // 粒子分布范围从40增大到60
    const height = (Math.random() - 0.5) * 100; // 高度范围从80增大到100
    
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = height;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    
    // 使用高饱和度颜色
    const color = getRandomHighSaturationColor();
    colors[i * 3] = ((color >> 16) & 255) / 255;     // 红色分量
    colors[i * 3 + 1] = ((color >> 8) & 255) / 255;  // 绿色分量
    colors[i * 3 + 2] = (color & 255) / 255;         // 蓝色分量
  }
  
  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const particleMaterial = new THREE.PointsMaterial({
    size: 4, // 粒子大小从3增大到4
    vertexColors: true,
    transparent: true,
    opacity: 0.9 // 不透明度从0.8增大到0.9
  });
  
  const particleSystem = new THREE.Points(particles, particleMaterial);
  scene.add(particleSystem);
  
  return particleSystem;
}

// 初始化场景
function init() {
  // 创建并播放背景音乐
  const bgMusic = new Audio('public/music/xieshi_bgm.wav');
  bgMusic.loop = true; // 设置循环播放
  bgMusic.volume = 0.5; // 设置音量为50%
  
  // 页面加载完成后自动播放音乐
  document.addEventListener('DOMContentLoaded', () => {
    bgMusic.play().catch(error => {
      console.log('音乐自动播放失败，可能需要用户交互:', error);
    });
  });
  
  // 添加点击事件来启动音乐（解决浏览器自动播放限制）
  document.addEventListener('click', () => {
    if (bgMusic.paused) {
      bgMusic.play().catch(error => {
        console.log('音乐播放失败:', error);
      });
    }
  }, { once: true }); // once: true 确保只执行一次
  
  trackCurve = createTrack(); // 保存轨道曲线引用
  createTrackPattern();
  const player = createPlayer();
  const pointLight = createEnvironment();
  const particles = createParticles();
  const skyboxMaterial = createRotatingSkybox(); // 保存skybox材质引用
  
  // 创建UI
  const uiElements = createUI();
  
  // 生成随机sphere
  generateRandomSpheres(trackCurve);
  
  // 生成随机路障
  generateRandomObstacles(trackCurve);
  
  // 显示训练开始浮窗
  createTrainingStartModal();
  
  // 动画循环
  function animate() {
    requestAnimationFrame(animate);
    
    // 如果训练暂停，只渲染场景，不更新游戏逻辑
    if (isTrainingPaused) {
      renderer.render(scene, camera);
      return;
    }
    
    // 处理连续按键
    handleContinuousKeys();
    
    // 更新玩家位置
    updatePlayer(player, trackCurve, pointLight);
    
    // 检测路障碰撞
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      if (checkObstacleCollision(player, obstacle)) {
        const currentTime = Date.now();
        const obstacleId = obstacle.id;
        
        // 检查是否在冷却时间内
        if (!collisionCooldowns.has(obstacleId) || 
            currentTime - collisionCooldowns.get(obstacleId) > cooldownDuration) {
          
          // 扣除分数
          score = Math.max(0, score - 30); // 扣除30分，但不低于0
          
          // 创建错误反馈效果
          const screenX = window.innerWidth / 2; // 屏幕中央
          const screenY = window.innerHeight / 2; // 屏幕中央
          createErrorEffect(screenX, screenY); // 错误反馈效果
          
          // 更新UI
          updateUI();
          
          // 设置冷却时间
          collisionCooldowns.set(obstacleId, currentTime);
        }
        
        // 路障不会消失，保持永久存在
        // 每次碰撞都会减分，但有冷却时间限制
      }
    }
    
    // 检测sphere碰撞
    for (let i = spheres.length - 1; i >= 0; i--) {
      const sphere = spheres[i];
      if (!sphere.userData.collected && checkCollision(player, sphere)) {
        // 收集sphere
        sphere.userData.collected = true;
        collectedSpheres.push(sphere);
        
        // 计算当前分值
        const currentScore = getCurrentScore();
        
        // 更新分数和球数
        score += currentScore; // 使用动态分值
        totalSpheresCollected++;
        
        // 从原数组中移除
        spheres.splice(i, 1);
        
        // 立即生成新sphere，保持球数量稳定
        generateNewSphere();
        
        // 更新UI
        updateUI();
        
        // 创建奖励反馈效果
        const screenX = window.innerWidth / 2; // 屏幕中央
        const screenY = window.innerHeight / 2; // 屏幕中央
        createRewardEffect(screenX, screenY, currentScore); // 显示实际获得的分值
        createSphereCountEffect(screenX + 100, screenY); // 球体收集效果
        
        // 创建3D爆炸粒子效果
        createExplosionEffect(sphere.position);
      }
    }
    
    // 更新已收集的sphere位置
    updateCollectedSpheres(player);
    
    // 更新爆炸粒子
    updateExplosionParticles();
    
    // 动态平衡：确保场景中始终保持目标数量的球
    const currentSphereCount = spheres.length;
    if (currentSphereCount < targetSphereCount) {
      // 计算需要生成的球数量
      const spheresToGenerate = targetSphereCount - currentSphereCount;
      for (let i = 0; i < spheresToGenerate; i++) {
        generateNewSphere();
      }
    }
    
    // 路障不会消失，所以不需要动态生成新路障
    
    // 更新UI（包括时间显示）
    updateUI();
    
    // 更新相机位置
    updateCamera(player, trackCurve);
    
    // 旋转粒子系统
    particles.rotation.y += 0.005;
    
    // 更新skybox旋转
    skyboxRotation += 0.01;
    skyboxMaterial.uniforms.time.value = skyboxRotation;
    
    // 渲染场景
    renderer.render(scene, camera);
  }
  
  animate();
}

// 窗口大小调整
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 键盘按下事件
window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  
  // 处理单次按键事件
  switch(event.code) {
    case 'ArrowLeft':
      if (currentLane === targetLane) { // 只有在不切换轨道时才能切换
        targetLane = Math.max(0, targetLane - 1); // 向左切换轨道
      }
      break;
    case 'ArrowRight':
      if (currentLane === targetLane) { // 只有在不切换轨道时才能切换
        targetLane = Math.min(3, targetLane + 1); // 向右切换轨道
      }
      break;
    case 'ArrowUp':
      // 单次按键只增加一点点速度
      playerSpeed = Math.min(playerSpeed + 0.0005, 0.02);
      break;
    case 'ArrowDown':
      // 单次按键只减少一点点速度
      playerSpeed = Math.max(playerSpeed - 0.0005, 0.002);
      break;
    case 'Space':
      playerSpeed = playerSpeed > 0 ? 0 : 0.005; // 默认速度从0.02降低到0.005
      break;
  }
});

// 键盘释放事件
window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

// 创建奖励反馈效果
function createRewardEffect(x, y, points) {
  const effect = document.createElement('div');
  effect.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    z-index: 2000;
    color: #FFD700;
    font-size: 32px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    background: rgba(0, 0, 0, 0.8);
    padding: 8px 16px;
    border-radius: 8px;
    border: 2px solid #FFD700;
    transform: translate(-50%, -50%);
    opacity: 1;
    transition: all 0.8s ease-out;
    pointer-events: none;
  `;
  effect.innerHTML = `+${points}`;
  document.body.appendChild(effect);
  
  // 动画效果
  setTimeout(() => {
    effect.style.transform = 'translate(-50%, -50%) scale(1.5)';
    effect.style.opacity = '0';
    effect.style.top = `${y - 100}px`;
  }, 100);
  
  // 移除元素
  setTimeout(() => {
    if (effect.parentNode) {
      effect.parentNode.removeChild(effect);
    }
  }, 1000);
  
  return effect;
}

// 创建收集球数反馈效果
function createSphereCountEffect(x, y) {
  const effect = document.createElement('div');
  effect.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    z-index: 2000;
    color: #00FF00;
    font-size: 24px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    background: rgba(0, 0, 0, 0.8);
    padding: 6px 12px;
    border-radius: 6px;
    border: 2px solid #00FF00;
    transform: translate(-50%, -50%);
    opacity: 1;
    transition: all 0.6s ease-out;
    pointer-events: none;
  `;
  effect.innerHTML = '球体收集!';
  document.body.appendChild(effect);
  
  // 动画效果
  setTimeout(() => {
    effect.style.transform = 'translate(-50%, -50%) scale(1.3)';
    effect.style.opacity = '0';
    effect.style.top = `${y - 80}px`;
  }, 100);
  
  // 移除元素
  setTimeout(() => {
    if (effect.parentNode) {
      effect.parentNode.removeChild(effect);
    }
  }, 800);
  
  return effect;
}

// 创建错误反馈效果
function createErrorEffect(x, y) {
  const effect = document.createElement('div');
  effect.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    z-index: 2000;
    color: #FF0000;
    font-size: 36px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    background: rgba(0, 0, 0, 0.9);
    padding: 10px 20px;
    border-radius: 8px;
    border: 3px solid #FF0000;
    transform: translate(-50%, -50%);
    opacity: 1;
    transition: all 0.6s ease-out;
    pointer-events: none;
  `;
  effect.innerHTML = '碰撞!';
  document.body.appendChild(effect);
  
  // 动画效果
  setTimeout(() => {
    effect.style.transform = 'translate(-50%, -50%) scale(1.8)';
    effect.style.opacity = '0';
    effect.style.top = `${y - 120}px`;
  }, 100);
  
  // 移除元素
  setTimeout(() => {
    if (effect.parentNode) {
      effect.parentNode.removeChild(effect);
    }
  }, 800);
  
  return effect;
}

// 创建训练开始浮窗
function createTrainingStartModal() {
  const modal = document.createElement('div');
  modal.id = 'trainingModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px;
    border-radius: 20px;
    text-align: center;
    color: white;
    max-width: 500px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  `;
  
  content.innerHTML = `
    <h2 style="font-size: 28px; margin-bottom: 20px; color: #FFD700;">斜视性弱视训练</h2>
    <p style="font-size: 18px; margin-bottom: 15px;">欢迎进入3D环形轨道跑酷训练</p>
    <p style="font-size: 16px; margin-bottom: 25px; color: #FFD700;">推荐训练时间：15分钟</p>
    <div style="margin-bottom: 25px;">
      <p style="font-size: 14px; margin-bottom: 10px;">训练目标：</p>
      <ul style="text-align: left; font-size: 14px; line-height: 1.6;">
        <li>• 收集彩色球体获得分数</li>
        <li>• 避开红色路障避免扣分</li>
        <li>• 通过速度控制获得更高分值</li>
        <li>• 提高视觉追踪和反应能力</li>
      </ul>
    </div>
    <button id="startTrainingBtn" style="
      background: linear-gradient(45deg, #FFD700, #FFA500);
      border: none;
      padding: 15px 30px;
      border-radius: 25px;
      font-size: 18px;
      font-weight: bold;
      color: #333;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);
    ">开始训练</button>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // 添加按钮事件
  document.getElementById('startTrainingBtn').addEventListener('click', startTraining);
  
  return modal;
}

// 创建训练完成浮窗
function createTrainingCompleteModal() {
  const modal = document.createElement('div');
  modal.id = 'completeModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
    padding: 40px;
    border-radius: 20px;
    text-align: center;
    color: white;
    max-width: 500px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  `;
  
  content.innerHTML = `
    <h2 style="font-size: 28px; margin-bottom: 20px; color: #FFD700;">🎉 恭喜完成训练！</h2>
    <p style="font-size: 18px; margin-bottom: 15px;">你已成功完成15分钟的斜视性弱视训练</p>
    <div style="margin-bottom: 25px;">
      <p style="font-size: 16px; margin-bottom: 10px;">训练成果：</p>
      <p style="font-size: 20px; color: #FFD700; margin-bottom: 5px;">最终分数：${score}</p>
      <p style="font-size: 16px; color: #FFD700;">收集球数：${totalSpheresCollected}</p>
    </div>
    <p style="font-size: 14px; margin-bottom: 25px; color: #90EE90;">继续保持，定期训练有助于改善视力！</p>
    <button id="backToHomeBtn" style="
      background: linear-gradient(45deg, #FFD700, #FFA500);
      border: none;
      padding: 15px 30px;
      border-radius: 25px;
      font-size: 18px;
      font-weight: bold;
      color: #333;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);
    ">返回首页</button>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // 添加按钮事件
  document.getElementById('backToHomeBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  
  return modal;
}

// 开始训练
function startTraining() {
  isTrainingStarted = true;
  isTrainingPaused = false;
  trainingStartTime = Date.now();
  
  // 移除开始浮窗
  const modal = document.getElementById('trainingModal');
  if (modal) {
    modal.remove();
  }
  
  // 开始计时
  startTrainingTimer();
}

// 开始训练计时器
function startTrainingTimer() {
  trainingTimer = setInterval(() => {
    const elapsedTime = Date.now() - trainingStartTime;
    
    if (elapsedTime >= trainingDuration) {
      // 训练完成
      completeTraining();
    }
  }, 1000); // 每秒检查一次
}

// 完成训练
function completeTraining() {
  // 停止计时器
  if (trainingTimer) {
    clearInterval(trainingTimer);
    trainingTimer = null;
  }
  
  // 暂停游戏
  isTrainingPaused = true;
  playerSpeed = 0;
  
  // 显示完成浮窗
  createTrainingCompleteModal();
}

// 创建爆炸粒子效果
function createExplosionEffect(position) {
  const particleCount = 20; // 爆炸粒子数量
  
  for (let i = 0; i < particleCount; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const particleMaterial = new THREE.MeshLambertMaterial({ 
      color: getRandomHighSaturationColor(),
      emissive: getRandomHighSaturationColor(),
      emissiveIntensity: 0.5
    });
    
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.position.copy(position);
    
    // 随机速度
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );
    
    // 存储粒子信息
    particle.userData = {
      velocity: velocity,
      life: 1.0, // 生命值
      maxLife: 1.0
    };
    
    scene.add(particle);
    explosionParticles.push(particle);
  }
}

// 更新爆炸粒子
function updateExplosionParticles() {
  for (let i = explosionParticles.length - 1; i >= 0; i--) {
    const particle = explosionParticles[i];
    
    // 更新位置
    particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.1));
    
    // 更新生命值
    particle.userData.life -= 0.02;
    
    // 更新透明度
    particle.material.opacity = particle.userData.life / particle.userData.maxLife;
    particle.material.transparent = true;
    
    // 移除死亡粒子
    if (particle.userData.life <= 0) {
      scene.remove(particle);
      explosionParticles.splice(i, 1);
    }
  }
}

// 计算速度分值倍数
function calculateSpeedMultiplier() {
  // 计算速度在最小值和最大值之间的比例 (0-1)
  const speedRatio = (playerSpeed - minSpeed) / (maxSpeed - minSpeed);
  
  // 速度倍数：慢速度(0.5倍)到快速度(2.0倍)
  speedMultiplier = 0.5 + (speedRatio * 1.5);
  
  return speedMultiplier;
}

// 获取当前分值
function getCurrentScore() {
  const multiplier = calculateSpeedMultiplier();
  return Math.round(baseScore * multiplier);
}

// 连续按键处理函数
function handleContinuousKeys() {
  // 速度控制 - 更渐进的变化
  if (keys.ArrowUp) {
    playerSpeed = Math.min(playerSpeed + 0.0003, 0.02); // 连续按键时更小的增量
  }
  if (keys.ArrowDown) {
    playerSpeed = Math.max(playerSpeed - 0.0003, 0.002); // 连续按键时更小的减量
  }
  
  // 轨道内移动
  if (keys.KeyA) {
    lanePosition = Math.max(-1, lanePosition - 0.5); // 更快的轨道内移动
  }
  if (keys.KeyD) {
    lanePosition = Math.min(1, lanePosition + 0.5); // 更快的轨道内移动
  }
}

// 启动应用
init();