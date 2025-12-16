class Scene {
    constructor(objects = [], lights = [], bgcolor = new Color(0,0,0)) {
        this.objects = objects;
        this.bgcolor = bgcolor;
        this.lights = lights;
    }
    add(object) { this.lights.push(object); }
    remove(object) { this.lights = this.lights.filter(o => o != object); }
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
        let radiusSquared = this.radius ** 2;
        let distToSurface = rayDistToCenter - Math.sqrt(Math.abs(radiusSquared - rayDistFromCenterSquared));
        let collide = true;
        if (rayDistToCenter < 0 || rayDistFromCenterSquared > radiusSquared) { collide = false; }
        if (!collide) { distToSurface = Infinity; }
        let point = Vector.add(Vector.scale(ray.direction, distToSurface), ray.origin);
        return { collide: collide, dist: distToSurface, point: point, normal: Vector.subtract(point, this.position).normalize(), obj: this }
    }
}

class Triangle extends Shape {
    constructor(points, properties) {
        super(properties);
        this.points = points;
    }
    collision(ray) {
        let planeVector = Vector.cross(Vector.subtract(this.points[1], this.points[0]), Vector.subtract(this.points[2], this.points[0])).normalize();
        let planeOffset = Vector.dot(planeVector, this.points[0]);
        let dotRV = Vector.dot(planeVector, ray.direction);
        if (Math.abs(dotRV) < 0.0001) return { collide: false, dist: Infinity };
        let distToSurface = (planeOffset - Vector.dot(planeVector, ray.origin)) / dotRV;
        let point = Vector.add(Vector.scale(ray.direction, distToSurface), ray.origin);
        let c1 = Vector.dot(Vector.cross(Vector.subtract(this.points[1], this.points[0]), Vector.subtract(point, this.points[0])), planeVector) >= 0;
        let c2 = Vector.dot(Vector.cross(Vector.subtract(this.points[2], this.points[1]), Vector.subtract(point, this.points[1])), planeVector) >= 0;
        let c3 = Vector.dot(Vector.cross(Vector.subtract(this.points[0], this.points[2]), Vector.subtract(point, this.points[2])), planeVector) >= 0;
        let collide = c1 && c2 && c3;
        if (!collide || distToSurface <= 0) { distToSurface = Infinity; collide = false; }
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
        ];
    }
    collision(ray) {
        let col = this.triangles[0].collision(ray);
        let col1 = this.triangles[1].collision(ray);
        if (col1.dist < col.dist) col = col1;
        col.obj = this;
        return col;
    }
}

class Box extends Shape {
    constructor(position, scale_x, scale_y, scale_z, properties) {
        super(properties);
        this.position = position;
        this.scale_x = scale_x;
        this.scale_y = scale_y;
        this.scale_z = scale_z;
        this.set_faces();
    }
    set_faces() {
        let sx = this.scale_x/2, sy = this.scale_y/2, sz = this.scale_z/2;
        let p = [
            new Vector(-sx, sy, -sz).add(this.position), new Vector(-sx, sy, sz).add(this.position),
            new Vector(sx, sy, sz).add(this.position), new Vector(sx, sy, -sz).add(this.position),
            new Vector(-sx, -sy, -sz).add(this.position), new Vector(-sx, -sy, sz).add(this.position),
            new Vector(sx, -sy, sz).add(this.position), new Vector(sx, -sy, -sz).add(this.position)
        ];
        this.faces = [
            new Plane([p[0], p[1], p[2], p[3]], this.properties), new Plane([p[7], p[6], p[5], p[4]], this.properties),
            new Plane([p[0], p[3], p[7], p[4]], this.properties), new Plane([p[1], p[5], p[6], p[2]], this.properties),
            new Plane([p[1], p[0], p[4], p[5]], this.properties), new Plane([p[3], p[2], p[6], p[7]], this.properties)
        ];
    }
    collision(ray) {
        let col = { dist: Infinity, collide: false };
        for (let face of this.faces) {
            let res = face.collision(ray);
            if (res.collide && res.dist < col.dist) col = res;
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
    scale(s) { this.r *= s; this.g *= s; this.b *= s; return this; }
    add(c) { this.r += c.r; this.g += c.g; this.b += c.b; return this; }
    copy() { return new Color(this.r, this.g, this.b); }
    static scale(c, s) { return new Color(c.r * s, c.g * s, c.b * s); }
}

class Vector {
    constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
    get length() { return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2); }
    set length(len) { let s = len / (this.length || 1); this.x *= s; this.y *= s; this.z *= s; }
    copy() { return new Vector(this.x, this.y, this.z); }
    normalize() { this.length = 1; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    subtract(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    static add(v1, v2) { return new Vector(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z); }
    static subtract(v1, v2) { return new Vector(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z); }
    static scale(v, s) { return new Vector(v.x * s, v.y * s, v.z * s); }
    static dot(v1, v2) { return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z; }
    static cross(v1, v2) { return new Vector(v1.y * v2.z - v1.z * v2.y, v1.z * v2.x - v1.x * v2.z, v1.x * v2.y - v1.y * v2.x); }
}

const maxDepth = 4;
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const width = 500, height = 500;
ctx.canvas.width = width; ctx.canvas.height = height;
const pixelGrid = Array(width).fill(0).map(() => new Array(height).fill(0).map(() => new Color(0, 0, 0)));
const camera = new Camera(new Vector(0, 0, -6), Math.PI / 1.2);

const leftWall = new Plane([new Vector(-10, -10, 10), new Vector(-10, -10, -10), new Vector(-10, 10, -10), new Vector(-10, 10, 10)], { color: new Color(155, 0, 255), reflectivity: false, transparency: false });
const rightWall = new Plane([new Vector(10, -10, 10), new Vector(10, 10, 10), new Vector(10, 10, -10), new Vector(10, -10, -10)], { color: new Color(50, 255, 50), reflectivity: false, transparency: false });
const upWall = new Plane([new Vector(-10, 10, 10), new Vector(-10, 10, -10), new Vector(10, 10, -10), new Vector(10, 10, 10)], { color: new Color(255, 250, 250), reflectivity: false, transparency: false });
const downWall = new Plane([new Vector(-10, -10, 10), new Vector(10, -10, 10), new Vector(10, -10, -10), new Vector(-10, -10, -10)], { color: new Color(220, 220, 220), reflectivity: false, transparency: false });
const frontWall = new Plane([new Vector(-10, -10, 10), new Vector(-10, 10, 10), new Vector(10, 10, 10), new Vector(10, -10, 10)], { color: new Color(255, 100, 0), reflectivity: false, transparency: false });
const backWall = new Plane([new Vector(-10, -10, -10), new Vector(10, -10, -10), new Vector(10, 10, -10), new Vector(-10, 10, -10)], { color: new Color(0, 0, 0), reflectivity: false, transparency: false });

const sphere1 = new Sphere(new Vector(-5, 0, 9), 2, { color: new Color(255, 215, 0), reflectivity: false, transparency: false });
const sphere2 = new Sphere(new Vector(5, -2, 5), 3, { color: new Color(255, 255, 204), reflectivity: false, transparency: false });
const box1 = new Box(new Vector(-2, -6, 2), 3, 2, 1, { color: new Color(180, 120, 255), reflectivity: false, transparency: false });
const box2 = new Box(new Vector(4, 3, 2), 2, 2, 2, { color: new Color(255, 160, 120), reflectivity: false, transparency: false });

const light1 = new Light(new Vector(-9, 0, 2), 0.8);
const lightCheckbox = document.getElementById("light1");
let lightSources = [new Light(new Vector(0, 9, 2), 1)];
const scene = new Scene([leftWall, rightWall, upWall, downWall, frontWall, backWall, sphere1, sphere2, box1, box2], lightSources, new Color(10, 10, 15));

function render() {
    // Перед рендером обновляем координаты доп. света из полей ввода, если они есть в HTML
    if (document.getElementById("lx")) {
        light1.position.x = parseFloat(document.getElementById("lx").value) || 0;
        light1.position.y = parseFloat(document.getElementById("ly").value) || 0;
        light1.position.z = parseFloat(document.getElementById("lz").value) || 0;
    }

    for (let i = 0; i < width; ++i) {
        for (let j = 0; j < height; ++j) {
            const x = (2 * (i + 0.5) / width - 1) * Math.tan(camera.fieldOfView / 2) * (width / height);
            const y = -(2 * (j + 0.5) / height - 1) * Math.tan(camera.fieldOfView / 2);
            const ray = new Ray(camera.position, new Vector(x, y, camera.fieldOfView).normalize());
            pixelGrid[i][j] = trace(ray, maxDepth);
        }
    }
    for (let i = 0; i < width; ++i) {
        for (let j = 0; j < height; ++j) {
            const c = pixelGrid[i][j];
            ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
            ctx.fillRect(i, j, 1, 1);
        }
    }
}

function trace(ray, depth, currentObj) {
    if (depth <= 0) return scene.bgcolor;
    const results = scene.objects.filter(o => o != currentObj).map(o => o.collision(ray));
    const result = results.filter(a => a.collide).reduce((a, b) => (a.dist <= b.dist ? a : b), { collide: false, dist: Infinity });
    if (!result.collide) return scene.bgcolor;

    let lightIntensity = 0;
    const shadowCoeff = 0.3 / scene.lights.length;
    for (const light of scene.lights) {
        const lightDirection = Vector.subtract(light.position, result.point).normalize();
        const lightDistance = Vector.subtract(light.position, result.point).length;
        if (scene.objects.filter(o => o != result.obj).some(o => { const c = o.collision(new Ray(result.point, lightDirection)); return c.collide && c.dist < lightDistance; })) {
            lightIntensity += shadowCoeff * light.intensity * Math.max(0, Vector.dot(lightDirection, result.normal));
        } else {
            lightIntensity += light.intensity * Math.max(0, Vector.dot(lightDirection, result.normal));
        }
    }
    lightIntensity /= scene.lights.length;

    let resultColor = Color.scale(result.obj.properties.color, lightIntensity);
    if (result.obj.properties.reflectivity) {
        const reflectRay = new Ray(result.point, Vector.subtract(ray.direction, Vector.scale(result.normal, 2 * Vector.dot(ray.direction, result.normal))));
        resultColor.add(trace(reflectRay, depth - 1, result.obj).scale(depth / maxDepth / 2));
    }
    if (result.obj.properties.transparency) {
        let cosi = -Math.max(-1, Math.min(1, Vector.dot(ray.direction, result.normal)));
        let etai = 1, etaobj = 0.9, n = result.normal.copy();
        if (cosi < 0) { cosi = -cosi; [etai, etaobj] = [etaobj, etai]; n.scale(-1); }
        const eta = etai / etaobj;
        const k = 1 - eta * eta * (1 - cosi * cosi);
        const refractRay = new Ray(result.point, Vector.scale(ray.direction, eta).add(Vector.scale(n, eta * cosi - Math.sqrt(Math.max(0, k)))));
        resultColor.add(trace(refractRay, depth - 1, result.obj).scale(depth / maxDepth / 2));
    }
    return resultColor;
}

const setup = (name, obj) => {
    document.querySelectorAll(`input[name=${name}]`).forEach(radio => {
        radio.onchange = () => { obj.properties.reflectivity = radio.value === 'reflective'; obj.properties.transparency = radio.value === 'transparent'; };
    });
};

['leftwall','rightwall','upwall','downwall','frontwall','backwall'].forEach((n,i) => setup(n, [leftWall,rightWall,upWall,downWall,frontWall,backWall][i]));
setup('sphere1', sphere1); setup('sphere2', sphere2); setup('cube1', box1); setup('cube2', box2);

lightCheckbox.onchange = () => lightCheckbox.checked ? scene.add(light1) : scene.remove(light1);
document.getElementById("render").onclick = render;
