import * as React from 'react';
import { normalizeLayout } from '../config-normalizers';
import {
  CellStyle,
  Density,
  ILayoutConfig,
  ScrollbarStyle,
  TabStyle
} from '../types';
import { ColorRow, Section, SelectRow, SliderRow, ToggleRow } from './controls';
import { useSetting } from './studio-hooks';
import { IStudioServices } from './studio-services';

const DEFAULT_NOTEBOOK_WIDTH = 1000;

export interface ILayoutTabProps {
  services: IStudioServices;
}

/** Which chrome is shown, and how tabs, notebooks, cells, and scrollbars look. */
export function LayoutTab(props: ILayoutTabProps): JSX.Element {
  const [layout, setLayout] = useSetting<ILayoutConfig>(
    props.services.settings,
    'layout',
    normalizeLayout
  );
  const patch = (changes: Partial<ILayoutConfig>): void => {
    setLayout({ ...layout, ...changes });
  };

  return (
    <div className="jp-neptuneatelier-Tab">
      <Section title="Interface">
        <ToggleRow
          label="Hide menu bar"
          description="Hides the top bar with the logo and File/Edit/View menus."
          checked={layout.hideHeader}
          onChange={hideHeader => patch({ hideHeader })}
        />
        <ToggleRow
          label="Hide status bar"
          checked={layout.hideStatusBar}
          onChange={hideStatusBar => patch({ hideStatusBar })}
        />
        <ToggleRow
          label="Hide left icon bar"
          description="The strip of icons (file browser, running, extensions…) on the left."
          checked={layout.hideLeftActivityBar}
          onChange={hideLeftActivityBar => patch({ hideLeftActivityBar })}
        />
        <ToggleRow
          label="Hide right icon bar"
          description="Includes this panel's own icon. If you hide it, reopen Theme Studio from the command palette (Ctrl+Shift+C)."
          checked={layout.hideRightActivityBar}
          onChange={hideRightActivityBar => patch({ hideRightActivityBar })}
        />
        <SelectRow<Density>
          label="Density"
          value={layout.density}
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'normal', label: 'Normal' },
            { value: 'comfortable', label: 'Comfortable' }
          ]}
          description="Spacing in file lists, toolbars, and notebook cells."
          onChange={density => patch({ density })}
        />
        <SelectRow<TabStyle>
          label="Tab style"
          value={layout.tabStyle}
          options={[
            { value: 'default', label: 'Default' },
            { value: 'pill', label: 'Pills' },
            { value: 'underline', label: 'Underline' },
            { value: 'minimal', label: 'Minimal' }
          ]}
          onChange={tabStyle => patch({ tabStyle })}
        />
      </Section>

      <Section title="Notebooks">
        <SelectRow<CellStyle>
          label="Cell style"
          value={layout.cellStyle}
          options={[
            { value: 'default', label: 'Default' },
            { value: 'card', label: 'Cards' },
            { value: 'borderless', label: 'Borderless' },
            { value: 'accent', label: 'Accent bar on active cell' }
          ]}
          onChange={cellStyle => patch({ cellStyle })}
        />
        <ToggleRow
          label="Hide In/Out prompts"
          description="Hides the [1]: execution counters beside cells."
          checked={layout.hidePrompts}
          onChange={hidePrompts => patch({ hidePrompts })}
        />
        <ToggleRow
          label="Limit notebook width"
          description="Centers notebooks in a readable column on wide screens."
          checked={layout.notebookMaxWidth > 0}
          onChange={limited =>
            patch({ notebookMaxWidth: limited ? DEFAULT_NOTEBOOK_WIDTH : 0 })
          }
        />
        {layout.notebookMaxWidth > 0 && (
          <SliderRow
            label="Notebook width"
            value={layout.notebookMaxWidth}
            min={600}
            max={2000}
            step={20}
            format={v => `${v}px`}
            defaultValue={DEFAULT_NOTEBOOK_WIDTH}
            onChange={notebookMaxWidth => patch({ notebookMaxWidth })}
          />
        )}
      </Section>

      <Section title="Scrollbars">
        <SelectRow<ScrollbarStyle>
          label="Style"
          value={layout.scrollbarStyle}
          options={[
            { value: 'default', label: 'Default' },
            { value: 'thin', label: 'Thin' },
            { value: 'hidden', label: 'Hidden (still scrollable)' }
          ]}
          onChange={scrollbarStyle => patch({ scrollbarStyle })}
        />
        {layout.scrollbarStyle !== 'hidden' && (
          <ColorRow
            label="Color"
            value={layout.scrollbarColor}
            inherited="#888888"
            onChange={scrollbarColor => patch({ scrollbarColor })}
          />
        )}
      </Section>
    </div>
  );
}
