import { DEFAULT_THEME_CONFIG } from '../defaults';
import {
  clearShareLink,
  parseShareLink,
  PresetManager,
  toShareLink
} from '../presets';
import { IThemeConfig, IThemePreset } from '../types';
import { FakeImageStore, FakeSettings } from './fakes';

function customConfig(): IThemeConfig {
  return {
    ...DEFAULT_THEME_CONFIG,
    colors: { '--jp-brand-color1': '#abcdef' },
    appearance: { ...DEFAULT_THEME_CONFIG.appearance, radius: 12 }
  };
}

function jsonFile(content: unknown): File {
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  return new File([text], 'preset.json', { type: 'application/json' });
}

describe('PresetManager', () => {
  let fake: FakeSettings;
  let images: FakeImageStore;
  let manager: PresetManager;

  beforeEach(() => {
    fake = new FakeSettings({ presets: [] });
    images = new FakeImageStore();
    manager = new PresetManager(fake.asSettings(), images);
  });

  it('starts empty', () => {
    expect(manager.list()).toEqual([]);
  });

  it('saves and lists a preset', async () => {
    const saved = await manager.save('Mine', customConfig());

    expect(manager.list()).toHaveLength(1);
    expect(manager.list()[0].id).toBe(saved.id);
    expect(manager.list()[0].config.appearance.radius).toBe(12);
  });

  it('applies every part of a preset to the live settings', async () => {
    const saved = await manager.save('Mine', customConfig());

    await manager.apply(saved.id);

    expect(fake.values.colors).toEqual({ '--jp-brand-color1': '#abcdef' });
    expect(fake.values.appearance).toEqual(customConfig().appearance);
    expect(fake.values.customCss).toBe('');
  });

  it('deletes a preset', async () => {
    const saved = await manager.save('Mine', customConfig());
    await manager.delete(saved.id);

    expect(manager.list()).toHaveLength(0);
  });

  it('drops malformed stored presets instead of failing', () => {
    fake.values.presets = [{ nonsense: true }, 'x'];
    expect(manager.list()).toEqual([]);
  });

  it('rejects files that are not JSON', async () => {
    await expect(manager.parseImport(jsonFile('not json'))).rejects.toThrow(
      /valid JSON/
    );
  });

  it('rejects files that are not presets', async () => {
    await expect(manager.parseImport(jsonFile({ foo: 1 }))).rejects.toThrow(
      /valid theme preset/
    );
  });

  it('round-trips a preset with its image through export and import', async () => {
    await images.storeImage('img-1', 'data:image/png;base64,AAAA');
    const config = customConfig();
    config.background = {
      ...config.background,
      type: 'image',
      imageRef: 'img-1'
    };
    const saved = await manager.save('With image', config);

    const exported = await manager.toExport(saved.id);
    expect(exported?.imageData).toBe('data:image/png;base64,AAAA');

    const parsed = await manager.parseImport(jsonFile(exported));
    const imported = await manager.addImported(parsed);

    expect(imported.id).not.toBe(saved.id);
    expect(imported.config.background.imageRef).not.toBe('img-1');
    expect(await images.fetchImage(imported.config.background.imageRef)).toBe(
      'data:image/png;base64,AAAA'
    );
    expect(manager.list()).toHaveLength(2);
  });

  it('ignores embedded data that is not an image', async () => {
    const parsed = await manager.parseImport(
      jsonFile({
        id: 'x',
        name: 'Sneaky',
        createdAt: '',
        config: {},
        imageData: 'javascript:alert(1)'
      })
    );

    expect(parsed.imageData).toBeUndefined();
  });

  it('fills in missing config sections when importing old files', async () => {
    const parsed = await manager.parseImport(
      jsonFile({
        id: 'old',
        name: 'Old format',
        createdAt: '',
        config: { colors: { accentColor: '#112233' } }
      })
    );

    expect(parsed.preset.config.colors).toEqual({
      '--jp-brand-color1': '#112233'
    });
    expect(parsed.preset.config.layout).toEqual(DEFAULT_THEME_CONFIG.layout);
  });
});

describe('shareable preset links', () => {
  afterEach(() => {
    clearShareLink();
  });

  it('round-trips a preset through a link, dropping its image reference', () => {
    const preset: IThemePreset = {
      id: 'p1',
      name: 'Shared theme',
      createdAt: '',
      config: {
        ...customConfig(),
        background: {
          ...DEFAULT_THEME_CONFIG.background,
          type: 'image',
          imageRef: 'some-ref'
        }
      }
    };
    const link = toShareLink(preset);
    expect(link).toContain('#neptuneatelier-preset=');

    window.history.replaceState(null, '', link);
    const decoded = parseShareLink();

    expect(decoded?.name).toBe('Shared theme');
    expect(decoded?.config.appearance.radius).toBe(12);
    expect(decoded?.config.background.imageRef).toBe('');
  });

  it('returns null when there is no preset in the hash', () => {
    window.history.replaceState(null, '', '#');
    expect(parseShareLink()).toBeNull();
  });
});
