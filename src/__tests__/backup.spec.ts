import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useBackupStore } from '@/stores/backup';
import { BERTHS_KEY } from '@/stores/diagram';
import { useLocosStore } from '@/stores/locos';
import { useMapsStore } from '@/stores/maps';

// A WebThrottle-EX "Export App data" file with one map and the loco using it.
const LEGACY = JSON.stringify([
  { maps: [{ mname: 'Class 08', fnData: { f0: [0, 0, 'Lights', 1] } }] },
  { locos: [{ name: 'Shunter', cv: '3', type: 'Diesel', brand: '', decoder: '', map: 'Class 08' }] },
  { preferences: {} },
]);

describe('backup store', () => {
  let backup: ReturnType<typeof useBackupStore>;
  let locos: ReturnType<typeof useLocosStore>;
  let maps: ReturnType<typeof useMapsStore>;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(BERTHS_KEY, JSON.stringify({ demo: { platform: 3 } }));
    setActivePinia(createPinia());
    backup = useBackupStore();
    locos = useLocosStore();
    maps = useMapsStore();
  });

  it('turns down a file it cannot read', () => {
    expect(backup.importFile('not a backup')).toBeUndefined();
  });

  describe('with a loco saved on its own map', () => {
    let exported: string;

    beforeEach(() => {
      const mapId = maps.createMap('Class 08', [{ fn: 0, label: 'Lights', momentary: false }]);

      locos.saveLoco(3, 'Shunter', mapId, { type: 'Diesel' });
      exported = backup.exportFile();
      backup.clearSaved();
    });

    it('deletes the saved locos, maps and diagram tags', () => {
      expect([locos.roster, maps.maps, localStorage.getItem(BERTHS_KEY)]).toEqual([[], [], null]);
    });

    it('brings them back from its own export', () => {
      backup.importFile(exported);

      expect(locos.roster[0]).toMatchObject({ address: 3, name: 'Shunter', type: 'Diesel', mapId: maps.maps[0]?.id });
    });

    it('counts what it brought back', () => {
      expect(backup.importFile(exported)).toEqual({ locos: 1, maps: 1 });
    });
  });

  describe('importing a WebThrottle-EX AppData.json', () => {
    beforeEach(() => {
      backup.importFile(LEGACY);
    });

    it('saves its locos', () => {
      expect(locos.roster.map(loco => loco.name)).toEqual(['Shunter']);
    });

    it('puts each loco on its own map', () => {
      expect(locos.roster[0]?.mapId).toBe(maps.maps[0]?.id);
    });
  });
});
