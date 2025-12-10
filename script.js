// ========== КЛАССЫ ДЛЯ РЕНДЕРИНГА ==========

class Scene {
    constructor(objects = [], lights = [], bgcolor = new Color(0,0,0)) {
        this.objects = objects;
        this.bgcolor = bgcolor;
        this.lights = lights;
    }

    addLight(light) {
        this.lights.push(light);
    }

    removeLight(light) {
        this.lights = this.lights.filter(l => l !== light);
    }
}

class Light {
    constructor(position, intensity) {
        this.position = position;
        this.intensity = intensity;
    }
}

class Camera {
    constructor(position, fieldOfView) {
        this.position = position;
        this.fieldOfView = fieldOfView;
    }
}

class Ray {
    constructor(origin, direction) {
        this.origin = origin;
        this.direction = direction;
    }
}

class Shape {
    constructor(properties) {
        this.properties = properties;
    }
}

class Sphere extends Shape {
    constructor(position, radius, properties) {
        super(properties);
        this.position = position;
        this.radius = radius;
    }

    collision(ray) {
        let distRay = Vector.subtract(this.position, ray.origin);
        let distToCenter = distRay.length;
        let rayDistToCenter = Vector.dot(distRay, ray.direction);
        let rayDistFromCenterSquared = distToCenter ** 2 - rayDistToCenter ** 2;

        let radiusSquared = this.radius ** 2

        let distToSurface = rayDistToCenter - Math.sqrt(Math.abs(radiusSquared - rayDistFromCenterSquared));

        let collide = true;

        if (rayDistToCenter < 0) { collide = false; }
        if (rayDistFromCenterSquared > radiusSquared) { collide = false; }

        if (!collide) { distToSurface = Infinity; }

        let point = Vector.add(Vector.scale(ray.direction, distToSurface), ray.origin)

        return { collide: collide, dist: distToSurface, point: point, normal: Vector.subtract(point, this.position).normalize(), obj: this }
    }
}

class Triangle extends Shape {
    constructor(points, properties) {
        super(properties)
        this.points = points
    }

    collision(ray) {
        let planeVector = Vector.cross(Vector.subtract(this.points[1], this.points[0]), Vector.subtract(this.points[2], this.points[0])).normalize()
        let planeOffset = Vector.dot(planeVector, this.points[0])
        let distToSurface = (planeOffset - Vector.dot(planeVector, ray.origin)) / Vector.dot(planeVector, ray.direction)
        let point = Vector.add(Vector.scale(ray.direction, distToSurface), ray.origin)
        let c1 = Vector.dot(Vector.cross(Vector.subtract(this.points[1], this.points[0]), Vector.subtract(point, this.points[0])), planeVector) >= 0
        let c2 = Vector.dot(Vector.cross(Vector.subtract(this.points[2], this.points[1]), Vector.subtract(point, this.points[1])), planeVector) >= 0
        let c3 = Vector.dot(Vector.cross(Vector.subtract(this.points[0], this.points[2]), Vector.subtract(point, this.points[2])), planeVector) >= 0
        let collide = c1 && c2 && c3

        if (!collide || distToSurface <= 0) { distToSurface = Infinity }

        return { collide: collide, dist: distToSurface, point: point, normal: planeVector, obj: this }
    }
}

class Plane extends Shape {
    constructor(points, properties) {
        super(properties);
        this.points = points;
        this.set_triangles();
    }

    set_triangles() {
        this.triangles = [
            new Triangle([this.points[0], this.points[1], this.points[2]], this.properties),
            new Triangle([this.points[2], this.points[3], this.points[0]], this.properties),
        ]
    }

    collision(ray) {
        let col = this.triangles[0].collision(ray);
        for (let i = 1; i < this.triangles.length; ++i) {
            let col1 = this.triangles[i].collision(ray);
            if (col1.dist < col.dist)
                col = col1;
        }
        col.obj = this;
        return col;
    }
}

class Box extends Shape {
    constructor(position, scale_x, scale_y, scale_z, properties) {
        super(properties)
        this.position = position
        this.scale_x = scale_x
        this.scale_y = scale_y
        this.scale_z = scale_z
        this.set_faces();
    }

    set_faces() {
        let sx = this.scale_x/2;
        let sy = this.scale_y/2;
        let sz = this.scale_z/2;

        let p1, p2, p3, p4, p5, p6, p7, p8;
        p1 = new Vector(-sx, +sy, -sz).add(this.position);
        p2 = new Vector(-sx, +sy, +sz).add(this.position);
        p3 = new Vector(+sx, +sy, +sz).add(this.position);
        p4 = new Vector(+sx, +sy, -sz).add(this.position);
        p5 = new Vector(-sx, -sy, -sz).add(this.position);
        p6 = new Vector(-sx, -sy, +sz).add(this.position);
        p7 = new Vector(+sx, -sy, +sz).add(this.position);
        p8 = new Vector(+sx, -sy, -sz).add(this.position);

        this.faces = [
            new Plane([p1, p2, p3, p4], this.properties),
            new Plane([p8, p7, p6, p5], this.properties),
            new Plane([p1, p4, p8, p5], this.properties),
            new Plane([p2, p6, p7, p3], this.properties),
            new Plane([p2, p1, p5, p6], this.properties),
            new Plane([p4, p3, p7, p8], this.properties),
        ];
    }

    collision(ray) {
        let col = this.faces[0].collision(ray);
        for (let i = 1; i < this.faces.length; ++i) {
            let col1 = this.faces[i].collision(ray);
            if (col1.dist < col.dist)
                col = col1;
        }
        col.obj = this;
        return col;
    }
}

class Color {
    constructor(r, g, b) {
        this.r = Math.max(0, Math.min(r, 255));
        this.g = Math.max(0, Math.min(g, 255));
        this.b = Math.max(0, Math.min(b, 255));
    }

    scale(s) {
        this.r *= s;
        this.g *= s;
        this.b *= s;
        return this;
    }

    add(c) {
        this.r += c.r;
        this.g += c.g;
        this.b += c.b;
        return this;
    }

    static add(c1, c2) {
        return new Color(c1.r + c2.r, c1.g + c2.g, c1.b + c2.b);
    }

    static scale(c, s) {
        return new Color(c.r * s, c.g * s, c.b * s);
    }
}

class Vector {
    constructor(x, y, z) {
        this.x = x
        this.y = y
        this.z = z
    }

    get length() {
        return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
    }

    set length(len) {
        let scaleFactor = len / this.length;
        this.scale(scaleFactor);
    }

    copy() {
        return new Vector(this.x, this.y, this.z);
    }

    normalize() {
        this.length = 1;
        return this;
    }

    scale(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    subtract(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    static normalize(v) {
        return v.copy().normalize();
    }

    static add(v1, v2) {
        return new Vector(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z);
    }

    static subtract(v1, v2) {
        return new Vector(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
    }

    static scale(v, s) {
        return new Vector(v.x * s, v.y * s, v.z * s);
    }

    static dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    static cross(v1, v2) {
        return new Vector(v1.y * v2.z - v1.z * v2.y, v1.z * v2.x - v1.x * v2.z, v1.x * v2.y - v1.y * v2.x);
    }
}

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========

let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");
let width = 600;
let height = 500;
canvas.width = width;
canvas.height = height;

let pixelGrid = Array(width).fill(0).map(() => new Array(height).fill(0).map(() => new Color(0, 0, 0)));
let camera = new Camera(new Vector(0, 0, -10), Math.PI/1.5);
const maxDepth = 3;

// ========== СОЗДАНИЕ СЦЕНЫ ==========

let leftWall = new Plane([
    new Vector(-20, -20, 20), 
    new Vector(-20, -20, -20), 
    new Vector(-20, 20, -20), 
    new Vector(-20, 20, 20)
], {
    color: new Color(255, 100, 100), 
    reflectivity: false,
    transparency: false
});

let rightWall = new Plane([
    new Vector(20, -20, 20), 
    new Vector(20, 20, 20), 
    new Vector(20, 20, -20), 
    new Vector(20, -20, -20)
], {
    color: new Color(100, 100, 255), 
    reflectivity: false,
    transparency: false
});

let upWall = new Plane([
    new Vector(-20, 20, 20), 
    new Vector(-20, 20, -20), 
    new Vector(20, 20, -20), 
    new Vector(20, 20, 20)
], {
    color: new Color(240, 240, 240), 
    reflectivity: false,
    transparency: false
});

let downWall = new Plane([
    new Vector(-20, -20, 20), 
    new Vector(20, -20, 20), 
    new Vector(20, -20, -20), 
    new Vector(-20, -20, -20)
], {
    color: new Color(150, 150, 150), 
    reflectivity: false,
    transparency: false
});

let frontWall = new Plane([
    new Vector(-20, -20, 20), 
    new Vector(-20, 20, 20), 
    new Vector(20, 20, 20), 
    new Vector(20, -20, 20)
], {
    color: new Color(255, 255, 255), 
    reflectivity: false,
    transparency: false
});

let backWall = new Plane([
    new Vector(-20, -20, -20), 
    new Vector(20, -20, -20), 
    new Vector(20, 20, -20), 
    new Vector(-20, 20, -20)
], {
    color: new Color(180, 180, 180), 
    reflectivity: false,
    transparency: false
});

let sphere1 = new Sphere(new Vector(-8, -3, 15), 4, {
    color: new Color(255, 107, 107), 
    reflectivity: false,
    transparency: false
});

let sphere2 = new Sphere(new Vector(8, -5, 10), 5, {
    color: new Color(78, 205, 196), 
    reflectivity: false,
    transparency: false
});

let box1 = new Box(new Vector(-5, -10, 8), 6, 4, 2, {
    color: new Color(255, 209, 102), 
    reflectivity: false,
    transparency: false
});

let box2 = new Box(new Vector(6, 6, 8), 4, 4, 4, {
    color: new Color(6, 214, 160), 
    reflectivity: false,
    transparency: false
});

let mainLight = new Light(new Vector(0, 15, 5), 0.8);
let secondLight = new Light(new Vector(-9, 0, 2), 0.6);

let scene = new Scene([
    leftWall,
    rightWall,
    upWall,
    downWall,
    frontWall,
    backWall,
    sphere1,
    sphere2,
    box1,
    box2
], [
    mainLight
], new Color(30, 30, 40));

// ========== УПРАВЛЕНИЕ ЭЛЕМЕНТАМИ ==========

let leftWallReflective = document.getElementById('leftwall-reflective');
let rightWallReflective = document.getElementById('rightwall-reflective');
let upWallReflective = document.getElementById('upwall-reflective');
let downWallReflective = document.getElementById('downwall-reflective');
let frontWallReflective = document.getElementById('frontwall-reflective');
let backWallReflective = document.getElementById('backwall-reflective');

let sphere1Reflective = document.getElementById('sphere1-reflective');
let sphere2Reflective = document.getElementById('sphere2-reflective');
let box1Reflective = document.getElementById('cube1-reflective');
let box2Reflective = document.getElementById('cube2-reflective');

let sphere1Transparent = document.getElementById('sphere1-transparent');
let sphere2Transparent = document.getElementById('sphere2-transparent');
let box1Transparent = document.getElementById('cube1-transparent');
let box2Transparent = document.getElementById('cube2-transparent');

let lightToggle = document.getElementById("light1-toggle");
let lightControlsContainer = document.getElementById("light-controls-container");
let lightXSlider = document.getElementById("light-x");
let lightYSlider = document.getElementById("light-y");
let lightZSlider = document.getElementById("light-z");
let lightXValue = document.getElementById("light-x-value");
let lightYValue = document.getElementById("light-y-value");
let lightZValue = document.getElementById("light-z-value");

let renderButton = document.getElementById("render");

// ========== ИНИЦИАЛИЗАЦИЯ ==========

ctx.fillStyle = '#1a202c';
ctx.fillRect(0, 0, width, height);

ctx.fillStyle = 'white';
ctx.font = '16px Arial';
ctx.textAlign = 'center';
ctx.fillText('Настройте параметры и нажмите "Запустить рендеринг"', width/2, height/2);

function updateProperties() {
    leftWall.properties.reflectivity = leftWallReflective.checked;
    rightWall.properties.reflectivity = rightWallReflective.checked;
    upWall.properties.reflectivity = upWallReflective.checked;
    downWall.properties.reflectivity = downWallReflective.checked;
    frontWall.properties.reflectivity = frontWallReflective.checked;
    backWall.properties.reflectivity = backWallReflective.checked;

    sphere1.properties.reflectivity = sphere1Reflective.checked;
    sphere1.properties.transparency = sphere1Transparent.checked;
    
    sphere2.properties.reflectivity = sphere2Reflective.checked;
    sphere2.properties.transparency = sphere2Transparent.checked;
    
    box1.properties.reflectivity = box1Reflective.checked;
    box1.properties.transparency = box1Transparent.checked;
    
    box2.properties.reflectivity = box2Reflective.checked;
    box2.properties.transparency = box2Transparent.checked;
}

[leftWallReflective, rightWallReflective, upWallReflective, downWallReflective, 
 frontWallReflective, backWallReflective, sphere1Reflective, sphere2Reflective, 
 box1Reflective, box2Reflective, sphere1Transparent, sphere2Transparent, 
 box1Transparent, box2Transparent].forEach(element => {
    element.onchange = updateProperties;
});

lightToggle.onchange = () => {
    if (lightToggle.checked) {
        lightControlsContainer.style.display = 'block';
        scene.addLight(secondLight);
    } else {
        lightControlsContainer.style.display = 'none';
        scene.removeLight(secondLight);
    }
    updateLightPosition();
};

function updateLightPosition() {
    secondLight.position.x = parseFloat(lightXSlider.value);
    secondLight.position.y = parseFloat(lightYSlider.value);
    secondLight.position.z = parseFloat(lightZSlider.value);
    
    lightXValue.textContent = secondLight.position.x;
    lightYValue.textContent = secondLight.position.y;
    lightZValue.textContent = secondLight.position.z;
}

lightXSlider.oninput = updateLightPosition;
lightYSlider.oninput = updateLightPosition;
lightZSlider.oninput = updateLightPosition;

// ========== ОПТИМИЗИРОВАННЫЕ ФУНКЦИИ РЕНДЕРИНГА ==========

function paintCanvas(pixels) {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const color = pixels[x][y];
            
            data[idx] = Math.min(255, Math.floor(color.r));
            data[idx + 1] = Math.min(255, Math.floor(color.g));
            data[idx + 2] = Math.min(255, Math.floor(color.b));
            data[idx + 3] = 255;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function scene_collide(ray, currentObj) {
    let closest = { collide: false, dist: Infinity };
    
    for (let obj of scene.objects) {
        if (obj === currentObj) continue;
        
        const col = obj.collision(ray);
        if (col.collide && col.dist < closest.dist) {
            closest = col;
        }
    }
    
    return closest;
}

function reflect(point, ray, normal) {
    const dot = Vector.dot(ray.direction, normal);
    const newDirection = Vector.subtract(ray.direction, Vector.scale(normal, 2 * dot));
    return new Ray(point, newDirection);
}

function trace(ray, depth, currentObj) {
    if (depth <= 0) return scene.bgcolor;

    const result = scene_collide(ray, currentObj);
    if (!result.collide) return scene.bgcolor;

    const point = result.point;
    const normal = result.normal;
    const epsilon = 0.001;

    let lightIntensity = 0;
    
    for (let light of scene.lights) {
        const toLight = Vector.subtract(light.position, point);
        const lightDistance = toLight.length;
        const lightDir = Vector.scale(toLight, 1 / lightDistance);
        
        const shadowRay = new Ray(Vector.add(point, Vector.scale(normal, epsilon)), lightDir);
        const shadowResult = scene_collide(shadowRay, result.obj);
        
        const shadowFactor = shadowResult.collide && shadowResult.dist < lightDistance ? 0.3 : 1.0;
        const cosTheta = Math.max(0, Vector.dot(lightDir, normal));
        
        lightIntensity += light.intensity * cosTheta * shadowFactor;
    }
    
    lightIntensity = Math.max(0.1, Math.min(1, lightIntensity / scene.lights.length));

    let color = Color.scale(result.obj.properties.color, lightIntensity);

    if (result.obj.properties.reflectivity && depth > 0) {
        const reflectedRay = reflect(Vector.add(point, Vector.scale(normal, epsilon)), ray, normal);
        const reflection = trace(reflectedRay, depth - 1, result.obj);
        
        const reflectAmount = 0.7;
        color = Color.add(
            Color.scale(color, 1 - reflectAmount),
            Color.scale(reflection, reflectAmount)
        );
    }

    if (result.obj.properties.transparency && depth > 0) {
        const refractedRay = new Ray(
            Vector.add(point, Vector.scale(normal, -epsilon)),
            ray.direction
        );
        const refraction = trace(refractedRay, depth - 1, result.obj);
        
        const refractAmount = 0.5;
        color = Color.add(
            Color.scale(color, 1 - refractAmount),
            Color.scale(refraction, refractAmount)
        );
    }

    return color;
}

async function render() {
    updateProperties();
    updateLightPosition();
    
    renderButton.disabled = true;
    renderButton.textContent = 'Рендеринг...';
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Рендеринг... 0%', width/2, height/2);
    
    const previewWidth = Math.floor(width / 2);
    const previewHeight = Math.floor(height / 2);
    
    for (let y = 0; y < previewHeight; y++) {
        for (let x = 0; x < previewWidth; x++) {
            const screenX = (2*(x + 0.5)/previewWidth - 1)*Math.tan(camera.fieldOfView/2)*(width/height);
            const screenY = -(2*(y + 0.5)/previewHeight - 1)*Math.tan(camera.fieldOfView/2);
            const ray = new Ray(camera.position, new Vector(screenX, screenY, camera.fieldOfView).normalize());
            
            const color = trace(ray, maxDepth, null);
            
            const canvasX = x * 2;
            const canvasY = y * 2;
            
            if (canvasX < width && canvasY < height) {
                pixelGrid[canvasX][canvasY] = color;
                if (canvasX + 1 < width) pixelGrid[canvasX + 1][canvasY] = color;
                if (canvasY + 1 < height) pixelGrid[canvasX][canvasY + 1] = color;
                if (canvasX + 1 < width && canvasY + 1 < height) pixelGrid[canvasX + 1][canvasY + 1] = color;
            }
        }
        
        if (y % 10 === 0) {
            const progress = Math.floor((y / previewHeight) * 50);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Рендеринг предпросмотра... ${progress}%`, width/2, height/2);
            
            paintCanvas(pixelGrid);
            
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (x % 2 === 0 && y % 2 === 0) continue;
            
            const screenX = (2*(x + 0.5)/width - 1)*Math.tan(camera.fieldOfView/2)*(width/height);
            const screenY = -(2*(y + 0.5)/height - 1)*Math.tan(camera.fieldOfView/2);
            const ray = new Ray(camera.position, new Vector(screenX, screenY, camera.fieldOfView).normalize());
            
            pixelGrid[x][y] = trace(ray, maxDepth, null);
        }
        
        if (y % 10 === 0) {
            const progress = Math.floor(50 + (y / height) * 50);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Полный рендеринг... ${progress}%`, width/2, height/2);
            
            paintCanvas(pixelGrid);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    paintCanvas(pixelGrid);
    
    renderButton.disabled = false;
    renderButton.textContent = '🔄 Запустить рендеринг';
}

renderButton.onclick = render;

updateProperties();
updateLightPosition();
