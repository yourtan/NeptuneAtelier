import { parseColor } from '../color-values';
import {
  IEffectLayer,
  IImageStore,
  IParticlesConfig,
  ParticleShape
} from '../types';
import { AnimationLoop, IEffect, isRendered } from './animation-loop';

/** Characters used by the "falling characters" shape, mixing katakana (for
 * the classic digital-rain look) with digits. */
const RAIN_CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';

interface IParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  /** Random phase offset for this particle's twinkle cycle. */
  phase: number;
  /** Current rotation, radians. */
  rotation: number;
  /** Random 0–1 position between `color` and `colorBlend`, fixed at spawn. */
  blendT: number;
  /** Cached "r, g, b" for `blendT`, refreshed whenever the config changes. */
  rgb: string;
  /** Fixed at spawn, for the `char` shape. */
  char: string;
}

/** Twinkle cycles per second. */
const TWINKLE_RATE = 2;

/** Base drift speed in CSS pixels per second, before the speed multiplier. */
const BASE_SPEED = 24;
/** Base spin speed in radians per second, before the spin multiplier. */
const SPIN_SPEED = Math.PI;
/** Max blur radius (px) at glow = 1. */
const MAX_GLOW_BLUR = 14;
const MAX_PIXEL_RATIO = 2;

/**
 * Drifting particles on a 2D canvas, optionally linked by lines when close
 * together ("constellation" style) and gently pushed away from the cursor.
 */
export class ParticlesEffect implements IEffect {
  constructor(host: HTMLElement, layer: IEffectLayer, images?: IImageStore) {
    this._host = host;
    this._images = images ?? null;
    this._canvas = document.createElement('canvas');
    this._canvas.className = 'jp-neptuneatelier-EffectCanvas';
    host.appendChild(this._canvas);
    const ctx = this._canvas.getContext('2d');
    if (!ctx) {
      this._canvas.remove();
      throw new Error('neptuneatelier: 2D canvas is unavailable');
    }
    this._ctx = ctx;
    this._config = layer.particles;
    this._loop = new AnimationLoop(
      dt => this._draw(dt),
      () => isRendered(host)
    );
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(host);
    window.addEventListener('pointermove', this._onPointerMove, {
      passive: true
    });
    document.addEventListener('pointerleave', this._onPointerLeave);
    this._resize();
    this.update(layer);
    this._loop.start();
  }

  update(layer: IEffectLayer): void {
    this._config = layer.particles;
    this._loop.maxFps = layer.maxFps;
    this._rgb = this._parseRgb(this._config.color);
    this._rgbA = this._parseComponents(this._config.color);
    this._rgbB = this._config.colorBlend
      ? this._parseComponents(this._config.colorBlend)
      : this._rgbA;
    this._syncImage();
    this._syncCount();
    for (const particle of this._particles) {
      particle.radius = this._randomRadius();
      particle.rgb = this._blendedRgb(particle.blendT);
    }
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
    window.removeEventListener('pointermove', this._onPointerMove);
    document.removeEventListener('pointerleave', this._onPointerLeave);
    this._canvas.remove();
  }

  private _parseRgb(color: string): string {
    const c = this._parseComponents(color);
    return `${c.r}, ${c.g}, ${c.b}`;
  }

  private _parseComponents(color: string): {
    r: number;
    g: number;
    b: number;
  } {
    const parsed = parseColor(color) ?? { r: 138, g: 180, b: 255, a: 1 };
    return {
      r: Math.round(parsed.r),
      g: Math.round(parsed.g),
      b: Math.round(parsed.b)
    };
  }

  /** The "r, g, b" for a particle whose blend position is `t` (0 = base
   * color, 1 = `colorBlend`). */
  private _blendedRgb(t: number): string {
    const a = this._rgbA;
    const b = this._rgbB;
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return `${r}, ${g}, ${bl}`;
  }

  private _randomRadius(): number {
    const spread = this._config.sizeVariation;
    return this._config.size * (1 - spread + Math.random() * spread * 2);
  }

  /** Loads (or clears) the image for the `image` shape when the config's
   * `imageRef` changes. Async and best-effort: a generation counter drops
   * a load that's superseded by a newer one before it resolves. */
  private _syncImage(): void {
    if (this._config.imageRef === this._imageRef) {
      return;
    }
    this._imageRef = this._config.imageRef;
    this._particleImage = null;
    if (!this._imageRef || !this._images) {
      return;
    }
    const generation = ++this._imageGeneration;
    void this._images.fetchImage(this._imageRef).then(dataUrl => {
      if (!dataUrl || generation !== this._imageGeneration) {
        return;
      }
      const image = new Image();
      image.onload = () => {
        if (generation === this._imageGeneration) {
          this._particleImage = image;
        }
      };
      image.src = dataUrl;
    });
  }

  /** Where a new (or respawning) particle starts, per the emitter setting. */
  private _spawnPosition(): { x: number; y: number } {
    switch (this._config.emitter) {
      case 'cursor':
        return this._pointer ?? { x: this._width / 2, y: this._height / 2 };
      case 'edges': {
        const w = this._width;
        const h = this._height;
        switch (Math.floor(Math.random() * 4)) {
          case 0:
            return { x: Math.random() * w, y: 0 };
          case 1:
            return { x: w, y: Math.random() * h };
          case 2:
            return { x: Math.random() * w, y: h };
          default:
            return { x: 0, y: Math.random() * h };
        }
      }
      case 'center':
        return { x: this._width / 2, y: this._height / 2 };
      case 'screen':
      default:
        return {
          x: Math.random() * this._width,
          y: Math.random() * this._height
        };
    }
  }

  private _spawn(): IParticle {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 0.7;
    const blendT = Math.random();
    const spawn = this._spawnPosition();
    return {
      x: spawn.x,
      y: spawn.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: this._randomRadius(),
      phase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      blendT,
      rgb: this._blendedRgb(blendT),
      char: RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)]
    };
  }

  private _syncCount(): void {
    const target = Math.round(this._config.count);
    while (this._particles.length < target) {
      this._particles.push(this._spawn());
    }
    this._particles.length = target;
  }

  private _resize(): void {
    this._width = Math.max(1, this._host.clientWidth);
    this._height = Math.max(1, this._host.clientHeight);
    const ratio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
    this._canvas.width = Math.round(this._width * ratio);
    this._canvas.height = Math.round(this._height * ratio);
    this._ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    for (const particle of this._particles) {
      particle.x = Math.min(particle.x, this._width);
      particle.y = Math.min(particle.y, this._height);
    }
    if (!this._loop.animating) {
      this._loop.renderStill();
    }
  }

  private _draw(dt: number): void {
    const ctx = this._ctx;
    const config = this._config;
    const width = this._width;
    const height = this._height;
    const step = dt * BASE_SPEED * config.speed * this._boost;
    const repelRadius = config.linkDistance;
    const gravityStep = dt * BASE_SPEED * config.gravity;
    const spinStep = dt * SPIN_SPEED * config.spin;
    this._time += dt;

    if (config.trail > 0) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0, 0, 0, ${(1 - config.trail * 0.9).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    for (const p of this._particles) {
      if (config.mouse && this._pointer) {
        const dx = p.x - this._pointer.x;
        const dy = p.y - this._pointer.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < repelRadius * repelRadius && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const push = (1 - dist / repelRadius) * 60 * dt;
          p.x += (dx / dist) * push;
          p.y += (dy / dist) * push;
        }
      }
      p.x += p.vx * step;
      p.y += p.vy * step + gravityStep;
      p.rotation += spinStep;
      const offscreen =
        p.x < -10 || p.x > width + 10 || p.y < -10 || p.y > height + 10;
      if (offscreen) {
        if (config.emitter === 'screen') {
          if (p.x < -10) {
            p.x = width + 10;
          } else if (p.x > width + 10) {
            p.x = -10;
          }
          if (p.y < -10) {
            p.y = height + 10;
          } else if (p.y > height + 10) {
            p.y = -10;
          }
        } else {
          const spawn = this._spawnPosition();
          p.x = spawn.x;
          p.y = spawn.y;
        }
      }
    }

    if (config.links) {
      const maxDist = config.linkDistance;
      const maxDistSq = maxDist * maxDist;
      ctx.lineWidth = 1;
      const particles = this._particles;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxDistSq) {
            const alpha = (1 - Math.sqrt(distSq) / maxDist) * 0.5;
            ctx.strokeStyle = `rgba(${this._rgb}, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    const useBlend = config.colorBlend !== '';
    ctx.fillStyle = `rgb(${this._rgb})`;
    for (const p of this._particles) {
      const rgb = useBlend ? p.rgb : this._rgb;
      if (useBlend) {
        ctx.fillStyle = `rgb(${rgb})`;
      }
      const twinkleAlpha = config.twinkle
        ? 0.35 +
          0.65 *
            (0.5 +
              0.5 * Math.sin(this._time * TWINKLE_RATE * Math.PI * 2 + p.phase))
        : 1;
      ctx.globalAlpha = config.opacity * twinkleAlpha;
      if (config.glow > 0) {
        ctx.shadowBlur = config.glow * MAX_GLOW_BLUR;
        ctx.shadowColor = `rgb(${rgb})`;
      }
      this._drawShape(p, config.shape);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private _drawShape(p: IParticle, shape: ParticleShape): void {
    const ctx = this._ctx;
    if (this._config.imageRef && this._particleImage) {
      const size = p.radius * 2.4;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.drawImage(this._particleImage, -size / 2, -size / 2, size, size);
      ctx.restore();
      return;
    }
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (shape === 'char') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.font = `${(p.radius * 2.6).toFixed(1)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.char, 0, 0);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.beginPath();
    switch (shape) {
      case 'square': {
        const side = p.radius * 1.8;
        ctx.rect(-side / 2, -side / 2, side, side);
        break;
      }
      case 'triangle': {
        const r = p.radius * 1.8;
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.87, r * 0.5);
        ctx.lineTo(-r * 0.87, r * 0.5);
        ctx.closePath();
        break;
      }
      case 'star': {
        const outer = p.radius * 2;
        const inner = p.radius * 0.85;
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          const r = i % 2 === 0 ? outer : inner;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        break;
      }
    }
    ctx.fill();
    ctx.restore();
  }

  private _onPointerMove = (event: PointerEvent): void => {
    const rect = this._canvas.getBoundingClientRect();
    this._pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  private _onPointerLeave = (): void => {
    this._pointer = null;
  };

  private _host: HTMLElement;
  private _images: IImageStore | null;
  private _imageRef = '';
  private _particleImage: HTMLImageElement | null = null;
  private _imageGeneration = 0;
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _config: IParticlesConfig;
  private _loop: AnimationLoop;
  private _resizeObserver: ResizeObserver;
  private _particles: IParticle[] = [];
  private _pointer: { x: number; y: number } | null = null;
  private _boost = 1;
  private _rgb = '138, 180, 255';
  private _rgbA = { r: 138, g: 180, b: 255 };
  private _rgbB = { r: 138, g: 180, b: 255 };
  private _width = 1;
  private _height = 1;
  private _time = 0;
}
