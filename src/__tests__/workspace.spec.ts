import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { WORKSPACE_KEY, useWorkspaceStore } from '@/stores/workspace';

describe('workspace store', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('starts on the Control preset', () => {
    expect(useWorkspaceStore().presetId).toBe('control');
  });

  it('starts on the Control preset when its storage is unreadable', () => {
    localStorage.setItem(WORKSPACE_KEY, '{not json');

    expect(useWorkspaceStore().presetId).toBe('control');
  });

  it('ignores an unknown role', () => {
    useWorkspaceStore().setPreset('teapot');

    expect(useWorkspaceStore().presetId).toBe('control');
  });

  describe('switching to the Points role', () => {
    beforeEach(() => {
      useWorkspaceStore().setPreset('points');
    });

    it('saves it', () => {
      expect(JSON.parse(localStorage.getItem(WORKSPACE_KEY) ?? '{}')).toEqual({ preset: 'points' });
    });

    it('starts on it next time', () => {
      setActivePinia(createPinia());

      expect(useWorkspaceStore().preset.label).toBe('Points');
    });
  });
});
