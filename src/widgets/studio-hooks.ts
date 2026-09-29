import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { PartialJSONValue } from '@lumino/coreutils';
import { ISignal } from '@lumino/signaling';
import { useEffect, useReducer, useRef, useState } from 'react';

/** Writes are coalesced over this window, since every `set()` is a server
 * round trip and sliders/color pickers fire continuously while dragged. */
const WRITE_DELAY_MS = 150;

/**
 * Binds a component to one top-level settings key. Reads go through the
 * given normalizer; writes update local state immediately (so the control
 * stays responsive) and are debounced before being saved. External changes
 * (another tab, preset apply, undo) re-render the component, except while
 * a local write is still pending, which would otherwise briefly revert the
 * control.
 * @param settings - the live settings object to bind to
 * @param key - the top-level settings key to read/write
 * @param normalize - turns the stored value into a complete, valid value
 */
export function useSetting<T extends PartialJSONValue>(
  settings: ISettingRegistry.ISettings,
  key: string,
  normalize: (value: unknown) => T
): [T, (value: T) => void] {
  const read = (): T => normalize(settings.get(key).composite);
  const [value, setValue] = useState<T>(read);
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef(0);

  const flush = (): void => {
    window.clearTimeout(timer.current);
    const write = pending.current;
    pending.current = null;
    if (write) {
      settings.set(key, write.value).catch(error => {
        console.error(`neptuneatelier: failed to save "${key}"`, error);
      });
    }
  };

  useEffect(() => {
    const onChanged = (): void => {
      if (!pending.current) {
        setValue(read());
      }
    };
    settings.changed.connect(onChanged);
    setValue(read());
    return () => {
      settings.changed.disconnect(onChanged);
      flush();
    };
    // read/flush are re-created each render; only re-subscribe when the
    // settings object or key identity actually changes.
  }, [settings, key]);

  const update = (next: T): void => {
    setValue(next);
    pending.current = { value: next };
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, WRITE_DELAY_MS);
  };

  return [value, update];
}

/**
 * Re-renders the component whenever a Lumino signal emits.
 * @param signal - the signal to follow
 */
export function useSignalRefresh<T>(signal: ISignal<T, void>): void {
  const [, refresh] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    const onEmit = (): void => refresh();
    signal.connect(onEmit);
    return () => {
      signal.disconnect(onEmit);
    };
  }, [signal]);
}
