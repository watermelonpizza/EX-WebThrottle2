import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import { useEventsStore } from '@/stores/events';
import { useLocosStore } from '@/stores/locos';

describe('events store', () => {
  let connection: ReturnType<typeof useConnectionStore>;
  let events: ReturnType<typeof useEventsStore>;
  let locos: ReturnType<typeof useLocosStore>;
  let station: MockTransport;

  function texts(): string[] {
    return events.events.map(event => event.text);
  }

  async function receive(frames: string): Promise<void> {
    station.receives(frames);
    await flushPromises();
  }

  beforeEach(async () => {
    setActivePinia(createPinia());
    connection = useConnectionStore();
    events = useEventsStore();
    locos = useLocosStore();
    station = new MockTransport();
    await connection.connect(station);
    await flushPromises();
  });

  describe('turnout and sensor changes', () => {
    // The first reports after connecting only say how things are.
    beforeEach(() => receive('<H 2 0><q 20>'));

    it('does not report the state on connecting', () => {
      expect(events.events).toEqual([]);
    });

    it('puts later changes into plain words, newest first', async () => {
      await receive('<H 2 1><Q 20>');

      expect(texts()).toEqual(['Sensor 20 occupied', 'Turnout 2 thrown']);
    });

    it('does not report a repeated state as a change', async () => {
      await receive('<Q 20><Q 20>');

      expect(texts()).toEqual(['Sensor 20 occupied']);
    });
  });

  describe('driving loco 3 at speed 20', () => {
    beforeEach(async () => {
      locos.acquire(3);
      locos.setSpeed(3, 20);
      // The station echoes our own command. Forward speed n is sent as
      // 129 + n (see core/protocol/speed.ts).
      await receive('<l 3 0 149 0>');
    });

    it('does not credit the echo of its own command to another Throttle', () => {
      expect(texts()).not.toContain('Loco 3 set to 20 by another Throttle');
    });

    it('credits a change it did not ask for to another Throttle', async () => {
      await receive('<l 3 0 169 0>');

      expect(texts()[0]).toBe('Loco 3 set to 40 by another Throttle');
    });
  });

  describe('picking up a loco another Throttle has running', () => {
    // Picking it up asks the station for its state.
    beforeEach(async () => {
      locos.acquire(12);
      await receive('<l 12 0 169 0>');
    });

    it('does not report the answer', () => {
      expect(events.events).toEqual([]);
    });

    it('reports its next change', async () => {
      await receive('<l 12 0 139 0>');

      expect(texts()[0]).toBe('Loco 12 set to 10 by another Throttle');
    });
  });

  describe('with turnout 4 closed, output 7 off and track A on', () => {
    beforeEach(() => receive('<jT 4 C "Yard"><Y 7 100 0 0><pA>'));

    it.each([
      { frames: '<Y 7 100 0 1>', text: 'Output 7 on' },
      { frames: '<Y 7 100 0 1><Y 7 100 0 0>', text: 'Output 7 off' },
      { frames: '<pa>', text: 'Track A power off' },
      { frames: '<H 4 1>', text: 'Turnout 4 thrown' },
    ])('reports "$text"', async ({ frames, text }) => {
      await receive(frames);

      expect(texts()[0]).toBe(text);
    });
  });

  it('ignores stopped and repeated loco broadcasts', async () => {
    await receive('<l 5 0 128 0><l 5 0 128 0>');

    expect(events.events).toEqual([]);
  });

  describe('after an emergency stop', () => {
    beforeEach(() => receive('<l 5 0 129 0>'));

    it('reports it', () => {
      expect(texts()[0]).toBe('Loco 5 emergency stopped');
    });

    it('forgets everything on disconnect', async () => {
      await connection.disconnect();

      expect(events.events).toEqual([]);
    });
  });
});
