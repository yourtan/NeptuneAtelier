import { comboFromEvent } from '../event-engine';

function key(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', init);
}

describe('comboFromEvent', () => {
  it('formats modifiers before the key, in a fixed order', () => {
    expect(
      comboFromEvent(key({ key: 'k', ctrlKey: true, shiftKey: true }))
    ).toBe('Ctrl+Shift+K');
  });

  it('uppercases single-character keys', () => {
    expect(comboFromEvent(key({ key: 'a' }))).toBe('A');
  });

  it('keeps multi-character key names as-is', () => {
    expect(comboFromEvent(key({ key: 'F9' }))).toBe('F9');
    expect(comboFromEvent(key({ key: 'Escape' }))).toBe('Escape');
  });

  it('does not double up a bare modifier key press', () => {
    expect(comboFromEvent(key({ key: 'Shift', shiftKey: true }))).toBe('Shift');
  });

  it('includes every active modifier', () => {
    expect(
      comboFromEvent(
        key({
          key: 'x',
          ctrlKey: true,
          altKey: true,
          shiftKey: true,
          metaKey: true
        })
      )
    ).toBe('Ctrl+Alt+Shift+Meta+X');
  });
});
