import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { DEFAULT_PRESET, PRESETS, findPreset } from '@/core/workspace';

export const WORKSPACE_KEY = 'exwt-workspace';

interface SavedWorkspace {
  preset: string;
}

function loadWorkspace(): SavedWorkspace {
  try {
    const saved = JSON.parse(localStorage.getItem(WORKSPACE_KEY) ?? 'null');

    if (typeof saved?.preset === 'string') {
      return { preset: saved.preset };
    }
  } catch {
    // Unreadable storage falls back to the default layout.
  }

  return { preset: DEFAULT_PRESET };
}

// Which layout the console shows. Today that is one of the built-in role
// presets; saved and Hub-synced layouts will join them here, as more entries
// in the same list, without the console changing.
export const useWorkspaceStore = defineStore('workspace', () => {
  const presetId = ref(findPreset(loadWorkspace().preset).id);

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
