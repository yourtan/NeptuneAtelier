import * as React from 'react';
import { normalizeEffects, normalizeEvents } from '../config-normalizers';
import {
  COMMON_COMMANDS,
  createEventRule,
  EVENT_ACTION_OPTIONS,
  EVENT_LOCATION_OPTIONS,
  EVENT_PRESETS,
  EVENT_SOUND_OPTIONS,
  EVENT_TRIGGER_OPTIONS,
  LAYER_ACTIONS
} from '../defaults';
import {
  EventAction,
  EventLocation,
  EventSound,
  EventTrigger,
  IEffectLayer,
  IEventRule
} from '../types';
import { PlainColorRow, Row, Section, SelectRow, SliderRow } from './controls';
import { useSetting } from './studio-hooks';
import { IStudioServices } from './studio-services';

const COMMAND_LIST_ID = 'jp-neptuneatelier-command-suggestions';

/** Field defaults for a new rule, reused as "Reset to default" targets. */
const RULE_DEFAULTS = createEventRule();

/** Actions whose colors matter. */
const COLORED_ACTIONS: readonly EventAction[] = [
  'confetti',
  'fireworks',
  'sparkles',
  'shockwave',
  'flash',
  'glow',
  'typing-animation'
];

/** Actions with only one color, not a 3-color palette. */
const SINGLE_COLOR_ACTIONS: readonly EventAction[] = [
  'flash',
  'glow',
  'typing-animation'
];

/** Actions with no meaningful "size" (they don't scale). */
const UNSIZED_ACTIONS: readonly EventAction[] = ['shake', 'glow'];

/** Actions that always target an element or the whole screen, never a
 * point, so "Where" has no effect. */
const NO_LOCATION_ACTIONS: readonly EventAction[] = ['shake', 'glow', 'flash'];

function optionLabel<T extends string>(
  options: { value: T; label: string }[],
  value: T
): string {
  return options.find(option => option.value === value)?.label ?? value;
}

interface IRuleCardProps {
  rule: IEventRule;
  layers: IEffectLayer[];
  allRules: IEventRule[];
  onChange: (rule: IEventRule) => void;
  onDelete: () => void;
  onPreview: () => void;
}

function RuleCard(props: IRuleCardProps): JSX.Element {
  const { rule, layers } = props;
  const otherRules = props.allRules.filter(item => item.id !== rule.id);
  const patch = (changes: Partial<IEventRule>): void =>
    props.onChange({ ...rule, ...changes });
  const isLayerAction = LAYER_ACTIONS.includes(rule.action);

  return (
    <details className="jp-neptuneatelier-Section">
      <summary className="jp-neptuneatelier-SectionTitle">
        <input
          type="checkbox"
          className="jp-neptuneatelier-Checkbox"
          title={rule.enabled ? 'Turn this rule off' : 'Turn this rule on'}
          checked={rule.enabled}
          onClick={event => event.stopPropagation()}
          onChange={event => patch({ enabled: event.target.checked })}
        />
        <span className="jp-neptuneatelier-LayerName">{rule.name}</span>
        <span className="jp-neptuneatelier-LayerTarget">
          {optionLabel(EVENT_ACTION_OPTIONS, rule.action)}
        </span>
      </summary>
      <div className="jp-neptuneatelier-SectionBody">
        <Row label="Name">
          <input
            type="text"
            className="jp-neptuneatelier-TextInput"
            value={rule.name}
            onChange={event => patch({ name: event.target.value })}
          />
        </Row>
        <SelectRow<EventTrigger>
          label="When"
          value={rule.trigger}
          options={EVENT_TRIGGER_OPTIONS}
          onChange={trigger => patch({ trigger })}
        />
        {rule.trigger === 'command' && (
          <Row
            label="Command"
            description="Any JupyterLab command id. Buttons, menus, and keyboard shortcuts all run commands."
          >
            <input
              type="text"
              className="jp-neptuneatelier-TextInput jp-neptuneatelier-CodeText"
              list={COMMAND_LIST_ID}
              placeholder="notebook:run-cell"
              value={rule.command}
              onChange={event => patch({ command: event.target.value })}
            />
          </Row>
        )}
        {rule.trigger === 'shortcut' && (
          <Row
            label="Keys"
            description='A key combo, e.g. "Ctrl+Shift+K" or "F9". Modifiers first: Ctrl, Alt, Shift, Meta.'
          >
            <input
              type="text"
              className="jp-neptuneatelier-TextInput jp-neptuneatelier-CodeText"
              placeholder="Ctrl+Shift+K"
              value={rule.shortcut}
              onChange={event => patch({ shortcut: event.target.value })}
            />
          </Row>
        )}
        {rule.trigger === 'idle' && (
          <SliderRow
            label="After"
            value={rule.idleMinutes}
            min={1}
            max={60}
            step={1}
            format={v => `${v} min`}
            description="No mouse, keyboard, or command activity for this long."
            defaultValue={RULE_DEFAULTS.idleMinutes}
            onChange={idleMinutes => patch({ idleMinutes })}
          />
        )}
        <SelectRow<EventAction>
          label="Do"
          value={rule.action}
          options={EVENT_ACTION_OPTIONS}
          onChange={action => patch({ action })}
        />
        {isLayerAction ? (
          <>
            <Row label="Effect layer">
              <select
                className="jp-neptuneatelier-Select"
                value={rule.layerId}
                onChange={event => patch({ layerId: event.target.value })}
              >
                <option value="">Every layer</option>
                {layers.map(layer => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>
            </Row>
            {layers.length === 0 && (
              <div className="jp-neptuneatelier-FieldDescription">
                Add a layer in the Effects tab first.
              </div>
            )}
            {rule.action !== 'toggle-layer' && (
              <SliderRow
                label="Duration"
                value={rule.duration}
                min={200}
                max={10000}
                step={100}
                format={v => `${(v / 1000).toFixed(1)}s`}
                defaultValue={RULE_DEFAULTS.duration}
                onChange={duration => patch({ duration })}
              />
            )}
          </>
        ) : (
          <>
            {!NO_LOCATION_ACTIONS.includes(rule.action) && (
              <SelectRow<EventLocation>
                label="Where"
                value={rule.location}
                options={EVENT_LOCATION_OPTIONS}
                onChange={location => patch({ location })}
              />
            )}
            {rule.action === 'typing-animation' && (
              <Row label="Text">
                <input
                  type="text"
                  className="jp-neptuneatelier-TextInput"
                  value={rule.text}
                  onChange={event => patch({ text: event.target.value })}
                />
              </Row>
            )}
            {COLORED_ACTIONS.includes(rule.action) && (
              <>
                <PlainColorRow
                  label="Color 1"
                  value={rule.color1}
                  onChange={color1 => patch({ color1 })}
                />
                {!SINGLE_COLOR_ACTIONS.includes(rule.action) && (
                  <>
                    <PlainColorRow
                      label="Color 2"
                      value={rule.color2}
                      onChange={color2 => patch({ color2 })}
                    />
                    <PlainColorRow
                      label="Color 3"
                      value={rule.color3}
                      onChange={color3 => patch({ color3 })}
                    />
                  </>
                )}
              </>
            )}
            {!UNSIZED_ACTIONS.includes(rule.action) && (
              <SliderRow
                label={
                  rule.action === 'flash'
                    ? 'Strength'
                    : rule.action === 'typing-animation'
                      ? 'Font size'
                      : 'Size'
                }
                value={rule.size}
                min={0.25}
                max={3}
                step={0.05}
                format={v => `${v.toFixed(2)}×`}
                defaultValue={RULE_DEFAULTS.size}
                onChange={size => patch({ size })}
              />
            )}
          </>
        )}
        <Section title="Advanced" defaultOpen={false}>
          <SelectRow<EventTrigger | ''>
            label="Also requires"
            value={rule.secondaryTrigger}
            options={[
              { value: '', label: 'Nothing else' },
              ...EVENT_TRIGGER_OPTIONS.filter(
                option => option.value !== rule.trigger
              )
            ]}
            description="A compound (“when X and Y”) condition: this other trigger must also have fired within the last few seconds."
            onChange={secondaryTrigger => patch({ secondaryTrigger })}
          />
          <SelectRow<EventSound>
            label="Sound"
            value={rule.sound}
            options={EVENT_SOUND_OPTIONS}
            onChange={sound => patch({ sound })}
          />
          {rule.sound !== 'none' && (
            <SliderRow
              label="Volume"
              value={rule.soundVolume}
              min={0}
              max={1}
              step={0.05}
              format={v => `${Math.round(v * 100)}%`}
              defaultValue={RULE_DEFAULTS.soundVolume}
              onChange={soundVolume => patch({ soundVolume })}
            />
          )}
          <Row
            label="Then also run"
            description="Macro: chain another rule to run after this one, for multi-step effects."
          >
            <select
              className="jp-neptuneatelier-Select"
              value={rule.chainRuleId}
              onChange={event => patch({ chainRuleId: event.target.value })}
            >
              <option value="">Nothing</option>
              {otherRules.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Row>
          {rule.chainRuleId && (
            <SliderRow
              label="Delay"
              value={rule.chainDelay}
              min={0}
              max={5000}
              step={100}
              format={v => `${(v / 1000).toFixed(1)}s`}
              defaultValue={RULE_DEFAULTS.chainDelay}
              onChange={chainDelay => patch({ chainDelay })}
            />
          )}
        </Section>
        <div className="jp-neptuneatelier-ButtonRow">
          <button
            type="button"
            className="jp-neptuneatelier-Button jp-mod-accept"
            onClick={props.onPreview}
          >
            Preview
          </button>
          <button
            type="button"
            className="jp-neptuneatelier-Button"
            onClick={props.onDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </details>
  );
}

export interface IEventsTabProps {
  services: IStudioServices;
}

/**
 * Event rules: "when <something happens>, play <an animation / drive an
 * effect layer>". Add from ready-made presets or start from scratch.
 */
export function EventsTab(props: IEventsTabProps): JSX.Element {
  const { settings, eventEngine } = props.services;
  const [rules, setRules] = useSetting<IEventRule[]>(
    settings,
    'events',
    normalizeEvents
  );
  const [layers] = useSetting<IEffectLayer[]>(
    settings,
    'effects',
    normalizeEffects
  );

  const addFromPreset = (index: number): void => {
    const preset = EVENT_PRESETS[index];
    setRules([...rules, createEventRule(preset ? preset.rule : {})]);
  };

  return (
    <div className="jp-neptuneatelier-Tab">
      <div className="jp-neptuneatelier-FieldDescription">
        Make things happen in response to what you do: confetti when a cell
        succeeds, a shake on errors, sparks while you type, or pulsing and
        toggling your effect layers.
      </div>
      <Row label="Add">
        <select
          className="jp-neptuneatelier-Select"
          value=""
          onChange={event => {
            if (event.target.value !== '') {
              addFromPreset(Number(event.target.value));
            }
          }}
        >
          <option value="">Choose an effect to add…</option>
          {EVENT_PRESETS.map((preset, index) => (
            <option key={preset.name} value={index}>
              {preset.name}
            </option>
          ))}
          <option value={-1}>Blank rule</option>
        </select>
      </Row>
      <datalist id={COMMAND_LIST_ID}>
        {COMMON_COMMANDS.map(command => (
          <option key={command.id} value={command.id}>
            {command.label}
          </option>
        ))}
      </datalist>
      {rules.length === 0 && (
        <div className="jp-neptuneatelier-FieldDescription">No rules yet.</div>
      )}
      {rules.map((rule, index) => (
        <RuleCard
          key={rule.id}
          rule={rule}
          layers={layers}
          allRules={rules}
          onChange={next =>
            setRules(rules.map((item, i) => (i === index ? next : item)))
          }
          onDelete={() => setRules(rules.filter((_, i) => i !== index))}
          onPreview={() => eventEngine.preview(rule)}
        />
      ))}
    </div>
  );
}
