// 全局变量
let selectedEye = null;
let trainingActive = false;
let trainingPaused = false;
let startTime = null;
let timerInterval = null;
let stimulusInterval = null;
let backgroundChangeInterval = null;
let trainingDuration = 300; // 5分钟训练
let currentProgress = 0;
let bgMusic = null;

// Three.js 相关变量
let scene, camera, renderer;
let leftScene, rightScene, leftCamera, rightCamera;
let leftRenderer, rightRenderer;
let stimulusObjects = [];
let backgroundObjects = [];

// 页面加载时初始化背景音乐
document.addEventListener('DOMContentLoaded', function() {
    bgMusic = document.getElementById('bgMusic');
    
    // 尝试播放背景音乐
    bgMusic.play().catch(function(error) {
        console.log('背景音乐自动播放失败，需要用户交互:', error);
    });
    
    // 添加点击事件来启动音乐
    document.addEventListener('click', function() {
        if (bgMusic.paused) {
            bgMusic.play().catch(function(error) {
                console.log('背景音乐播放失败:', error);
            });
        }
    }, { once: true });
});

// 眼别选择功能
function selectEye(eye) {
    selectedEye = eye;
    
    // 移除所有选中状态
    document.querySelectorAll('.eye-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // 添加选中状态
    event.target.closest('.eye-option').classList.add('selected');
    
    // 启用开始按钮
    document.getElementById('startBtn').disabled = false;
}

// 开始3D VR训练
function start3DVRTraining() {
    if (!selectedEye) {
        alert('请先选择弱视眼！');
        return;
    }
    
    // 确保背景音乐播放
    if (bgMusic && bgMusic.paused) {
        bgMusic.play().catch(function(error) {
            console.log('背景音乐播放失败:', error);
        });
    }
    
    // 隐藏选择界面，显示VR训练界面
    document.getElementById('selectionScreen').style.display = 'none';
    document.getElementById('vrTrainingScreen').style.display = 'block';
    
    // 初始化3D场景
    initialize3DScene();
    
    // 初始化训练
    initialize3DVRTraining();
}

// 初始化3D场景
function initialize3DScene() {
    // Google Cardboard 标准参数
    const eyeDistance = 0.064; // 64mm 标准眼间距
    const focalLength = 5; // 焦距
    
    // 创建左眼场景
    leftScene = new THREE.Scene();
    leftCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    leftCamera.position.z = focalLength;
    // 左眼相机向左偏移，模拟人眼间距
    leftCamera.position.x = -eyeDistance / 2;
    
    // 创建右眼场景
    rightScene = new THREE.Scene();
    rightCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    rightCamera.position.z = focalLength;
    // 右眼相机向右偏移，模拟人眼间距
    rightCamera.position.x = eyeDistance / 2;
    
    // 创建左眼渲染器
    leftRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    leftRenderer.setSize(400, 400);
    leftRenderer.setClearColor(0x000000, 0);
    leftRenderer.shadowMap.enabled = true;
    leftRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('leftLensContent').appendChild(leftRenderer.domElement);
    
    // 创建右眼渲染器
    rightRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rightRenderer.setSize(400, 400);
    rightRenderer.setClearColor(0x000000, 0);
    rightRenderer.shadowMap.enabled = true;
    rightRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('rightLensContent').appendChild(rightRenderer.domElement);
    
    // 设置渲染器样式
    leftRenderer.domElement.style.width = '100%';
    leftRenderer.domElement.style.height = '100%';
    rightRenderer.domElement.style.width = '100%';
    rightRenderer.domElement.style.height = '100%';
    
    // 创建3D环境
    create3DEnvironment();
    
    // 开始渲染循环
    animate();
}

// 创建3D环境
function create3DEnvironment() {
    // 创建低多边形风格的3D场景
    createLowPolyEnvironment(leftScene);
    createLowPolyEnvironment(rightScene);
}

// 创建低多边形环境
function createLowPolyEnvironment(scene) {
    // 添加基础光源
    const ambientLight = new THREE.AmbientLight(0x000000, 1);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // 创建水面
    const waterGeometry = new THREE.PlaneGeometry(20, 20, 4, 4);
    const waterMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x0066cc,
        transparent: true,
        opacity: 0.8
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -2;
    water.receiveShadow = true;
    water.isStimulus = false; // 标记为静态环境物体
    scene.add(water);
    
    // 创建山丘
    const mountainGeometry = new THREE.ConeGeometry(3, 4, 6);
    const mountainMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
    const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
    mountain.position.set(5, 0, -5);
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    mountain.isStimulus = false; // 标记为静态环境物体
    scene.add(mountain);
    
    // 创建树木
    for (let i = 0; i < 8; i++) {
        const treeGeometry = new THREE.ConeGeometry(0.5, 2, 6);
        const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
        const tree = new THREE.Mesh(treeGeometry, treeMaterial);
        tree.position.set(
            (Math.random() - 0.5) * 15,
            0,
            (Math.random() - 0.5) * 15
        );
        tree.castShadow = true;
        tree.receiveShadow = true;
        tree.isStimulus = false; // 标记为静态环境物体
        scene.add(tree);
    }
    
    // 创建太阳
    const sunGeometry = new THREE.SphereGeometry(1, 8, 6);
    const sunMaterial = new THREE.MeshLambertMaterial({ color: 0xffdd00 });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(0, 3, -8);
    sun.castShadow = true;
    sun.isStimulus = false; // 标记为静态环境物体
    scene.add(sun);
    
    // 创建天空渐变
    const skyGeometry = new THREE.SphereGeometry(50, 8, 6);
    const skyMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x87ceeb,
        side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.isStimulus = false; // 标记为静态环境物体
    scene.add(sky);
}

// 初始化3D VR训练
function initialize3DVRTraining() {
    trainingActive = true;
    trainingPaused = false;
    startTime = Date.now();
    currentProgress = 0;
    
    // 更新UI
    updateTimer();
    updateProgress();
    
    // 开始计时器
    timerInterval = setInterval(updateTimer, 1000);
    
    // 开始生成3D视觉刺激
    generate3DStimuli();
    stimulusInterval = setInterval(generate3DStimuli, 3000);
    
    // 应用视觉差异
    apply3DVisualDifferences();
}

// 更新计时器
function updateTimer() {
    if (!startTime) return;
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    document.getElementById('timer').textContent = 
        `训练时间: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // 更新进度
    currentProgress = Math.min((elapsed / trainingDuration) * 100, 100);
    updateProgress();
    
    // 检查训练是否完成
    if (elapsed >= trainingDuration) {
        complete3DVRTraining();
    }
}

// 更新进度条
function updateProgress() {
    document.getElementById('progressFill').style.width = `${currentProgress}%`;
    document.getElementById('progressText').textContent = `${Math.round(currentProgress)}%`;
}

// 生成3D视觉刺激
function generate3DStimuli() {
    if (!trainingActive || trainingPaused) return;
    
    // 清除现有刺激
    clear3DStimuli();
    
    // 生成新的3D刺激
    for (let i = 0; i < 6; i++) {
        const stimulusData = generate3DStimulusData();
        create3DStimulus(leftScene, 'left', stimulusData);
        create3DStimulus(rightScene, 'right', stimulusData);
    }
}

// 生成3D刺激数据
function generate3DStimulusData() {
    const shapes = ['sphere', 'cube', 'cone', 'torus'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    
    const colors = [
        0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff,
        0xff4500, 0x9400d3, 0x32cd32, 0xff1493, 0x00ced1, 0xffd700,
        0xff0080, 0x8000ff, 0x00ff80, 0xff8000
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    return {
        shape: shape,
        color: color,
        position: {
            x: (Math.random() - 0.5) * 12,
            y: (Math.random() - 0.5) * 8 + 4,
            z: (Math.random() - 0.5) * 12
        },
        rotation: {
            x: Math.random() * Math.PI * 2,
            y: Math.random() * Math.PI * 2,
            z: Math.random() * Math.PI * 2
        },
        scale: Math.random() * 1.0 + 0.8
    };
}

// 创建3D刺激
function create3DStimulus(scene, side, stimulusData) {
    let geometry, material, mesh;
    
    // 根据形状创建几何体
    switch(stimulusData.shape) {
        case 'sphere':
            geometry = new THREE.SphereGeometry(1, 8, 6);
            break;
        case 'cube':
            geometry = new THREE.BoxGeometry(1, 1, 1);
            break;
        case 'cone':
            geometry = new THREE.ConeGeometry(0.5, 1, 6);
            break;
        case 'torus':
            geometry = new THREE.TorusGeometry(0.5, 0.2, 6, 8);
            break;
    }
    
    // 创建材质
    if (side === selectedEye) {
        // 弱眼区域：动态物体使用随机最高饱和最亮颜色
        const ultraSaturatedColors = [
            0xff0000, // 纯红
            0x00ff00, // 纯绿
            0x0000ff, // 纯蓝
            0xffff00, // 纯黄
            0xff00ff, // 洋红
            0x00ffff, // 青色
            0xff0080, // 深粉红
            0x8000ff, // 紫色
            0x00ff80, // 青绿
            0xff8000, // 橙色
            0xff0080, // 玫瑰红
            0x8000ff, // 紫罗兰
            0x00ff80, // 春绿
            0xff8000  // 橙红
        ];
        
        const randomColor = ultraSaturatedColors[Math.floor(Math.random() * ultraSaturatedColors.length)];
        
        // 随机决定是否使用3D光影
        const useLighting = Math.random() > 0.4; // 40%使用光影，60%不使用
        
        if (useLighting) {
            material = new THREE.MeshLambertMaterial({ 
                color: randomColor,
                transparent: true,
                opacity: 1
            });
        } else {
            material = new THREE.MeshBasicMaterial({ 
                color: randomColor,
                transparent: true,
                opacity: 1
            });
        }
        
    } else {
        // 非弱眼区域：使用低饱和度颜色
        const lowSaturatedColors = [
            0x888888, // 灰色
            0x999999, // 浅灰
            0x777777, // 深灰
            0xaaaaaa, // 更浅灰
            0x666666, // 更深灰
            0xbbbbbb  // 最浅灰
        ];
        
        const randomLowColor = lowSaturatedColors[Math.floor(Math.random() * lowSaturatedColors.length)];
        
        material = new THREE.MeshLambertMaterial({ 
            color: randomLowColor,
            transparent: true,
            opacity: 0.4
        });
    }
    
    // 创建网格
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
        stimulusData.position.x,
        stimulusData.position.y,
        stimulusData.position.z
    );
    mesh.rotation.set(
        stimulusData.rotation.x,
        stimulusData.rotation.y,
        stimulusData.rotation.z
    );
    mesh.scale.setScalar(stimulusData.scale);
    
    // 添加到场景
    if (material instanceof THREE.MeshLambertMaterial) {
        // 只有使用Lambert材质的物体才投射和接收阴影
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    } else {
        // MeshBasicMaterial不需要阴影
        mesh.castShadow = false;
        mesh.receiveShadow = false;
    }
    mesh.isStimulus = true; // 标记为动态刺激物
    scene.add(mesh);
    stimulusObjects.push({ mesh, scene, side });
    
    // 添加动画
    animate3DStimulus(mesh);
}

// 动画3D刺激
function animate3DStimulus(mesh) {
    const animate = () => {
        if (!trainingActive || trainingPaused) return;
        
        // 空中旋转动画
        mesh.rotation.x += 0.02;
        mesh.rotation.y += 0.03;
        mesh.rotation.z += 0.01;
        
        // 浮动动画
        mesh.position.y += Math.sin(Date.now() * 0.002) * 0.02;
        mesh.position.x += Math.cos(Date.now() * 0.001) * 0.01;
        
        requestAnimationFrame(animate);
    };
    animate();
}

// 添加超强光源到弱视眼场景
function addUltraBrightLights(scene) {
    // 移除现有的额外光源（避免重复添加）
    scene.children = scene.children.filter(child => 
        !(child instanceof THREE.Light && child.isExtraLight)
    );
    
    // 超强环境光 - 让整个场景更亮
    const ultraAmbientLight = new THREE.AmbientLight(0xffffff, 2.0);
    ultraAmbientLight.isExtraLight = true;
    scene.add(ultraAmbientLight);
    
    // 多个方向光 - 从不同角度照亮
    const positions = [
        [0, 10, 0],    // 顶部
        [10, 5, 10],   // 右上
        [-10, 5, 10],  // 左上
        [10, 5, -10],  // 右下
        [-10, 5, -10], // 左下
        [0, 5, 15],    // 前方
        [0, 5, -15]    // 后方
    ];
    
    positions.forEach((pos, index) => {
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(pos[0], pos[1], pos[2]);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.isExtraLight = true;
        scene.add(directionalLight);
    });
    
    // 点光源 - 在场景中心添加强光
    const pointLight = new THREE.PointLight(0xffffff, 3.0, 50);
    pointLight.position.set(0, 5, 0);
    pointLight.isExtraLight = true;
    scene.add(pointLight);
    
    // 聚光灯 - 从上方照射
    const spotLight = new THREE.SpotLight(0xffffff, 2.0);
    spotLight.position.set(0, 15, 0);
    spotLight.angle = Math.PI / 3;
    spotLight.penumbra = 0.1;
    spotLight.decay = 1;
    spotLight.distance = 50;
    spotLight.castShadow = true;
    spotLight.isExtraLight = true;
    scene.add(spotLight);
}

// 清除3D刺激
function clear3DStimuli() {
    stimulusObjects.forEach(obj => {
        obj.scene.remove(obj.mesh);
    });
    stimulusObjects = [];
}

// 应用3D视觉差异
function apply3DVisualDifferences() {
    // 设置左眼场景的视觉效果
    if (selectedEye === 'left') {
        // 左眼为弱视眼 - 添加超强光源
        addUltraBrightLights(leftScene);
        
        // 左眼为弱视眼 - 静态环境物体使用旋转黑白条纹贴图
        leftScene.traverse((child) => {
            if (child.material && !child.isStimulus) {
                // 静态环境物体使用旋转黑白条纹贴图
                if (!child.material.map) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 64;
                    canvas.height = 64;
                    const ctx = canvas.getContext('2d');
                    
                    // 创建黑白条纹纹理
                    const stripeWidth = 8;
                    for (let x = 0; x < canvas.width; x += stripeWidth * 2) {
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(x, 0, stripeWidth, canvas.height);
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(x + stripeWidth, 0, stripeWidth, canvas.height);
                    }
                    
                    const texture = new THREE.CanvasTexture(canvas);
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(2, 2);
                    
                    child.material.map = texture;
                    child.material.needsUpdate = true;
                }
                
                // 添加纹理旋转动画
                if (child.material.map && !child.textureAnimation) {
                    child.textureAnimation = () => {
                        if (trainingActive && !trainingPaused) {
                            child.material.map.offset.x += 0.01;
                            child.material.map.offset.y += 0.01;
                        }
                        requestAnimationFrame(child.textureAnimation);
                    };
                    child.textureAnimation();
                }
                
                child.material.opacity = 1;
            }
        });
        
        // 右眼为健眼 - 保持低对比度
        rightScene.traverse((child) => {
            if (child.material && !child.material.map) {
                // 使用低对比度
                child.material.color.setHex(0x666666);
                child.material.opacity = 0.3;
            }
        });
    } else {
        // 右眼为弱视眼 - 添加超强光源
        addUltraBrightLights(rightScene);
        
        // 右眼为弱视眼 - 静态环境物体使用旋转黑白条纹贴图
        rightScene.traverse((child) => {
            if (child.material && !child.isStimulus) {
                // 静态环境物体使用旋转黑白条纹贴图
                if (!child.material.map) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 64;
                    canvas.height = 64;
                    const ctx = canvas.getContext('2d');
                    
                    // 创建黑白条纹纹理
                    const stripeWidth = 8;
                    for (let x = 0; x < canvas.width; x += stripeWidth * 2) {
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(x, 0, stripeWidth, canvas.height);
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(x + stripeWidth, 0, stripeWidth, canvas.height);
                    }
                    
                    const texture = new THREE.CanvasTexture(canvas);
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(2, 2);
                    
                    child.material.map = texture;
                    child.material.needsUpdate = true;
                }
                
                // 添加纹理旋转动画
                if (child.material.map && !child.textureAnimation) {
                    child.textureAnimation = () => {
                        if (trainingActive && !trainingPaused) {
                            child.material.map.offset.x += 0.01;
                            child.material.map.offset.y += 0.01;
                        }
                        requestAnimationFrame(child.textureAnimation);
                    };
                    child.textureAnimation();
                }
                
                child.material.opacity = 1;
            }
        });
        
        // 左眼为健眼 - 保持低对比度
        leftScene.traverse((child) => {
            if (child.material && !child.material.map) {
                // 使用低对比度
                child.material.color.setHex(0x666666);
                child.material.opacity = 0.3;
            }
        });
    }
    
    // 开始背景变换
    start3DBackgroundChange();
}

// 3D背景变换
function start3DBackgroundChange() {
    const ultraSaturatedColors = [
        0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff,
        0xff4500, 0x9400d3, 0x32cd32, 0xff1493, 0x00ced1, 0xffd700
    ];
    
    let colorIndex = 0;
    
    function changeBackground() {
        if (!trainingActive || trainingPaused) return;
        
        const currentColor = ultraSaturatedColors[colorIndex];
        const targetScene = selectedEye === 'left' ? leftScene : rightScene;
        
        // 改变天空颜色
        targetScene.traverse((child) => {
            if (child.geometry && child.geometry.type === 'SphereGeometry' && child.position.y === 0) {
                child.material.color.setHex(currentColor);
            }
        });
        
        // 下一个颜色
        colorIndex = (colorIndex + 1) % ultraSaturatedColors.length;
        
        // 每2秒变换一次颜色
        backgroundChangeInterval = setTimeout(changeBackground, 2000);
    }
    
    // 开始变换
    changeBackground();
}

// 渲染循环
function animate() {
    requestAnimationFrame(animate);
    
    if (trainingActive && !trainingPaused) {
        // 渲染左眼场景
        leftRenderer.render(leftScene, leftCamera);
        
        // 渲染右眼场景
        rightRenderer.render(rightScene, rightCamera);
    }
}

// 暂停训练
function pauseTraining() {
    if (!trainingActive) return;
    
    trainingPaused = !trainingPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    
    if (trainingPaused) {
        pauseBtn.textContent = '继续';
        // 暂停背景音乐
        if (bgMusic && !bgMusic.paused) {
            bgMusic.pause();
        }
    } else {
        pauseBtn.textContent = '暂停';
        // 继续播放背景音乐
        if (bgMusic && bgMusic.paused) {
            bgMusic.play().catch(function(error) {
                console.log('背景音乐播放失败:', error);
            });
        }
    }
}

// 退出VR训练
function exitVRTraining() {
    if (confirm('确定要退出3D VR训练吗？当前训练进度将丢失。')) {
        stop3DVRTraining();
        document.getElementById('vrTrainingScreen').style.display = 'none';
        document.getElementById('selectionScreen').style.display = 'flex';
        
        // 重置选择状态
        selectedEye = null;
        document.querySelectorAll('.eye-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.getElementById('startBtn').disabled = true;
    }
}

// 停止3D VR训练
function stop3DVRTraining() {
    trainingActive = false;
    trainingPaused = false;
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    if (stimulusInterval) {
        clearInterval(stimulusInterval);
        stimulusInterval = null;
    }
    
    if (backgroundChangeInterval) {
        clearTimeout(backgroundChangeInterval);
        backgroundChangeInterval = null;
    }
    
    // 清理3D资源
    clear3DStimuli();
    
    // 继续播放背景音乐（循环播放）
    if (bgMusic && bgMusic.paused) {
        bgMusic.play().catch(function(error) {
            console.log('背景音乐播放失败:', error);
        });
    }
    
    startTime = null;
}

// 完成3D VR训练
function complete3DVRTraining() {
    stop3DVRTraining();
    
    // 显示完成信息
    const completionMessage = `
        <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: white;
            font-size: 1.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            background: rgba(0,0,0,0.8);
            padding: 20px;
            border-radius: 15px;
            z-index: 1002;
        ">
            <div style="font-size: 2em; margin-bottom: 15px;">🎉</div>
            <div>3D VR训练完成！</div>
            <div style="font-size: 0.7em; margin-top: 10px;">您已完成本次屈光参差弱视3D VR训练</div>
        </div>
    `;
    
    // 在镜片上方显示完成信息
    const overlay = document.createElement('div');
    overlay.innerHTML = completionMessage;
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '1002';
    document.body.appendChild(overlay);
    
    // 更新按钮
    document.getElementById('pauseBtn').style.display = 'none';
    
    // 3秒后显示重新开始选项
    setTimeout(() => {
        document.body.removeChild(overlay);
        if (confirm('3D VR训练完成！是否要重新开始训练？')) {
            initialize3DVRTraining();
        }
    }, 3000);
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 添加键盘快捷键
    document.addEventListener('keydown', function(event) {
        if (event.code === 'Space' && trainingActive) {
            event.preventDefault();
            pauseTraining();
        }
        if (event.code === 'Escape' && trainingActive) {
            event.preventDefault();
            exitVRTraining();
        }
    });
    
    // 添加触摸支持
    let touchStartY = 0;
    document.addEventListener('touchstart', function(event) {
        touchStartY = event.touches[0].clientY;
    });
    
    document.addEventListener('touchend', function(event) {
        const touchEndY = event.changedTouches[0].clientY;
        const diff = touchStartY - touchEndY;
        
        // 向上滑动暂停/继续
        if (Math.abs(diff) > 50 && trainingActive) {
            pauseTraining();
        }
    });
});
