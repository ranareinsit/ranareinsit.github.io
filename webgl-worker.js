class WebGLMatrixRain {
    static VERTEX_SHADER = `
attribute vec4 aVertexPosition;
void main() {
gl_Position = aVertexPosition;
}
`;

    static FRAGMENT_SHADER = `
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;
uniform vec4 iDate;

#define R fract(1e2 * sin(p.x * 8.0 + p.y))

float rand(vec2 co) {
return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

float randomFloatInRange(float min, float max, vec2 seed) {
return min + rand(seed) * (max - min);
}

void mainImage(out vec4 o, vec2 u) {
float multiply = randomFloatInRange(990.9, 1010.1, gl_FragCoord.xy);
// float multiply = mix(990.9, 1010.1, smoothstep(0.0, 10.0, iTime));
multiply = iTime < 10.0 ? iTime * 100.0 : multiply;

vec3 v = vec3(u, 1) / iResolution - 0.5;
vec3 s = 0.2 / abs(v);
vec3 i = ceil(multiply * (s.z = min(s.y,s.x)) * (s.y < s.x ? v.xzz : v.zyz));
vec3 j = fract(i *= 0.09);
vec3 p = vec3(1, int(iTime * (30.0 * sin(i -= j).x)), 0) + i;

o -= o;
o.g = R / (s.z / (0.016 * 50.0)); // Fixed deltaTime approximation
o *= R > 0.9 && j.x < 0.2 ? 1.5 : 0.0;
}

void main() {
vec4 fragColor;
mainImage(fragColor, gl_FragCoord.xy);
gl_FragColor = fragColor;
}
`;

    constructor(canvas) {
        this.canvas = canvas;
        this.gl = this.initWebGLContext();
        this.program = null;
        this.buffers = null;
        this.uniforms = {};
        this.animationFrameId = null;
        this.startTime = null;

        this.init = this.init.bind(this);
        this.render = this.render.bind(this);

        // Initialize WebGL
        this.init();
    }

    initWebGLContext() {
        const gl = this.canvas.getContext('webgl') ||
            this.canvas.getContext('experimental-webgl');

        if (!gl) throw new Error('WebGL not supported');
        return gl;
    }

    compileShader(source, type) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error(`Shader compile error: ${this.gl.getShaderInfoLog(shader)}`);
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    initShaderProgram() {
        const vertexShader = this.compileShader(
            WebGLMatrixRain.VERTEX_SHADER,
            this.gl.VERTEX_SHADER
        );
        const fragmentShader = this.compileShader(
            WebGLMatrixRain.FRAGMENT_SHADER,
            this.gl.FRAGMENT_SHADER
        );

        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error(`Program link error: ${this.gl.getProgramInfoLog(program)}`);
            return null;
        }

        return program;
    }

    initBuffers() {
        const vertices = new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]);
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        return buffer;
    }

    initUniforms() {
        return {
            iTime: this.gl.getUniformLocation(this.program, 'iTime'),
            iResolution: this.gl.getUniformLocation(this.program, 'iResolution'),
            iMouse: this.gl.getUniformLocation(this.program, 'iMouse'),
            iDate: this.gl.getUniformLocation(this.program, 'iDate')
        };
    }

    addEventListeners() {
        window.addEventListener('resize', this.handleResize);
    }

    handleResize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
    }

    init() {
        try {
            this.program = this.initShaderProgram();
            this.buffers = this.initBuffers();
            this.uniforms = this.initUniforms();

            this.gl.useProgram(this.program);
            this.gl.enableVertexAttribArray(
                this.gl.getAttribLocation(this.program, 'aVertexPosition')
            );

            this.startTime = performance.now();
            this.render();
        } catch (error) {
            console.error('Initialization failed:', error);
        }
    }

    updateUniforms(time) {
        const res = [this.canvas.width, this.canvas.height, 1];
        this.gl.uniform3fv(this.uniforms.iResolution, res);
        this.gl.uniform1f(this.uniforms.iTime, time);
    }

    render() {
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers);
        this.gl.vertexAttribPointer(
            this.gl.getAttribLocation(this.program, 'aVertexPosition'),
            2,
            this.gl.FLOAT,
            false,
            0,
            0
        );

        const time = (performance.now() - this.startTime) * 0.001;
        this.updateUniforms(time);

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.animationFrameId = requestAnimationFrame(this.render);
    }

    destroy() {
        cancelAnimationFrame(this.animationFrameId);
        window.removeEventListener('resize', this.handleResize);
    }
}

let matrixRain;

// Web Worker message handler
onmessage = (e) => {
    const { canvas, type, width, height } = e.data;

    if (type === 'resize') {
        // Handle resize
        if (matrixRain) {
            matrixRain.handleResize(width, height);
        }
    } else {
        // Initialize WebGLMatrixRain
        matrixRain = new WebGLMatrixRain(canvas);
        matrixRain.init();
    }
};