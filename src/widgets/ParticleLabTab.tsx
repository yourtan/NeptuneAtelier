import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { normalizeParticlePresets } from '../config-normalizers';
import {
  createEffectLayer,
  createParticlePreset,
  DEFAULT_PARTICLES,
  PARTICLE_STARTER_PRESETS
} from '../defaults';
import { ParticlesEffect } from '../effects/particles-effect';
import { IEffectLayer, IParticlePreset, IParticlesConfig } from '../types';
import { Row, Section } from './controls';
import { ParticlesControls } from './effect-controls';
import { useSetting } from './studio-hooks';
import { IStudioServices } from './studio-services';

/** A synthetic effect layer, just to satisfy `ParticlesEffect`'s API. */
function previewLayer(particles: IParticlesConfig): IEffectLayer {
  return { ...createEffectLayer('particles'), particles, maxFps: 60 };
}

export interface IParticleLabTabProps {
  services: IStudioServices;
}

/**
 * Design a particle effect with a live preview, then save it as a named
 * preset reusable from any Particles effect layer in the Effects tab.
 */
export function ParticleLabTab(props: IParticleLabTabProps): JSX.Element {
  const [draft, setDraft] = useState<IParticlesConfig>(DEFAULT_PARTICLES);
  const [name, setName] = useState('My particles');
  const [savedPresets, setSavedPresets] = useSetting<IParticlePreset[]>(
    props.services.settings,
    'particlePresets',
    normalizeParticlePresets
  );

  const hostRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<ParticlesEffect | null>(null);

  // The canvas is created once and driven imperatively afterward, so
  // dragging a slider updates the running effect instead of restarting it.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const effect = new ParticlesEffect(
      host,
      previewLayer(draft),
      props.services.backgroundApplier
    );
    effectRef.current = effect;
    return () => {
      effect.dispose();
      effectRef.current = null;
    };
  }, []);

  useEffect(() => {
    effectRef.current?.update(previewLayer(draft));
  }, [draft]);

  const save = (): void => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setSavedPresets([...savedPresets, createParticlePreset(trimmed, draft)]);
  };

  const remove = (id: string): void => {
    setSavedPresets(savedPresets.filter(item => item.id !== id));
  };

  return (
    <div className="jp-neptuneatelier-Tab">
      <div className="jp-neptuneatelier-FieldDescription">
        Design a particle effect here, with a live preview, then save it as a
        preset you can pick from any Particles layer in the Effects tab.
      </div>

      <div ref={hostRef} className="jp-neptuneatelier-ParticleLabPreview" />

      <ParticlesControls
        value={draft}
        onChange={setDraft}
        imageStore={props.services.backgroundApplier}
      />

      <Section title="Save this effect">
        <Row label="Preset name">
          <input
            type="text"
            className="jp-neptuneatelier-TextInput"
            value={name}
            onChange={event => setName(event.target.value)}
          />
        </Row>
        <div className="jp-neptuneatelier-ButtonRow">
          <button
            type="button"
            className="jp-neptuneatelier-Button jp-mod-accept"
            disabled={!name.trim()}
            onClick={save}
          >
            Save as preset
          </button>
        </div>
      </Section>

      <Section title="Starter presets">
        <ul className="jp-neptuneatelier-PresetList">
          {PARTICLE_STARTER_PRESETS.map(preset => (
            <li key={preset.name} className="jp-neptuneatelier-PresetItem">
              <div className="jp-neptuneatelier-PresetInfo">
                <span className="jp-neptuneatelier-PresetName">
                  {preset.name}
                </span>
                <div className="jp-neptuneatelier-PresetActions">
                  <button
                    type="button"
                    className="jp-neptuneatelier-Button jp-mod-accept"
                    onClick={() => setDraft(preset.particles)}
                  >
                    Load
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Your presets">
        {savedPresets.length === 0 && (
          <div className="jp-neptuneatelier-FieldDescription">
            No saved particle presets yet.
          </div>
        )}
        <ul className="jp-neptuneatelier-PresetList">
          {savedPresets.map(preset => (
            <li key={preset.id} className="jp-neptuneatelier-PresetItem">
              <div className="jp-neptuneatelier-PresetInfo">
                <span className="jp-neptuneatelier-PresetName">
                  {preset.name}
                </span>
                <div className="jp-neptuneatelier-PresetActions">
                  <button
                    type="button"
                    className="jp-neptuneatelier-Button jp-mod-accept"
                    onClick={() => setDraft(preset.particles)}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    className="jp-neptuneatelier-Button"
                    onClick={() => remove(preset.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
