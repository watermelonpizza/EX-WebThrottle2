import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import { BERTHS_KEY, useDiagramStore } from '@/stores/diagram';

async function connectAs(banner: string) {
  const connection = useConnectionStore();
  const diagrams = useDiagramStore();
  const station = new MockTransport();

  await connection.connect(station);
  station.receives(banner);
  await flushPromises();

  return { connection, diagrams };
}

describe('diagram store', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('uses the sample diagram only for the host emulator', async () => {
    const { diagrams } = await connectAs('<iDCC-EX V-5.6.6 / HOST / HOST_SHIELD G-x>');

    expect(diagrams.diagram?.id).toBe('emulator-demo');
    expect(diagrams.turnoutName(3)).toBe('Yard throat');
    // The station's own description always wins.
    expect(diagrams.turnoutName(3, 'Goods yard')).toBe('Goods yard');
  });

  it('has no diagram for a real Command Station', async () => {
    const { diagrams } = await connectAs('<iDCC-EX V-5.6.6 / ESP32 / EX-CSB1 G-x>');

    expect(diagrams.diagram).toBeNull();
    expect(diagrams.turnoutName(3)).toBe('');
  });

  it('keeps a loco in one berth at a time and remembers placements', async () => {
    const { diagrams } = await connectAs('<iDCC-EX V-5.6.6 / HOST / HOST_SHIELD G-x>');

    diagrams.place('west', 3);
    diagrams.place('east', 3);

    expect(diagrams.occupant('west')).toBeUndefined();
    expect(diagrams.occupant('east')).toBe(3);
    expect(JSON.parse(localStorage.getItem(BERTHS_KEY) ?? '{}')).toEqual({
      'emulator-demo': { east: 3 },
    });

    diagrams.place('east', undefined);

    expect(diagrams.occupant('east')).toBeUndefined();
  });
});
