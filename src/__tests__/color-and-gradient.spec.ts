import {
  contrastRatio,
  cssColorToHex,
  hslToHex,
  mixColors,
  parseColor,
  rgbToHsl
} from '../color-values';
import { colorAt, gradientToCss } from '../gradient';
import { generatePalette } from '../palette-generator';
import { IGradientConfig } from '../types';

describe('color values', () => {
  it('parses hex, short hex, rgb, and rgba', () => {
    expect(parseColor('#ff8000')).toEqual({ r: 255, g: 128, b: 0, a: 1 });
    expect(parseColor('#f80')).toEqual({ r: 255, g: 136, b: 0, a: 1 });
    expect(parseColor('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
    expect(parseColor('rgba(1, 2, 3, 0.5)')).toEqual({
      r: 1,
      g: 2,
      b: 3,
      a: 0.5
    });
  });

  it('returns null for unparseable input', () => {
    expect(parseColor('')).toBeNull();
  });

  it('converts to hex with a fallback', () => {
    expect(cssColorToHex('white')).toBe('#ffffff');
    expect(cssColorToHex('', '#123456')).toBe('#123456');
  });

  it('computes WCAG contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('round-trips through HSL', () => {
    const hsl = rgbToHsl({ r: 51, g: 102, b: 204, a: 1 });
    expect(hslToHex(hsl.h, hsl.s, hsl.l)).toBe('#3366cc');
  });

  it('mixes colors', () => {
    expect(mixColors('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('gradients', () => {
  const gradient: IGradientConfig = {
    kind: 'linear',
    angle: 90,
    stops: [
      { color: '#0000ff', position: 100 },
      { color: '#ff0000', position: 0 }
    ],
    animation: 'none',
    speed: 1,
    scrollSize: 1000
  };

  it('builds sorted linear CSS', () => {
    expect(gradientToCss(gradient)).toBe(
      'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)'
    );
  });

  it('builds radial and conic CSS', () => {
    expect(gradientToCss({ ...gradient, kind: 'radial' })).toMatch(
      /^radial-gradient\(circle at center/
    );
    expect(gradientToCss({ ...gradient, kind: 'conic' })).toMatch(
      /^conic-gradient\(from 90deg/
    );
  });

  it('includes the spin variable when animated', () => {
    expect(gradientToCss({ ...gradient, animation: 'rotate' }, true)).toContain(
      'var(--jp-neptuneatelier-gradient-spin, 0deg)'
    );
  });

  it('interpolates colors between stops', () => {
    expect(colorAt(gradient.stops, 50)).toBe('#800080');
    expect(colorAt(gradient.stops, 0)).toBe('#ff0000');
  });
});

describe('palette generator', () => {
  it.each(['light', 'dark'] as const)('produces readable %s palettes', mode => {
    for (const accent of ['#ff2e97', '#1fd1a5', '#2196f3', '#888888']) {
      const palette = generatePalette(accent, mode);
      const uiContrast = contrastRatio(
        palette['--jp-ui-font-color1'],
        palette['--jp-layout-color1']
      );
      const contentContrast = contrastRatio(
        palette['--jp-content-font-color1'],
        palette['--jp-layout-color0']
      );
      expect(uiContrast).toBeGreaterThanOrEqual(4.5);
      expect(contentContrast).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('only produces --jp-* variables', () => {
    const palette = generatePalette('#7a5cff', 'dark');
    expect(Object.keys(palette).every(key => key.startsWith('--jp-'))).toBe(
      true
    );
  });
});
