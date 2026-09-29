import * as React from 'react';
import { normalizeCustomCss } from '../config-normalizers';
import { useSetting } from './studio-hooks';
import { IStudioServices } from './studio-services';

const PLACEHOLDER = `/* Example: rounder notebook cells */
.jp-Notebook .jp-Cell {
  border-radius: 12px;
}`;

export interface ICssTabProps {
  services: IStudioServices;
}

/** Raw CSS escape hatch for anything the other tabs don't cover. */
export function CssTab(props: ICssTabProps): JSX.Element {
  const [css, setCss] = useSetting<string>(
    props.services.settings,
    'customCss',
    normalizeCustomCss
  );

  return (
    <div className="jp-neptuneatelier-Tab">
      <div className="jp-neptuneatelier-FieldDescription">
        Advanced: CSS added after every other style, applied as you type. Use
        your browser's inspector (F12) to find class names. If something breaks,
        clear this box or run "Theme Studio Safe Mode" from the command palette
        (Ctrl+Alt+Shift+R).
      </div>
      <textarea
        className="jp-neptuneatelier-CssEditor"
        spellCheck={false}
        placeholder={PLACEHOLDER}
        value={css}
        onChange={event => setCss(event.target.value)}
        onKeyDown={event => {
          // Keep Tab inside the editor instead of moving focus.
          if (event.key === 'Tab' && !event.shiftKey) {
            event.preventDefault();
            const target = event.currentTarget;
            const { selectionStart, selectionEnd, value } = target;
            const next =
              value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd);
            setCss(next);
            requestAnimationFrame(() => {
              target.selectionStart = target.selectionEnd = selectionStart + 2;
            });
          }
        }}
      />
    </div>
  );
}
