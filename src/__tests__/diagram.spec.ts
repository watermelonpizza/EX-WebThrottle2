import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import { BERTHS_KEY, useDiagramStore } from '@/stores/diagram';

describe('diagram store', () => {
  let diagrams: ReturnType<typeof useDiagramStore>;

  async function connectAs(banner: string): Promise<void> {
    const station = new MockTransport();

    diagrams = useDiagramStore();
    await useConnectionStore().connect(station);
    station.receives(banner);
    await flushPromises();
  }

  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  describe('on the host emulator', () => {
    beforeEach(() => connectAs('<iDCC-EX V-5.6.6 / HOST / HOST_SHIELD G-x>'));

    it('uses the sample diagram', () => {
      expect(diagrams.diagram?.id).toBe('emulator-demo');
    });

    it('names a turnout from the diagram', () => {
      expect(diagrams.turnoutName(3)).toBe('Yard throat');
    });

    it('prefers the station\'s own description of a turnout', () => {
      expect(diagrams.turnoutName(3, 'Goods yard')).toBe('Goods yard');
    });

    it('names a sensor from the diagram', () => {
      expect(diagrams.sensorName(20)).not.toBe('Sensor 20');
    });

    describe('placing loco 3 on the west berth, then the east', () => {
      beforeEach(() => {
        diagrams.place('west', 3);
        diagrams.place('east', 3);
      });

      it('takes it off the west berth', () => {
        expect(diagrams.occupant('west')).toBeUndefined();
      });

      it('puts it on the east berth', () => {
        expect(diagrams.occupant('east')).toBe(3);
      });

      it('remembers the placement for next time', () => {
        expect(JSON.parse(localStorage.getItem(BERTHS_KEY) ?? '{}')).toEqual({ 'emulator-demo': { east: 3 } });
      });

      it('empties the berth when its loco is taken off', () => {
        diagrams.place('east', undefined);

        expect(diagrams.occupant('east')).toBeUndefined();
      });
    });

    it('puts a loco on a berth by its address', () => {
      diagrams.setBerth(3, 'west');

      expect(diagrams.berthOf(3)).toBe('west');
    });

    describe('moving loco 3 from the west berth to the east by address', () => {
      beforeEach(() => {
        diagrams.setBerth(3, 'west');
        diagrams.setBerth(3, 'east');
      });

      it('puts it on the east berth', () => {
        expect(diagrams.berthOf(3)).toBe('east');
      });

      it('leaves the west berth empty', () => {
        expect(diagrams.occupant('west')).toBeUndefined();
      });
    });

    it('takes a loco off the diagram by its address', () => {
      diagrams.setBerth(3, 'west');
      diagrams.setBerth(3, '');

      expect(diagrams.berthOf(3)).toBe('');
    });

    it('changes nothing when taking off a loco that is on no berth', () => {
      diagrams.setBerth(3, '');

      expect(diagrams.berthOf(3)).toBe('');
    });
  });

  describe('on a real Command Station', () => {
    beforeEach(() => connectAs('<iDCC-EX V-5.6.6 / ESP32 / EX-CSB1 G-x>'));

    it('has no diagram', () => {
      expect(diagrams.diagram).toBeNull();
    });

    it('has no turnout names of its own', () => {
      expect(diagrams.turnoutName(3)).toBe('');
    });

    it('names sensors by number', () => {
      expect(diagrams.sensorName(999)).toBe('Sensor 999');
    });

    it('has no berths to place a loco on', () => {
      diagrams.place('west', 3);

      expect(diagrams.occupant('west')).toBeUndefined();
    });
  });
});
