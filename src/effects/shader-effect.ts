import { parseColor } from '../color-values';
import { IEffectLayer, IShaderConfig, ShaderPreset } from '../types';
import { AnimationLoop, IEffect, isRendered } from './animation-loop';
import { fragmentShaderFor, VERTEX_SHADER } from './shader-sources';

type Vec3 = [number, number, number];

interface IUniforms {
  time: WebGLUniformLocation | null;
  resolution: WebGLUniformLocation | null;
  color1: WebGLUniformLocation | null;
  color2: WebGLUniformLocation | null;
  color3: WebGLUniformLocation | null;
  intensity: WebGLUniformLocation | null;
}

function toVec3(color: string): Vec3 {
  const parsed = parseColor(color) ?? { r: 0, g: 0, b: 0, a: 1 };
  return [parsed.r / 255, parsed.g / 255, parsed.b / 255];
}

/**
 * A full-screen WebGL fragment shader. Renders at a configurable fraction
 * of screen resolution (the result is upscaled by the browser) to keep GPU
 * cost low. Recovers from WebGL context loss, which happens on GPU resets
 * or laptop GPU switching, and releases every GPU resource on dispose.
 */
export class ShaderEffect implements IEffect {
  constructor(host: HTMLElement, layer: IEffectLayer) {
    this._host = host;
    this._canvas = document.createElement('canvas');
    this._canvas.className = 'jp-neptuneatelier-EffectCanvas';
    const gl = this._canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false
    });
    if (!gl) {
      throw new Error('neptuneatelier: WebGL is unavailable');
    }
    this._gl = gl;
    host.appendChild(this._canvas);
    this._config = layer.shader;
    this._loop = new AnimationLoop(
      dt => this._draw(dt),
      () => isRendered(host)
    );
    this._canvas.addEventListener('webglcontextlost', this._onContextLost);
    this._canvas.addEventListener(
      'webglcontextrestored',
      this._onContextRestored
    );
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(host);
    this._initResources();
    this.update(layer);
    this._loop.start();
  }

  update(layer: IEffectLayer): void {
    const previous = this._config;
    this._config = layer.shader;
    this._loop.maxFps = layer.maxFps;
    this._colors = [
      toVec3(this._config.color1),
      toVec3(this._config.color2),
      toVec3(this._config.color3)
    ];
    if (this._program === null || previous.preset !== this._config.preset) {
      this._buildProgram(this._config.preset);
    }
    this._resize();
    if (!this._loop.animating) {
      this._loop.renderStill();
    }
  }

  setBoost(factor: number): void {
    this._boost = factor;
  }

  dispose(): void {
    this._loop.dispose();
    this._resizeObserver.disconnect();
    this._canvas.removeEventListener('webglcontextlost', this._onContextLost);
    this._canvas.removeEventListener(
      'webglcontextrestored',
      this._onContextRestored
    );
    this._releaseResources();
    this._gl.getExtension('WEBGL_lose_context')?.loseContext();
    this._canvas.remove();
  }

  private _initResources(): void {
    const gl = this._gl;
    this._buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    // One triangle that covers the whole viewport.
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    this._buildProgram(this._config.preset);
  }

  private _releaseResources(): void {
    const gl = this._gl;
    if (this._program) {
      gl.deleteProgram(this._program);
      this._program = null;
    }
    if (this._buffer) {
      gl.deleteBuffer(this._buffer);
      this._buffer = null;
    }
  }

  private _compile(type: number, source: string): WebGLShader | null {
    const gl = this._gl;
    const shader = gl.createShader(type);
    if (!shader) {
      return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(
        'neptuneatelier: shader compile failed',
        gl.getShaderInfoLog(shader)
      );
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private _buildProgram(preset: ShaderPreset): void {
    const gl = this._gl;
    if (gl.isContextLost()) {
      return;
    }
    const vertex = this._compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = this._compile(
      gl.FRAGMENT_SHADER,
      fragmentShaderFor(preset)
    );
    if (!vertex || !fragment) {
      return;
    }
    const program = gl.createProgram();
    if (!program) {
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    // Shaders are no longer needed once linked into the program.
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(
        'neptuneatelier: shader link failed',
        gl.getProgramInfoLog(program)
      );
      gl.deleteProgram(program);
      return;
    }
    if (this._program) {
      gl.deleteProgram(this._program);
    }
    this._program = program;
    this._uniforms = {
      time: gl.getUniformLocation(program, 'u_time'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      color1: gl.getUniformLocation(program, 'u_color1'),
      color2: gl.getUniformLocation(program, 'u_color2'),
      color3: gl.getUniformLocation(program, 'u_color3'),
      intensity: gl.getUniformLocation(program, 'u_intensity')
    };
    const position = gl.getAttribLocation(program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  }

  private _resize(): void {
    const scale = this._config.resolution;
    const width = Math.max(1, Math.round(this._host.clientWidth * scale));
    const height = Math.max(1, Math.round(this._host.clientHeight * scale));
    if (this._canvas.width !== width || this._canvas.height !== height) {
      this._canvas.width = width;
      this._canvas.height = height;
      if (!this._loop.animating) {
        this._loop.renderStill();
      }
    }
  }

  private _draw(dt: number): void {
    const gl = this._gl;
    const uniforms = this._uniforms;
    if (!this._program || !uniforms || gl.isContextLost()) {
      return;
    }
    this._time += dt * this._config.speed * this._boost;
    gl.viewport(0, 0, this._canvas.width, this._canvas.height);
    gl.useProgram(this._program);
    gl.uniform1f(uniforms.time, this._time);
    gl.uniform2f(uniforms.resolution, this._canvas.width, this._canvas.height);
    gl.uniform3fv(uniforms.color1, this._colors[0]);
    gl.uniform3fv(uniforms.color2, this._colors[1]);
    gl.uniform3fv(uniforms.color3, this._colors[2]);
    // A boost also brightens, but less than it speeds up.
    gl.uniform1f(
      uniforms.intensity,
      this._config.intensity * (1 + (this._boost - 1) * 0.35)
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private _onContextLost = (event: Event): void => {
    // Signals that we intend to handle restoration.
    event.preventDefault();
    this._program = null;
    this._buffer = null;
    this._uniforms = null;
  };

  private _onContextRestored = (): void => {
    this._initResources();
    this._loop.renderStill();
  };

  private _host: HTMLElement;
  private _canvas: HTMLCanvasElement;
  private _gl: WebGLRenderingContext;
  private _config: IShaderConfig;
  private _loop: AnimationLoop;
  private _resizeObserver: ResizeObserver;
  private _program: WebGLProgram | null = null;
  private _buffer: WebGLBuffer | null = null;
  private _uniforms: IUniforms | null = null;
  private _colors: [Vec3, Vec3, Vec3] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  private _time = 0;
  private _boost = 1;
}
