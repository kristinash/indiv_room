let scene, camera, renderer, controls;
let roomWalls = {};
let innerCube1, innerCube2, sphere1, sphere2;
let mainLight, additionalLight;
let additionalLightEnabled = true;
let mirrorWall = 'none';
let cubeMirrorEnabled = false;
let sphereMirrorEnabled = false;
let cubeTransparencyEnabled = false;
let sphereTransparencyEnabled = false;
let cubeOpacity = 0.6;
let sphereOpacity = 0.7;
let frontWallOpacity = 0.3;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 30);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('scene-container').appendChild(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    
    createLighting();
    createRoom();
    createInnerObjects();
    setupEventListeners();
    
    window.addEventListener('resize', onWindowResize);
}

function createLighting() {
    // ОСНОВНОЙ ТОЧЕЧНЫЙ ИСТОЧНИК СВЕТА СВЕРХУ
    mainLight = new THREE.PointLight(0xffffff, 1.0, 50);
    mainLight.position.set(0, 8, 0);
    mainLight.castShadow = true;
    scene.add(mainLight);
    
    // Дополнительный источник света
    additionalLight = new THREE.PointLight(0xffffff, 1.5, 50);
    additionalLight.position.set(5, 5, 5);
    additionalLight.castShadow = true;
    scene.add(additionalLight);
    
    const ambientLight = new THREE.AmbientLight(0x444444, 0.4);
    scene.add(ambientLight);
}

function updateMainLight() {
    const intensity = parseFloat(document.getElementById('mainLightIntensity').value);
    mainLight.intensity = intensity;
    document.getElementById('mainLightIntensityValue').textContent = intensity.toFixed(1);
}

function toggleAdditionalLight() {
    additionalLightEnabled = document.getElementById('additionalLightToggle').checked;
    additionalLight.visible = additionalLightEnabled;
}

function updateAdditionalLight() {
    const x = parseFloat(document.getElementById('lightX').value);
    const y = parseFloat(document.getElementById('lightY').value);
    const z = parseFloat(document.getElementById('lightZ').value);
    const intensity = parseFloat(document.getElementById('lightIntensity').value);
    
    additionalLight.position.set(x, y, z);
    additionalLight.intensity = intensity;
    
    document.getElementById('lightXValue').textContent = x;
    document.getElementById('lightYValue').textContent = y;
    document.getElementById('lightZValue').textContent = z;
    document.getElementById('lightIntensityValue').textContent = intensity.toFixed(1);
}

function createRoom() {
    const roomSize = 20;
    const wallThickness = 0.5;
    
    const createMirrorMaterial = (color) => {
        return new THREE.MeshPhongMaterial({
            color: color,
            side: THREE.BackSide,
            shininess: 100,
            specular: 0xffffff,
            reflectivity: 0.8
        });
    };
    
    const createNormalMaterial = (color) => {
        return new THREE.MeshLambertMaterial({
            color: color,
            side: THREE.BackSide
        });
    };
    
    const walls = [
        { name: 'right', color: 0xff6b6b, pos: [roomSize/2, 0, 0], geo: [wallThickness, roomSize, roomSize] },
        { name: 'left', color: 0x4ecdc4, pos: [-roomSize/2, 0, 0], geo: [wallThickness, roomSize, roomSize] },
        { name: 'top', color: 0xf5deb3, pos: [0, roomSize/2, 0], geo: [roomSize, wallThickness, roomSize] },
        { name: 'bottom', color: 0xf5deb3, pos: [0, -roomSize/2, 0], geo: [roomSize, wallThickness, roomSize] },
        { name: 'back', color: 0xf5deb3, pos: [0, 0, -roomSize/2], geo: [roomSize, roomSize, wallThickness] },
        { name: 'front', color: 0x333366, pos: [0, 0, roomSize/2], geo: [roomSize, roomSize, wallThickness] }
    ];
    
    walls.forEach(wall => {
        const geometry = new THREE.BoxGeometry(...wall.geo);
        const material = (mirrorWall === wall.name) 
            ? createMirrorMaterial(wall.color)
            : (wall.name === 'front')
            ? new THREE.MeshLambertMaterial({
                color: wall.color,
                side: THREE.BackSide,
                transparent: true,
                opacity: frontWallOpacity
            })
            : createNormalMaterial(wall.color);
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...wall.pos);
        if (wall.name === 'bottom') mesh.receiveShadow = true;
        roomWalls[wall.name] = mesh;
        scene.add(mesh);
    });
}

function updateObjectsTransparency() {
    cubeOpacity = parseFloat(document.getElementById('cubeOpacity').value);
    sphereOpacity = parseFloat(document.getElementById('sphereOpacity').value);
    
    document.getElementById('cubeOpacityValue').textContent = cubeOpacity.toFixed(1);
    document.getElementById('sphereOpacityValue').textContent = sphereOpacity.toFixed(1);
    
    createInnerObjects();
}

function createInnerObjects() {
    if (innerCube1) scene.remove(innerCube1);
    if (innerCube2) scene.remove(innerCube2);
    if (sphere1) scene.remove(sphere1);
    if (sphere2) scene.remove(sphere2);
    
    const createObjectMaterial = (color, isMirror, isTransparent, opacity) => {
        if (isMirror) {
            return new THREE.MeshPhongMaterial({
                color: color,
                shininess: 100,
                specular: 0xffffff,
                reflectivity: 0.6,
                transparent: isTransparent,
                opacity: isTransparent ? opacity : 1.0
            });
        } else {
            return new THREE.MeshLambertMaterial({ 
                color: color,
                transparent: isTransparent,
                opacity: isTransparent ? opacity : 1.0
            });
        }
    };
    
    const cubeGeometry = new THREE.BoxGeometry(3, 3, 3);
    const cubeMaterial1 = createObjectMaterial(0xffd700, cubeMirrorEnabled, cubeTransparencyEnabled, cubeOpacity);
    const cubeMaterial2 = createObjectMaterial(0x4CAF50, cubeMirrorEnabled, cubeTransparencyEnabled, cubeOpacity);
    
    innerCube1 = new THREE.Mesh(cubeGeometry, cubeMaterial1);
    innerCube1.position.set(-5, -8.5, 3);
    innerCube1.castShadow = true;
    scene.add(innerCube1);
    
    innerCube2 = new THREE.Mesh(cubeGeometry, cubeMaterial2);
    innerCube2.position.set(5, -8.5, -3);
    innerCube2.castShadow = true;
    scene.add(innerCube2);
    
    const sphereGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const sphereMaterial1 = createObjectMaterial(0xff4444, sphereMirrorEnabled, sphereTransparencyEnabled, sphereOpacity);
    const sphereMaterial2 = createObjectMaterial(0xaa44ff, sphereMirrorEnabled, sphereTransparencyEnabled, sphereOpacity);
    
    sphere1 = new THREE.Mesh(sphereGeometry, sphereMaterial1);
    sphere1.position.set(-5, -8.5, -3);
    sphere1.castShadow = true;
    scene.add(sphere1);
    
    sphere2 = new THREE.Mesh(sphereGeometry, sphereMaterial2);
    sphere2.position.set(5, -8.5, 3);
    sphere2.castShadow = true;
    scene.add(sphere2);
}

function updateMirrorWall() {
    Object.values(roomWalls).forEach(wall => scene.remove(wall));
    roomWalls = {};
    createRoom();
}

function setupEventListeners() {
    document.getElementById('mainLightIntensity').addEventListener('input', updateMainLight);
    
    document.getElementById('additionalLightToggle').addEventListener('change', toggleAdditionalLight);
    
    document.getElementById('lightX').addEventListener('input', updateAdditionalLight);
    document.getElementById('lightY').addEventListener('input', updateAdditionalLight);
    document.getElementById('lightZ').addEventListener('input', updateAdditionalLight);
    document.getElementById('lightIntensity').addEventListener('input', updateAdditionalLight);
    
    // Прозрачность объектов
    document.getElementById('cubeTransparencyToggle').addEventListener('change', function() {
        cubeTransparencyEnabled = this.checked;
        createInnerObjects();
    });
    
    document.getElementById('sphereTransparencyToggle').addEventListener('change', function() {
        sphereTransparencyEnabled = this.checked;
        createInnerObjects();
    });
    
    document.getElementById('cubeOpacity').addEventListener('input', updateObjectsTransparency);
    document.getElementById('sphereOpacity').addEventListener('input', updateObjectsTransparency);
    
    // Зеркальность объектов
    document.getElementById('cubeMirrorToggle').addEventListener('change', function() {
        cubeMirrorEnabled = this.checked;
        createInnerObjects();
    });
    
    document.getElementById('sphereMirrorToggle').addEventListener('change', function() {
        sphereMirrorEnabled = this.checked;
        createInnerObjects();
    });
    
    // Зеркальные стены
    document.getElementById('mirrorWallSelect').addEventListener('change', function() {
        mirrorWall = this.value;
        updateMirrorWall();
    });
    
    // Прозрачность передней стены
    document.getElementById('frontWallOpacity').addEventListener('input', function() {
        frontWallOpacity = parseFloat(this.value);
        if (roomWalls.front) {
            roomWalls.front.material.opacity = frontWallOpacity;
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

init();
animate();