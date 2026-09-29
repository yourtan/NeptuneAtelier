import {
  normalizeBackground,
  normalizeColors,
  normalizeLayout,
  normalizeThemeConfig
} from '../config-normalizers';
import {
  DEFAULT_BACKGROUND_CONFIG,
  DEFAULT_GRADIENT,
  DEFAULT_THEME_CONFIG
} from '../defaults';
import { ThemeHistory } from '../history';
import { STARTER_PRESETS } from '../starter-presets';
import { THEME_CONFIG_KEYS } from '../types';
import { FakeSettings, flushPromises } from './fakes';

// Provided by Jest's CommonJS runtime; the project has no Node typings.
declare const require: (id: string) => unknown;

interface ISchema {
  properties: Record<string, { default: unknown }>;
}

function isSchema(value: unknown): value is ISchema {
  return typeof value === 'object' && value !== null && 'properties' in value;
}

describe('config normalizers', () => {
  it('migrates legacy color keys and drops non-variables', () => {
    expect(
      normalizeColors({
        accentColor: '#111111',
        '--jp-layout-color0': '#222222',
        bogus: '#333333',
        '--jp-empty': ''
      })
    ).toEqual({
      '--jp-brand-color1': '#111111',
      '--jp-layout-color0': '#222222'
    });
  });

  it('fills a first-release background with the new fields', () => {
    const background = normalizeBackground({
      type: 'gradient',
      color: '#1e1e1e',
      gradient: 'linear-gradient(red, blue)',
      imageRef: '',
      opacity: 0.5,
      blur: 3
    });

    expect(background.gradient).toEqual(DEFAULT_GRADIENT);
    expect(background.opacity).toBe(0.5);
    expect(background.shader).toEqual(DEFAULT_BACKGROUND_CONFIG.shader);
  });

  it('clamps out-of-range numbers and rejects unknown options', () => {
    const background = normalizeBackground({ blur: 999, type: 'lasers' });
    expect(background.blur).toBe(40);
    expect(background.type).toBe('none');
  });

  it('normalizes image fit, position, and zoom, clamping and defaulting', () => {
    const withImageFields = normalizeBackground({
      imageFit: 'tile',
      imagePositionX: 30,
      imagePositionY: 70,
      imageZoom: 2
    });
    expect(withImageFields.imageFit).toBe('tile');
    expect(withImageFields.imagePositionX).toBe(30);
    expect(withImageFields.imagePositionY).toBe(70);
    expect(withImageFields.imageZoom).toBe(2);

    const outOfRange = normalizeBackground({
      imageFit: 'bogus',
      imagePositionX: 500,
      imageZoom: 99
    });
    expect(outOfRange.imageFit).toBe(DEFAULT_BACKGROUND_CONFIG.imageFit);
    expect(outOfRange.imagePositionX).toBe(100);
    expect(outOfRange.imageZoom).toBe(3);
  });

  it('defaults a missing layout', () => {
    expect(normalizeLayout(undefined).tabStyle).toBe('default');
  });

  it('keeps schema defaults identical to the code defaults', () => {
    const schema = require('../../schema/plugin.json');
    if (!isSchema(schema)) {
      throw new Error('schema/plugin.json has no properties');
    }
    for (const key of THEME_CONFIG_KEYS) {
      expect({ key, value: schema.properties[key].default }).toEqual({
        key,
        value: DEFAULT_THEME_CONFIG[key]
      });
    }
  });

  it('round-trips every starter preset through the normalizer unchanged', () => {
    // A typo in a starter's enum-like value (e.g. a bad tabStyle or shader
    // preset name) would otherwise be silently replaced by its default
    // instead of failing loudly.
    for (const preset of STARTER_PRESETS) {
      expect({
        id: preset.id,
        config: normalizeThemeConfig(preset.config)
      }).toEqual({ id: preset.id, config: preset.config });
    }
  });
});

describe('ThemeHistory', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('collapses rapid changes into one step and undoes/redoes them', async () => {
    const fake = new FakeSettings({ customCss: 'a' });
    const history = new ThemeHistory(fake.asSettings());
    expect(history.canUndo).toBe(false);

    await fake.set('customCss', 'ab');
    await fake.set('customCss', 'abc');
    jest.advanceTimersByTime(1000);

    expect(history.canUndo).toBe(true);

    await history.undo();
    await flushPromises();
    expect(fake.values.customCss).toBe('a');
    expect(history.canRedo).toBe(true);

    await history.redo();
    await flushPromises();
    expect(fake.values.customCss).toBe('abc');
  });

  it('records an unsettled change before undoing it', async () => {
    const fake = new FakeSettings({ customCss: 'a' });
    const history = new ThemeHistory(fake.asSettings());

    await fake.set('customCss', 'b');
    await history.undo();

    expect(fake.values.customCss).toBe('a');
  });

  it('drops the redo branch after a new change', async () => {
    const fake = new FakeSettings({ customCss: 'a' });
    const history = new ThemeHistory(fake.asSettings());
    await fake.set('customCss', 'b');
    jest.advanceTimersByTime(1000);
    await history.undo();

    await fake.set('customCss', 'c');
    jest.advanceTimersByTime(1000);

    expect(history.canRedo).toBe(false);
  });
});
