import { JupyterFrontEnd } from '@jupyterlab/application';
import { NotebookActions } from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { CommandRegistry } from '@lumino/commands';
import { IDisposable } from '@lumino/disposable';
import { normalizeEvents } from './config-normalizers';
import { SAVE_COMMANDS } from './defaults';
import { EffectsApplier } from './effects-applier';
import { FxOverlay, IPoint } from './fx-overlay';
import { playSound } from './sound-effects';
import { EventTrigger, IEventRule } from './types';

/** Buttons in JupyterLab toolbars (classic buttons and web-component ones). */
const TOOLBAR_BUTTON_SELECTOR =
  '.jp-Toolbar button, .jp-Toolbar jp-button, .jp-ToolbarButtonComponent';

/** Typing fires often; each rule plays at most this often. */
const TYPING_THROTTLE_MS = 45;

/** How recently a "secondary" trigger must have fired for a compound
 * ("when X and Y") rule to run. */
const COMPOUND_WINDOW_MS = 3000;

/** How often idle time is checked. */
const IDLE_CHECK_MS = 5000;

interface IEventContext {
  /** The element the event happened on (cell, button, …), if any. */
  target?: Element | null;
  /** An exact point, when known (e.g. the text cursor while typing). */
  point?: IPoint | null;
  /** The command that ran, for command triggers. */
  command?: string;
  /** The key combo pressed, for shortcut triggers. */
  shortcut?: string;
}

function centerOf(element: Element): IPoint {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Formats a keydown event as e.g. "Ctrl+Shift+K", matching what users
 * type into a rule's "Keys" field for the `shortcut` trigger. */
export function comboFromEvent(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) {
    parts.push('Ctrl');
  }
  if (event.altKey) {
    parts.push('Alt');
  }
  if (event.shiftKey) {
    parts.push('Shift');
  }
  if (event.metaKey) {
    parts.push('Meta');
  }
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    parts.push(key);
  }
  return parts.join('+');
}

/**
 * Runs the user's event rules: "when <trigger> happens, play <action>".
 *
 * Triggers come from JupyterLab itself — cell execution results, command
 * executions (which covers toolbar buttons, menus, and shortcuts), clicks
 * on toolbar buttons, typing in code editors, and startup. Actions either
 * play an animation through `FxOverlay` or drive effect layers through
 * `EffectsApplier`.
 */
export class EventEngine implements IDisposable {
  constructor(
    app: JupyterFrontEnd,
    settings: ISettingRegistry.ISettings,
    fx: FxOverlay,
    effects: EffectsApplier
  ) {
    this._app = app;
    this._settings = settings;
    this._fx = fx;
    this._effects = effects;
    this._settings.changed.connect(this._loadRules, this);
    this._loadRules();
    NotebookActions.executed.connect(this._onCellExecuted, this);
    app.commands.commandExecuted.connect(this._onCommand, this);
    document.addEventListener('click', this._onClick, true);
    document.addEventListener('keydown', this._onKeyDown, true);
    document.addEventListener('pointermove', this._onPointerMove, {
      passive: true
    });
    this._idleTimer = window.setInterval(
      () => this._checkIdle(),
      IDLE_CHECK_MS
    );
    void app.restored.then(() => this._fire('startup', {}));
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._settings.changed.disconnect(this._loadRules, this);
    NotebookActions.executed.disconnect(this._onCellExecuted, this);
    this._app.commands.commandExecuted.disconnect(this._onCommand, this);
    document.removeEventListener('click', this._onClick, true);
    document.removeEventListener('keydown', this._onKeyDown, true);
    document.removeEventListener('pointermove', this._onPointerMove);
    window.clearInterval(this._idleTimer);
    for (const timer of this._chainTimers) {
      window.clearTimeout(timer);
    }
  }

  /**
   * Plays a rule's action right away, e.g. from a "Preview" button.
   * @param rule - the rule to preview
   * @param target - element to treat as where it happened
   */
  preview(rule: IEventRule, target?: Element | null): void {
    this._run(rule, { target });
  }

  private _loadRules(): void {
    this._rules = normalizeEvents(this._settings.get('events').composite);
  }

  private _fire(trigger: EventTrigger, context: IEventContext): void {
    if (this._isDisposed) {
      return;
    }
    this._recentTriggers.set(trigger, performance.now());
    if (trigger !== 'idle') {
      // Any real activity resets the idle clock, including startup.
      this._lastActivity = performance.now();
      if (this._idledRules.size > 0) {
        this._idledRules.clear();
      }
    }
    for (const rule of this._rules) {
      if (!rule.enabled || rule.trigger !== trigger) {
        continue;
      }
      if (trigger === 'command' && rule.command !== context.command) {
        continue;
      }
      if (
        trigger === 'shortcut' &&
        (!rule.shortcut || rule.shortcut !== context.shortcut)
      ) {
        continue;
      }
      if (trigger === 'typing') {
        const now = performance.now();
        if (now - (this._lastTyping.get(rule.id) ?? 0) < TYPING_THROTTLE_MS) {
          continue;
        }
        this._lastTyping.set(rule.id, now);
      }
      if (rule.secondaryTrigger) {
        const lastFired = this._recentTriggers.get(rule.secondaryTrigger);
        if (
          lastFired === undefined ||
          performance.now() - lastFired > COMPOUND_WINDOW_MS
        ) {
          continue;
        }
      }
      this._run(rule, context);
    }
  }

  /** Checks whether any `idle` rule's threshold has just been crossed. */
  private _checkIdle(): void {
    if (this._isDisposed) {
      return;
    }
    const idleMs = performance.now() - this._lastActivity;
    for (const rule of this._rules) {
      if (!rule.enabled || rule.trigger !== 'idle') {
        continue;
      }
      if (idleMs < rule.idleMinutes * 60 * 1000) {
        continue;
      }
      // Fire once per idle period, not on every check while still idle.
      if (this._idledRules.has(rule.id)) {
        continue;
      }
      this._idledRules.add(rule.id);
      this._run(rule, {});
    }
  }

  private _locate(rule: IEventRule, context: IEventContext): IPoint {
    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    switch (rule.location) {
      case 'cursor':
        return this._pointer ?? center;
      case 'center':
        return center;
      default:
        if (context.point) {
          return context.point;
        }
        return context.target ? centerOf(context.target) : center;
    }
  }

  private _run(rule: IEventRule, context: IEventContext): void {
    playSound(rule.sound, rule.soundVolume);
    if (rule.chainRuleId) {
      const next = this._rules.find(item => item.id === rule.chainRuleId);
      if (next) {
        const timer = window.setTimeout(() => {
          this._chainTimers.delete(timer);
          this._run(next, context);
        }, rule.chainDelay);
        this._chainTimers.add(timer);
      }
    }
    switch (rule.action) {
      case 'shader-pulse':
        this._effects.pulse(rule.layerId, rule.duration);
        return;
      case 'toggle-layer':
        this._effects.toggle(rule.layerId);
        return;
      case 'flash-layer':
        this._effects.showBriefly(rule.layerId, rule.duration);
        return;
    }
    // Shake/glow need an element: default to the active window.
    const target =
      context.target ?? this._app.shell.currentWidget?.node ?? null;
    this._fx.play(rule.action, this._locate(rule, context), {
      colors: [rule.color1, rule.color2, rule.color3],
      size: rule.size,
      target,
      text: rule.text
    });
  }

  private _onCellExecuted(
    _: unknown,
    args: { cell: { node: HTMLElement }; success: boolean }
  ): void {
    this._fire(args.success ? 'cell-success' : 'cell-error', {
      target: args.cell.node
    });
  }

  private _onCommand(
    _: CommandRegistry,
    args: CommandRegistry.ICommandExecutedArgs
  ): void {
    if (SAVE_COMMANDS.includes(args.id)) {
      this._fire('save', {});
    }
    this._fire('command', { command: args.id });
  }

  private _onClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const button = event.target.closest(TOOLBAR_BUTTON_SELECTOR);
    if (button) {
      this._fire('toolbar-button', { target: button });
    }
  };

  private _onKeyDown = (event: KeyboardEvent): void => {
    const combo = comboFromEvent(event);
    if (combo) {
      this._fire('shortcut', {
        shortcut: combo,
        target: event.target instanceof Element ? event.target : null
      });
    }
    const typed =
      event.key.length === 1 ||
      event.key === 'Enter' ||
      event.key === 'Backspace';
    if (
      !typed ||
      event.ctrlKey ||
      event.metaKey ||
      !(event.target instanceof Element) ||
      !event.target.closest('.cm-content')
    ) {
      return;
    }
    // The editor moves its cursor after the key is handled.
    requestAnimationFrame(() => {
      const cursor = document.querySelector(
        '.cm-editor.cm-focused .cm-cursor-primary, .cm-editor.cm-focused .cm-cursor'
      );
      const rect = cursor?.getBoundingClientRect();
      const point =
        rect && rect.height > 0
          ? { x: rect.left, y: rect.top + rect.height / 2 }
          : null;
      this._fire('typing', { point, target: cursor });
    });
  };

  private _onPointerMove = (event: PointerEvent): void => {
    this._pointer = { x: event.clientX, y: event.clientY };
    this._lastActivity = performance.now();
    if (this._idledRules.size > 0) {
      this._idledRules.clear();
    }
  };

  private _app: JupyterFrontEnd;
  private _settings: ISettingRegistry.ISettings;
  private _fx: FxOverlay;
  private _effects: EffectsApplier;
  private _rules: IEventRule[] = [];
  private _pointer: IPoint | null = null;
  private _lastTyping = new Map<string, number>();
  private _recentTriggers = new Map<EventTrigger, number>();
  private _lastActivity = performance.now();
  private _idledRules = new Set<string>();
  private _idleTimer = 0;
  private _chainTimers = new Set<number>();
  private _isDisposed = false;
}
