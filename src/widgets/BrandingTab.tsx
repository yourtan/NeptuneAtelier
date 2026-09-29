import { showErrorMessage } from '@jupyterlab/apputils';
import * as React from 'react';
import { normalizeBranding } from '../config-normalizers';
import { generateId } from '../ids';
import { IBrandingConfig } from '../types';
import {
  PlainColorRow,
  readFileAsDataUrl,
  Row,
  Section,
  ToggleRow
} from './controls';
import { useSetting } from './studio-hooks';
import { IStudioServices } from './studio-services';

export interface IBrandingTabProps {
  services: IStudioServices;
}

/** Favicon, loading splash screen, and a kernel-busy favicon pulse. */
export function BrandingTab(props: IBrandingTabProps): JSX.Element {
  const { settings, backgroundApplier } = props.services;
  const [branding, setBranding] = useSetting<IBrandingConfig>(
    settings,
    'branding',
    normalizeBranding
  );
  const patch = (changes: Partial<IBrandingConfig>): void => {
    setBranding({ ...branding, ...changes });
  };

  const uploadFavicon = async (
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
      patch({ faviconRef: ref });
    } catch (error) {
      console.error('neptuneatelier: failed to store favicon', error);
      await showErrorMessage(
        'Favicon failed',
        'That image could not be stored. Try a small PNG or ICO file.'
      );
    }
  };

  return (
    <div className="jp-neptuneatelier-Tab">
      <Section title="Favicon">
        <div className="jp-neptuneatelier-FieldDescription">
          Replaces the browser tab icon. Stored in this browser only.
        </div>
        <div className="jp-neptuneatelier-ButtonRow">
          <label className="jp-neptuneatelier-Button jp-mod-accept">
            {branding.faviconRef ? 'Replace…' : 'Choose image…'}
            <input
              type="file"
              accept="image/*"
              className="jp-neptuneatelier-HiddenInput"
              onChange={event => void uploadFavicon(event)}
            />
          </label>
          {branding.faviconRef && (
            <button
              type="button"
              className="jp-neptuneatelier-Button"
              onClick={() => patch({ faviconRef: '' })}
            >
              Use JupyterLab's icon
            </button>
          )}
        </div>
        <ToggleRow
          label="Pulse while a cell runs"
          description="The tab icon pulses between two colors while a notebook cell is executing."
          checked={branding.animatedFavicon}
          onChange={animatedFavicon => patch({ animatedFavicon })}
        />
      </Section>

      <Section title="Loading splash screen">
        <ToggleRow
          label="Show a splash screen while JupyterLab loads"
          description="A full-screen message, shown until the interface finishes restoring."
          checked={branding.splashEnabled}
          onChange={splashEnabled => patch({ splashEnabled })}
        />
        {branding.splashEnabled && (
          <>
            <Row label="Message">
              <input
                type="text"
                className="jp-neptuneatelier-TextInput"
                value={branding.splashText}
                onChange={event => patch({ splashText: event.target.value })}
              />
            </Row>
            <PlainColorRow
              label="Background color"
              value={branding.splashColor}
              onChange={splashColor => patch({ splashColor })}
            />
            <div className="jp-neptuneatelier-FieldDescription">
              You won't see this again until the next full reload of JupyterLab.
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
