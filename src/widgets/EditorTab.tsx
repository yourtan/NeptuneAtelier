import * as React from 'react';
import { normalizeQol } from '../config-normalizers';
import { DEFAULT_QOL_CONFIG } from '../defaults';
import { IndentUnit, IQolConfig } from '../types';
import { Section, SelectRow, SliderRow, ToggleRow } from './controls';
import { useSetting } from './studio-hooks';
import { IStudioServices } from './studio-services';

type ToggleKey =
  | 'autoClosingBrackets'
  | 'matchBrackets'
  | 'codeFolding'
  | 'highlightActiveLine'
  | 'lineNumbers'
  | 'lineWrap'
  | 'highlightWhitespace'
  | 'highlightTrailingWhitespace';

const TOGGLES: { key: ToggleKey; label: string; description: string }[] = [
  {
    key: 'autoClosingBrackets',
    label: 'Auto-close brackets and quotes',
    description:
      'Typing ( [ { \' or " inserts the matching closing character and places the cursor between them.'
  },
  {
    key: 'matchBrackets',
    label: 'Highlight matching brackets',
    description:
      'When the cursor is next to a bracket, highlights its matching pair.'
  },
  {
    key: 'codeFolding',
    label: 'Code folding',
    description:
      'Adds arrows in the gutter to collapse and expand blocks of code.'
  },
  {
    key: 'highlightActiveLine',
    label: 'Highlight active line',
    description: 'Shades the line the cursor is currently on.'
  },
  {
    key: 'lineNumbers',
    label: 'Line numbers',
    description: 'Shows line numbers in the editor gutter.'
  },
  {
    key: 'lineWrap',
    label: 'Wrap long lines',
    description:
      'Long lines continue on the next visual line instead of scrolling sideways.'
  },
  {
    key: 'highlightWhitespace',
    label: 'Show whitespace',
    description: 'Draws faint markers for spaces and tabs.'
  },
  {
    key: 'highlightTrailingWhitespace',
    label: 'Highlight trailing spaces',
    description: 'Marks stray spaces at the ends of lines.'
  }
];

export interface IEditorTabProps {
  services: IStudioServices;
}

/** Editor behavior, mirrored into JupyterLab's own CodeMirror settings. */
export function EditorTab(props: IEditorTabProps): JSX.Element {
  const [qol, setQol] = useSetting<IQolConfig>(
    props.services.settings,
    'qol',
    normalizeQol
  );
  const patch = (changes: Partial<IQolConfig>): void => {
    setQol({ ...qol, ...changes });
  };

  return (
    <div className="jp-neptuneatelier-Tab">
      <Section title="Behavior">
        {TOGGLES.map(toggle => (
          <ToggleRow
            key={toggle.key}
            label={toggle.label}
            description={toggle.description}
            checked={qol[toggle.key]}
            onChange={checked => patch({ [toggle.key]: checked })}
          />
        ))}
      </Section>
      <Section title="Indentation and cursor">
        <SelectRow<IndentUnit>
          label="Indent with"
          value={qol.indentUnit}
          options={[
            { value: '1', label: '1 space' },
            { value: '2', label: '2 spaces' },
            { value: '4', label: '4 spaces' },
            { value: '8', label: '8 spaces' },
            { value: 'Tab', label: 'Tabs' }
          ]}
          onChange={indentUnit => patch({ indentUnit })}
        />
        <SliderRow
          label="Cursor blink speed"
          value={qol.cursorBlinkRate}
          min={0}
          max={2000}
          step={100}
          format={v => (v === 0 ? 'no blink' : `${v}ms`)}
          description="Time for one blink. Set to 0 for a steady cursor."
          defaultValue={DEFAULT_QOL_CONFIG.cursorBlinkRate}
          onChange={cursorBlinkRate => patch({ cursorBlinkRate })}
        />
      </Section>
    </div>
  );
}
