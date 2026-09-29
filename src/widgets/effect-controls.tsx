import * as React from 'react';
import { generateId } from '../ids';
import {
  DEFAULT_PARTICLES,
  DEFAULT_SHADER,
  PARTICLE_EMITTER_OPTIONS,
  PARTICLE_SHAPE_OPTIONS,
  SHADER_PRESETS
} from '../defaults';
import {
  IImageStore,
  IParticlesConfig,
  IShaderConfig,
  ParticleEmitter,
  ParticleShape,
  ShaderPreset
} from '../types';
import {
  PlainColorRow,
  readFileAsDataUrl,
  Row,
  SelectRow,
  SliderRow,
  ToggleRow
} from './controls';

const percent = (value: number): string => `${Math.round(value * 100)}%`;
const times = (value: number): string => `${value.toFixed(1)}×`;

export interface IParticlePresetOption {
  name: string;
  particles: IParticlesConfig;
}

export interface IParticlesControlsProps {
  value: IParticlesConfig;
  onChange: (value: IParticlesConfig) => void;
  /** Saved/built-in presets offered as a "Load preset" shortcut, if any. */
  presets?: IParticlePresetOption[];
  /** Where uploaded particle images are stored, if image particles are
   * supported here. */
  imageStore?: IImageStore;
}

export function ParticlesControls(props: IParticlesControlsProps): JSX.Element {
  const { value, presets, imageStore } = props;
  const patch = (changes: Partial<IParticlesConfig>): void =>
    props.onChange({ ...value, ...changes });

  const uploadImage = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !imageStore) {
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const ref = generateId();
      await imageStore.storeImage(ref, dataUrl);
      patch({ imageRef: ref });
    } catch (error) {
      console.error('neptuneatelier: failed to store particle image', error);
    }
  };

  return (
    <>
      {presets && presets.length > 0 && (
        <Row
          label="Load preset"
          description="Replaces every setting below with the preset's. Build and save your own in the Particle Lab tab."
        >
          <select
            className="jp-neptuneatelier-Select"
            value=""
            onChange={event => {
              const preset = presets.find(
                item => item.name === event.target.value
              );
              if (preset) {
                props.onChange(preset.particles);
              }
            }}
          >
            <option value="">Choose a preset…</option>
            {presets.map(preset => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
        </Row>
      )}
      <PlainColorRow
        label="Particle color"
        value={value.color}
        onChange={color => patch({ color })}
      />
      <SelectRow<ParticleShape>
        label="Shape"
        value={value.shape}
        options={PARTICLE_SHAPE_OPTIONS}
        description={
          value.imageRef
            ? 'Ignored while a particle image is set, below.'
            : undefined
        }
        onChange={shape => patch({ shape })}
      />
      {imageStore && (
        <Row
          label="Particle image"
          description="An uploaded image replaces the shape above. Stored in this browser only."
        >
          <div className="jp-neptuneatelier-ButtonRow">
            <label className="jp-neptuneatelier-Button jp-mod-accept">
              {value.imageRef ? 'Replace…' : 'Choose image…'}
              <input
                type="file"
                accept="image/*"
                className="jp-neptuneatelier-HiddenInput"
                onChange={event => void uploadImage(event)}
              />
            </label>
            {value.imageRef && (
              <button
                type="button"
                className="jp-neptuneatelier-Button"
                onClick={() => patch({ imageRef: '' })}
              >
                Clear
              </button>
            )}
          </div>
        </Row>
      )}
      <SliderRow
        label="Count"
        value={value.count}
        min={5}
        max={300}
        step={5}
        defaultValue={DEFAULT_PARTICLES.count}
        onChange={count => patch({ count })}
      />
      <SliderRow
        label="Size"
        value={value.size}
        min={0.5}
        max={8}
        step={0.5}
        defaultValue={DEFAULT_PARTICLES.size}
        onChange={size => patch({ size })}
      />
      <SliderRow
        label="Size variation"
        value={value.sizeVariation}
        min={0}
        max={1}
        step={0.05}
        format={percent}
        description="0 makes every particle the same size; 1 gives the widest spread."
        defaultValue={DEFAULT_PARTICLES.sizeVariation}
        onChange={sizeVariation => patch({ sizeVariation })}
      />
      <SliderRow
        label="Speed"
        value={value.speed}
        min={0}
        max={5}
        step={0.1}
        format={times}
        defaultValue={DEFAULT_PARTICLES.speed}
        onChange={speed => patch({ speed })}
      />
      <ToggleRow
        label="Connect nearby particles"
        description="Draws faint lines between particles that are close together."
        checked={value.links}
        onChange={links => patch({ links })}
      />
      {value.links && (
        <SliderRow
          label="Connection distance"
          value={value.linkDistance}
          min={40}
          max={300}
          step={10}
          format={v => `${v}px`}
          defaultValue={DEFAULT_PARTICLES.linkDistance}
          onChange={linkDistance => patch({ linkDistance })}
        />
      )}
      <ToggleRow
        label="React to the mouse"
        description="Particles drift away from the cursor."
        checked={value.mouse}
        onChange={mouse => patch({ mouse })}
      />
      <SelectRow<ParticleEmitter>
        label="Spawn from"
        value={value.emitter}
        options={PARTICLE_EMITTER_OPTIONS}
        description="Where new and off-screen particles reappear."
        onChange={emitter => patch({ emitter })}
      />
      <SliderRow
        label="Trail"
        value={value.trail}
        min={0}
        max={1}
        step={0.05}
        format={percent}
        description="A motion-blur trail behind each particle."
        defaultValue={DEFAULT_PARTICLES.trail}
        onChange={trail => patch({ trail })}
      />
      <ToggleRow
        label="Twinkle"
        description="Each particle fades in and out on its own cycle."
        checked={value.twinkle}
        onChange={twinkle => patch({ twinkle })}
      />
      <SliderRow
        label="Gravity"
        value={value.gravity}
        min={-3}
        max={3}
        step={0.1}
        description="A constant pull: negative floats particles upward (embers), positive makes them fall (rain, snow)."
        defaultValue={DEFAULT_PARTICLES.gravity}
        onChange={gravity => patch({ gravity })}
      />
      <SliderRow
        label="Spin"
        value={value.spin}
        min={-3}
        max={3}
        step={0.1}
        format={times}
        description="Rotation speed — visible on square, triangle, and star shapes."
        defaultValue={DEFAULT_PARTICLES.spin}
        onChange={spin => patch({ spin })}
      />
      <SliderRow
        label="Opacity"
        value={value.opacity}
        min={0}
        max={1}
        step={0.05}
        format={percent}
        defaultValue={DEFAULT_PARTICLES.opacity}
        onChange={opacity => patch({ opacity })}
      />
      <SliderRow
        label="Glow"
        value={value.glow}
        min={0}
        max={1}
        step={0.05}
        format={percent}
        description="A soft blur halo around each particle."
        defaultValue={DEFAULT_PARTICLES.glow}
        onChange={glow => patch({ glow })}
      />
      <ToggleRow
        label="Blend toward a second color"
        description="Each particle randomly mixes between the color above and this one, for varied, painterly mixes."
        checked={value.colorBlend !== ''}
        onChange={enabled =>
          patch({ colorBlend: enabled ? value.colorBlend || '#ffffff' : '' })
        }
      />
      {value.colorBlend !== '' && (
        <PlainColorRow
          label="Blend color"
          value={value.colorBlend}
          onChange={colorBlend => patch({ colorBlend })}
        />
      )}
    </>
  );
}

export interface IShaderControlsProps {
  value: IShaderConfig;
  onChange: (value: IShaderConfig) => void;
}

export function ShaderControls(props: IShaderControlsProps): JSX.Element {
  const { value } = props;
  const patch = (changes: Partial<IShaderConfig>): void =>
    props.onChange({ ...value, ...changes });
  return (
    <>
      <SelectRow<ShaderPreset>
        label="Effect"
        value={value.preset}
        options={SHADER_PRESETS}
        onChange={preset => patch({ preset })}
      />
      <PlainColorRow
        label="Base color"
        value={value.color1}
        onChange={color1 => patch({ color1 })}
      />
      <PlainColorRow
        label="Color 2"
        value={value.color2}
        onChange={color2 => patch({ color2 })}
      />
      <PlainColorRow
        label="Color 3"
        value={value.color3}
        onChange={color3 => patch({ color3 })}
      />
      <SliderRow
        label="Speed"
        value={value.speed}
        min={0}
        max={5}
        step={0.1}
        format={times}
        defaultValue={DEFAULT_SHADER.speed}
        onChange={speed => patch({ speed })}
      />
      <SliderRow
        label="Intensity"
        value={value.intensity}
        min={0}
        max={2}
        step={0.05}
        format={percent}
        defaultValue={DEFAULT_SHADER.intensity}
        onChange={intensity => patch({ intensity })}
      />
      <SliderRow
        label="Quality"
        value={value.resolution}
        min={0.25}
        max={1}
        step={0.05}
        format={percent}
        description="Render resolution. Lower is lighter on your GPU and battery, and softer looking."
        defaultValue={DEFAULT_SHADER.resolution}
        onChange={resolution => patch({ resolution })}
      />
    </>
  );
}
