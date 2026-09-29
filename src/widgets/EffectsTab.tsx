import * as React from 'react';
import {
  normalizeEffects,
  normalizeParticlePresets
} from '../config-normalizers';
import {
  BLEND_MODE_OPTIONS,
  createEffectLayer,
  EFFECT_PLACEMENT_OPTIONS,
  EFFECT_TARGET_OPTIONS,
  PARTICLE_STARTER_PRESETS
} from '../defaults';
import { generateId } from '../ids';
import {
  BlendMode,
  EffectKind,
  EffectPlacement,
  EffectTarget,
  IEffectLayer,
  IImageStore,
  IParticlePreset
} from '../types';
import { Row, SelectRow, SliderRow } from './controls';
import {
  IParticlePresetOption,
  ParticlesControls,
  ShaderControls
} from './effect-controls';
import { useSetting } from './studio-hooks';
import { IStudioServices } from './studio-services';

const percent = (value: number): string => `${Math.round(value * 100)}%`;

function targetLabel(layer: IEffectLayer): string {
  if (layer.target === 'file') {
    return layer.path ? `file: ${layer.path}` : 'a file (not set)';
  }
  const option = EFFECT_TARGET_OPTIONS.find(
    item => item.value === layer.target
  );
  return option ? option.label.replace(/ \(.*\)$/, '') : layer.target;
}

interface ILayerCardProps {
  layer: IEffectLayer;
  index: number;
  count: number;
  particlePresets: IParticlePresetOption[];
  imageStore: IImageStore;
  onChange: (layer: IEffectLayer) => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function LayerCard(props: ILayerCardProps): JSX.Element {
  const { layer } = props;
  const patch = (changes: Partial<IEffectLayer>): void =>
    props.onChange({ ...layer, ...changes });
  const inWindow = layer.target !== 'background';

  return (
    <details className="jp-neptuneatelier-Section jp-neptuneatelier-LayerCard">
      <summary className="jp-neptuneatelier-SectionTitle">
        <input
          type="checkbox"
          className="jp-neptuneatelier-Checkbox"
          title={layer.enabled ? 'Turn this layer off' : 'Turn this layer on'}
          checked={layer.enabled}
          onClick={event => event.stopPropagation()}
          onChange={event => patch({ enabled: event.target.checked })}
        />
        <span className="jp-neptuneatelier-LayerName">{layer.name}</span>
        <span className="jp-neptuneatelier-Badge">
          {layer.kind === 'particles' ? 'particles' : 'shader'}
        </span>
        <span className="jp-neptuneatelier-LayerTarget">
          {targetLabel(layer)}
        </span>
      </summary>
      <div className="jp-neptuneatelier-SectionBody">
        <Row label="Name">
          <input
            type="text"
            className="jp-neptuneatelier-TextInput"
            value={layer.name}
            onChange={event => patch({ name: event.target.value })}
          />
        </Row>
        <SelectRow<EffectTarget>
          label="Where"
          value={layer.target}
          options={EFFECT_TARGET_OPTIONS}
          description={
            inWindow
              ? 'Each matching open window gets its own copy of this effect.'
              : undefined
          }
          onChange={target => patch({ target })}
        />
        {layer.target === 'file' && (
          <Row
            label="File"
            description="A file name (e.g. analysis.ipynb) or path. Applies whenever that file is open."
          >
            <input
              type="text"
              className="jp-neptuneatelier-TextInput"
              placeholder="analysis.ipynb"
              value={layer.path}
              onChange={event => patch({ path: event.target.value })}
            />
          </Row>
        )}
        {inWindow && (
          <SelectRow<EffectPlacement>
            label="Placement"
            value={layer.placement}
            options={EFFECT_PLACEMENT_OPTIONS}
            description={
              layer.placement === 'behind'
                ? 'Visible where the window is see-through: lower Background → Window opacity.'
                : 'Drawn on top of the window. It never blocks clicks or typing.'
            }
            onChange={placement => patch({ placement })}
          />
        )}
        <SliderRow
          label="Opacity"
          value={layer.opacity}
          min={0}
          max={1}
          step={0.01}
          format={percent}
          defaultValue={inWindow ? 0.6 : 1}
          onChange={opacity => patch({ opacity })}
        />
        <SelectRow<BlendMode>
          label="Blend"
          value={layer.blend}
          options={BLEND_MODE_OPTIONS}
          description="How it mixes with what's beneath. Screen or Color dodge make effects glow over images; Normal just paints over."
          onChange={blend => patch({ blend })}
        />
        <Row
          label="Frame rate limit"
          description="Lower saves battery. Animation pauses in hidden tabs and stops if your system asks for reduced motion."
        >
          <select
            className="jp-neptuneatelier-Select"
            value={layer.maxFps}
            onChange={event => patch({ maxFps: Number(event.target.value) })}
          >
            {[15, 30, 60, 120].map(fps => (
              <option key={fps} value={fps}>
                {fps} fps
              </option>
            ))}
          </select>
        </Row>
        {layer.kind === 'particles' ? (
          <ParticlesControls
            value={layer.particles}
            imageStore={props.imageStore}
            presets={props.particlePresets}
            onChange={particles => patch({ particles })}
          />
        ) : (
          <ShaderControls
            value={layer.shader}
            onChange={shader => patch({ shader })}
          />
        )}
        <div className="jp-neptuneatelier-ButtonRow">
          <button
            type="button"
            className="jp-neptuneatelier-Button"
            disabled={props.index === 0}
            title="Draw this layer behind the one before it"
            onClick={() => props.onMove(-1)}
          >
            Send back
          </button>
          <button
            type="button"
            className="jp-neptuneatelier-Button"
            disabled={props.index === props.count - 1}
            title="Draw this layer in front of the one after it"
            onClick={() => props.onMove(1)}
          >
            Bring forward
          </button>
          <button
            type="button"
            className="jp-neptuneatelier-Button"
            onClick={props.onDuplicate}
          >
            Duplicate
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

export interface IEffectsTabProps {
  services: IStudioServices;
}

/**
 * Animated effect layers — particles and shaders — stacked on the base
 * background, or placed inside windows (every window of a kind, or one
 * specific file). Any number can run at once.
 */
export function EffectsTab(props: IEffectsTabProps): JSX.Element {
  const [layers, setLayers] = useSetting<IEffectLayer[]>(
    props.services.settings,
    'effects',
    normalizeEffects
  );
  const [savedParticlePresets] = useSetting<IParticlePreset[]>(
    props.services.settings,
    'particlePresets',
    normalizeParticlePresets
  );
  const particlePresets: IParticlePresetOption[] = [
    ...PARTICLE_STARTER_PRESETS,
    ...savedParticlePresets.map(preset => ({
      name: preset.name,
      particles: preset.particles
    }))
  ];

  const add = (kind: EffectKind, target: EffectTarget): void => {
    setLayers([...layers, createEffectLayer(kind, target)]);
  };
  const update = (index: number, layer: IEffectLayer): void => {
    setLayers(layers.map((item, i) => (i === index ? layer : item)));
  };
  const move = (index: number, delta: number): void => {
    const next = [...layers];
    const [layer] = next.splice(index, 1);
    next.splice(index + delta, 0, layer);
    setLayers(next);
  };
  const duplicate = (index: number): void => {
    const copy = {
      ...layers[index],
      id: generateId(),
      name: `${layers[index].name} copy`
    };
    const next = [...layers];
    next.splice(index + 1, 0, copy);
    setLayers(next);
  };

  return (
    <div className="jp-neptuneatelier-Tab">
      <div className="jp-neptuneatelier-FieldDescription">
        Stack as many animated layers as you like on top of the base background
        — for example an image, then a shader blended over it, then particles.
        Layers can also live inside windows: every notebook, terminal, or
        editor, or one specific file. Later layers draw on top.
      </div>
      <div className="jp-neptuneatelier-ButtonRow">
        <button
          type="button"
          className="jp-neptuneatelier-Button jp-mod-accept"
          onClick={() => add('particles', 'background')}
        >
          + Particles
        </button>
        <button
          type="button"
          className="jp-neptuneatelier-Button jp-mod-accept"
          onClick={() => add('shader', 'background')}
        >
          + Shader
        </button>
        <button
          type="button"
          className="jp-neptuneatelier-Button"
          onClick={() => add('particles', 'notebooks')}
        >
          + Particles in notebooks
        </button>
      </div>
      {layers.length === 0 && (
        <div className="jp-neptuneatelier-FieldDescription">
          No effect layers yet.
        </div>
      )}
      {layers.map((layer, index) => (
        <LayerCard
          key={layer.id}
          layer={layer}
          index={index}
          count={layers.length}
          particlePresets={particlePresets}
          imageStore={props.services.backgroundApplier}
          onChange={next => update(index, next)}
          onMove={delta => move(index, delta)}
          onDuplicate={() => duplicate(index)}
          onDelete={() => setLayers(layers.filter((_, i) => i !== index))}
        />
      ))}
    </div>
  );
}
