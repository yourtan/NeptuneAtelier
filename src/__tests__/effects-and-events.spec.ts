import {
  legacyEffectLayers,
  migrateLegacySettings,
  MIGRATED_LAYER_ID,
  normalizeBackground,
  normalizeEffects,
  normalizeEvents,
  normalizeGradient,
  normalizeParticlePresets,
  normalizeThemeConfig
} from '../config-normalizers';
import {
  createEffectLayer,
  DEFAULT_BACKGROUND_CONFIG,
  DEFAULT_GRADIENT
} from '../defaults';
import { matchesTarget } from '../effects-applier';
import { gradientMotion, gradientToCss } from '../gradient';
import { ThemeApplier } from '../theme-applier';
import { FakeSettings } from './fakes';

describe('scrolling gradients', () => {
  const scrolling = {
    ...DEFAULT_GRADIENT,
    angle: 90,
    animation: 'scroll' as const,
    scrollSize: 1000
  };

  it('builds a repeating, phase-shifted gradient in the scroll direction', () => {
    const css = gradientToCss(scrolling, true);
    expect(css).toMatch(/^repeating-linear-gradient\(90deg, /);
    expect(css).toContain(
      'var(--jp-neptuneatelier-gradient-phase, 0) * 1000px'
    );
  });

  it('mirrors the stops so one repeat starts and ends on the same color', () => {
    const css = gradientToCss(scrolling, true);
    const first = DEFAULT_GRADIENT.stops[0].color;
    expect(css.startsWith(`repeating-linear-gradient(90deg, ${first} `)).toBe(
      true
    );
    expect(
      css.endsWith(
        `${first} calc(var(--jp-neptuneatelier-gradient-phase, 0) * 1000px + 1000.0px))`
      )
    ).toBe(true);
  });

  it('ripples radial gradients and spins conic ones', () => {
    expect(gradientMotion({ ...scrolling, kind: 'radial' })).toBe('scroll');
    expect(gradientToCss({ ...scrolling, kind: 'radial' }, true)).toMatch(
      /^repeating-radial-gradient/
    );
    expect(gradientMotion({ ...scrolling, kind: 'conic' })).toBe('spin');
  });

  it('previews still', () => {
    expect(gradientToCss(scrolling)).toMatch(/^linear-gradient/);
  });

  it('migrates the old "animate" flag to rotate', () => {
    expect(normalizeGradient({ animate: true }).animation).toBe('rotate');
    expect(normalizeGradient({}).animation).toBe('none');
  });
});

describe('window targets', () => {
  it('matches window kinds', () => {
    expect(matchesTarget('notebooks', '', 'notebook', 'a.ipynb')).toBe(true);
    expect(matchesTarget('notebooks', '', 'terminal', '')).toBe(false);
    expect(matchesTarget('terminals', '', 'terminal', '')).toBe(true);
    expect(matchesTarget('all-windows', '', 'other', '')).toBe(true);
    expect(matchesTarget('background', '', 'notebook', '')).toBe(false);
  });

  it('matches a file by name or path', () => {
    expect(
      matchesTarget('file', 'demo.ipynb', 'notebook', 'work/demo.ipynb')
    ).toBe(true);
    expect(
      matchesTarget('file', './work/demo.ipynb', 'notebook', 'work/demo.ipynb')
    ).toBe(true);
    expect(
      matchesTarget('file', 'demo.ipynb', 'notebook', 'mydemo.ipynb')
    ).toBe(false);
    expect(matchesTarget('file', '', 'notebook', 'demo.ipynb')).toBe(false);
  });
});

describe('effect layers and event rules', () => {
  it('fills in missing fields and drops unknown kinds', () => {
    const layers = normalizeEffects([
      { kind: 'particles', target: 'terminals', opacity: 5 },
      { kind: 'lasers' },
      'nonsense'
    ]);
    expect(layers).toHaveLength(1);
    expect(layers[0].target).toBe('terminals');
    expect(layers[0].opacity).toBe(1);
    expect(layers[0].id).not.toBe('');
  });

  it('normalizes event rules', () => {
    const rules = normalizeEvents([
      { trigger: 'typing', action: 'sparkles', size: 99 },
      { trigger: 'teleport' },
      null
    ]);
    expect(rules).toHaveLength(2);
    expect(rules[0].size).toBe(3);
    expect(rules[1].trigger).toBe('cell-success');
  });

  it('normalizes particle shape, twinkle, and gravity, clamping and rejecting unknowns', () => {
    const layers = normalizeEffects([
      {
        kind: 'particles',
        particles: {
          shape: 'star',
          twinkle: true,
          gravity: 99
        }
      },
      {
        kind: 'particles',
        particles: { shape: 'not-a-shape' }
      }
    ]);
    expect(layers[0].particles.shape).toBe('star');
    expect(layers[0].particles.twinkle).toBe(true);
    expect(layers[0].particles.gravity).toBe(3);
    expect(layers[1].particles.shape).toBe('circle');
  });

  it('normalizes spin, size variation, opacity, glow, and color blend, clamping ranges', () => {
    const layers = normalizeEffects([
      {
        kind: 'particles',
        particles: {
          spin: 99,
          sizeVariation: 5,
          opacity: -1,
          glow: 5,
          colorBlend: '#123456'
        }
      },
      { kind: 'particles', particles: {} }
    ]);
    expect(layers[0].particles.spin).toBe(3);
    expect(layers[0].particles.sizeVariation).toBe(1);
    expect(layers[0].particles.opacity).toBe(0);
    expect(layers[0].particles.glow).toBe(1);
    expect(layers[0].particles.colorBlend).toBe('#123456');
    // Defaults preserve the previous look: full opacity, no blend/glow/spin.
    expect(layers[1].particles.spin).toBe(0);
    expect(layers[1].particles.opacity).toBe(1);
    expect(layers[1].particles.glow).toBe(0);
    expect(layers[1].particles.colorBlend).toBe('');
  });

  it('normalizes image, trail, and emitter, clamping and rejecting unknowns', () => {
    const layers = normalizeEffects([
      {
        kind: 'particles',
        particles: { imageRef: 'ref-1', trail: 5, emitter: 'edges' }
      },
      { kind: 'particles', particles: { emitter: 'nonsense' } }
    ]);
    expect(layers[0].particles.imageRef).toBe('ref-1');
    expect(layers[0].particles.trail).toBe(1);
    expect(layers[0].particles.emitter).toBe('edges');
    expect(layers[1].particles.emitter).toBe('screen');
  });

  it('accepts the new shader presets and rejects unknown ones', () => {
    const layers = normalizeEffects([
      { kind: 'shader', shader: { preset: 'rain' } },
      { kind: 'shader', shader: { preset: 'grid' } },
      { kind: 'shader', shader: { preset: 'embers' } },
      { kind: 'shader', shader: { preset: 'bogus' } }
    ]);
    expect(layers.map(l => l.shader.preset)).toEqual([
      'rain',
      'grid',
      'embers',
      'aurora'
    ]);
  });
});

describe('particle presets', () => {
  it('drops presets with no name or id, and fills in particle defaults', () => {
    const presets = normalizeParticlePresets([
      {
        id: 'snow-1',
        name: 'Snow',
        particles: { color: '#ffffff', count: 999 }
      },
      { id: 'no-name', name: '' },
      { name: 'no-id', particles: {} },
      null
    ]);
    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe('Snow');
    expect(presets[0].particles.color).toBe('#ffffff');
    // Out-of-range counts still get clamped by normalizeParticles.
    expect(presets[0].particles.count).toBe(300);
  });

  it('returns an empty array for anything that is not an array', () => {
    expect(normalizeParticlePresets(undefined)).toEqual([]);
    expect(normalizeParticlePresets({})).toEqual([]);
  });
});

describe('migrating old animated backgrounds', () => {
  const legacy = {
    type: 'shader',
    color: '#101010',
    shader: { preset: 'nebula' },
    maxFps: 30
  };

  it('turns them into a base color plus an effect layer', () => {
    expect(normalizeBackground(legacy).type).toBe('color');
    const [layer] = legacyEffectLayers(legacy);
    expect(layer.id).toBe(MIGRATED_LAYER_ID);
    expect(layer.kind).toBe('shader');
    expect(layer.shader.preset).toBe('nebula');
    expect(layer.maxFps).toBe(30);
  });

  it('migrates old presets that have no effects key', () => {
    const config = normalizeThemeConfig({ background: legacy });
    expect(config.effects).toHaveLength(1);
    expect(
      normalizeThemeConfig({ background: legacy, effects: [] }).effects
    ).toEqual([]);
  });

  it('rewrites live settings once, idempotently', async () => {
    const fake = new FakeSettings({ background: legacy, effects: [] });
    await migrateLegacySettings(fake.asSettings());
    await migrateLegacySettings(fake.asSettings());

    expect(normalizeEffects(fake.values.effects)).toHaveLength(1);
    expect(normalizeBackground(fake.values.background).type).toBe('color');
  });
});

describe('see-through rules with effect layers', () => {
  const rootVar = (name: string): string =>
    document.documentElement.style.getPropertyValue(name);
  let applier: ThemeApplier | null = null;

  afterEach(() => {
    applier?.dispose();
    applier = null;
    document.documentElement.removeAttribute('style');
  });

  it('treats an enabled background layer as a background', () => {
    const fake = new FakeSettings({
      background: { ...DEFAULT_BACKGROUND_CONFIG, chromeOpacity: 0 },
      effects: [createEffectLayer('shader', 'background')]
    });
    applier = new ThemeApplier(fake.asSettings(), null);
    expect(rootVar('--jp-layout-color1')).toBe('transparent');
  });

  it('keeps chrome solid when only window layers exist', () => {
    const fake = new FakeSettings({
      background: { ...DEFAULT_BACKGROUND_CONFIG, contentOpacity: 0.7 },
      effects: [
        { ...createEffectLayer('particles', 'notebooks'), placement: 'behind' }
      ]
    });
    applier = new ThemeApplier(fake.asSettings(), null);
    expect(rootVar('--jp-layout-color1')).toBe('');
    expect(applier.contentOpacity).toBe(0.7);
  });
});
