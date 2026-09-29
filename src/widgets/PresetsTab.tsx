import {
  Dialog,
  Notification,
  showDialog,
  showErrorMessage
} from '@jupyterlab/apputils';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { normalizePresets, readThemeConfig } from '../config-normalizers';
import { gradientToCss } from '../gradient';
import {
  clearShareLink,
  parseShareLink,
  toShareLink,
  writeThemeConfig
} from '../presets';
import { randomizeTheme } from '../randomize';
import { STARTER_PRESETS } from '../starter-presets';
import { IBackgroundConfig, IThemeConfig, IThemePreset } from '../types';
import { Section } from './controls';
import { useSetting } from './studio-hooks';
import { IStudioServices } from './studio-services';

function baseBackgroundCss(background: IBackgroundConfig): string {
  switch (background.type) {
    case 'color':
      return background.color;
    case 'gradient':
      return gradientToCss(background.gradient);
    case 'image':
      return 'linear-gradient(135deg, #555, #888)';
    default:
      return '';
  }
}

/** The config's background (base plus the first background effect layer)
 * as a CSS background, approximating animated effects with still ones. */
function backgroundPreviewCss(config: IThemeConfig): string {
  const layers = [];
  const layer = config.effects.find(
    item => item.enabled && item.target === 'background'
  );
  if (layer?.kind === 'shader') {
    const { color1, color2, color3 } = layer.shader;
    layers.push(`linear-gradient(135deg, ${color1}, ${color2}, ${color3})`);
  } else if (layer?.kind === 'particles') {
    const dot = layer.particles.color;
    layers.push(
      `radial-gradient(circle at 25% 35%, ${dot} 0 1.5px, transparent 2px)`,
      `radial-gradient(circle at 70% 60%, ${dot} 0 1.5px, transparent 2px)`,
      `radial-gradient(circle at 45% 80%, ${dot} 0 1px, transparent 1.5px)`
    );
  }
  const base = baseBackgroundCss(config.background);
  if (base) {
    layers.push(base);
  }
  return layers.join(', ');
}

interface IPresetThumbnailProps {
  config: IThemeConfig;
  themeValue: (variable: string) => string;
}

/** A miniature mock of the JupyterLab window styled by a config. */
function PresetThumbnail(props: IPresetThumbnailProps): JSX.Element {
  const { colors, background, appearance } = props.config;
  const color = (variable: string): string =>
    colors[variable] || props.themeValue(variable);
  const preview = backgroundPreviewCss(props.config);
  const hasBackground = preview !== '';
  const chrome = (variable: string): string =>
    hasBackground
      ? `color-mix(in srgb, ${color(variable)} ${Math.round(background.chromeOpacity * 100)}%, transparent)`
      : color(variable);
  const radius = `${Math.min(6, appearance.radius / 2)}px`;
  const gap = appearance.floatingPanels ? '3px' : '0';

  return (
    <div
      className="jp-neptuneatelier-Thumb"
      style={{
        background: hasBackground ? preview : color('--jp-layout-color3'),
        gap,
        padding: gap
      }}
      aria-hidden="true"
    >
      <div
        className="jp-neptuneatelier-ThumbBar"
        style={{
          background: chrome('--jp-layout-color1'),
          borderRadius: radius
        }}
      />
      <div className="jp-neptuneatelier-ThumbBody" style={{ gap }}>
        <div
          className="jp-neptuneatelier-ThumbSide"
          style={{
            background: chrome('--jp-layout-color1'),
            borderRadius: radius
          }}
        />
        <div
          className="jp-neptuneatelier-ThumbContent"
          style={{
            background: color('--jp-layout-color0'),
            borderRadius: radius
          }}
        >
          <span
            className="jp-neptuneatelier-ThumbLine"
            style={{ background: color('--jp-brand-color1'), width: '35%' }}
          />
          <span
            className="jp-neptuneatelier-ThumbLine"
            style={{ background: color('--jp-ui-font-color2'), width: '75%' }}
          />
          <span
            className="jp-neptuneatelier-ThumbLine"
            style={{ background: color('--jp-ui-font-color3'), width: '55%' }}
          />
        </div>
      </div>
    </div>
  );
}

/** Renders the same mock the on-screen thumbnail shows (top bar, sidebar,
 * content with a few lines) to a canvas, for a downloadable PNG. Uses flat
 * colors even for gradient/shader backgrounds — a close approximation, not
 * a pixel-perfect render. */
function renderThumbnailPng(
  config: IThemeConfig,
  themeValue: (variable: string) => string
): string {
  const { colors, appearance } = config;
  const color = (variable: string): string =>
    colors[variable] || themeValue(variable);
  const width = 320;
  const height = 200;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }
  const radius = Math.min(10, appearance.radius);

  const rounded = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string
  ): void => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
  };

  rounded(0, 0, width, height, color('--jp-layout-color3'));
  rounded(6, 6, width - 12, 20, color('--jp-layout-color1'));
  rounded(6, 32, 44, height - 38, color('--jp-layout-color1'));
  rounded(56, 32, width - 62, height - 38, color('--jp-layout-color0'));

  const lines: [string, number][] = [
    [color('--jp-brand-color1'), 0.35],
    [color('--jp-ui-font-color2'), 0.75],
    [color('--jp-ui-font-color3'), 0.55]
  ];
  let y = 46;
  for (const [fill, fraction] of lines) {
    rounded(68, y, (width - 86) * fraction, 6, fill);
    y += 16;
  }

  return canvas.toDataURL('image/png');
}

export interface IPresetsTabProps {
  services: IStudioServices;
}

/**
 * Save the current theme under a name, apply/export/delete saved presets,
 * import shared preset files, and apply the built-in starter themes.
 */
export function PresetsTab(props: IPresetsTabProps): JSX.Element {
  const { settings, presetManager, themeApplier } = props.services;
  const [presets] = useSetting<IThemePreset[]>(
    settings,
    'presets',
    normalizePresets
  );
  const [name, setName] = useState('');
  const themeValue = (variable: string): string =>
    themeApplier.themeValue(variable);

  const handleSave = async (): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    await presetManager.save(trimmed, readThemeConfig(settings));
    setName('');
  };

  const handleImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    try {
      const parsed = await presetManager.parseImport(file);
      if (parsed.preset.config.customCss.trim()) {
        const result = await showDialog({
          title: 'This preset includes custom CSS',
          body: 'Custom CSS can change anything on the page and load content from other websites. Only import it if you trust where this file came from.',
          buttons: [
            Dialog.cancelButton(),
            Dialog.warnButton({ label: 'Import anyway' })
          ]
        });
        if (!result.button.accept) {
          return;
        }
      }
      await presetManager.addImported(parsed);
    } catch (error) {
      console.error('neptuneatelier: failed to import preset', error);
      await showErrorMessage(
        'Import failed',
        error instanceof Error
          ? error.message
          : 'The selected file is not a valid preset.'
      );
    }
  };

  const downloadThumbnail = (preset: IThemePreset): void => {
    const dataUrl = renderThumbnailPng(preset.config, themeValue);
    if (!dataUrl) {
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `${preset.name || 'theme-preset'}.png`;
    anchor.click();
  };

  const copyShareLink = async (preset: IThemePreset): Promise<void> => {
    try {
      await navigator.clipboard.writeText(toShareLink(preset));
      Notification.success('Link copied. Anyone who opens it can import it.', {
        autoClose: 4000
      });
    } catch (error) {
      console.error('neptuneatelier: failed to copy the share link', error);
      await showErrorMessage(
        'Copy failed',
        'The link could not be copied to your clipboard.'
      );
    }
  };

  // A shared preset link (pasted or clicked) shows up in the URL hash on
  // load; offer to import it once, then clear the hash either way.
  useEffect(() => {
    const shared = parseShareLink();
    if (!shared) {
      return;
    }
    void (async () => {
      const result = await showDialog({
        title: 'Import shared preset?',
        body: `"${shared.name}" was shared with you as a link. Only import presets from people you trust — custom CSS (if any) can change anything on the page.`,
        buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Import' })]
      });
      if (result.button.accept) {
        await presetManager.addImported({ preset: shared });
      }
      clearShareLink();
    })();
    // Only ever check the hash once, on mount.
  }, []);

  return (
    <div className="jp-neptuneatelier-Tab">
      <Section title="Save current theme">
        <div className="jp-neptuneatelier-ButtonRow">
          <input
            type="text"
            className="jp-neptuneatelier-TextInput"
            placeholder="Preset name"
            value={name}
            onChange={event => setName(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                void handleSave();
              }
            }}
          />
          <button
            type="button"
            className="jp-neptuneatelier-Button jp-mod-accept"
            disabled={!name.trim()}
            onClick={() => void handleSave()}
          >
            Save
          </button>
        </div>
      </Section>

      <Section title="Your presets">
        {presets.length === 0 && (
          <div className="jp-neptuneatelier-FieldDescription">
            No saved presets yet.
          </div>
        )}
        <ul className="jp-neptuneatelier-PresetList">
          {presets.map(preset => (
            <li key={preset.id} className="jp-neptuneatelier-PresetItem">
              <PresetThumbnail config={preset.config} themeValue={themeValue} />
              <div className="jp-neptuneatelier-PresetInfo">
                <span className="jp-neptuneatelier-PresetName">
                  {preset.name}
                </span>
                <div className="jp-neptuneatelier-PresetActions">
                  <button
                    type="button"
                    className="jp-neptuneatelier-Button jp-mod-accept"
                    onClick={() => void presetManager.apply(preset.id)}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    className="jp-neptuneatelier-Button"
                    onClick={() => void presetManager.export(preset.id)}
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    className="jp-neptuneatelier-Button"
                    onClick={() => void copyShareLink(preset)}
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    className="jp-neptuneatelier-Button"
                    onClick={() => downloadThumbnail(preset)}
                  >
                    Download image
                  </button>
                  <button
                    type="button"
                    className="jp-neptuneatelier-Button"
                    onClick={() => void presetManager.delete(preset.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <label className="jp-neptuneatelier-Button">
          Import preset file…
          <input
            type="file"
            accept="application/json,.json"
            className="jp-neptuneatelier-HiddenInput"
            onChange={event => void handleImport(event)}
          />
        </label>
      </Section>

      <Section title="Randomize">
        <div className="jp-neptuneatelier-FieldDescription">
          Generates a coherent random theme — palette, background, an effect
          layer roughly half the time, shape, and fonts. Replaces your current
          theme (use Undo to go back).
        </div>
        <div className="jp-neptuneatelier-ButtonRow">
          <button
            type="button"
            className="jp-neptuneatelier-Button jp-mod-accept"
            onClick={() => void writeThemeConfig(settings, randomizeTheme())}
          >
            Randomize theme
          </button>
        </div>
      </Section>

      <Section title="Starter themes">
        <div className="jp-neptuneatelier-FieldDescription">
          Replaces your current theme (saved presets are kept). Use Undo to go
          back.
        </div>
        <div className="jp-neptuneatelier-StarterGrid">
          {STARTER_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              className="jp-neptuneatelier-StarterCard"
              onClick={() => void writeThemeConfig(settings, preset.config)}
            >
              <PresetThumbnail config={preset.config} themeValue={themeValue} />
              <span className="jp-neptuneatelier-PresetName">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
