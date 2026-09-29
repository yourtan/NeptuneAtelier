import { BackgroundApplier } from '../background-applier';
import { DEFAULT_BACKGROUND_CONFIG } from '../defaults';
import { IBackgroundConfig } from '../types';
import { FakeSettings, FakeStateDB, flushPromises } from './fakes';

function paintElement(): HTMLElement | null {
  return document.body.querySelector('.jp-neptuneatelier-BackgroundPaint');
}

function create(background: Partial<IBackgroundConfig>): {
  fake: FakeSettings;
  applier: BackgroundApplier;
} {
  const fake = new FakeSettings({
    background: { ...DEFAULT_BACKGROUND_CONFIG, ...background }
  });
  const applier = new BackgroundApplier(
    fake.asSettings(),
    new FakeStateDB().asStateDB()
  );
  return { fake, applier };
}

describe('BackgroundApplier', () => {
  afterEach(() => {
    document
      .querySelectorAll('.jp-neptuneatelier-BackgroundLayer')
      .forEach(node => node.remove());
  });

  it('inserts the layer as the first child of body', () => {
    create({});
    expect(document.body.firstElementChild?.className).toBe(
      'jp-neptuneatelier-BackgroundLayer'
    );
  });

  it('paints a solid color', async () => {
    create({ type: 'color', color: '#123456' });
    await flushPromises();
    expect(paintElement()?.style.backgroundColor).toBe('rgb(18, 52, 86)');
  });

  it('paints a gradient built from its stops', async () => {
    // jsdom's CSS parser rejects gradients (browsers accept them), so assert
    // on the value assigned rather than what jsdom stored.
    const setter = jest.spyOn(
      CSSStyleDeclaration.prototype,
      'backgroundImage',
      'set'
    );
    create({ type: 'gradient' });
    await flushPromises();

    expect(setter).toHaveBeenCalledWith(
      expect.stringContaining('linear-gradient(135deg')
    );
    setter.mockRestore();
  });

  it('oversizes the painted area by twice the blur radius', async () => {
    create({ type: 'color', blur: 10 });
    await flushPromises();

    expect(paintElement()?.style.inset).toBe('-20px');
    expect(paintElement()?.style.filter).toBe('blur(10px)');
  });

  it('does not oversize when there is no blur', async () => {
    create({ type: 'color', blur: 0 });
    await flushPromises();

    expect(paintElement()?.style.inset).toBe('0');
  });

  it('clears the paint when the type is none', async () => {
    const { fake } = create({ type: 'color' });
    await flushPromises();

    await fake.set('background', DEFAULT_BACKGROUND_CONFIG);
    await flushPromises();

    expect(paintElement()?.style.backgroundColor).toBe('');
  });

  it('stores images and paints them by reference', async () => {
    const { fake, applier } = create({});
    await applier.storeImage('ref-1', 'data:image/png;base64,AAAA');
    await fake.set('background', {
      ...DEFAULT_BACKGROUND_CONFIG,
      type: 'image',
      imageRef: 'ref-1'
    });
    await flushPromises();

    expect(paintElement()?.style.backgroundImage).toContain(
      'data:image/png;base64,AAAA'
    );
    expect(await applier.fetchImage('ref-1')).toBe(
      'data:image/png;base64,AAAA'
    );
  });

  it('applies image position, fit, and zoom', async () => {
    const { fake, applier } = create({});
    await applier.storeImage('ref-1', 'data:image/png;base64,AAAA');
    await fake.set('background', {
      ...DEFAULT_BACKGROUND_CONFIG,
      type: 'image',
      imageRef: 'ref-1',
      imageFit: 'contain',
      imagePositionX: 20,
      imagePositionY: 80,
      imageZoom: 1.5
    });
    await flushPromises();

    const paint = paintElement();
    expect(paint?.style.backgroundSize).toBe('contain');
    expect(paint?.style.backgroundPosition).toBe('20% 80%');
    expect(paint?.style.backgroundRepeat).toBe('no-repeat');
    expect(paint?.style.transform).toBe('scale(1.5)');
    expect(paint?.style.transformOrigin).toBe('20% 80%');
  });

  it('tiles the image and skips the zoom transform at 100%', async () => {
    const { fake, applier } = create({});
    await applier.storeImage('ref-1', 'data:image/png;base64,AAAA');
    await fake.set('background', {
      ...DEFAULT_BACKGROUND_CONFIG,
      type: 'image',
      imageRef: 'ref-1',
      imageFit: 'tile'
    });
    await flushPromises();

    const paint = paintElement();
    expect(paint?.style.backgroundSize).toBe('auto');
    expect(paint?.style.backgroundRepeat).toBe('repeat');
    expect(paint?.style.transform).toBe('');
  });

  it('removes the layer on dispose', () => {
    const { applier } = create({});
    applier.dispose();

    expect(paintElement()).toBeNull();
    expect(applier.isDisposed).toBe(true);
  });
});
