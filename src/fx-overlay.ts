import { IDisposable } from '@lumino/disposable';

export type FxAction =
  | 'confetti'
  | 'fireworks'
  | 'sparkles'
  | 'shockwave'
  | 'flash'
  | 'shake'
  | 'glow'
  | 'typing-animation';

export interface IFxOptions {
  /** Palette to draw from (at least one color). */
  colors: string[];
  /** Size/amount multiplier, around 0.25–3. */
  size: number;
  /** Element to shake or glow, when the action applies to one. */
  target?: Element | null;
  /** Text to type out, for `typing-animation`. */
  text?: string;
}

export interface IPoint {
  x: number;
  y: number;
}

type Shape = 'confetti' | 'dot' | 'spark' | 'star' | 'ring' | 'rocket';

interface IFxParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: Shape;
  rotation: number;
  spin: number;
  gravity: number;
  /** Fraction of velocity kept per 1/60 s. */
  drag: number;
  /** Additive ("glowing") blending instead of normal painting. */
  glow: boolean;
  onExpire?: (particle: IFxParticle) => void;
}

/** Keeps a burst of typing sparks from ever piling up. */
const MAX_PARTICLES = 1500;
const MAX_PIXEL_RATIO = 2;

function random(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Plays short celebratory/feedback animations over the whole interface:
 * particle bursts on a click-through full-screen canvas (only animating
 * while particles are alive), plus a screen flash and element shake/glow
 * done with CSS classes. Everything is skipped when the user has asked
 * for reduced motion.
 */
export class FxOverlay implements IDisposable {
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    if (this._frame !== null) {
      cancelAnimationFrame(this._frame);
    }
    window.removeEventListener('resize', this._onResize);
    this._canvas?.remove();
    this._particles = [];
  }

  /**
   * Plays an animation.
   * @param action - which animation
   * @param point - where, in viewport coordinates
   * @param options - colors, size, and the element to shake/glow
   */
  play(action: FxAction, point: IPoint, options: IFxOptions): void {
    if (this._isDisposed || this._reducedMotion.matches) {
      return;
    }
    const colors = options.colors.length > 0 ? options.colors : ['#ffffff'];
    const size = Math.max(0.25, options.size);
    switch (action) {
      case 'confetti':
        this._confetti(point, colors, size);
        break;
      case 'fireworks':
        this._fireworks(point, colors, size);
        break;
      case 'sparkles':
        this._sparkles(point, colors, size);
        break;
      case 'shockwave':
        this._shockwave(point, colors, size);
        break;
      case 'flash':
        this._flash(colors[0], size);
        return;
      case 'shake':
        this._animateElement(options.target, 'jp-neptuneatelier-fx-shake', 450);
        return;
      case 'glow':
        this._animateElement(
          options.target,
          'jp-neptuneatelier-fx-glow',
          900,
          colors[0]
        );
        return;
      case 'typing-animation':
        this._typingAnimation(point, options.text ?? '', colors[0], size);
        return;
    }
    this._start();
  }

  private _add(particle: IFxParticle): void {
    if (this._particles.length < MAX_PARTICLES) {
      this._particles.push(particle);
    }
  }

  private _base(
    point: IPoint,
    changes: Partial<IFxParticle> & Pick<IFxParticle, 'shape' | 'color'>
  ): IFxParticle {
    const life = changes.life ?? 1;
    return {
      x: point.x,
      y: point.y,
      vx: 0,
      vy: 0,
      life,
      maxLife: life,
      size: 3,
      rotation: 0,
      spin: 0,
      gravity: 0,
      drag: 1,
      glow: false,
      ...changes
    };
  }

  private _confetti(point: IPoint, colors: string[], size: number): void {
    const count = Math.round(70 * size);
    for (let i = 0; i < count; i++) {
      const angle = random(-Math.PI * 0.85, -Math.PI * 0.15);
      const speed = random(280, 720) * Math.sqrt(size);
      const life = random(1.6, 2.6);
      this._add(
        this._base(point, {
          shape: 'confetti',
          color: pick(colors),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life,
          maxLife: life,
          size: random(5, 9),
          rotation: random(0, Math.PI * 2),
          spin: random(-12, 12),
          gravity: 900,
          drag: 0.975
        })
      );
    }
  }

  private _burst(
    point: IPoint,
    colors: string[],
    size: number,
    count: number
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = random(0, Math.PI * 2);
      const speed = random(120, 420) * Math.sqrt(size);
      const life = random(0.9, 1.6);
      this._add(
        this._base(point, {
          shape: 'spark',
          color: pick(colors),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life,
          maxLife: life,
          size: random(1.5, 3),
          gravity: 260,
          drag: 0.965,
          glow: true
        })
      );
    }
  }

  private _fireworks(point: IPoint, colors: string[], size: number): void {
    const rockets = Math.max(1, Math.round(2 + size));
    const bottom = window.innerHeight + 10;
    for (let i = 0; i < rockets; i++) {
      const target = {
        x: point.x + random(-180, 180) * size,
        y: point.y + random(-90, 60)
      };
      const flight = random(0.7, 1.1);
      const start = { x: target.x + random(-60, 60), y: bottom };
      this._add(
        this._base(start, {
          shape: 'rocket',
          color: pick(colors),
          vx: (target.x - start.x) / flight,
          vy: (target.y - start.y) / flight,
          life: flight + i * 0.25,
          maxLife: flight + i * 0.25,
          size: 2.5,
          glow: true,
          onExpire: rocket =>
            this._burst(
              { x: rocket.x, y: rocket.y },
              colors,
              size,
              Math.round(60 * size)
            )
        })
      );
    }
  }

  private _sparkles(point: IPoint, colors: string[], size: number): void {
    const count = Math.round(16 * size + 4);
    for (let i = 0; i < count; i++) {
      const angle = random(0, Math.PI * 2);
      const speed = random(60, 240) * Math.sqrt(size);
      const life = random(0.35, 0.8);
      this._add(
        this._base(point, {
          shape: Math.random() < 0.35 ? 'star' : 'spark',
          color: pick(colors),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 40,
          life,
          maxLife: life,
          size: random(1.5, 3.5) * Math.sqrt(size),
          gravity: 220,
          drag: 0.94,
          glow: true
        })
      );
    }
  }

  private _shockwave(point: IPoint, colors: string[], size: number): void {
    for (let i = 0; i < 2; i++) {
      this._add(
        this._base(point, {
          shape: 'ring',
          color: colors[i % colors.length],
          life: 0.65 + i * 0.15,
          maxLife: 0.65 + i * 0.15,
          // For rings, `size` is the final radius.
          size: (140 + i * 50) * size,
          glow: true
        })
      );
    }
  }

  private _flash(color: string, size: number): void {
    const flash = document.createElement('div');
    flash.className = 'jp-neptuneatelier-FxFlash';
    flash.style.background = color;
    flash.style.setProperty(
      '--jp-neptuneatelier-fx-strength',
      String(Math.min(0.85, 0.35 * size))
    );
    flash.addEventListener('animationend', () => flash.remove());
    document.body.appendChild(flash);
    // Safety net if the animation never runs (e.g. hidden tab).
    window.setTimeout(() => flash.remove(), 1000);
  }

  private _animateElement(
    target: Element | null | undefined,
    className: string,
    duration: number,
    color?: string
  ): void {
    if (!(target instanceof HTMLElement)) {
      return;
    }
    target.classList.remove(className);
    if (color) {
      target.style.setProperty('--jp-neptuneatelier-fx-color', color);
    }
    // Force a reflow so re-adding the class restarts the animation.
    void target.offsetWidth;
    target.classList.add(className);
    window.setTimeout(() => target.classList.remove(className), duration);
  }

  /**
   * Types out `text` character by character in a floating label at `point`,
   * with a blinking cursor, then removes itself.
   */
  private _typingAnimation(
    point: IPoint,
    text: string,
    color: string,
    size: number
  ): void {
    const content = text.trim() || 'Hello!';
    const el = document.createElement('div');
    el.className = 'jp-neptuneatelier-FxTypewriter';
    el.style.left = `${point.x}px`;
    el.style.top = `${point.y}px`;
    el.style.color = color;
    el.style.fontSize = `${(1.4 * size).toFixed(2)}rem`;
    const textSpan = document.createElement('span');
    const cursorSpan = document.createElement('span');
    cursorSpan.className = 'jp-neptuneatelier-FxTypewriterCursor';
    cursorSpan.textContent = '|';
    el.appendChild(textSpan);
    el.appendChild(cursorSpan);
    document.body.appendChild(el);

    const charDelay = Math.max(30, 1800 / content.length);
    let shown = 0;
    const interval = window.setInterval(() => {
      shown += 1;
      textSpan.textContent = content.slice(0, shown);
      if (shown >= content.length) {
        window.clearInterval(interval);
        window.setTimeout(() => el.remove(), 1400);
      }
    }, charDelay);
  }

  private _ensureCanvas(): CanvasRenderingContext2D | null {
    if (this._ctx && this._canvas?.isConnected) {
      return this._ctx;
    }
    const canvas = document.createElement('canvas');
    canvas.className = 'jp-neptuneatelier-FxCanvas';
    document.body.appendChild(canvas);
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    window.addEventListener('resize', this._onResize);
    this._onResize();
    return this._ctx;
  }

  private _onResize = (): void => {
    if (!this._canvas || !this._ctx) {
      return;
    }
    const ratio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
    this._canvas.width = Math.round(window.innerWidth * ratio);
    this._canvas.height = Math.round(window.innerHeight * ratio);
    this._ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  private _start(): void {
    if (this._frame === null && this._ensureCanvas()) {
      this._lastTime = null;
      this._frame = requestAnimationFrame(this._tick);
    }
  }

  private _tick = (now: number): void => {
    this._frame = null;
    const ctx = this._ctx;
    if (!ctx) {
      return;
    }
    const dt =
      this._lastTime === null
        ? 1 / 60
        : Math.min(0.05, (now - this._lastTime) / 1000);
    this._lastTime = now;

    const alive: IFxParticle[] = [];
    const expired: IFxParticle[] = [];
    for (const p of this._particles) {
      p.life -= dt;
      if (p.life <= 0) {
        expired.push(p);
        continue;
      }
      const drag = Math.pow(p.drag, dt * 60);
      p.vx *= drag;
      p.vy = p.vy * drag + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
      alive.push(p);
    }
    this._particles = alive;
    for (const p of expired) {
      p.onExpire?.(p);
    }

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of this._particles) {
      this._draw(ctx, p);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (this._particles.length > 0 && !this._isDisposed) {
      this._frame = requestAnimationFrame(this._tick);
    }
  };

  private _draw(ctx: CanvasRenderingContext2D, p: IFxParticle): void {
    const t = p.life / p.maxLife;
    ctx.globalCompositeOperation = p.glow ? 'lighter' : 'source-over';
    ctx.globalAlpha = p.shape === 'confetti' ? Math.min(1, t * 3) : t;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    switch (p.shape) {
      case 'confetti':
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        // Squash vertically as it spins, like a tumbling paper strip.
        ctx.scale(1, Math.abs(Math.cos(p.rotation * 1.7)) * 0.8 + 0.2);
        ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
        ctx.restore();
        break;
      case 'spark':
      case 'rocket': {
        const trail = p.shape === 'rocket' ? 0.06 : 0.035;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * trail, p.y - p.vy * trail);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        break;
      }
      case 'star': {
        const r = p.size * 2.2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r);
        ctx.lineTo(p.x + r * 0.25, p.y - r * 0.25);
        ctx.lineTo(p.x + r, p.y);
        ctx.lineTo(p.x + r * 0.25, p.y + r * 0.25);
        ctx.lineTo(p.x, p.y + r);
        ctx.lineTo(p.x - r * 0.25, p.y + r * 0.25);
        ctx.lineTo(p.x - r, p.y);
        ctx.lineTo(p.x - r * 0.25, p.y - r * 0.25);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'ring': {
        const progress = 1 - t;
        const eased = 1 - Math.pow(1 - progress, 3);
        ctx.lineWidth = Math.max(0.5, 6 * t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * eased, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      default:
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
  }

  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _particles: IFxParticle[] = [];
  private _frame: number | null = null;
  private _lastTime: number | null = null;
  private _reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );
  private _isDisposed = false;
}
