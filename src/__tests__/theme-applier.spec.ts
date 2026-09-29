import { DEFAULT_BACKGROUND_CONFIG } from '../defaults';
import { ThemeApplier } from '../theme-applier';
import { FakeSettings } from './fakes';

const rootVar = (name: string): string =>
  document.documentElement.style.getPropertyValue(name);

const created: ThemeApplier[] = [];

function create(fake: FakeSettings): ThemeApplier {
  const applier = new ThemeApplier(fake.asSettings(), null);
  created.push(applier);
  return applier;
}

describe('ThemeApplier', () => {
  afterEach(() => {
    created.splice(0).forEach(applier => applier.dispose());
    document.documentElement.removeAttribute('style');
  });

  it('writes only the colors the user overrode', () => {
    const fake = new FakeSettings({
      colors: { '--jp-brand-color1': '#ff0000' }
    });
    create(fake);

    expect(rootVar('--jp-brand-color1')).toBe('#ff0000');
    expect(rootVar('--jp-layout-color1')).toBe('');
  });

  it('migrates legacy named color keys', () => {
    const fake = new FakeSettings({ colors: { accentColor: '#00ff00' } });
    create(fake);

    expect(rootVar('--jp-brand-color1')).toBe('#00ff00');
  });

  it('removes an override when the user clears it', async () => {
    const fake = new FakeSettings({
      colors: { '--jp-brand-color1': '#ff0000' }
    });
    create(fake);

    await fake.set('colors', {});

    expect(rootVar('--jp-brand-color1')).toBe('');
  });

  it('makes chrome transparent at 0% panel opacity', () => {
    const fake = new FakeSettings({
      background: {
        ...DEFAULT_BACKGROUND_CONFIG,
        type: 'color',
        chromeOpacity: 0
      }
    });
    create(fake);

    expect(rootVar('--jp-layout-color1')).toBe('transparent');
    expect(rootVar('--jp-layout-color3')).toBe('transparent');
    expect(rootVar('--jp-layout-color0')).toBe('');
  });

  it('mixes chrome with transparency at partial panel opacity', () => {
    const fake = new FakeSettings({
      colors: { '--jp-layout-color1': '#abcdef' },
      background: {
        ...DEFAULT_BACKGROUND_CONFIG,
        type: 'gradient',
        chromeOpacity: 0.4
      }
    });
    create(fake);

    expect(rootVar('--jp-layout-color1')).toBe(
      'color-mix(in srgb, #abcdef 40%, transparent)'
    );
  });

  it('makes the toolbar follow an overridden panel color', () => {
    const fake = new FakeSettings({
      colors: { '--jp-layout-color1': '#abcdef' },
      background: {
        ...DEFAULT_BACKGROUND_CONFIG,
        type: 'color',
        chromeOpacity: 0.5
      }
    });
    create(fake);

    expect(rootVar('--jp-toolbar-background')).toBe(
      'color-mix(in srgb, #abcdef 50%, transparent)'
    );
  });

  it('only makes content translucent when asked to', () => {
    const fake = new FakeSettings({
      colors: { '--jp-layout-color0': '#ffffff' },
      background: {
        ...DEFAULT_BACKGROUND_CONFIG,
        type: 'color',
        contentOpacity: 0.8
      }
    });
    create(fake);

    expect(rootVar('--jp-layout-color0')).toBe(
      'color-mix(in srgb, #ffffff 80%, transparent)'
    );
  });

  it('restores palette colors when the background is switched off', async () => {
    const fake = new FakeSettings({
      colors: { '--jp-layout-color1': '#abcdef' },
      background: { ...DEFAULT_BACKGROUND_CONFIG, type: 'gradient' }
    });
    create(fake);

    await fake.set('background', DEFAULT_BACKGROUND_CONFIG);

    expect(rootVar('--jp-layout-color1')).toBe('#abcdef');
    expect(rootVar('--jp-layout-color3')).toBe('');
  });

  it('leaves properties written by others alone', () => {
    document.documentElement.style.setProperty('--jp-code-font-size', '20px');
    const fake = new FakeSettings({
      colors: { '--jp-brand-color1': '#ff0000' }
    });
    const applier = create(fake);

    applier.dispose();

    expect(rootVar('--jp-code-font-size')).toBe('20px');
    expect(rootVar('--jp-brand-color1')).toBe('');
  });
});
