import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { DEFAULT_PRESET, PRESETS, findPreset } from '@/core/workspace';
import { loadSaved } from '@/stores/saved';

export const WORKSPACE_KEY = 'exwt-workspace';

interface SavedWorkspace {
  preset: string;
}

function isSavedWorkspace(saved: unknown): saved is SavedWorkspace {
  return typeof (saved as SavedWorkspace | null)?.preset === 'string';
}

// Which layout the console shows. Today that is one of the built-in role
// presets; saved and Hub-synced layouts will join them here, as more entries
// in the same list, without the console changing.
export const useWorkspaceStore = defineStore('workspace', () => {
  const saved = loadSaved(
    WORKSPACE_KEY,
    { preset: DEFAULT_PRESET },
    isSavedWorkspace,
  );

  const presetId = ref(findPreset(saved.preset).id);

  const preset = computed(() => findPreset(presetId.value));

  function setPreset(id: string): void {
    presetId.value = findPreset(id).id;
    localStorage.setItem(
      WORKSPACE_KEY,
      JSON.stringify({ preset: presetId.value }),
    );
  }

  return { presets: PRESETS, presetId, preset, setPreset };
});
