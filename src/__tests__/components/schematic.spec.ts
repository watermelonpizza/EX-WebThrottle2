import type { VueWrapper } from '@vue/test-utils';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import SchematicPanel from '@/components/panels/SchematicPanel.vue';

import type { ConnectedApp } from './helpers';
import { EMULATOR_BANNER, connectedApp } from './helpers';

describe('schematic panel', () => {
  let app: ConnectedApp;
  let wrapper: VueWrapper;

  async function receive(frames: string): Promise<void> {
    app.station.receives(frames);
    await flushPromises();
  }

  // Turnout 1 closed, turnout 2 thrown and sensor 20 occupied, on a station
  // that introduces itself with the given banner.
  async function openOn(banner: string): Promise<void> {
    app = await connectedApp();
    await receive(`${banner}<jT 1 2><jT 1 C ""><jT 2 T ""><Q 20>`);
    wrapper = mount(SchematicPanel, { global: { plugins: [app.pinia] } });
  }

  beforeEach(() => {
    localStorage.clear();
  });

  describe('on the emulator', () => {
    function turnout1(): ReturnType<VueWrapper['get']> {
      return wrapper.get('[data-testid="diagram-turnout-1"]');
    }

    beforeEach(() => openOn(EMULATOR_BANNER));

    it('draws the sample layout diagram', () => {
      expect(wrapper.find('[data-testid="schematic"]').exists()).toBe(true);
    });

    it('lights the occupied section', () => {
      expect(wrapper.get('[data-testid="section-20"]').text()).toBe('Platform 1 · Occupied');
    });

    it('offers to throw a closed turnout', () => {
      expect(turnout1().attributes('aria-label')).toBe('Turnout 1, closed. Press to throw.');
    });

    it('does not flash any route when opened', () => {
      expect(wrapper.find('.changing-over').exists()).toBe(false);
    });

    describe('when Enter is pressed on a closed turnout', () => {
      beforeEach(async () => {
        await turnout1().trigger('keydown', { key: 'Enter' });
      });

      it('throws it', () => {
        expect(app.station.sent.at(-1)).toBe('<T 1 T>');
      });

      // Pending until the station confirms, never assumed.
      it('shows it pending', () => {
        expect(turnout1().classes()).toContain('turnout--pending');
      });

      describe('once the station reports it thrown', () => {
        beforeEach(() => receive('<H 1 1>'));

        it('no longer shows it pending', () => {
          expect(turnout1().classes()).not.toContain('turnout--pending');
        });

        it('offers to close it', () => {
          expect(turnout1().attributes('aria-label')).toBe('Turnout 1, thrown. Press to close.');
        });
      });
    });

    // Moved by another Throttle: no press here, just the station's report.
    describe('when the station reports the points moving', () => {
      beforeEach(() => receive('<H 1 1>'));

      it('flashes the new route into place', () => {
        expect(wrapper.get('[data-testid="leg-turnout-1-thrown"]').classes()).toContain('changing-over');
      });

      it('does not flash the old route', () => {
        expect(wrapper.get('[data-testid="leg-turnout-1-closed"]').classes()).not.toContain('changing-over');
      });
    });
  });

  describe('on a Command Station with no diagram', () => {
    beforeEach(() => openOn('<iDCC-EX V-5.6.6 / ESP32 / EX-CSB1 G-test>'));

    it('shows the points and sensors list instead of a diagram', () => {
      expect(wrapper.find('[data-testid="schematic"]').exists()).toBe(false);
    });

    it('shows each turnout\'s position on its tile', () => {
      expect(wrapper.get('[data-testid="turnout-state-2"]').text()).toBe('Thrown');
    });

    it('closes a thrown turnout when its tile is clicked', async () => {
      await wrapper.get('[data-testid="turnout-2"]').trigger('click');

      expect(app.station.sent.at(-1)).toBe('<T 2 C>');
    });
  });
});
