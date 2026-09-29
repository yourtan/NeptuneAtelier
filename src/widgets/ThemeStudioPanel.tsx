import { ReactWidget } from '@jupyterlab/ui-components';
import * as React from 'react';
import { useState } from 'react';
import { readThemeConfig } from '../config-normalizers';
import { DEFAULT_THEME_CONFIG } from '../defaults';
import { THEME_CONFIG_KEYS } from '../types';
import { BackgroundTab } from './BackgroundTab';
import { BrandingTab } from './BrandingTab';
import { ColorsTab } from './ColorsTab';
import { CssTab } from './CssTab';
import { EditorTab } from './EditorTab';
import { EffectsTab } from './EffectsTab';
import { EventsTab } from './EventsTab';
import { LayoutTab } from './LayoutTab';
import { ParticleLabTab } from './ParticleLabTab';
import { PresetsTab } from './PresetsTab';
import { useSignalRefresh } from './studio-hooks';
import { IStudioServices } from './studio-services';
import { StyleTab } from './StyleTab';

type StudioTabId =
  | 'colors'
  | 'background'
  | 'effects'
  | 'events'
  | 'particle-lab'
  | 'style'
  | 'layout'
  | 'editor'
  | 'branding'
  | 'presets'
  | 'css';

interface IStudioTab {
  id: StudioTabId;
  label: string;
  /** The settings key "Reset tab" restores, if any. */
  resets?: (typeof THEME_CONFIG_KEYS)[number];
}

const TABS: IStudioTab[] = [
  { id: 'colors', label: 'Colors', resets: 'colors' },
  { id: 'background', label: 'Background', resets: 'background' },
  { id: 'effects', label: 'Effects', resets: 'effects' },
  { id: 'events', label: 'Events', resets: 'events' },
  { id: 'particle-lab', label: 'Particle Lab' },
  { id: 'style', label: 'Style', resets: 'appearance' },
  { id: 'layout', label: 'Layout', resets: 'layout' },
  { id: 'editor', label: 'Editor', resets: 'qol' },
  { id: 'branding', label: 'Branding' },
  { id: 'presets', label: 'Presets' },
  { id: 'css', label: 'CSS', resets: 'customCss' }
];

function TabContent(props: {
  tab: StudioTabId;
  services: IStudioServices;
}): JSX.Element {
  const { services } = props;
  switch (props.tab) {
    case 'colors':
      return <ColorsTab services={services} />;
    case 'background':
      return <BackgroundTab services={services} />;
    case 'effects':
      return <EffectsTab services={services} />;
    case 'events':
      return <EventsTab services={services} />;
    case 'particle-lab':
      return <ParticleLabTab services={services} />;
    case 'style':
      return <StyleTab services={services} />;
    case 'layout':
      return <LayoutTab services={services} />;
    case 'editor':
      return <EditorTab services={services} />;
    case 'branding':
      return <BrandingTab services={services} />;
    case 'presets':
      return <PresetsTab services={services} />;
    case 'css':
      return <CssTab services={services} />;
  }
}

function ThemeStudio(props: { services: IStudioServices }): JSX.Element {
  const { services } = props;
  const { history, settings } = services;
  const [active, setActive] = useState<StudioTabId>('colors');
  // Remounts the tab after a reset so it drops any unsaved local state.
  const [resetCount, setResetCount] = useState(0);
  useSignalRefresh(history.changed);
  const activeTab = TABS.find(tab => tab.id === active) ?? TABS[0];
  // Re-read on every render (cheap: a handful of settings reads), so the
  // "modified" dots stay accurate as other tabs change in the background.
  const config = readThemeConfig(settings);
  const isModified = (tab: IStudioTab): boolean =>
    tab.resets !== undefined &&
    JSON.stringify(config[tab.resets]) !==
      JSON.stringify(DEFAULT_THEME_CONFIG[tab.resets]);

  const resetTab = async (): Promise<void> => {
    if (activeTab.resets) {
      await settings.set(
        activeTab.resets,
        DEFAULT_THEME_CONFIG[activeTab.resets]
      );
      setResetCount(count => count + 1);
    }
  };

  return (
    <div className="jp-neptuneatelier-ThemeStudio">
      <div className="jp-neptuneatelier-StudioHeader">
        <button
          type="button"
          className="jp-neptuneatelier-Button"
          disabled={!history.canUndo}
          title="Undo the last theme change"
          onClick={() => void history.undo()}
        >
          Undo
        </button>
        <button
          type="button"
          className="jp-neptuneatelier-Button"
          disabled={!history.canRedo}
          title="Redo"
          onClick={() => void history.redo()}
        >
          Redo
        </button>
        <span className="jp-neptuneatelier-Spacer" />
        {activeTab.resets && (
          <button
            type="button"
            className="jp-neptuneatelier-LinkButton"
            title={`Reset everything in the ${activeTab.label} tab to its default`}
            onClick={() => void resetTab()}
          >
            Reset tab
          </button>
        )}
      </div>
      <div className="jp-neptuneatelier-TabBar" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            className={
              'jp-neptuneatelier-TabButton' +
              (active === tab.id ? ' jp-mod-active' : '')
            }
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
            {isModified(tab) && (
              <span
                className="jp-neptuneatelier-ModifiedDot"
                title={`${tab.label} has been changed from its default`}
              />
            )}
          </button>
        ))}
      </div>
      <div className="jp-neptuneatelier-TabContent" role="tabpanel">
        <TabContent
          key={`${active}-${resetCount}`}
          tab={active}
          services={services}
        />
      </div>
    </div>
  );
}

/**
 * Top-level Theme Studio side panel — the no-code surface for restyling
 * JupyterLab.
 */
export class ThemeStudioPanel extends ReactWidget {
  constructor(services: IStudioServices) {
    super();
    this._services = services;
    this.id = 'neptuneatelier-theme-studio';
    this.title.label = 'Theme Studio';
    this.title.caption = 'Theme Studio';
    this.title.closable = true;
    this.addClass('jp-neptuneatelier-ThemeStudioPanel');
  }

  render(): JSX.Element {
    return <ThemeStudio services={this._services} />;
  }

  private _services: IStudioServices;
}
