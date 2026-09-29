import * as React from 'react';
import { useState } from 'react';
import { normalizeAppearance } from '../config-normalizers';
import {
  CODE_FONT_OPTIONS,
  DEFAULT_APPEARANCE_CONFIG,
  IFontOption,
  UI_FONT_OPTIONS
} from '../defaults';
import {
  BaseTheme,
  BorderStyle,
  CursorStyle,
  IAppearanceConfig
} from '../types';
import {
  PlainColorRow,
  Row,
  Section,
  SelectRow,
  SliderRow,
  ToggleRow
} from './controls';
import { useSetting } from './studio-hooks';
import { IStudioServices } from './studio-services';

const THEME_DEFAULT = '';
const CUSTOM = '__custom__';

interface IFontPickerProps {
  label: string;
  value: string;
  options: IFontOption[];
  onChange: (value: string) => void;
}

/**
 * Font dropdown with a "Custom…" entry that reveals a text field for any
 * locally installed font. Google Fonts entries are loaded on demand.
 */
function FontPicker(props: IFontPickerProps): JSX.Element {
  const known = props.options.some(option => option.label === props.value);
  const [customOpen, setCustomOpen] = useState(false);
  const isCustom = customOpen || (props.value !== THEME_DEFAULT && !known);
  const selectValue = isCustom ? CUSTOM : props.value;

  return (
    <>
      <Row label={props.label}>
        <select
          className="jp-neptuneatelier-Select"
          value={selectValue}
          onChange={event => {
            const next = event.target.value;
            if (next === CUSTOM) {
              setCustomOpen(true);
              return;
            }
            setCustomOpen(false);
            props.onChange(next);
          }}
        >
          <option value={THEME_DEFAULT}>Theme default</option>
          {props.options.map(option => (
            <option key={option.label} value={option.label}>
              {option.label}
              {option.google ? ' (Google Fonts)' : ''}
            </option>
          ))}
          <option value={CUSTOM}>Custom…</option>
        </select>
      </Row>
      {isCustom && (
        <Row
          label="Font name"
          description="Any font installed on this computer, e.g. Cascadia Code."
        >
          <input
            type="text"
            className="jp-neptuneatelier-TextInput"
            placeholder="Font family"
            value={known ? '' : props.value}
            onChange={event => props.onChange(event.target.value)}
          />
        </Row>
      )}
    </>
  );
}

const orTheme =
  (unit: string) =>
  (value: number): string =>
    value === 0 ? 'theme' : `${value}${unit}`;

export interface IStyleTabProps {
  services: IStudioServices;
}

/** Shape, surfaces, fonts, cursor, and motion. */
export function StyleTab(props: IStyleTabProps): JSX.Element {
  const [appearance, setAppearance] = useSetting<IAppearanceConfig>(
    props.services.settings,
    'appearance',
    normalizeAppearance
  );
  const patch = (changes: Partial<IAppearanceConfig>): void => {
    setAppearance({ ...appearance, ...changes });
  };

  return (
    <div className="jp-neptuneatelier-Tab">
      <Section title="Base theme">
        <SelectRow<BaseTheme>
          label="JupyterLab theme"
          value={appearance.baseTheme}
          options={[
            { value: 'auto', label: 'Keep my current theme' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' }
          ]}
          description="The built-in theme underneath your customizations. Match it to your palette so every color you haven't set (dialogs, toolbars, prompts) fits too."
          onChange={baseTheme => patch({ baseTheme })}
        />
      </Section>

      <Section title="Shape">
        <SliderRow
          label="Corner radius"
          value={appearance.radius}
          min={0}
          max={24}
          step={1}
          format={v => `${v}px`}
          defaultValue={DEFAULT_APPEARANCE_CONFIG.radius}
          onChange={radius => patch({ radius })}
        />
        <SliderRow
          label="Border thickness"
          value={appearance.borderWidth}
          min={0}
          max={3}
          step={1}
          format={v => `${v}px`}
          defaultValue={DEFAULT_APPEARANCE_CONFIG.borderWidth}
          onChange={borderWidth => patch({ borderWidth })}
        />
        <SelectRow<BorderStyle>
          label="Border style"
          value={appearance.borderStyle}
          options={[
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
            { value: 'double', label: 'Double' }
          ]}
          description="Applies to cells, the toolbar, and buttons."
          onChange={borderStyle => patch({ borderStyle })}
        />
        <ToggleRow
          label="Floating panels"
          description="Separates the sidebars, editor area, and bars into rounded cards with space between them."
          checked={appearance.floatingPanels}
          onChange={floatingPanels => patch({ floatingPanels })}
        />
        {appearance.floatingPanels && (
          <>
            <SliderRow
              label="Gap"
              value={appearance.panelGap}
              min={0}
              max={24}
              step={1}
              format={v => `${v}px`}
              defaultValue={DEFAULT_APPEARANCE_CONFIG.panelGap}
              onChange={panelGap => patch({ panelGap })}
            />
            <SliderRow
              label="Shadow"
              value={appearance.shadow}
              min={0}
              max={3}
              step={0.25}
              format={v => (v === 0 ? 'none' : `${v}×`)}
              defaultValue={DEFAULT_APPEARANCE_CONFIG.shadow}
              onChange={shadow => patch({ shadow })}
            />
            {appearance.shadow > 0 && (
              <PlainColorRow
                label="Shadow color"
                value={appearance.shadowColor}
                onChange={shadowColor => patch({ shadowColor })}
              />
            )}
          </>
        )}
      </Section>

      <Section title="Surfaces">
        <ToggleRow
          label="Glass panels"
          description="Frosted-glass blur behind the menu bar, sidebars, tabs, and status bar. Shows up when there's a background and panel opacity is below 100%."
          checked={appearance.glass}
          onChange={glass => patch({ glass })}
        />
        {appearance.glass && (
          <>
            <SliderRow
              label="Glass blur"
              value={appearance.glassBlur}
              min={0}
              max={40}
              step={1}
              format={v => `${v}px`}
              defaultValue={DEFAULT_APPEARANCE_CONFIG.glassBlur}
              onChange={glassBlur => patch({ glassBlur })}
            />
            <ToggleRow
              label="Acrylic texture"
              description="A subtle noise texture over the glass, for a Windows 11 Mica-like feel."
              checked={appearance.acrylicNoise}
              onChange={acrylicNoise => patch({ acrylicNoise })}
            />
          </>
        )}
        <ToggleRow
          label="Glow"
          description="An ambient accent glow around the active cell, accent buttons, and the active tab."
          checked={appearance.glow}
          onChange={glow => patch({ glow })}
        />
        {appearance.glow && (
          <SliderRow
            label="Glow strength"
            value={appearance.glowIntensity}
            min={0.1}
            max={1}
            step={0.05}
            format={v => `${Math.round(v * 100)}%`}
            defaultValue={DEFAULT_APPEARANCE_CONFIG.glowIntensity}
            onChange={glowIntensity => patch({ glowIntensity })}
          />
        )}
      </Section>

      <Section title="Fonts">
        <FontPicker
          label="Interface font"
          value={appearance.uiFont}
          options={UI_FONT_OPTIONS}
          onChange={uiFont => patch({ uiFont })}
        />
        <SliderRow
          label="Interface size"
          value={appearance.uiFontSize}
          min={0}
          max={20}
          step={1}
          format={orTheme('px')}
          description="0 keeps the theme's size."
          defaultValue={DEFAULT_APPEARANCE_CONFIG.uiFontSize}
          onChange={uiFontSize => patch({ uiFontSize })}
        />
        <FontPicker
          label="Code font"
          value={appearance.codeFont}
          options={CODE_FONT_OPTIONS}
          onChange={codeFont => patch({ codeFont })}
        />
        <SliderRow
          label="Code size"
          value={appearance.codeFontSize}
          min={0}
          max={24}
          step={1}
          format={orTheme('px')}
          defaultValue={DEFAULT_APPEARANCE_CONFIG.codeFontSize}
          onChange={codeFontSize => patch({ codeFontSize })}
        />
        <SliderRow
          label="Code line height"
          value={appearance.codeLineHeight}
          min={0}
          max={2.4}
          step={0.05}
          format={orTheme('')}
          defaultValue={DEFAULT_APPEARANCE_CONFIG.codeLineHeight}
          onChange={codeLineHeight => patch({ codeLineHeight })}
        />
        <ToggleRow
          label="Code ligatures"
          description="Joins character pairs like => and != into single symbols, in fonts that support it (e.g. Fira Code, JetBrains Mono)."
          checked={appearance.ligatures}
          onChange={ligatures => patch({ ligatures })}
        />
        <ToggleRow
          label="Animated gradient headings"
          description="Markdown headings get an accent-colored gradient that slowly animates."
          checked={appearance.gradientHeadings}
          onChange={gradientHeadings => patch({ gradientHeadings })}
        />
        <div className="jp-neptuneatelier-FieldDescription">
          Fonts marked "Google Fonts" are downloaded from fonts.googleapis.com
          when selected.
        </div>
      </Section>

      <Section title="Cursor and motion">
        <SelectRow<CursorStyle>
          label="Cursor"
          value={appearance.cursorStyle}
          options={[
            { value: 'line', label: 'Thin line' },
            { value: 'thick', label: 'Thick line' },
            { value: 'block', label: 'Block' }
          ]}
          onChange={cursorStyle => patch({ cursorStyle })}
        />
        <ToggleRow
          label="Interface animations"
          description="Smooth hover and tab transitions, and new outputs fade in. Turned off automatically if your system asks for reduced motion."
          checked={appearance.animations}
          onChange={animations => patch({ animations })}
        />
        <ToggleRow
          label="Cursor trail"
          description="A trail of small accent-colored sparkles follows your cursor. Off automatically if your system asks for reduced motion."
          checked={appearance.cursorTrail}
          onChange={cursorTrail => patch({ cursorTrail })}
        />
      </Section>
    </div>
  );
}
