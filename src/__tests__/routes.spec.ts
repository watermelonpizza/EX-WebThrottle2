import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import { useLocosStore } from '@/stores/locos';
import { useRoutesStore } from '@/stores/routes';

type RoutesStore = ReturnType<typeof useRoutesStore>;

describe('routes store', () => {
  let connection: ReturnType<typeof useConnectionStore>;
  let routes: RoutesStore;
  let station: MockTransport;

  async function receive(frames: string): Promise<void> {
    station.receives(frames);
    await flushPromises();
  }

  beforeEach(async () => {
    localStorage.clear();
    setActivePinia(createPinia());
    connection = useConnectionStore();
    routes = useRoutesStore();
    station = new MockTransport();
    await connection.connect(station);
    await flushPromises();
  });

  it('asks the station for its routes as soon as it is connected', () => {
    expect(station.sent).toContain('<JA>');
  });

  it('asks straight away when first used on a connection that is already up', async () => {
    setActivePinia(createPinia());

    const later = new MockTransport();

    await useConnectionStore().connect(later);
    useRoutesStore();

    expect(later.sent.filter(command => command === '<JA>')).toHaveLength(1);
  });

  describe('when EXRAIL lists routes 101 and 102 and automation 201', () => {
    beforeEach(() => receive('<jA 101 102 201>'));

    it.each(['<JA 101>', '<JA 102>', '<JA 201>'])('asks what each one is with %s', (command) => {
      expect(station.sent).toContain(command);
    });

    it('shows nothing until the station says what they are', () => {
      expect([...routes.routes, ...routes.automations]).toEqual([]);
    });

    describe('and describes them', () => {
      beforeEach(() =>
        receive('<jA 101 R "Main line"><jA 102 R ""><jA 201 A "Stop at Platform 1">'));

      it('lists the routes, named by their descriptions or numbers', () => {
        expect(routes.routes).toEqual([
          { id: 101, name: 'Main line', active: false, disabled: false },
          { id: 102, name: 'Route 102', active: false, disabled: false },
        ]);
      });

      it('lists the automation', () => {
        expect(routes.automations).toEqual([
          { id: 201, name: 'Stop at Platform 1', active: false, disabled: false },
        ]);
      });

      it('shows a route EXRAIL marks active', async () => {
        await receive('<jB 201 1>');

        expect(routes.automations[0]?.active).toBe(true);
      });

      it('shows a route EXRAIL disables', async () => {
        await receive('<jB 101 4>');

        expect(routes.routes[0]?.disabled).toBe(true);
      });

      it('leaves out a route EXRAIL hides', async () => {
        await receive('<jB 101 2>');

        expect(routes.routes.map(route => route.id)).toEqual([102]);
      });

      it('names a route by the caption EXRAIL gives it', async () => {
        await receive('<jB 101 "Mainline clear">');

        expect(routes.routes[0]?.name).toBe('Mainline clear');
      });

      it('forgets a route the station drops from its list', async () => {
        await receive('<jA 102 201>');

        expect(routes.routes.map(route => route.id)).toEqual([102]);
      });

      it('sets a route with </ START id>', async () => {
        routes.setRoute(101);
        await flushPromises();

        expect(station.sent).toContain('</ START 101>');
      });

      it('clears the lists on disconnect', async () => {
        await connection.disconnect();

        expect([...routes.routes, ...routes.automations]).toEqual([]);
      });
    });
  });

  describe('pausing every task', () => {
    beforeEach(() => {
      routes.pauseAll();
    });

    it('sends </ PAUSE>', () => {
      expect(station.sent).toContain('</ PAUSE>');
    });

    it('remembers that this Throttle paused them', () => {
      expect(routes.paused).toBe(true);
    });

    it('sends </ RESUME> to set them going again', () => {
      routes.resumeAll();

      expect(station.sent.at(-1)).toBe('</ RESUME>');
    });

    it('is no longer paused once resumed', () => {
      routes.resumeAll();

      expect(routes.paused).toBe(false);
    });

    it('forgets the pause on disconnect', async () => {
      await connection.disconnect();

      expect(routes.paused).toBe(false);
    });
  });

  describe('stopping everything', () => {
    beforeEach(() => {
      routes.stopAll();
    });

    it('pauses every task, then stops every loco', () => {
      expect(station.sent.slice(-2)).toEqual(['</ PAUSE>', '<!>']);
    });

    it('remembers that this Throttle paused them', () => {
      expect(routes.paused).toBe(true);
    });
  });

  describe('starting an automation', () => {
    it('does nothing without a loco on a desk', async () => {
      routes.startWithLoco(201);
      await flushPromises();

      expect(station.sent.some(command => command.startsWith('</ START'))).toBe(false);
    });

    describe('with locos 3 and 7 on desks', () => {
      beforeEach(() => {
        useLocosStore().acquireAll([3, 7]);
      });

      it('uses the first desk\'s loco', () => {
        expect(routes.automationLoco?.address).toBe(3);
      });

      it('starts it with that loco', async () => {
        routes.startWithLoco(201);
        await flushPromises();

        expect(station.sent).toContain('</ START 3 201>');
      });

      it('uses the loco picked instead', () => {
        routes.pickLoco(7);

        expect(routes.automationLoco?.address).toBe(7);
      });

      it('goes back to the first desk\'s loco when the picked one is released', () => {
        routes.pickLoco(7);
        useLocosStore().release(7);

        expect(routes.automationLoco?.address).toBe(3);
      });
    });
  });
});
