import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStateDB } from '@jupyterlab/statedb';
import { Signal } from '@lumino/signaling';
import { IImageStore } from '../types';

/** Minimal stand-in for `ISettingRegistry.ISettings`: get/set/changed. */
export class FakeSettings {
  changed = new Signal<this, void>(this);
  values: Record<string, unknown>;

  constructor(initial: Record<string, unknown> = {}) {
    this.values = { ...initial };
  }

  get(key: string): { composite: unknown } {
    return { composite: this.values[key] };
  }

  async set(key: string, value: unknown): Promise<void> {
    this.values[key] = value;
    this.changed.emit(undefined);
  }

  asSettings(): ISettingRegistry.ISettings {
    return this as unknown as ISettingRegistry.ISettings;
  }
}

/** In-memory stand-in for `IStateDB`: fetch/save only. */
export class FakeStateDB {
  store = new Map<string, unknown>();

  async fetch(id: string): Promise<unknown> {
    return this.store.get(id);
  }

  async save(id: string, value: unknown): Promise<void> {
    this.store.set(id, value);
  }

  asStateDB(): IStateDB {
    return this as unknown as IStateDB;
  }
}

export class FakeImageStore implements IImageStore {
  images = new Map<string, string>();

  async storeImage(ref: string, dataUrl: string): Promise<void> {
    this.images.set(ref, dataUrl);
  }

  async fetchImage(ref: string): Promise<string | undefined> {
    return this.images.get(ref);
  }
}

/** Lets pending promise callbacks run. */
export async function flushPromises(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}
