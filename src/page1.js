// 删除p5.js相关代码，只保留小狐狸和对话框功能

// 绘画相关变量
let canvas;
let ctx;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let mapImage; // 地图图片对象
let mapCanvas; // 用于检测地图像素的画布

// 小狐狸行走相关变量
let walkingFox = null; // 行走的小狐狸元素
let pathPoints = []; // 存储路径点
let foxPosition = 0; // 小狐狸在路径上的位置
let isFoxWalking = false; // 小狐狸是否在行走
let foxWalkingTimer = null; // 小狐狸行走定时器

// 路径规划相关变量
let startPoint = null; // 起点
let endPoint = null; // 终点
let currentPathIndex = 0; // 当前路径索引
let allPaths = []; // 存储所有路径
let pathEndPoints = []; // 存储每条路径的结束点
let toleranceRadius = 50; // 允许继续绘画的半径

  let currentDialogIndex = 0; // 当前对话索引
  let dialogTexts = [ // 对话文本数组
    "我丢掉了送给小灰灰的礼物碎片！",
    "你能帮我找到它们吗？",
    "它们散落在屏幕上了...",
    "每找到一个碎片，我就能拼回完整的礼物！",
    "小灰灰一定会很开心的！"
  ];
    
    // 初始化对话框系统
  function initDialogSystem() {
    const dialogTexts = [
      "嗨！你好啊！",
    "欢迎来到山地旅行！",
    "我是小狐狸，但是...",
    "我迷路了！",
    "可以帮我用笔画出接下来的路吗？",
    "我会沿着你画的路径走的！",
    "请在地图的黑色区域内画出一条安全的路径",
      "准备好了吗？让我们开始吧！"
    ];
    
    let currentDialogIndex = 0;
    const dialogText = document.getElementById('dialog-text');
    const dialogNext = document.getElementById('dialog-next');
    const foxWelcome = document.getElementById('fox-welcome');
    
    function showNextDialog() {
      if (currentDialogIndex < dialogTexts.length) {
        dialogText.textContent = dialogTexts[currentDialogIndex];
        currentDialogIndex++;
      } else {
      // 对话框结束，隐藏欢迎界面
        foxWelcome.style.display = 'none';
      }
    }
    
    dialogNext.addEventListener('click', showNextDialog);
    
    // 自动开始第一个对话框
    showNextDialog();
}





// 初始化绘画功能
function initDrawing() {
  canvas = document.getElementById('drawing-canvas');
  ctx = canvas.getContext('2d');
  
  // 设置画布大小
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  // 初始化画布大小
  resizeCanvas();
  
  // 监听窗口大小变化
  window.addEventListener('resize', resizeCanvas);
  
  // 设置画笔样式 - 霓虹绿色发光效果
  ctx.shadowColor = '#00FF00'; // 发光颜色
  ctx.shadowBlur = 10; // 发光强度
  ctx.strokeStyle = '#00FF00'; // 霓虹绿色画笔
  ctx.lineWidth = 4; // 稍微加粗一点
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // 加载地图图片用于边界检测
  loadMapImage();
  
  // 鼠标事件监听
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  
  // 触摸事件监听（移动设备支持）
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchmove', handleTouchMove);
  
  // 添加鼠标点击事件来停止绘画
  canvas.addEventListener('click', function(e) {
    if (isDrawing) {
      // 如果正在绘画，点击任何地方都会停止绘画
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      // 检查点击位置是否在地图边界内
      if (isWithinMapBounds(e.clientX, e.clientY)) {
        // 添加最后一个点到路径
        pathPoints.push({x: clickX, y: clickY});
        
        // 停止绘画
        isDrawing = false;
        
        // 保存当前路径
        if (pathPoints.length > 1) {
          allPaths.push([...pathPoints]);
          pathEndPoints.push({
            x: clickX + rect.left,
            y: clickY + rect.top
          });
          currentPathIndex++;
          
          // 显示继续绘画的提示点
          showContinuePoint(pathEndPoints[pathEndPoints.length - 1]);
        }
        
        // 停止小狐狸跟随
        isFoxWalking = false;
        if (foxWalkingTimer) {
          clearInterval(foxWalkingTimer);
          foxWalkingTimer = null;
        }
        if (walkingFox) {
          walkingFox.style.display = 'none';
        }
      } else {
        // 如果点击位置超出边界，清除所有路径
        showErrorAndClear();
      }
    }
  });
}

// 加载地图图片
function loadMapImage() {
  mapImage = new Image();
  mapImage.onload = function() {
    // 创建用于检测的画布
    mapCanvas = document.createElement('canvas');
    const mapCtx = mapCanvas.getContext('2d');
    
    // 设置画布大小为地图图片大小
    mapCanvas.width = mapImage.width;
    mapCanvas.height = mapImage.height;
    
    // 绘制地图图片到检测画布
    mapCtx.drawImage(mapImage, 0, 0);
    
    // 生成起点和终点
    generateStartAndEndPoints();
  };
  mapImage.src = 'public/picture/map.png';
}

// 生成起点和终点
function generateStartAndEndPoints() {
  const validPoints = [];
  
  // 定义边缘安全距离（避免在屏幕边缘生成点）
  const edgeMargin = 100; // 距离边缘100像素的安全区域
  
  // 定义UI区域（避免在这些区域生成点）
  const uiAreas = [
    { x: 20, y: 20, width: 120, height: 50 }, // 返回按钮区域
    { x: window.innerWidth/2 - 150, y: 20, width: 300, height: 80 }, // 标题区域
    { x: 0, y: window.innerHeight - 250, width: 400, height: 250 } // 游戏说明区域（扩大保护范围）
  ];
  
  // 遍历地图找到所有有效的黑色像素点
  for (let x = 0; x < mapCanvas.width; x += 10) {
    for (let y = 0; y < mapCanvas.height; y += 10) {
      const pixelData = mapCanvas.getContext('2d').getImageData(x, y, 1, 1).data;
      if (pixelData[3] > 0) { // 非透明像素
        // 将地图坐标转换为屏幕坐标
        const mapRect = document.getElementById('background-map').getBoundingClientRect();
        const screenX = (x / mapCanvas.width) * mapRect.width + mapRect.left;
        const screenY = (y / mapCanvas.height) * mapRect.height + mapRect.top;
        
        // 检查是否在边缘安全区域内
        const isNearEdge = screenX < edgeMargin || 
                          screenX > window.innerWidth - edgeMargin ||
                          screenY < edgeMargin || 
                          screenY > window.innerHeight - edgeMargin;
        
        // 检查是否在UI区域内
        let inUIArea = false;
        for (const area of uiAreas) {
          if (screenX >= area.x && screenX <= area.x + area.width &&
              screenY >= area.y && screenY <= area.y + area.height) {
            inUIArea = true;
            break;
          }
        }
        
        // 如果不在边缘且不在UI区域内，添加到有效点列表
        if (!isNearEdge && !inUIArea) {
          validPoints.push({x, y, screenX, screenY});
        }
      }
    }
  }
  
  if (validPoints.length < 2) return;
  
  // 随机选择起点
  const startIndex = Math.floor(Math.random() * validPoints.length);
  startPoint = validPoints[startIndex];
  
  // 寻找距离起点最远的点作为终点
  let maxDistance = 0;
  let endIndex = 0;
  
  for (let i = 0; i < validPoints.length; i++) {
    if (i === startIndex) continue;
    
    const distance = Math.sqrt(
      Math.pow(validPoints[i].screenX - startPoint.screenX, 2) + 
      Math.pow(validPoints[i].screenY - startPoint.screenY, 2)
    );
    
    if (distance > maxDistance) {
      maxDistance = distance;
      endIndex = i;
    }
  }
  
  endPoint = validPoints[endIndex];
  
  // 设置屏幕坐标
  startPoint.screenX = startPoint.screenX;
  startPoint.screenY = startPoint.screenY;
  endPoint.screenX = endPoint.screenX;
  endPoint.screenY = endPoint.screenY;
  
  // 显示起点和终点标记
  showStartAndEndMarkers();
}

// 显示起点和终点标记
function showStartAndEndMarkers() {
  // 创建起点标记
  const startMarker = document.createElement('button');
  startMarker.id = 'start-marker';
  startMarker.style.cssText = `
    position: fixed;
    left: ${startPoint.screenX - 25}px;
    top: ${startPoint.screenY - 25}px;
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #00FF00, #00CC00);
    border: 4px solid #008000;
    border-radius: 50%;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 18px;
    font-family: 'Comic Sans MS', 'Arial Rounded MT Bold', Arial, sans-serif;
    box-shadow: 0 4px 15px rgba(0, 255, 0, 0.6);
    cursor: pointer;
    outline: none;
    transition: all 0.3s ease;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    animation: startPulse 2s ease-in-out infinite;
  `;
  startMarker.textContent = '🌱';
  startMarker.addEventListener('mouseenter', () => {
    startMarker.style.transform = 'scale(1.15) rotate(5deg)';
    startMarker.style.boxShadow = '0 6px 20px rgba(0, 255, 0, 0.8)';
  });
  startMarker.addEventListener('mouseleave', () => {
    startMarker.style.transform = 'scale(1) rotate(0deg)';
    startMarker.style.boxShadow = '0 4px 15px rgba(0, 255, 0, 0.6)';
  });
  startMarker.addEventListener('click', () => {
    // 点击起点开始绘画
    if (!isDrawing) {
      // 模拟在起点位置的点击事件
      const clickEvent = new MouseEvent('mousedown', {
        clientX: startPoint.screenX,
        clientY: startPoint.screenY
      });
      canvas.dispatchEvent(clickEvent);
    }
  });
  // 添加脉冲动画CSS
  const pulseStyle = document.createElement('style');
  pulseStyle.textContent = `
    @keyframes startPulse {
      0%, 100% { transform: scale(1); box-shadow: 0 4px 15px rgba(0, 255, 0, 0.6); }
      50% { transform: scale(1.1); box-shadow: 0 6px 20px rgba(0, 255, 0, 0.8); }
    }
    @keyframes endPulse {
      0%, 100% { transform: scale(1); box-shadow: 0 4px 15px rgba(0, 102, 255, 0.6); }
      50% { transform: scale(1.1); box-shadow: 0 6px 20px rgba(0, 102, 255, 0.8); }
    }
  `;
  document.head.appendChild(pulseStyle);
  
  document.body.appendChild(startMarker);
  
  // 创建终点标记
  const endMarker = document.createElement('button');
  endMarker.id = 'end-marker';
  endMarker.style.cssText = `
    position: fixed;
    left: ${endPoint.screenX - 25}px;
    top: ${endPoint.screenY - 25}px;
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #0066FF, #0052CC);
    border: 4px solid #003399;
    border-radius: 50%;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 18px;
    font-family: 'Comic Sans MS', 'Arial Rounded MT Bold', Arial, sans-serif;
    box-shadow: 0 4px 15px rgba(0, 102, 255, 0.6);
    cursor: pointer;
    outline: none;
    transition: all 0.3s ease;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    animation: endPulse 2s ease-in-out infinite;
  `;
  endMarker.textContent = '🏁';
  endMarker.addEventListener('mouseenter', () => {
    endMarker.style.transform = 'scale(1.15) rotate(-5deg)';
    endMarker.style.boxShadow = '0 6px 20px rgba(0, 102, 255, 0.8)';
  });
  endMarker.addEventListener('mouseleave', () => {
    endMarker.style.transform = 'scale(1) rotate(0deg)';
    endMarker.style.boxShadow = '0 4px 15px rgba(0, 102, 255, 0.6)';
  });
  endMarker.addEventListener('click', () => {
    // 点击终点结束绘画
    if (isDrawing) {
      // 模拟在终点位置的点击事件
      const clickEvent = new MouseEvent('click', {
        clientX: endPoint.screenX,
        clientY: endPoint.screenY
      });
      canvas.dispatchEvent(clickEvent);
      
      // 显示成功消息
      showSuccessMessage('🎉 恭喜！小狐狸成功到达🌳终点！🎉');
    }
  });
  document.body.appendChild(endMarker);
}

// 检查坐标是否在地图的黑色区域内（带容错范围）
function isWithinMapBounds(x, y) {
  if (!mapCanvas) return true; // 如果地图还没加载，暂时允许绘画
  
  // 将屏幕坐标转换为地图坐标
  const mapRect = document.getElementById('background-map').getBoundingClientRect();
  const mapX = ((x - mapRect.left) / mapRect.width) * mapCanvas.width;
  const mapY = ((y - mapRect.top) / mapRect.height) * mapCanvas.height;
  
  // 检查坐标是否在地图范围内
  if (mapX < 0 || mapX >= mapCanvas.width || mapY < 0 || mapY >= mapCanvas.height) {
    return false;
  }
  
  // 容错范围（像素）
  const tolerance = 3;
  
  // 检查中心点及周围几个像素点
  for (let dx = -tolerance; dx <= tolerance; dx++) {
    for (let dy = -tolerance; dy <= tolerance; dy++) {
      const checkX = Math.round(mapX + dx);
      const checkY = Math.round(mapY + dy);
      
      // 确保检查的坐标在地图范围内
      if (checkX >= 0 && checkX < mapCanvas.width && checkY >= 0 && checkY < mapCanvas.height) {
        // 获取该位置的像素数据
        const pixelData = mapCanvas.getContext('2d').getImageData(checkX, checkY, 1, 1).data;
        
        // 如果找到一个非透明像素，就认为在边界内
        if (pixelData[3] > 0) {
          return true;
        }
      }
    }
  }
  
  // 如果周围都没有找到非透明像素，则认为超出边界
  return false;
}

// 开始/停止绘画（点击切换状态）
function startDrawing(e) {
  // 检查起始点是否在地图边界内
  if (!isWithinMapBounds(e.clientX, e.clientY)) {
    showErrorMessage('起始点超出安全区域！请在地图黑色区域内开始画路径！');
    return; // 如果起始点不在边界内，不允许开始绘画
  }
  
  // 检查是否是第一条路径，如果是，必须从起点开始
  if (allPaths.length === 0 && !isDrawing) {
    const distanceToStart = Math.sqrt(
      Math.pow(e.clientX - startPoint.screenX, 2) + 
      Math.pow(e.clientY - startPoint.screenY, 2)
    );
    if (distanceToStart > toleranceRadius) {
      showErrorMessage('请点击🌱起点按钮开始画第一条路径！');
      return;
    }
  } else if (allPaths.length > 0 && !isDrawing) {
    // 检查是否从上一条路径的结束点附近开始
    const lastEndPoint = pathEndPoints[pathEndPoints.length - 1];
    const distanceToLastEnd = Math.sqrt(
      Math.pow(e.clientX - lastEndPoint.x, 2) + 
      Math.pow(e.clientY - lastEndPoint.y, 2)
    );
    if (distanceToLastEnd > toleranceRadius) {
      showErrorMessage('请从上一条路径结束点附近继续画路径！');
      return;
    }
  }
  
  isDrawing = !isDrawing; // 切换绘画状态
  
  if (isDrawing) {
    // 开始绘画，记录起始位置
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
    
    // 清空当前路径点
    pathPoints = [];
    pathPoints.push({x: lastX, y: lastY});
    
    // 移除继续绘画的提示点
    const existingHint = document.getElementById('continue-hint');
    if (existingHint) {
      existingHint.remove();
    }
    
    // 延迟开始小狐狸跟随
    setTimeout(() => {
      startFoxFollowing();
    }, 300); // 延迟300毫秒开始跟随
  } else {
    // 停止绘画时，保存当前路径
    const rect = canvas.getBoundingClientRect();
    if (pathPoints.length > 1) {
      allPaths.push([...pathPoints]);
      pathEndPoints.push({
        x: pathPoints[pathPoints.length - 1].x + rect.left,
        y: pathPoints[pathPoints.length - 1].y + rect.top
      });
      currentPathIndex++;
      
      // 显示继续绘画的提示点
      showContinuePoint(pathEndPoints[pathEndPoints.length - 1]);
    }
    
    // 停止小狐狸跟随
    isFoxWalking = false;
    if (foxWalkingTimer) {
      clearInterval(foxWalkingTimer);
      foxWalkingTimer = null;
    }
    if (walkingFox) {
      walkingFox.style.display = 'none';
    }
  }
}

// 绘画过程
function draw(e) {
  if (!isDrawing) return;
  
  const rect = canvas.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;
  
  // 检查当前坐标是否在地图边界内
  if (!isWithinMapBounds(e.clientX, e.clientY)) {
    // 超出边界，显示错误提示并清除所有路径
    showErrorAndClear();
    return;
  }
  
  // 绘制霓虹发光效果
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(currentX, currentY);
  ctx.stroke();
  
  // 添加额外的发光层
  ctx.shadowBlur = 5;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // 恢复原始设置
  ctx.shadowBlur = 10;
  ctx.lineWidth = 4;
  
  // 记录路径点
  pathPoints.push({x: currentX, y: currentY});
  
  // 实时更新小狐狸位置
  if (isFoxWalking && walkingFox) {
    updateFoxPosition(currentX, currentY);
  }
  
  lastX = currentX;
  lastY = currentY;
}

// 显示错误提示并清除画布
function showErrorAndClear() {
  // 停止绘画
  isDrawing = false;
  
  // 显示错误提示
        showErrorMessage('路径超出安全区域！请从🌱起点重新开始画路径！');
  
  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 清空所有路径数据
  pathPoints = [];
  allPaths = [];
  pathEndPoints = [];
  currentPathIndex = 0;
  
  // 停止小狐狸
  isFoxWalking = false;
  if (foxWalkingTimer) {
    clearInterval(foxWalkingTimer);
    foxWalkingTimer = null;
  }
  if (walkingFox) {
    walkingFox.style.display = 'none';
  }
  
  // 移除继续绘画的提示点
  const existingHint = document.getElementById('continue-hint');
  if (existingHint) {
    existingHint.remove();
  }
}

// 开始小狐狸跟随
function startFoxFollowing() {
  // 创建跟随的小狐狸
  if (!walkingFox) {
    walkingFox = document.createElement('div');
    walkingFox.id = 'walking-fox';
    walkingFox.style.cssText = `
      position: fixed;
      width: 40px;
      height: 40px;
      z-index: 50;
      pointer-events: none;
      transition: all 0.2s ease-out;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    `;
    
    // 小狐狸SVG - 更可爱的版本
    const foxSVG = `
      <svg width="40" height="40" viewBox="0 0 40 40">
        <!-- 小狐狸身体 -->
        <ellipse cx="20" cy="20" rx="16" ry="13" fill="#FF8C42" stroke="#E67E22" stroke-width="1"/>
        <!-- 小狐狸头部 -->
        <ellipse cx="20" cy="11" rx="12" ry="11" fill="#FF8C42" stroke="#E67E22" stroke-width="1"/>
        <!-- 小狐狸耳朵 -->
        <polygon points="10,3 13,0 16,7" fill="#FF8C42" stroke="#E67E22" stroke-width="1"/>
        <polygon points="30,3 27,0 24,7" fill="#FF8C42" stroke="#E67E22" stroke-width="1"/>
        <!-- 小狐狸眼睛 -->
        <circle cx="15" cy="7" r="2" fill="#000000"/>
        <circle cx="25" cy="7" r="2" fill="#000000"/>
        <circle cx="15.5" cy="6.5" r="0.5" fill="#FFFFFF"/>
        <circle cx="25.5" cy="6.5" r="0.5" fill="#FFFFFF"/>
        <!-- 小狐狸鼻子 -->
        <circle cx="20" cy="12" r="1.5" fill="#FF6B9D"/>
        <!-- 小狐狸嘴巴 -->
        <path d="M 17 13 Q 20 16 23 13" stroke="#000000" stroke-width="0.5" fill="none"/>
        <!-- 小狐狸尾巴 -->
        <ellipse cx="32" cy="18" rx="8" ry="4" fill="#FF8C42" stroke="#E67E22" stroke-width="1" transform="rotate(15 32 18)"/>
      </svg>
    `;
    
    walkingFox.innerHTML = foxSVG;
    document.body.appendChild(walkingFox);
  }
  
  // 设置小狐狸初始位置（从路径起点开始）
  const startPoint = pathPoints[0];
  walkingFox.style.left = startPoint.x - 20 + 'px';
  walkingFox.style.top = startPoint.y - 20 + 'px';
  
  // 重置小狐狸位置到起点
  foxPosition = 0;
  
  isFoxWalking = true;
  walkingFox.style.display = 'block';
}

// 更新小狐狸位置（慢速行走）
function updateFoxPosition(x, y) {
  if (!walkingFox || !isFoxWalking) return;
  
  // 使用定时器控制小狐狸行走速度
  if (!foxWalkingTimer) {
    foxWalkingTimer = setInterval(() => {
      if (foxPosition < pathPoints.length - 1) {
        foxPosition++;
        const point = pathPoints[foxPosition];
        
        // 计算朝向（基于移动方向）
        let rotation = 0;
        if (foxPosition > 0) {
          const prevPoint = pathPoints[foxPosition - 1];
          const dx = point.x - prevPoint.x;
          const dy = point.y - prevPoint.y;
          rotation = Math.atan2(dy, dx) * 180 / Math.PI;
        }
        
                 // 应用位置和旋转
         walkingFox.style.left = point.x - 20 + 'px';
         walkingFox.style.top = point.y - 20 + 'px';
         walkingFox.style.transform = `rotate(${rotation}deg)`;
      } else {
        // 到达路径终点，停止行走
        clearInterval(foxWalkingTimer);
        foxWalkingTimer = null;
      }
    }, 150); // 每150毫秒移动一步，慢速行走
  }
}

// 小狐狸沿路径行走（保留函数以备后用）
// function walkFoxAlongPath() {
//   // 此函数已不再使用，改为实时跟随
// }

// 显示继续绘画的提示点
function showContinuePoint(point) {
  // 移除之前的提示点
  const existingHint = document.getElementById('continue-hint');
  if (existingHint) {
    existingHint.remove();
  }
  
  // 创建提示点
  const hintPoint = document.createElement('button');
  hintPoint.id = 'continue-hint';
  hintPoint.style.cssText = `
    position: fixed;
    left: ${point.x - 20}px;
    top: ${point.y - 20}px;
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #FFFF00, #FFD700);
    border: 3px solid #FFA500;
    border-radius: 50%;
    z-index: 150;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #333;
    font-weight: bold;
    font-size: 16px;
    font-family: 'Comic Sans MS', 'Arial Rounded MT Bold', Arial, sans-serif;
    box-shadow: 0 4px 15px rgba(255, 255, 0, 0.6);
    cursor: pointer;
    outline: none;
    transition: all 0.3s ease;
    text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
    animation: continuePulse 1.5s ease-in-out infinite;
  `;
  hintPoint.textContent = '✨';
  
  // 添加脉冲动画的CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes continuePulse {
      0% { transform: scale(1) rotate(0deg); opacity: 1; }
      25% { transform: scale(1.1) rotate(5deg); opacity: 0.9; }
      50% { transform: scale(1.2) rotate(0deg); opacity: 0.8; }
      75% { transform: scale(1.1) rotate(-5deg); opacity: 0.9; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  // 添加悬停效果
  hintPoint.addEventListener('mouseenter', () => {
    hintPoint.style.transform = 'scale(1.2) rotate(10deg)';
    hintPoint.style.boxShadow = '0 6px 20px rgba(255, 255, 0, 0.8)';
  });
  
  hintPoint.addEventListener('mouseleave', () => {
    hintPoint.style.transform = 'scale(1) rotate(0deg)';
    hintPoint.style.boxShadow = '0 4px 15px rgba(255, 255, 0, 0.6)';
  });
  
  document.body.appendChild(hintPoint);
  
  // 添加点击事件，点击提示点也可以继续绘画
  hintPoint.addEventListener('click', () => {
    if (!isDrawing) {
      const clickEvent = new MouseEvent('mousedown', {
        clientX: point.x,
        clientY: point.y
      });
      canvas.dispatchEvent(clickEvent);
    }
  });
}

// 显示成功消息
function showSuccessMessage(message) {
  // 创建成功提示元素
  const successDiv = document.createElement('div');
  successDiv.id = 'success-message';
  successDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, rgba(0, 255, 0, 0.95), rgba(0, 200, 0, 0.95));
    color: white;
    padding: 25px 50px;
    border-radius: 20px;
    font-size: 20px;
    font-weight: bold;
    font-family: 'Comic Sans MS', 'Arial Rounded MT Bold', Arial, sans-serif;
    z-index: 1000;
    box-shadow: 0 8px 25px rgba(0, 255, 0, 0.6);
    text-align: center;
    border: 3px solid #008000;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    animation: successBounce 0.6s ease-out;
  `;
  successDiv.textContent = message;
  
  // 添加成功动画CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes successBounce {
      0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
      50% { transform: translate(-50%, -50%) scale(1.1); }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(successDiv);
  
  // 3秒后移除成功提示
  setTimeout(() => {
    if (successDiv.parentNode) {
      successDiv.parentNode.removeChild(successDiv);
    }
  }, 3000);
}

// 显示错误提示
function showErrorMessage(message = '错误！路径超出了安全区域，请重新画一条安全的路径！') {
  // 创建错误提示元素
  const errorDiv = document.createElement('div');
  errorDiv.id = 'error-message';
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, rgba(244, 67, 54, 0.95), rgba(211, 47, 47, 0.95));
    color: white;
    padding: 25px 50px;
    border-radius: 20px;
    font-size: 18px;
    font-weight: bold;
    font-family: 'Comic Sans MS', 'Arial Rounded MT Bold', Arial, sans-serif;
    z-index: 1000;
    box-shadow: 0 8px 25px rgba(244, 67, 54, 0.4);
    text-align: center;
    border: 3px solid #C62828;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    animation: errorShake 0.6s ease-out;
  `;
  errorDiv.textContent = message;
  
  // 添加错误动画CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes errorShake {
      0%, 100% { transform: translate(-50%, -50%) translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translate(-50%, -50%) translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translate(-50%, -50%) translateX(5px); }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(errorDiv);
  
  // 2秒后移除错误提示
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 2000);
}

// 停止绘画（移除这个函数，因为现在通过点击来控制）
// function stopDrawing() {
//   isDrawing = false;
// }

// 触摸事件处理
function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent('mousedown', {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  canvas.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
  e.preventDefault();
  if (isDrawing) {
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  // 初始化背景音乐
  const bgMusic = new Audio('public/music/page1_bgm.wav');
  bgMusic.loop = true; // 设置循环播放
  bgMusic.volume = 0.5; // 设置音量为50%
  
  // 尝试播放背景音乐
  bgMusic.play().catch(error => {
    console.log('背景音乐播放失败:', error);
  });
  
  // 监听用户交互以启动音乐
  document.addEventListener('click', function() {
    if (bgMusic.paused) {
      bgMusic.play().catch(error => {
        console.log('背景音乐播放失败:', error);
      });
    }
  }, { once: true });
  
  initDrawing();
  initDialogSystem();
}); 