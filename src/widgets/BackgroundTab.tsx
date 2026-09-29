import { showErrorMessage } from '@jupyterlab/apputils';
import * as React from 'react';
import {
  normalizeAppearance,
  normalizeBackground,
  normalizeColors
} from '../config-normalizers';
import { DEFAULT_BACKGROUND_CONFIG, IMAGE_FIT_OPTIONS } from '../defaults';
import { generateId } from '../ids';
import { extractImageSeed, generatePalette } from '../palette-generator';
import { BackgroundType, IBackgroundConfig, IColorOverrides } from '../types';
import {
  PlainColorRow,
  readFileAsDataUrl,
  Section,
  SelectRow,
  SliderRow
} from './controls';
import { GradientEditor } from './GradientEditor';
import { useSetting } from './studio-hooks';
import { IStudioServices } from './studio-services';

const BACKGROUND_TYPES: { value: BackgroundType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'color', label: 'Solid color' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'image', label: 'Image' }
];

const percent = (value: number): string => `${Math.round(value * 100)}%`;

export interface IBackgroundTabProps {
  services: IStudioServices;
}

/**
 * The base background — solid color, gradient (visual editor), or image —
 * plus how see-through the interface in front of it is. Animated
 * particles and shaders stack on top of it as layers in the Effects tab.
 */
export function BackgroundTab(props: IBackgroundTabProps): JSX.Element {
  const { settings, backgroundApplier } = props.services;
  const [background, setBackground] = useSetting<IBackgroundConfig>(
    settings,
    'background',
    normalizeBackground
  );
  const [appearance, setAppearance] = useSetting(
    settings,
    'appearance',
    normalizeAppearance
  );
  const [, setColors] = useSetting<IColorOverrides>(
    settings,
    'colors',
    normalizeColors
  );

  const patch = (changes: Partial<IBackgroundConfig>): void => {
    setBackground({ ...background, ...changes });
  };

  const uploadImage = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const ref = generateId();
      await backgroundApplier.storeImage(ref, dataUrl);
      patch({ type: 'image', imageRef: ref });
    } catch (error) {
      console.error('neptuneatelier: failed to store background image', error);
      await showErrorMessage(
        'Background image failed',
        'The image could not be stored — it may be larger than the browser allows (roughly 5 MB). Try a smaller or compressed image.'
      );
    }
  };

  const matchPaletteToImage = async (): Promise<void> => {
    const dataUrl = await backgroundApplier.fetchImage(background.imageRef);
    if (!dataUrl) {
      return;
    }
    try {
      const seed = await extractImageSeed(dataUrl);
      setColors(generatePalette(seed.accent, seed.mode));
      setAppearance({ ...appearance, baseTheme: seed.mode });
    } catch (error) {
      console.error('neptuneatelier: palette generation failed', error);
    }
  };

  return (
    <div className="jp-neptuneatelier-Tab">
      <div className="jp-neptuneatelier-FieldDescription">
        The base background. Animated particles and shaders go on top of it —
        add them in the <strong>Effects</strong> tab.
      </div>
      <SelectRow<BackgroundType>
        label="Type"
        value={background.type}
        options={BACKGROUND_TYPES}
        onChange={type => patch({ type })}
      />

      {background.type === 'color' && (
        <PlainColorRow
          label="Color"
          value={background.color}
          onChange={color => patch({ color })}
        />
      )}

      {background.type === 'gradient' && (
        <Section title="Gradient">
          <GradientEditor
            value={background.gradient}
            onChange={gradient => patch({ gradient })}
          />
        </Section>
      )}

      {background.type === 'image' && (
        <Section title="Image">
          <div className="jp-neptuneatelier-ButtonRow">
            <label className="jp-neptuneatelier-Button jp-mod-accept">
              {background.imageRef ? 'Replace image…' : 'Choose image…'}
              <input
                type="file"
                accept="image/*"
                className="jp-neptuneatelier-HiddenInput"
                onChange={event => void uploadImage(event)}
              />
            </label>
            {background.imageRef && (
              <button
                type="button"
                className="jp-neptuneatelier-Button"
                onClick={() => void matchPaletteToImage()}
              >
                Match colors to image
              </button>
            )}
          </div>
          <div className="jp-neptuneatelier-FieldDescription">
            Stored in this browser only. Exported presets include it.
          </div>
          {background.imageRef && (
            <>
              <SelectRow<IBackgroundConfig['imageFit']>
                label="Fit"
                value={background.imageFit}
                options={IMAGE_FIT_OPTIONS}
                onChange={imageFit => patch({ imageFit })}
              />
              <SliderRow
                label="Zoom"
                value={background.imageZoom}
                min={0.5}
                max={3}
                step={0.05}
                format={v => `${Math.round(v * 100)}%`}
                defaultValue={DEFAULT_BACKGROUND_CONFIG.imageZoom}
                onChange={imageZoom => patch({ imageZoom })}
              />
              <SliderRow
                label="Position (horizontal)"
                value={background.imagePositionX}
                min={0}
                max={100}
                step={1}
                format={v => `${Math.round(v)}%`}
                defaultValue={DEFAULT_BACKGROUND_CONFIG.imagePositionX}
                onChange={imagePositionX => patch({ imagePositionX })}
              />
              <SliderRow
                label="Position (vertical)"
                value={background.imagePositionY}
                min={0}
                max={100}
                step={1}
                format={v => `${Math.round(v)}%`}
                defaultValue={DEFAULT_BACKGROUND_CONFIG.imagePositionY}
                onChange={imagePositionY => patch({ imagePositionY })}
              />
            </>
          )}
        </Section>
      )}

      <Section title="See-through">
        <div className="jp-neptuneatelier-FieldDescription">
          These apply whenever there's a background or a background effect
          layer.
        </div>
        {background.type !== 'none' && (
          <>
            <SliderRow
              label="Background opacity"
              value={background.opacity}
              min={0}
              max={1}
              step={0.01}
              format={percent}
              defaultValue={DEFAULT_BACKGROUND_CONFIG.opacity}
              onChange={opacity => patch({ opacity })}
            />
            <SliderRow
              label="Background blur"
              value={background.blur}
              min={0}
              max={40}
              step={1}
              format={v => `${v}px`}
              defaultValue={DEFAULT_BACKGROUND_CONFIG.blur}
              onChange={blur => patch({ blur })}
            />
          </>
        )}
        <SliderRow
          label="Panel opacity"
          value={background.chromeOpacity}
          min={0}
          max={1}
          step={0.01}
          format={percent}
          description="How solid the menu bar, sidebars, tabs, and status bar are over the background. Pair a low value with Style → Glass panels for a frosted look."
          defaultValue={DEFAULT_BACKGROUND_CONFIG.chromeOpacity}
          onChange={chromeOpacity => patch({ chromeOpacity })}
        />
        <SliderRow
          label="Window opacity"
          value={background.contentOpacity}
          min={0.5}
          max={1}
          step={0.01}
          format={percent}
          description="How solid notebooks, editors, terminals, consoles, and other windows are. Lower lets the background (and window effects set to “behind the content”) show through. Keep it high for readability."
          defaultValue={DEFAULT_BACKGROUND_CONFIG.contentOpacity}
          onChange={contentOpacity => patch({ contentOpacity })}
        />
      </Section>

      {background.type !== 'none' && (
        <Section title="Texture">
          <SliderRow
            label="Grain"
            value={background.noise}
            min={0}
            max={1}
            step={0.05}
            format={percent}
            description="A subtle film-grain texture over the background."
            defaultValue={DEFAULT_BACKGROUND_CONFIG.noise}
            onChange={noise => patch({ noise })}
          />
          <SliderRow
            label="Vignette"
            value={background.vignette}
            min={0}
            max={1}
            step={0.05}
            format={percent}
            description="Darkens the edges of the screen, drawing focus to the center."
            defaultValue={DEFAULT_BACKGROUND_CONFIG.vignette}
            onChange={vignette => patch({ vignette })}
          />
        </Section>
      )}
    </div>
  );
}
