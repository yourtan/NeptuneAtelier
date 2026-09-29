import * as React from 'react';
import { cssColorToHex } from '../color-values';

interface ISectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** A collapsible group of related controls. */
export function Section(props: ISectionProps): JSX.Element {
  return (
    <details
      className="jp-neptuneatelier-Section"
      open={props.defaultOpen ?? true}
    >
      <summary className="jp-neptuneatelier-SectionTitle">
        {props.title}
      </summary>
      <div className="jp-neptuneatelier-SectionBody">{props.children}</div>
    </details>
  );
}

interface IRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

/** A labelled control, with optional help text underneath. */
export function Row(props: IRowProps): JSX.Element {
  return (
    <div className="jp-neptuneatelier-Row">
      <div className="jp-neptuneatelier-RowMain">
        <span className="jp-neptuneatelier-FieldLabel">{props.label}</span>
        <div className="jp-neptuneatelier-RowControl">{props.children}</div>
      </div>
      {props.description && (
        <div className="jp-neptuneatelier-FieldDescription">
          {props.description}
        </div>
      )}
    </div>
  );
}

interface IColorInputProps {
  value: string;
  onChange: (value: string) => void;
  title?: string;
}

/** Minimal shape of the browser's EyeDropper API (not yet in lib.dom.d.ts). */
interface IEyeDropperResult {
  sRGBHex: string;
}
interface IEyeDropper {
  open(): Promise<IEyeDropperResult>;
}
type EyeDropperConstructor = new () => IEyeDropper;

/** Chrome/Edge only; undefined elsewhere (Firefox, Safari). */
function getEyeDropper(): EyeDropperConstructor | undefined {
  return (window as { EyeDropper?: EyeDropperConstructor }).EyeDropper;
}

/**
 * Native color picker that accepts any CSS color as its value, plus an
 * eyedropper button (where the browser supports it) to pick a color from
 * anywhere on screen.
 */
export function ColorInput(props: IColorInputProps): JSX.Element {
  const EyeDropper = getEyeDropper();
  const pick = async (): Promise<void> => {
    if (!EyeDropper) {
      return;
    }
    try {
      const result = await new EyeDropper().open();
      props.onChange(result.sRGBHex);
    } catch {
      // Cancelled (Escape or click elsewhere); nothing to do.
    }
  };
  return (
    <span className="jp-neptuneatelier-ColorInputGroup">
      <input
        type="color"
        className="jp-neptuneatelier-ColorInput"
        title={props.title}
        value={cssColorToHex(props.value)}
        onChange={event => props.onChange(event.target.value)}
      />
      {EyeDropper && (
        <button
          type="button"
          className="jp-neptuneatelier-EyedropperButton"
          title="Pick a color from anywhere on screen"
          onClick={() => void pick()}
        >
          Pick
        </button>
      )}
    </span>
  );
}

interface IPlainColorRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

/** A color that always has a value (nothing to inherit). */
export function PlainColorRow(props: IPlainColorRowProps): JSX.Element {
  return (
    <Row label={props.label} description={props.description}>
      <ColorInput value={props.value} onChange={props.onChange} />
    </Row>
  );
}

interface IColorRowProps {
  label: string;
  /** The user's override, or '' to inherit. */
  value: string;
  /** What the color resolves to when not overridden. */
  inherited: string;
  onChange: (value: string) => void;
  description?: string;
}

/**
 * A color that can either be overridden or inherit a value (from the
 * theme, typically). Inherited colors are shown dimmed with an "auto"
 * badge; overridden ones get a button to go back to inheriting.
 */
export function ColorRow(props: IColorRowProps): JSX.Element {
  const overridden = props.value !== '';
  return (
    <Row label={props.label} description={props.description}>
      {overridden ? (
        <button
          type="button"
          className="jp-neptuneatelier-LinkButton"
          title="Use the theme's color again"
          onClick={() => props.onChange('')}
        >
          Reset
        </button>
      ) : (
        <span className="jp-neptuneatelier-Badge" title="Inherited from theme">
          auto
        </span>
      )}
      <span
        className={
          'jp-neptuneatelier-ColorWrap' +
          (overridden ? '' : ' jp-neptuneatelier-mod-inherited')
        }
      >
        <ColorInput
          value={overridden ? props.value : props.inherited}
          onChange={props.onChange}
        />
      </span>
    </Row>
  );
}

interface ISliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Formats the displayed value; defaults to the raw number. */
  format?: (value: number) => string;
  description?: string;
  /** When given and the value differs from it, shows a "Reset" link. */
  defaultValue?: number;
}

export function SliderRow(props: ISliderRowProps): JSX.Element {
  const shown = props.format ? props.format(props.value) : String(props.value);
  const canReset =
    props.defaultValue !== undefined && props.value !== props.defaultValue;
  return (
    <Row label={`${props.label} (${shown})`} description={props.description}>
      <input
        type="range"
        className="jp-neptuneatelier-Slider"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={event => props.onChange(Number(event.target.value))}
      />
      {canReset && (
        <button
          type="button"
          className="jp-neptuneatelier-LinkButton"
          title="Reset to default"
          onClick={() => props.onChange(props.defaultValue as number)}
        >
          Reset
        </button>
      )}
    </Row>
  );
}

interface IToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export function ToggleRow(props: IToggleRowProps): JSX.Element {
  return (
    <label className="jp-neptuneatelier-Row jp-neptuneatelier-ToggleRow">
      <input
        type="checkbox"
        className="jp-neptuneatelier-Checkbox"
        checked={props.checked}
        onChange={event => props.onChange(event.target.checked)}
      />
      <span className="jp-neptuneatelier-ToggleText">
        <span className="jp-neptuneatelier-FieldLabel">{props.label}</span>
        {props.description && (
          <span className="jp-neptuneatelier-FieldDescription">
            {props.description}
          </span>
        )}
      </span>
    </label>
  );
}

export interface IOption<T extends string> {
  value: T;
  label: string;
}

interface ISelectRowProps<T extends string> {
  label: string;
  value: T;
  options: IOption<T>[];
  onChange: (value: T) => void;
  description?: string;
}

export function SelectRow<T extends string>(
  props: ISelectRowProps<T>
): JSX.Element {
  return (
    <Row label={props.label} description={props.description}>
      <select
        className="jp-neptuneatelier-Select"
        value={props.value}
        onChange={event => {
          const option = props.options.find(
            item => item.value === event.target.value
          );
          if (option) {
            props.onChange(option.value);
          }
        }}
      >
        {props.options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Row>
  );
}

/** Reads a user-picked file as a data URL. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('neptuneatelier: file did not read as a data URL'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
