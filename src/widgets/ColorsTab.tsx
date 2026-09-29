import { showErrorMessage } from '@jupyterlab/apputils';
import * as React from 'react';
import { useState } from 'react';
import { contrastRatio, relativeLuminance, parseColor } from '../color-values';
import {
  normalizeAppearance,
  normalizeBackground,
  normalizeColors
} from '../config-normalizers';
import { COLOR_GROUPS, SYNTAX_THEME_PACKS } from '../defaults';
import {
  extractImageSeed,
  generatePalette,
  PaletteHarmony,
  PaletteMode
} from '../palette-generator';
import { IColorOverrides } from '../types';
import {
  ColorInput,
  ColorRow,
  readFileAsDataUrl,
  Section,
  SelectRow
} from './controls';
import { useSetting, useSignalRefresh } from './studio-hooks';
import { IStudioServices } from './studio-services';

/** WCAG AA minimum contrast for normal-size text. */
const MIN_CONTRAST = 4.5;

interface IContrastCheck {
  label: string;
  text: string;
  surface: string;
}

/** Every meaningful text/surface pairing in the theme, for the audit view
 * below. The first four (unchanged) also drive the "Hard-to-read text"
 * warning at the top for quick visibility. */
const CONTRAST_CHECKS: IContrastCheck[] = [
  {
    label: 'UI text on panels',
    text: '--jp-ui-font-color1',
    surface: '--jp-layout-color1'
  },
  {
    label: 'UI text on raised panels',
    text: '--jp-ui-font-color1',
    surface: '--jp-layout-color2'
  },
  {
    label: 'Document text on content',
    text: '--jp-content-font-color1',
    surface: '--jp-layout-color0'
  },
  {
    label: 'Code on code cells',
    text: '--jp-mirror-editor-variable-color',
    surface: '--jp-cell-editor-background'
  },
  {
    label: 'Strong UI text on panels',
    text: '--jp-ui-font-color0',
    surface: '--jp-layout-color1'
  },
  {
    label: 'Muted UI text on panels',
    text: '--jp-ui-font-color2',
    surface: '--jp-layout-color1'
  },
  {
    label: 'Links on content',
    text: '--jp-content-link-color',
    surface: '--jp-layout-color0'
  },
  {
    label: 'Success text on content',
    text: '--jp-success-color1',
    surface: '--jp-layout-color0'
  },
  {
    label: 'Warning text on content',
    text: '--jp-warn-color1',
    surface: '--jp-layout-color0'
  },
  {
    label: 'Error text on content',
    text: '--jp-error-color1',
    surface: '--jp-layout-color0'
  },
  {
    label: 'Comments on code cells',
    text: '--jp-mirror-editor-comment-color',
    surface: '--jp-cell-editor-background'
  },
  {
    label: 'Keywords on code cells',
    text: '--jp-mirror-editor-keyword-color',
    surface: '--jp-cell-editor-background'
  }
];

export interface IColorsTabProps {
  services: IStudioServices;
}

/**
 * Palette editor. Every color can inherit the active theme's value or be
 * overridden; a generator builds a full coordinated palette from one
 * accent color or an image, and a contrast check flags unreadable text.
 */
export function ColorsTab(props: IColorsTabProps): JSX.Element {
  const { settings, themeApplier } = props.services;
  useSignalRefresh(themeApplier.applied);
  const [colors, setColors] = useSetting<IColorOverrides>(
    settings,
    'colors',
    normalizeColors
  );
  const [background] = useSetting(settings, 'background', normalizeBackground);
  const [appearance, setAppearance] = useSetting(
    settings,
    'appearance',
    normalizeAppearance
  );

  /** Applies a generated palette and switches JupyterLab's base theme to
   * the same brightness, so colors the palette doesn't cover match too. */
  const applyGenerated = (
    accent: string,
    mode: PaletteMode,
    harmony: PaletteHarmony
  ): void => {
    setColors(generatePalette(accent, mode, harmony));
    setAppearance({ ...appearance, baseTheme: mode });
  };
  const [seedAccent, setSeedAccent] = useState('#6c8cff');
  const [seedMode, setSeedMode] = useState<PaletteMode>('dark');
  const [seedHarmony, setSeedHarmony] =
    useState<PaletteHarmony>('complementary');

  const effective = (variable: string): string =>
    colors[variable] || themeApplier.themeValue(variable);

  const setColor = (variable: string, value: string): void => {
    const next: IColorOverrides = { ...colors };
    if (value) {
      next[variable] = value;
    } else {
      delete next[variable];
    }
    setColors(next);
  };

  const generateFromImage = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    try {
      const seed = await extractImageSeed(await readFileAsDataUrl(file));
      setSeedAccent(seed.accent);
      setSeedMode(seed.mode);
      applyGenerated(seed.accent, seed.mode, seedHarmony);
    } catch (error) {
      console.error('neptuneatelier: palette generation failed', error);
      await showErrorMessage(
        'Palette generation failed',
        'That image could not be read. Try a PNG or JPEG file.'
      );
    }
  };

  const failing = CONTRAST_CHECKS.map(check => ({
    check,
    ratio: contrastRatio(effective(check.text), effective(check.surface))
  })).filter(
    (result): result is { check: IContrastCheck; ratio: number } =>
      result.ratio !== null && result.ratio < MIN_CONTRAST
  );

  const fixContrast = (check: IContrastCheck): void => {
    const surface = parseColor(effective(check.surface));
    const dark = surface ? relativeLuminance(surface) > 0.4 : true;
    setColor(check.text, dark ? '#111111' : '#f5f5f5');
  };

  return (
    <div className="jp-neptuneatelier-Tab">
      <Section title="Generate a palette">
        <div className="jp-neptuneatelier-FieldDescription">
          Builds a full, coordinated palette (surfaces, text, borders, accents,
          and syntax colors) from one color or a picture, and switches
          JupyterLab to its matching light or dark base theme. It replaces your
          current color overrides — use Undo to go back.
        </div>
        <SelectRow<PaletteMode>
          label="Mode"
          value={seedMode}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' }
          ]}
          onChange={setSeedMode}
        />
        <SelectRow<PaletteHarmony>
          label="Harmony"
          value={seedHarmony}
          options={[
            { value: 'complementary', label: 'Complementary (opposite hue)' },
            { value: 'triadic', label: 'Triadic (120° apart)' },
            { value: 'analogous', label: 'Analogous (30° apart)' }
          ]}
          description="How the secondary accent's hue relates to the main accent's."
          onChange={setSeedHarmony}
        />
        <div className="jp-neptuneatelier-ButtonRow">
          <ColorInput
            value={seedAccent}
            onChange={setSeedAccent}
            title="Accent color"
          />
          <button
            type="button"
            className="jp-neptuneatelier-Button jp-mod-accept"
            onClick={() => applyGenerated(seedAccent, seedMode, seedHarmony)}
          >
            Generate from color
          </button>
          <label className="jp-neptuneatelier-Button">
            From image…
            <input
              type="file"
              accept="image/*"
              className="jp-neptuneatelier-HiddenInput"
              onChange={event => void generateFromImage(event)}
            />
          </label>
        </div>
        <button
          type="button"
          className="jp-neptuneatelier-LinkButton"
          onClick={() => setColors({})}
        >
          Clear all overrides (use the theme's colors)
        </button>
      </Section>

      <Section title="Syntax highlighting presets" defaultOpen={false}>
        <div className="jp-neptuneatelier-FieldDescription">
          One-click code-color schemes. These only touch the syntax colors below
          — everything else (surfaces, UI text) stays as you have it.
        </div>
        <div className="jp-neptuneatelier-ButtonRow">
          {SYNTAX_THEME_PACKS.map(pack => (
            <button
              key={pack.name}
              type="button"
              className="jp-neptuneatelier-Button"
              onClick={() => setColors({ ...colors, ...pack.colors })}
            >
              {pack.name}
            </button>
          ))}
        </div>
      </Section>

      {failing.length > 0 && (
        <div className="jp-neptuneatelier-Warning" role="alert">
          <strong>Hard-to-read text</strong>
          {background.type !== 'none' && (
            <div className="jp-neptuneatelier-FieldDescription">
              A background is on, so panels are partly see-through — check
              readability against it too.
            </div>
          )}
          {failing.map(({ check, ratio }) => (
            <div key={check.label} className="jp-neptuneatelier-WarningItem">
              <span>
                {check.label}: {ratio.toFixed(1)}:1 (aim for {MIN_CONTRAST}:1)
              </span>
              <button
                type="button"
                className="jp-neptuneatelier-LinkButton"
                onClick={() => fixContrast(check)}
              >
                Fix
              </button>
            </div>
          ))}
        </div>
      )}

      <Section title="Accessibility audit" defaultOpen={false}>
        <div className="jp-neptuneatelier-FieldDescription">
          WCAG contrast ratio for every meaningful text/surface pair in the
          theme, checked against the AA minimum for normal text ({MIN_CONTRAST}
          :1).
        </div>
        <ul className="jp-neptuneatelier-AuditList">
          {CONTRAST_CHECKS.map(check => {
            const ratio = contrastRatio(
              effective(check.text),
              effective(check.surface)
            );
            const pass = ratio !== null && ratio >= MIN_CONTRAST;
            return (
              <li key={check.label} className="jp-neptuneatelier-AuditItem">
                <span
                  className={
                    'jp-neptuneatelier-AuditBadge' +
                    (pass
                      ? ' jp-neptuneatelier-mod-pass'
                      : ' jp-neptuneatelier-mod-fail')
                  }
                >
                  {pass ? 'Pass' : 'Fail'}
                </span>
                <span className="jp-neptuneatelier-AuditLabel">
                  {check.label}
                </span>
                <span className="jp-neptuneatelier-AuditRatio">
                  {ratio === null ? '—' : `${ratio.toFixed(1)}:1`}
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      {COLOR_GROUPS.map((group, index) => (
        <Section key={group.title} title={group.title} defaultOpen={index < 3}>
          {group.fields.map(field => (
            <ColorRow
              key={field.variable}
              label={field.label}
              value={colors[field.variable] ?? ''}
              inherited={themeApplier.themeValue(field.variable)}
              onChange={value => setColor(field.variable, value)}
            />
          ))}
        </Section>
      ))}
    </div>
  );
}
