import { defineStore } from 'pinia';

import { readBackup, writeBackup } from '@/core/loco/backup';
import { useDiagramStore } from '@/stores/diagram';
import { useLocosStore } from '@/stores/locos';
import { useMapsStore } from '@/stores/maps';

export interface ImportResult {
  locos: number;
  maps: number;
}

// Everything a person saves in this browser can be taken away as a file and
// brought back, here or in another browser, and WebThrottle-EX's own backup
// brings their old locos and maps over.
export const useBackupStore = defineStore('backup', () => {
  const locos = useLocosStore();
  const maps = useMapsStore();
  const diagram = useDiagramStore();

  function exportFile(): string {
    return writeBackup({ locos: locos.roster, maps: maps.maps });
  }

  // Undefined when the file is not a backup this app can read.
  function importFile(file: string): ImportResult | undefined {
    const backup = readBackup(file);

    if (!backup) {
      return undefined;
    }

    const ids = maps.importMaps(backup.maps);

    locos.importLocos(
      backup.locos.map(loco => ({ ...loco, mapId: ids.get(loco.mapId) ?? loco.mapId })),
    );

    return { locos: backup.locos.length, maps: backup.maps.length };
  }

  // Saved locos, function maps and where locos sit on the diagram. The theme
  // and the role are how the app looks, not data, so they stay.
  function clearSaved(): void {
    locos.clearSaved();
    maps.clearAll();
    diagram.clearPlacements();
  }

  return { exportFile, importFile, clearSaved };
});
