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

  it('switches role and remembers it for next time', () => {
    useWorkspaceStore().setPreset('points');

    expect(JSON.parse(localStorage.getItem(WORKSPACE_KEY) ?? '{}')).toEqual({
      preset: 'points',
    });

    setActivePinia(createPinia());

    expect(useWorkspaceStore().preset.label).toBe('Points');
  });

  it('ignores an unknown role and unreadable storage', () => {
    localStorage.setItem(WORKSPACE_KEY, '{not json');

    const workspace = useWorkspaceStore();

    expect(workspace.presetId).toBe('control');

    workspace.setPreset('teapot');

    expect(workspace.presetId).toBe('control');
  });
});
