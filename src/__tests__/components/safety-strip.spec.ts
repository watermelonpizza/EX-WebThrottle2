import type { VueWrapper } from '@vue/test-utils';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import SafetyStrip from '@/components/shell/SafetyStrip.vue';

import type { ConnectedApp } from './helpers';
import { connectedApp } from './helpers';

describe('safety strip', () => {
  let app: ConnectedApp;
  let wrapper: VueWrapper;

  async function receive(frames: string): Promise<void> {
    app.station.receives(frames);
    await flushPromises();
  }

  beforeEach(async () => {
    localStorage.clear();
    app = await connectedApp();
    wrapper = mount(SafetyStrip, { global: { plugins: [app.pinia] } });
  });

  it('stops every loco from one always-visible button', async () => {
    await wrapper.get('[data-testid="stop-all"]').trigger('click');

    expect(app.station.sent.at(-1)).toBe('<!>');
  });

  describe('with track A reported off', () => {
    function trackA(): ReturnType<VueWrapper['get']> {
      return wrapper.get('[data-testid="track-power-A"]');
    }

    beforeEach(() => receive('<= A MAIN><= B PROG><p0>'));

    it('names the track and its state for screen readers', () => {
      expect(trackA().attributes('aria-label')).toBe('Main A power, off');
    });

    it('shows its state as a word', () => {
      expect(trackA().get('[data-testid="power-state"]').text()).toBe('OFF');
    });

    it('shows its switch as not pressed', () => {
      expect(trackA().attributes('aria-pressed')).toBe('false');
    });

    it('turns it on when clicked', async () => {
      await trackA().trigger('click');
      await flushPromises();

      expect(app.station.sent).toContain('<1 A>');
    });

    it('shows ON once the station reports it on', async () => {
      await receive('<pA>');

      expect(trackA().get('[data-testid="power-state"]').text()).toBe('ON');
    });
  });

  describe('all-tracks switch', () => {
    function all(): ReturnType<VueWrapper['get']> {
      return wrapper.get('[data-testid="master-power"]');
    }

    it('is labelled for track power before any track is listed', () => {
      expect(all().text()).toContain('Track power');
    });

    describe('when the tracks disagree', () => {
      beforeEach(() => receive('<= A MAIN><= B PROG><pA><pb>'));

      it('is labelled for all tracks', () => {
        expect(all().text()).toContain('All tracks');
      });

      it('shows the state as MIXED', () => {
        expect(all().get('[data-testid="power-state"]').text()).toBe('MIXED');
      });

      it('shows the switch as partly pressed', () => {
        expect(all().attributes('aria-pressed')).toBe('mixed');
      });

      it('cuts power to every track when clicked', async () => {
        await all().trigger('click');

        expect(app.station.sent.at(-1)).toBe('<0>');
      });
    });
  });

  describe('event log', () => {
    // What the station says on connecting sets the scene; it is not news.
    beforeEach(() => receive('<H 4 0><H 5 1>'));

    it('does not count the state reported on connecting as new', () => {
      expect(wrapper.find('[data-testid="events-unread"]').exists()).toBe(false);
    });

    describe('after two layout changes', () => {
      beforeEach(() => receive('<H 4 1><H 5 0>'));

      it('counts them as new', () => {
        expect(wrapper.get('[data-testid="events-unread"]').text()).toBe('2');
      });

      it('says how many are new for screen readers', () => {
        expect(wrapper.get('[data-testid="events-button"]').attributes('aria-label')).toBe('Events, 2 new');
      });

      it('lists the newest first', () => {
        const log = wrapper.get('[data-testid="event-log"]').text();

        expect(log.indexOf('Turnout 5 closed')).toBeLessThan(log.indexOf('Turnout 4 thrown'));
      });
    });
  });
});
