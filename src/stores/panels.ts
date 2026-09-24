import { defineStore } from 'pinia';

export const PANELS_KEY = 'exwt-panels';

export type PanelId = 'layout' | 'locos' | 'driving' | 'debug';

export interface PanelDef {
  id: PanelId;
  title: string;
  icon: string;
}

export const PANELS: PanelDef[] = [
  { id: 'layout', title: 'Layout', icon: 'mdi-ruler-square' },
  { id: 'locos', title: 'Locomotives', icon: 'mdi-train-car' },
  { id: 'driving', title: 'Driving', icon: 'mdi-speedometer' },
  { id: 'debug', title: 'Debug console', icon: 'mdi-console-line' },
];

export type ArrangementId = 'driving' | 'ops' | 'system';

export interface ArrangementDef {
  label: string;
  columns: string;
  // Grid areas per row; every shared panel has a home in every arrangement so
  // a closed panel simply leaves an empty cell.
  areas: PanelId[][];
}

export const ARRANGEMENTS: Record<ArrangementId, ArrangementDef> = {
  driving: {
    label: 'Driving',
    columns: 'minmax(18rem, 1.1fr) minmax(26rem, 1.9fr)',
    areas: [
      ['layout', 'driving'],
      ['locos', 'driving'],
      ['debug', 'driving'],
    ],
  },
  ops: {
    label: 'Operations',
    columns: 'minmax(24rem, 1.9fr) minmax(18rem, 1.1fr)',
    areas: [
      ['layout', 'locos'],
      ['layout', 'driving'],
      ['layout', 'debug'],
    ],
  },
  system: {
    label: 'System',
    columns: 'minmax(18rem, 1.1fr) minmax(26rem, 1.9fr)',
    areas: [
      ['layout', 'debug'],
      ['locos', 'driving'],
    ],
  },
};

export const ARRANGEMENT_IDS = Object.keys(ARRANGEMENTS) as ArrangementId[];

interface SavedPanels {
  arrangement: ArrangementId;
  hidden: PanelId[];
}

function initialPanels(): SavedPanels {
  try {
    const saved = JSON.parse(
      localStorage.getItem(PANELS_KEY) ?? 'null',
    ) as SavedPanels | null;

    if (
      saved &&
      saved.arrangement in ARRANGEMENTS &&
      Array.isArray(saved.hidden)
    ) {
      return saved;
    }
  } catch {
    // Fall through to defaults on unreadable storage.
  }

  return { arrangement: 'driving', hidden: [] };
}

export const usePanelsStore = defineStore('panels', {
  state: () => {
    const saved = initialPanels();

    return {
      arrangement: saved.arrangement,
      hidden: saved.hidden,
    };
  },
  actions: {
    persist() {
      localStorage.setItem(
        PANELS_KEY,
        JSON.stringify({ arrangement: this.arrangement, hidden: this.hidden }),
      );
    },
    setArrangement(arrangement: ArrangementId) {
      this.arrangement = arrangement;
      this.persist();
    },
    isOpen(id: PanelId): boolean {
      return !this.hidden.includes(id);
    },
    openPanel(id: PanelId) {
      this.hidden = this.hidden.filter((closed) => closed !== id);
      this.persist();
    },
    closePanel(id: PanelId) {
      if (!this.hidden.includes(id)) {
        this.hidden = [...this.hidden, id];
        this.persist();
      }
    },
    togglePanel(id: PanelId) {
      if (this.isOpen(id)) {
        this.closePanel(id);
      } else {
        this.openPanel(id);
      }
    },
  },
});
