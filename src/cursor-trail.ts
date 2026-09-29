import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IDisposable } from '@lumino/disposable';
import { normalizeAppearance } from './config-normalizers';

interface ISpark {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
}

const SPARK_LIFE = 0.5;
const MAX_SPARKS = 200;
/** Spawns at most one spark per this many pixels of cursor movement, so a
 * fast swipe doesn't flood the canvas. */
const MIN_SPAWN_DISTANCE = 14;

/**
 * A persistent trail of small accent-colored sparkles following the
 * cursor, on whenever `appearance.cursorTrail` is on. Independent of the
 * Events system's click-triggered animations.
 */
export class CursorTrail implements IDisposable {
  constructor(settings: ISettingRegistry.ISettings) {
    this._settings = settings;
    this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._settings.changed.connect(this._onSettingsChanged, this);
    this._onSettingsChanged();
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._settings.changed.disconnect(this._onSettingsChanged, this);
    this._stop();
  }

  private _onSettingsChanged(): void {
    const appearance = normalizeAppearance(
      this._settings.get('appearance').composite
    );
    const enabled = appearance.cursorTrail && !this._reducedMotion.matches;
    if (enabled && !this._canvas) {
      this._start();
    } else if (!enabled && this._canvas) {
      this._stop();
    }
  }

  private _start(): void {
    const canvas = document.createElement('canvas');
    canvas.className = 'jp-neptuneatelier-CursorTrailCanvas';
    document.body.appendChild(canvas);
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', this._onResize);
    document.addEventListener('pointermove', this._onPointerMove, {
      passive: true
    });
    this._lastTime = null;
    this._frame = requestAnimationFrame(this._tick);
  }

  private _stop(): void {
    if (this._frame !== null) {
      cancelAnimationFrame(this._frame);
      this._frame = null;
    }
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('pointermove', this._onPointerMove);
    this._canvas?.remove();
    this._canvas = null;
    this._ctx = null;
    this._sparks = [];
  }

  private _resize = (): void => {
    if (!this._canvas || !this._ctx) {
      return;
    }
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    this._canvas.width = Math.round(window.innerWidth * ratio);
    this._canvas.height = Math.round(window.innerHeight * ratio);
    this._ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  private _onResize = (): void => this._resize();

  private _onPointerMove = (event: PointerEvent): void => {
    const dx = event.clientX - this._lastSpawn.x;
    const dy = event.clientY - this._lastSpawn.y;
    if (dx * dx + dy * dy < MIN_SPAWN_DISTANCE * MIN_SPAWN_DISTANCE) {
      return;
    }
    this._lastSpawn = { x: event.clientX, y: event.clientY };
    if (this._sparks.length < MAX_SPARKS) {
      this._sparks.push({
        x: event.clientX,
        y: event.clientY,
        life: SPARK_LIFE,
        maxLife: SPARK_LIFE,
        size: 1.5 + Math.random() * 2
      });
    }
  };

  private _tick = (now: number): void => {
    const ctx = this._ctx;
    if (!ctx) {
      return;
    }
    const dt =
      this._lastTime === null
        ? 1 / 60
        : Math.min(0.05, (now - this._lastTime) / 1000);
    this._lastTime = now;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue('--jp-brand-color1')
      .trim();
    ctx.fillStyle = color || '#8ab4ff';
    const alive: ISpark[] = [];
    for (const spark of this._sparks) {
      spark.life -= dt;
      if (spark.life <= 0) {
        continue;
      }
      alive.push(spark);
      ctx.globalAlpha = spark.life / spark.maxLife;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    this._sparks = alive;
    this._frame = requestAnimationFrame(this._tick);
  };

  private _settings: ISettingRegistry.ISettings;
  private _reducedMotion: MediaQueryList;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _sparks: ISpark[] = [];
  private _lastSpawn = { x: -1000, y: -1000 };
  private _frame: number | null = null;
  private _lastTime: number | null = null;
  private _isDisposed = false;
}
