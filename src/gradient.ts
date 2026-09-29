/**
 * Converts structured gradient configs to CSS, and samples colors along
 * them.
 */

import { mixColors } from './color-values';
import { IGradientConfig, IGradientStop } from './types';

/** Animated angle offset (0→360deg) used by the "rotate" animation.
 * Registered via `@property` in style/base.css. */
export const GRADIENT_SPIN_VARIABLE = '--jp-neptuneatelier-gradient-spin';

/** Animated phase (0→1) used by the "scroll" animation. Registered via
 * `@property` in style/base.css. */
export const GRADIENT_PHASE_VARIABLE = '--jp-neptuneatelier-gradient-phase';

/** How a gradient is being animated, which decides the CSS built for it. */
export type GradientMotion = 'static' | 'spin' | 'drift' | 'scroll';

/**
 * The motion actually used for a gradient: radial gradients can't rotate,
 * so they drift; conic ones can't scroll, so they spin.
 */
export function gradientMotion(gradient: IGradientConfig): GradientMotion {
  switch (gradient.animation) {
    case 'rotate':
      return gradient.kind === 'radial' ? 'drift' : 'spin';
    case 'scroll':
      return gradient.kind === 'conic' ? 'spin' : 'scroll';
    default:
      return 'static';
  }
}

function sortedStops(stops: IGradientStop[]): IGradientStop[] {
  return [...stops].sort((a, b) => a.position - b.position);
}

/**
 * Stops for an endlessly scrolling gradient: one repeat of `size` px holds
 * the stops forward, then mirrored, so it ends on the color it started
 * with and tiles seamlessly. Every position is shifted by the animated
 * phase, which slides the pattern by exactly one repeat per cycle.
 */
function scrollingStops(stops: IGradientStop[], size: number): string {
  const half = size / 2;
  const at = (offset: number): string =>
    `calc(var(${GRADIENT_PHASE_VARIABLE}, 0) * ${size}px + ${offset.toFixed(1)}px)`;
  const sorted = sortedStops(stops);
  const forward = sorted.map(
    stop => `${stop.color} ${at((stop.position / 100) * half)}`
  );
  const back = [...sorted]
    .reverse()
    .map(stop => `${stop.color} ${at(size - (stop.position / 100) * half)}`);
  return [...forward, ...back].join(', ');
}

/**
 * Builds a CSS `background-image` value.
 * @param gradient - the gradient to convert
 * @param animated - build the animatable form for its animation setting
 *   (previews pass false to show the gradient still)
 */
export function gradientToCss(
  gradient: IGradientConfig,
  animated = false
): string {
  const motion = animated ? gradientMotion(gradient) : 'static';
  if (motion === 'scroll') {
    const stops = scrollingStops(gradient.stops, gradient.scrollSize);
    return gradient.kind === 'radial'
      ? `repeating-radial-gradient(circle at center, ${stops})`
      : `repeating-linear-gradient(${gradient.angle}deg, ${stops})`;
  }
  const stops = sortedStops(gradient.stops)
    .map(stop => `${stop.color} ${stop.position}%`)
    .join(', ');
  const angle =
    motion === 'spin'
      ? `calc(${gradient.angle}deg + var(${GRADIENT_SPIN_VARIABLE}, 0deg))`
      : `${gradient.angle}deg`;
  switch (gradient.kind) {
    case 'radial':
      return `radial-gradient(circle at center, ${stops})`;
    case 'conic':
      return `conic-gradient(from ${angle} at center, ${stops})`;
    default:
      return `linear-gradient(${angle}, ${stops})`;
  }
}

/** Left-to-right preview of the stops alone, for the editor's stop bar. */
export function stopsPreviewCss(stops: IGradientStop[]): string {
  const list = sortedStops(stops)
    .map(stop => `${stop.color} ${stop.position}%`)
    .join(', ');
  return `linear-gradient(90deg, ${list})`;
}

/**
 * Interpolated color at a position (0–100), used when adding a stop so the
 * new stop doesn't visibly change the gradient.
 */
export function colorAt(stops: IGradientStop[], position: number): string {
  const sorted = sortedStops(stops);
  if (position <= sorted[0].position) {
    return sorted[0].color;
  }
  const last = sorted[sorted.length - 1];
  if (position >= last.position) {
    return last.color;
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (position >= a.position && position <= b.position) {
      const span = b.position - a.position || 1;
      return mixColors(a.color, b.color, (position - a.position) / span);
    }
  }
  return last.color;
}
