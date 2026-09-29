import { IEffectLayer } from '../types';

/** A live, animated effect (one instance of an effect layer). */
export interface IEffect {
  /** Applies new settings without restarting the effect. */
  update(layer: IEffectLayer): void;
  /**
   * Temporarily multiplies the effect's energy (speed, brightness), e.g.
   * for an event-driven pulse. 1 is normal.
   */
  setBoost(factor: number): void;
  dispose(): void;
}

const HIDDEN_RECHECK_MS = 500;

/** Whether an element is currently rendered (not inside `display: none`). */
export function isRendered(element: HTMLElement): boolean {
  return element.isConnected && element.getClientRects().length > 0;
}

/**
 * Drives a render callback with `requestAnimationFrame`, throttled to a
 * frame-rate cap. Pauses entirely while the browser tab is hidden, and
 * renders single still frames instead of animating when the user has
 * requested reduced motion at the OS level.
 */
export class AnimationLoop {
  /**
   * @param render - draws one frame; `dt` is seconds since the last frame
   *   (0 for still frames)
   * @param isVisible - whether there's anything to draw into right now
   *   (e.g. false for an effect inside a background tab); while false,
   *   rendering pauses and visibility is re-checked twice a second
   */
  constructor(render: (dt: number) => void, isVisible?: () => boolean) {
    this._render = render;
    this._isVisible = isVisible ?? (() => true);
    this._motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    this._motionQuery.addEventListener('change', this._onMotionChange);
  }

  set maxFps(value: number) {
    this._maxFps = Math.max(1, value);
  }

  /** Whether frames are currently animating (vs. paused or still). */
  get animating(): boolean {
    return this._running && !document.hidden && !this._motionQuery.matches;
  }

  start(): void {
    this._running = true;
    if (this.animating) {
      this._schedule();
    } else {
      this.renderStill();
    }
  }

  /** Draws one frame without advancing time, e.g. after a settings change
   * while paused. */
  renderStill(): void {
    this._render(0);
  }

  dispose(): void {
    this._running = false;
    this._cancel();
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    this._motionQuery.removeEventListener('change', this._onMotionChange);
  }

  private _schedule(): void {
    if (this._frame === null && this.animating) {
      this._frame = requestAnimationFrame(this._tick);
    }
  }

  private _cancel(): void {
    if (this._frame !== null) {
      cancelAnimationFrame(this._frame);
      this._frame = null;
    }
    window.clearTimeout(this._hiddenTimer);
    this._lastTime = null;
  }

  private _tick = (now: number): void => {
    this._frame = null;
    if (!this._isVisible()) {
      this._lastTime = null;
      this._hiddenTimer = window.setTimeout(
        () => this._schedule(),
        HIDDEN_RECHECK_MS
      );
      return;
    }
    const minInterval = 1000 / this._maxFps;
    if (this._lastTime !== null && now - this._lastTime < minInterval - 1) {
      this._schedule();
      return;
    }
    // Clamp so a long stall (e.g. a blocked main thread) doesn't jump.
    const dt =
      this._lastTime === null
        ? 0
        : Math.min(0.1, (now - this._lastTime) / 1000);
    this._lastTime = now;
    this._render(dt);
    this._schedule();
  };

  private _onVisibilityChange = (): void => {
    if (document.hidden) {
      this._cancel();
    } else {
      this._schedule();
    }
  };

  private _onMotionChange = (): void => {
    if (this._motionQuery.matches) {
      this._cancel();
      this.renderStill();
    } else {
      this._schedule();
    }
  };

  private _render: (dt: number) => void;
  private _isVisible: () => boolean;
  private _hiddenTimer = 0;
  private _motionQuery: MediaQueryList;
  private _frame: number | null = null;
  private _lastTime: number | null = null;
  private _maxFps = 60;
  private _running = false;
}
