import * as React from 'react';
import { useRef, useState } from 'react';
import { DEFAULT_GRADIENT, GRADIENT_PRESETS } from '../defaults';
import { colorAt, gradientToCss, stopsPreviewCss } from '../gradient';
import {
  GradientAnimation,
  GradientKind,
  IGradientConfig,
  IGradientStop
} from '../types';
import { ColorInput, Row, SelectRow, SliderRow } from './controls';

/** CSS gradient angles: 0° points up, 90° right. Scrolling moves the
 * pattern toward the angle. */
const SCROLL_DIRECTIONS = [
  { label: 'Left', symbol: '←', angle: 270 },
  { label: 'Up', symbol: '↑', angle: 0 },
  { label: 'Down', symbol: '↓', angle: 180 },
  { label: 'Right', symbol: '→', angle: 90 }
];

function animationDescription(gradient: IGradientConfig): string {
  switch (gradient.animation) {
    case 'rotate':
      return gradient.kind === 'radial'
        ? 'Slowly drifts the gradient around.'
        : 'Slowly rotates the gradient.';
    case 'scroll':
      if (gradient.kind === 'radial') {
        return 'Rings of color ripple endlessly outward from the center.';
      }
      if (gradient.kind === 'conic') {
        return 'Conic gradients rotate when set to scroll.';
      }
      return 'Scrolls endlessly toward the angle (use the arrows or the dial). The colors repeat mirrored, so there is no visible seam.';
    default:
      return '';
  }
}

export interface IGradientEditorProps {
  value: IGradientConfig;
  onChange: (value: IGradientConfig) => void;
}

function clampPosition(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}

interface IAngleDialProps {
  angle: number;
  onChange: (angle: number) => void;
}

/** A draggable dial for picking an angle, 0° pointing up, clockwise. */
function AngleDial(props: IAngleDialProps): JSX.Element {
  const dialRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const angleFromPointer = (event: React.PointerEvent): number | null => {
    const dial = dialRef.current;
    if (!dial) {
      return null;
    }
    const rect = dial.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
    // Snap to 5° steps; hold Shift for 1° precision.
    const step = event.shiftKey ? 1 : 5;
    return (Math.round(degrees / step) * step + 360) % 360;
  };

  const update = (event: React.PointerEvent): void => {
    const angle = angleFromPointer(event);
    if (angle !== null) {
      props.onChange(angle);
    }
  };

  return (
    <div
      ref={dialRef}
      className="jp-neptuneatelier-AngleDial"
      title="Drag to set the angle (hold Shift for 1° steps)"
      onPointerDown={event => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event);
      }}
      onPointerMove={event => {
        if (dragging.current) {
          update(event);
        }
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
    >
      <div
        className="jp-neptuneatelier-AngleNeedle"
        style={{ transform: `rotate(${props.angle}deg)` }}
      />
    </div>
  );
}

/**
 * Visual gradient editor: presets, a live preview, an angle dial, and a
 * stop bar where handles are dragged to move stops, clicking empty space
 * adds a stop (at the color already showing there), and the selected
 * stop's color and position can be edited precisely below.
 */
export function GradientEditor(props: IGradientEditorProps): JSX.Element {
  const { value, onChange } = props;
  const [selected, setSelected] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const dragIndex = useRef<number | null>(null);
  const selectedIndex = Math.min(selected, value.stops.length - 1);
  const selectedStop = value.stops[selectedIndex];

  const positionFromPointer = (clientX: number): number => {
    const bar = barRef.current;
    if (!bar) {
      return 0;
    }
    const rect = bar.getBoundingClientRect();
    return clampPosition(((clientX - rect.left) / rect.width) * 100);
  };

  const setStops = (stops: IGradientStop[]): void => {
    onChange({ ...value, stops });
  };

  const updateStop = (index: number, patch: Partial<IGradientStop>): void => {
    setStops(
      value.stops.map((stop, i) => (i === index ? { ...stop, ...patch } : stop))
    );
  };

  const addStopAt = (position: number): void => {
    const stops = [
      ...value.stops,
      { color: colorAt(value.stops, position), position }
    ];
    setStops(stops);
    setSelected(stops.length - 1);
  };

  const removeSelected = (): void => {
    if (value.stops.length <= 2) {
      return;
    }
    setStops(value.stops.filter((_, i) => i !== selectedIndex));
    setSelected(0);
  };

  return (
    <div className="jp-neptuneatelier-GradientEditor">
      <div className="jp-neptuneatelier-PresetSwatches">
        {GRADIENT_PRESETS.map(preset => (
          <button
            key={preset.name}
            type="button"
            className="jp-neptuneatelier-Swatch"
            title={preset.name}
            style={{ backgroundImage: gradientToCss(preset.gradient) }}
            onClick={() =>
              onChange({
                ...preset.gradient,
                animation: value.animation,
                speed: value.speed,
                scrollSize: value.scrollSize
              })
            }
          />
        ))}
      </div>

      <div
        className="jp-neptuneatelier-GradientPreview"
        style={{ backgroundImage: gradientToCss(value) }}
      />

      <div className="jp-neptuneatelier-FieldDescription">
        Drag the handles to move colors. Click the bar to add a color.
      </div>
      <div
        ref={barRef}
        className="jp-neptuneatelier-StopBar"
        style={{ backgroundImage: stopsPreviewCss(value.stops) }}
        onPointerDown={event => {
          if (event.target === event.currentTarget) {
            addStopAt(positionFromPointer(event.clientX));
          }
        }}
      >
        {value.stops.map((stop, index) => (
          <div
            key={index}
            role="slider"
            aria-label={`Color stop ${index + 1}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={stop.position}
            tabIndex={0}
            className={
              'jp-neptuneatelier-StopHandle' +
              (index === selectedIndex ? ' jp-mod-selected' : '')
            }
            style={{ left: `${stop.position}%`, background: stop.color }}
            onPointerDown={event => {
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              dragIndex.current = index;
              setSelected(index);
            }}
            onPointerMove={event => {
              if (dragIndex.current === index) {
                updateStop(index, {
                  position: positionFromPointer(event.clientX)
                });
              }
            }}
            onPointerUp={() => {
              dragIndex.current = null;
            }}
            onKeyDown={event => {
              const delta =
                event.key === 'ArrowLeft'
                  ? -1
                  : event.key === 'ArrowRight'
                    ? 1
                    : 0;
              if (delta !== 0) {
                event.preventDefault();
                updateStop(index, {
                  position: clampPosition(
                    stop.position + delta * (event.shiftKey ? 10 : 1)
                  )
                });
              } else if (event.key === 'Delete') {
                removeSelected();
              }
            }}
          />
        ))}
      </div>

      {selectedStop && (
        <Row label={`Selected color (at ${selectedStop.position}%)`}>
          <ColorInput
            value={selectedStop.color}
            onChange={color => updateStop(selectedIndex, { color })}
          />
          <button
            type="button"
            className="jp-neptuneatelier-LinkButton"
            disabled={value.stops.length <= 2}
            title={
              value.stops.length <= 2
                ? 'A gradient needs at least two colors'
                : 'Remove this color'
            }
            onClick={removeSelected}
          >
            Remove
          </button>
        </Row>
      )}

      <SelectRow<GradientKind>
        label="Shape"
        value={value.kind}
        options={[
          { value: 'linear', label: 'Linear' },
          { value: 'radial', label: 'Radial (from center)' },
          { value: 'conic', label: 'Conic (sweep)' }
        ]}
        onChange={kind => onChange({ ...value, kind })}
      />
      {value.kind !== 'radial' && (
        <Row label={`Angle (${value.angle}°)`}>
          <AngleDial
            angle={value.angle}
            onChange={angle => onChange({ ...value, angle })}
          />
        </Row>
      )}
      <SelectRow<GradientAnimation>
        label="Animation"
        value={value.animation}
        options={[
          { value: 'none', label: 'None' },
          {
            value: 'rotate',
            label: value.kind === 'radial' ? 'Drift' : 'Rotate'
          },
          {
            value: 'scroll',
            label: value.kind === 'radial' ? 'Ripple outward' : 'Scroll'
          }
        ]}
        description={animationDescription(value)}
        onChange={animation => onChange({ ...value, animation })}
      />
      {value.animation === 'scroll' && value.kind === 'linear' && (
        <Row label="Scroll direction">
          <div className="jp-neptuneatelier-ButtonRow">
            {SCROLL_DIRECTIONS.map(direction => (
              <button
                key={direction.label}
                type="button"
                className={
                  'jp-neptuneatelier-Button' +
                  (value.angle === direction.angle ? ' jp-mod-accept' : '')
                }
                title={`Scroll ${direction.label.toLowerCase()} (sets the angle to ${direction.angle}°)`}
                onClick={() => onChange({ ...value, angle: direction.angle })}
              >
                {direction.symbol}
              </button>
            ))}
          </div>
        </Row>
      )}
      {value.animation === 'scroll' && value.kind !== 'conic' && (
        <SliderRow
          label="Repeat length"
          value={value.scrollSize}
          min={200}
          max={4000}
          step={50}
          format={v => `${v}px`}
          description="How far the gradient travels before it repeats. Longer is smoother and calmer."
          defaultValue={DEFAULT_GRADIENT.scrollSize}
          onChange={scrollSize => onChange({ ...value, scrollSize })}
        />
      )}
      {value.animation !== 'none' && (
        <SliderRow
          label="Animation speed"
          value={value.speed}
          min={0.1}
          max={5}
          step={0.1}
          format={v => `${v.toFixed(1)}×`}
          defaultValue={DEFAULT_GRADIENT.speed}
          onChange={speed => onChange({ ...value, speed })}
        />
      )}
      <Row label="CSS">
        <input
          type="text"
          readOnly
          className="jp-neptuneatelier-TextInput jp-neptuneatelier-CodeText"
          value={gradientToCss(value)}
          onFocus={event => event.currentTarget.select()}
        />
      </Row>
    </div>
  );
}
