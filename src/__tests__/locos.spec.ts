import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';

import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import { useLocosStore } from '@/stores/locos';

type LocosStore = ReturnType<typeof useLocosStore>;

describe('locos store', () => {
  let connection: ReturnType<typeof useConnectionStore>;
  let locos: LocosStore;
  let station: MockTransport;

  async function broadcast(text: string): Promise<void> {
    station.receives(text);
    await flushPromises();
    await nextTick();
  }

  beforeEach(async () => {
    setActivePinia(createPinia());
    localStorage.clear();
    connection = useConnectionStore();
    station = new MockTransport();
    await connection.connect(station);
    locos = useLocosStore();
  });

  it.each(['roster', 'throttles'] as const)('starts with no %s', (list) => {
    expect(locos[list]).toEqual([]);
  });

  it('ignores broadcasts for locos that are not being driven', async () => {
    await broadcast('<l 9 0 2 0>\n');

    expect(locos.throttles).toEqual([]);
  });

  it.each<{ command: string; send: (store: LocosStore) => void }>([
    { command: 'a speed', send: store => store.setSpeed(9, 10) },
    { command: 'a direction', send: store => store.setForward(9, false) },
    { command: 'an emergency stop', send: store => store.emergencyStop(9) },
    { command: 'a function', send: store => store.setFunction(9, 0, true) },
    { command: 'a function map', send: store => store.setMap(9, 'missing') },
  ])('ignores $command for a loco that is not being driven', ({ send }) => {
    const before = station.sent.length;

    send(locos);

    expect(station.sent).toHaveLength(before);
  });

  describe('acquiring loco 3', () => {
    beforeEach(() => {
      locos.acquire(3);
    });

    it('asks the station for its state', () => {
      expect(station.sent).toContain('<t 3>');
    });

    it('opens a throttle, stopped and forward with every function off', () => {
      expect(locos.throttles).toEqual([
        expect.objectContaining({
          address: 3,
          name: 'Loco 3',
          speed: 0,
          forward: true,
          functions: new Array(32).fill(false),
        }),
      ]);
    });

    it('keeps one throttle for it when it is acquired again', () => {
      locos.acquire(3);

      expect(locos.throttles).toHaveLength(1);
    });

    it('asks for its state again when it is acquired again', () => {
      locos.acquire(3);

      expect(station.sent.filter(command => command === '<t 3>')).toHaveLength(2);
    });

    it('closes its throttle when the connection drops', async () => {
      await connection.disconnect();
      await nextTick();

      expect(locos.throttles).toEqual([]);
    });

    describe('after <l 3 0 134 5>', () => {
      // Speed byte 134 is forward speed 5; function map 5 is F0 and F2.
      beforeEach(() => broadcast('<l 3 0 134 5>\n'));

      it('reads its speed as 5 forward, not stopped', () => {
        expect(locos.throttles[0]).toMatchObject({ speed: 5, forward: true, estop: false });
      });

      it.each([0, 2])('reads F%i as on', (fn) => {
        expect(locos.throttles[0]?.functions[fn]).toBe(true);
      });
    });

    it('reads speed 22 in reverse from <l 3 0 23 0>', async () => {
      await broadcast('<l 3 0 23 0>\n');

      expect(locos.throttles[0]).toMatchObject({ speed: 22, forward: false });
    });

    describe('releasing it', () => {
      beforeEach(() => {
        locos.release(3);
      });

      it('closes its throttle', () => {
        expect(locos.throttles).toEqual([]);
      });

      it('frees its slot on the station', () => {
        expect(station.sent).toContain('<- 3>');
      });
    });

    describe('at speed 12', () => {
      beforeEach(() => {
        locos.setSpeed(3, 12);
      });

      it('sends the speed as <t 3 12 1>', () => {
        expect(station.sent).toContain('<t 3 12 1>');
      });

      it('reverses at the same speed with <t 3 12 0>', () => {
        locos.setForward(3, false);

        expect(station.sent).toContain('<t 3 12 0>');
      });

      describe('then stopped in an emergency while in reverse', () => {
        beforeEach(() => {
          locos.setForward(3, false);
          locos.emergencyStop(3);
        });

        it('sends <t 3 -1 0>', () => {
          expect(station.sent).toContain('<t 3 -1 0>');
        });

        it('shows the throttle stopped in an emergency, still in reverse', () => {
          expect(locos.throttles[0]).toMatchObject({ speed: 0, estop: true, forward: false });
        });
      });
    });

    describe('turning F0 on', () => {
      beforeEach(() => {
        locos.setFunction(3, 0, true);
      });

      it('sends <F 3 0 1>', () => {
        expect(station.sent).toContain('<F 3 0 1>');
      });

      it('shows F0 on', () => {
        expect(locos.throttles[0]?.functions[0]).toBe(true);
      });

      describe('and off again', () => {
        beforeEach(() => {
          locos.setFunction(3, 0, false);
        });

        it('sends <F 3 0 0>', () => {
          expect(station.sent).toContain('<F 3 0 0>');
        });

        it('shows F0 off', () => {
          expect(locos.throttles[0]?.functions[0]).toBe(false);
        });
      });
    });
  });

  describe('with loco 42 saved, then saved again under a new name and map', () => {
    beforeEach(() => {
      locos.saveLoco(42, 'Flying Scotsman');
      locos.saveLoco(42, 'Updated Scotsman', 'shunter');
    });

    it('keeps one saved entry for it, with the latest name', () => {
      expect(JSON.parse(localStorage.getItem('exwt-roster') ?? '[]')).toEqual([
        expect.objectContaining({ address: 42, name: 'Updated Scotsman' }),
      ]);
    });

    it('names its throttle from the saved entry', () => {
      locos.acquire(42);

      expect(locos.throttles[0]?.name).toBe('Updated Scotsman');
    });

    it('saves a function map chosen on its throttle', () => {
      locos.acquire(42);
      locos.setMap(42, 'default');

      expect(locos.roster[0]?.mapId).toBe('default');
    });

    it('forgets it when it is removed', () => {
      locos.removeLoco(42);

      expect(locos.roster).toEqual([]);
    });
  });

  describe('driving by address, with loco 12 saved as Shunter', () => {
    beforeEach(() => {
      locos.saveLoco(12, 'Shunter');
    });

    it.each([
      { address: 7, name: 'Yard pilot' },
      { address: 12, name: 'Something else' },
      { address: 9, name: undefined },
    ])('acquires loco $address', ({ address, name }) => {
      locos.drive(address, name);

      expect(station.sent).toContain(`<t ${address}>`);
    });

    it('saves a new loco under the name given, trimmed', () => {
      locos.drive(7, '  Yard pilot ');

      expect(locos.roster).toContainEqual({ address: 7, name: 'Yard pilot', mapId: 'default' });
    });

    it('never renames a saved loco', () => {
      locos.drive(12, 'Something else');

      expect(locos.roster[0]?.name).toBe('Shunter');
    });

    it('does not save a loco driven without a name', () => {
      locos.drive(9);

      expect(locos.roster.map(loco => loco.address)).toEqual([12]);
    });
  });

  describe('with locos 3 and 8 saved, and 3 and 4 on desks with 4 moving', () => {
    beforeEach(() => {
      locos.saveLoco(3, 'Class 37');
      locos.saveLoco(8, 'Shunter');
      locos.acquire(3);
      locos.acquire(4);
      locos.setSpeed(4, 20);
    });

    it('lists the saved locos not yet on a desk', () => {
      expect(locos.savedNotDriven.map(loco => loco.address)).toEqual([8]);
    });

    it('lists the desks that are moving', () => {
      expect(locos.movingHere.map(throttle => throttle.address)).toEqual([4]);
    });
  });

  it('names locos moving on the layout from the saved list where it can', async () => {
    locos.saveLoco(12, 'Shunter');
    await broadcast('<l 12 0 169 0><l 14 0 23 0>');

    expect(locos.moving.map(({ address, name, forward }) => [address, name, forward])).toEqual([
      [12, 'Shunter', true],
      [14, 'Loco 14', false],
    ]);
  });

  describe('stopping everything', () => {
    beforeEach(() => {
      locos.acquire(3);
      locos.acquire(8);
      locos.setSpeed(3, 40);
      locos.stopAll();
    });

    it('sends one emergency stop for the whole layout', () => {
      expect(station.sent.at(-1)).toBe('<!>');
    });

    it('shows every throttle stopped in an emergency', () => {
      expect(locos.throttles.every(throttle => throttle.estop && throttle.speed === 0)).toBe(true);
    });
  });

  describe('locos other Throttles are running', () => {
    it('asks the station which locos it drives on connecting', () => {
      expect(station.sent).toContain('<D CABS>');
    });

    describe('when the station lists locos 14 and 12', () => {
      beforeEach(() => broadcast('<* LocoSlots 2/120 size=56b\n Loco=14 s=23 f=0\n Loco=12 s=169 f=0\n*>'));

      it.each(['<t 14>', '<t 12>'])('asks after each with %s', (command) => {
        expect(station.sent).toContain(command);
      });

      describe('and reports 12 and 14 moving and 5 stopped', () => {
        // Loco 12 forward at 40 (129 + 40), loco 14 reverse at 22 (1 + 22),
        // and loco 5 stopped.
        beforeEach(() => broadcast('<l 12 0 169 0><l 14 0 23 0><l 5 0 128 0>'));

        it('lists the moving ones', () => {
          expect(locos.moving.map(loco => loco.address)).toEqual([12, 14]);
        });

        it('does not put them on desks here yet', () => {
          expect(locos.throttles).toEqual([]);
        });

        describe('driving them all here at once', () => {
          beforeEach(() => {
            locos.acquireAll(locos.moving.map(loco => loco.address));
          });

          it('opens a throttle for each at its current speed', () => {
            expect(locos.throttles.map(throttle => [throttle.address, throttle.speed])).toEqual([
              [12, 40],
              [14, 22],
            ]);
          });

          it('keeps loco 14 in reverse', () => {
            expect(locos.throttles[1]?.forward).toBe(false);
          });

          it('takes them out of the list of locos to pick up', () => {
            expect(locos.moving).toEqual([]);
          });
        });
      });
    });
  });
});
