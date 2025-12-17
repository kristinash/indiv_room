class Scene {
    constructor(objects = [], lights = [], bg = new Color(0,0,0)) {
        this.objects = objects;
        this.bg = bg;
        this.lights = lights;
    }
    add(light) { this.lights.push(light); }
    remove(light) { this.lights = this.lights.filter(l => l !== light); }
}

class Light {
    constructor(pos, intensity) {
        this.pos = pos;
        this.intensity = intensity;
    }
}

class Camera {
    constructor(pos, fov) {
        this.pos = pos;
        this.fov = fov;
    }
}

class Ray {
    constructor(origin, dir) {
        this.origin = origin;
        this.dir = dir;
    }
}

class Shape {
    constructor(props) {
        this.props = props;
    }
}

class Sphere extends Shape {
    constructor(pos, radius, props) {
        super(props);
        this.pos = pos;
        this.radius = radius;
    }
    
    intersect(ray) {
        const toSphere = Vector.sub(this.pos, ray.origin);
        //Мы проецируем вектор toSphere на направление луча
        //Длина отрезка от начала луча до точки на луче, которая находится ближе всего к центру сферы.
        const proj = Vector.dot(toSphere, ray.dir);
        //Она вычисляет квадрат расстояния от центра сферы до ближайшей к ней точки на прямой луча.
        const d2 = toSphere.length ** 2 - proj ** 2;
        const r2 = this.radius ** 2;
        //proj < 0: Сфера находится "сзади" луча.
        if (proj < 0 || d2 > r2) return { hit: false, dist: Infinity };
        //расстояние от камеры до ближайшей точки поверхности сферы, в которую врезался луч.
        const dist = proj - Math.sqrt(r2 - d2);
        const point = Vector.add(ray.origin, Vector.mul(ray.dir, dist));
        const normal = Vector.sub(point, this.pos).norm();
        
        return { hit: true, dist, point, normal, obj: this };
    }
}

class Triangle extends Shape {
    constructor(points, props) {
        super(props);
        this.points = points;
    }
    
    intersect(ray) {
        const v0v1 = Vector.sub(this.points[1], this.points[0]);
        const v0v2 = Vector.sub(this.points[2], this.points[0]);
        const normal = Vector.cross(v0v1, v0v2).norm();

        //Если denom близок к 0: луч летит почти параллельно треугольнику.
        const denom = Vector.dot(normal, ray.dir);
        if (Math.abs(denom) < 0.0001) return { hit: false, dist: Infinity };
        //перпендикуляр от камеры до  плоскости, в которой лежит треугольник.
        const dist = Vector.dot(normal, Vector.sub(this.points[0], ray.origin)) / denom;
        //Это значит, что треугольник находится у нас за спиной.
        if (dist <= 0) return { hit: false, dist: Infinity };
        const point = Vector.add(ray.origin, Vector.mul(ray.dir, dist));
        
        const checkEdge = (a, b, p) => 
        
        //Если точка $P$ внутри треугольника: временный перпендикуляр будет смотреть в ту же сторону, что и основная нормаль треугольника.
        Vector.dot(Vector.cross(Vector.sub(b, a), Vector.sub(p, a)), normal) >= 0;
        
        if (!checkEdge(this.points[0], this.points[1], point) ||
            !checkEdge(this.points[1], this.points[2], point) ||
            !checkEdge(this.points[2], this.points[0], point)) {
            return { hit: false, dist: Infinity };
        }
        
        return { hit: true, dist, point, normal, obj: this };
    }
}

class Rectangle extends Shape {
    constructor(points, props) {
        super(props);
        this.tri1 = new Triangle([points[0], points[1], points[2]], props);
        this.tri2 = new Triangle([points[2], points[3], points[0]], props);
    }
    
    intersect(ray) {
        const hit1 = this.tri1.intersect(ray);
        const hit2 = this.tri2.intersect(ray);
        return hit1.dist < hit2.dist ? { ...hit1, obj: this } : { ...hit2, obj: this };
    }
}

class Box extends Shape {
    constructor(pos, w, h, d, props) {
        super(props);
        this.pos = pos;
        this.w = w; this.h = h; this.d = d;
        this.createFaces();
    }
    
    createFaces() {
        const [x, y, z] = [this.w/2, this.h/2, this.d/2];
        const p = this.pos;
        
        this.faces = [
          
            new Rectangle([
                new Vector(-x, y, -z).add(p), new Vector(-x, y, z).add(p),
                new Vector(x, y, z).add(p), new Vector(x, y, -z).add(p)
            ], this.props),
            new Rectangle([
                new Vector(x, -y, -z).add(p), new Vector(x, -y, z).add(p),
                new Vector(-x, -y, z).add(p), new Vector(-x, -y, -z).add(p)
            ], this.props),
            new Rectangle([
                new Vector(-x, -y, z).add(p), new Vector(-x, y, z).add(p),
                new Vector(x, y, z).add(p), new Vector(x, -y, z).add(p)
            ], this.props),
            new Rectangle([
                new Vector(x, -y, -z).add(p), new Vector(x, y, -z).add(p),
                new Vector(-x, y, -z).add(p), new Vector(-x, -y, -z).add(p)
            ], this.props),
            new Rectangle([
                new Vector(-x, -y, -z).add(p), new Vector(-x, y, -z).add(p),
                new Vector(-x, y, z).add(p), new Vector(-x, -y, z).add(p)
            ], this.props),
            new Rectangle([
                new Vector(x, -y, z).add(p), new Vector(x, y, z).add(p),
                new Vector(x, y, -z).add(p), new Vector(x, -y, -z).add(p)
            ], this.props)
        ];
    }
    
    intersect(ray) {
        let closest = { hit: false, dist: Infinity };
        for (let face of this.faces) {
            const hit = face.intersect(ray);
            if (hit.hit && hit.dist < closest.dist) closest = hit;
        }
        closest.obj = this;
        return closest;
    }
}

class Color {
    constructor(r, g, b) {
        this.r = Math.max(0, Math.min(255, r));
        this.g = Math.max(0, Math.min(255, g));
        this.b = Math.max(0, Math.min(255, b));
    }
    
    mul(s) { return new Color(this.r * s, this.g * s, this.b * s); }
    add(c) { return new Color(this.r + c.r, this.g + c.g, this.b + c.b); }
}

class Vector {
    constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
    
    get length() { return Math.sqrt(this.x**2 + this.y**2 + this.z**2); }
    norm() { const l = this.length; return l > 0 ? new Vector(this.x/l, this.y/l, this.z/l) : this; }
    add(v) { return new Vector(this.x + v.x, this.y + v.y, this.z + v.z); }
    sub(v) { return new Vector(this.x - v.x, this.y - v.y, this.z - v.z); }
    mul(s) { return new Vector(this.x * s, this.y * s, this.z * s); }
    
    static dot(v1, v2) { return v1.x*v2.x + v1.y*v2.y + v1.z*v2.z; }
    static cross(v1, v2) { 
        return new Vector(
            v1.y*v2.z - v1.z*v2.y,
            v1.z*v2.x - v1.x*v2.z,
            v1.x*v2.y - v1.y*v2.x
        );
    }
    static add(v1, v2) { return v1.add(v2); }
    static sub(v1, v2) { return v1.sub(v2); }
    static mul(v, s) { return v.mul(s); }
}

const walls = [
    new Rectangle([
        new Vector(-10, -10, 20), new Vector(-10, -10, -20),
        new Vector(-10, 10, -20), new Vector(-10, 10, 20)
    ], { color: new Color(155, 0, 255), reflective: false, transparent: false }),
    
    new Rectangle([
        new Vector(10, -10, 20), new Vector(10, 10, 20),
        new Vector(10, 10, -20), new Vector(10, -10, -20)
    ], { color: new Color(50, 255, 50), reflective: false, transparent: false }),
    
    new Rectangle([
        new Vector(-10, 10, 20), new Vector(-10, 10, -20),
        new Vector(10, 10, -20), new Vector(10, 10, 20)
    ], { color: new Color(255, 250, 250), reflective: false, transparent: false }),
    
    new Rectangle([
        new Vector(-10, -10, 20), new Vector(10, -10, 20),
        new Vector(10, -10, -20), new Vector(-10, -10, -20)
    ], { color: new Color(220, 220, 220), reflective: false, transparent: false }),
    
    new Rectangle([
        new Vector(-10, -10, 20), new Vector(-10, 10, 20),
        new Vector(10, 10, 20), new Vector(10, -10, 20)
    ], { color: new Color(255, 100, 0), reflective: false, transparent: false }),
    
    new Rectangle([
        new Vector(-10, -10, -20), new Vector(10, -10, -20),
        new Vector(10, 10, -20), new Vector(-10, 10, -20)
    ], { color: new Color(0, 0, 0), reflective: false, transparent: false })
];

const spheres = [
    new Sphere(new Vector(-3, -1, 8), 1.5, { 
        color: new Color(255, 215, 0), reflective: false, transparent: false 
    }),
    new Sphere(new Vector(4, -4, 5), 1.8, { 
        color: new Color(255, 255, 255), reflective: false, transparent: false 
    })
];

const boxes = [
    new Box(new Vector(-3, -4, 5), 3, 2.5, 2, { 
        color: new Color(0, 150, 255), reflective: false, transparent: false 
    }),
    new Box(new Vector(3, -2, 7), 2.8, 2.8, 2.8, { 
        color: new Color(255, 100, 100), reflective: false, transparent: false 
    })
];

const extraLight = new Light(new Vector(0, -8, 5), 1);
const lights = [new Light(new Vector(0, 9, 5), 1)];
const scene = new Scene([...walls, ...spheres, ...boxes], lights, new Color(10, 10, 15));

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const W = 500, H = 500;
const DEPTH = 5;
const cam = new Camera(new Vector(0, 0, -3), Math.PI / 1.5);

function trace(ray, depth, skipObj = null) {
    if (depth <= 0) return scene.bg;
    
    let hit = null;
    let minDist = Infinity;
    
    for (let obj of scene.objects) {
        if (obj === skipObj) continue;
        const h = obj.intersect(ray);
        if (h.hit && h.dist < minDist) {
            hit = h;
            minDist = h.dist;
        }
    }
    
    if (!hit) return scene.bg;
    //Если в сцене несколько лампочек, мы будем прибавлять свет от каждой из них в эту переменную.
    let light = 0;
    for (let l of scene.lights) {
        //Это вектор направление к свету.
        const toLight = Vector.sub(l.pos, hit.point).norm();
        //расстояние от точки на объекте до лампочки.
        const distToLight = Vector.sub(l.pos, hit.point).length;
        //По умолчанию мы считаем, что точка освещена (тени нет), пока не докажем обратное.
        let inShadow = false;
        for (let obj of scene.objects) {
            if (obj === hit.obj) continue;
            //Мы выпускаем новый луч из точки, в которую попали (hit.point), и направляем его прямо в сторону лампочки (toLight).
            const shadow = obj.intersect(new Ray(hit.point, toLight));
            if (shadow.hit && shadow.dist < distToLight) {
                inShadow = true;
                break;
            }
        }
        //угол между поверхностью и светом. Если свет падает прямо (перпендикулярно), dot будет равен 1 (максимальная яркость).
        //Если свет скользит вдоль поверхности, dot будет равен 0.
        const dot = Math.max(0, Vector.dot(toLight, hit.normal));
        light += inShadow ? 0.5 * l.intensity * dot : l.intensity * dot;
    }
    //Это нужно для того, чтобы при добавлении новых источников сцена не становилась ослепительно белой. Яркость в тени не упадет ниже 0.3
    light = Math.max(0.3, light / scene.lights.length);
    let color = hit.obj.props.color.mul(light);
    
    if (hit.obj.props.reflective) {
        // Расчет направления отражения
        const reflDir = Vector.sub(ray.dir, Vector.mul(hit.normal, 2 * Vector.dot(ray.dir, hit.normal)));
        //цвет того, что находится «в зеркале».
        const reflColor = trace(new Ray(hit.point, reflDir), depth - 1, hit.obj);
        //Здесь мы берем собственный цвет объекта (например, серый металл) и добавляем к нему то, что «увидело» отражение. Чем больше «отскоков» сделал луч, тем слабее и тусклее становится отражение.
        color = color.add(reflColor.mul(depth / DEPTH / 2));
    }
    
    if (hit.obj.props.transparent) {
       //луч мог пройти сквозь объект, преломившись на границе сред.
       //Здесь мы вычисляем косинус угла падения.
        const cosi = -Math.max(-1, Math.min(1, Vector.dot(ray.dir, hit.normal)));
        let [eta1, eta2] = [1, 0.8];
        let n = hit.normal;
        //Значит cosi > 0 означает: ЛУЧ ВХОДИТ В ОБЪЕКТ
        //нормаль всегда смотрела НАВСТРЕЧУ лучу
        if (cosi < 0) { [eta1, eta2] = [eta2, eta1]; n = n.mul(-1); }
        //Отношение этих чисел определяет «силу» преломления.
        const eta = eta1 / eta2;
        //Если k < 0: Происходит полное внутреннее отражение.луч НЕ МОЖЕТ выйти из более плотной среды в менее плотную и полностью отражается обратно.
        const k = 1 - eta * eta * (1 - cosi * cosi);
        
        if (k >= 0) {
            //Программа берет входящий луч и «сгибает» его на границе сред.
            const refrDir = Vector.add(Vector.mul(ray.dir, eta), Vector.mul(n, eta * cosi - Math.sqrt(k)));
            const refrColor = trace(new Ray(hit.point, refrDir), depth - 1, hit.obj);
            color = color.add(refrColor.mul(depth / DEPTH / 2));
        }
    }
    
    return color;
}
function render() {
    const inputs = ['lx', 'ly', 'lz'];
    if (inputs.every(id => document.getElementById(id))) {
        extraLight.pos.x = parseFloat(document.getElementById('lx').value) || 0;
        extraLight.pos.y = parseFloat(document.getElementById('ly').value) || 0;
        extraLight.pos.z = parseFloat(document.getElementById('lz').value) || 0;
    }
    
    const imgData = ctx.createImageData(W, H);
    
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
           //Это координаты точки на виртуальном холсте, который находится на расстоянии 1 от камеры по оси $Z$.
            const sx = (2 * (x + 0.5) / W - 1) * Math.tan(cam.fov / 2) * (W / H);
            const sy = -(2 * (y + 0.5) / H - 1) * Math.tan(cam.fov / 2);
            const dir = new Vector(sx, sy, 1).norm();
            
            const color = trace(new Ray(cam.pos, dir), DEPTH);
            
            const idx = (y * W + x) * 4;
            imgData.data[idx] = color.r;
            imgData.data[idx + 1] = color.g;
            imgData.data[idx + 2] = color.b;
            imgData.data[idx + 3] = 255;
        }
    }
    
    ctx.putImageData(imgData, 0, 0);
}

function setupControl(name, obj) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
        radio.onchange = () => {
            obj.props.reflective = radio.value === 'reflective';
            obj.props.transparent = radio.value === 'transparent';
        };
    });
}

['leftwall','rightwall','upwall','downwall','frontwall','backwall'].forEach((n,i) => 
    setupControl(n, walls[i]));

setupControl('sphere1', spheres[0]);
setupControl('sphere2', spheres[1]);
setupControl('cube1', boxes[0]);
setupControl('cube2', boxes[1]);

document.getElementById('light1').onchange = function() {
    this.checked ? scene.add(extraLight) : scene.remove(extraLight);
};

document.getElementById('render').onclick = render;
