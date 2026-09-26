import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import SafetyStrip from '@/components/shell/SafetyStrip.vue';

import { connectedApp } from './helpers';

describe('safety strip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stops every loco from one always-visible button', async () => {
    const { pinia, station } = await connectedApp();
    const wrapper = mount(SafetyStrip, { global: { plugins: [pinia] } });

    await wrapper.get('[data-testid="stop-all"]').trigger('click');

    expect(station.sent.at(-1)).toBe('<!>');
  });

  it('shows each reported track with its state as a word and switches it', async () => {
    const { pinia, station } = await connectedApp();
    const wrapper = mount(SafetyStrip, { global: { plugins: [pinia] } });

    station.receives('<= A MAIN><= B PROG><p0>');
    await flushPromises();

    const main = wrapper.get('[data-testid="track-power-A"]');

    expect(main.attributes('aria-label')).toBe('Main A power, off');
    expect(main.get('.power__state').text()).toBe('OFF');
    expect(main.attributes('aria-pressed')).toBe('false');

    await main.trigger('click');
    await flushPromises();

    expect(station.sent).toContain('<1 A>');

    station.receives('<pA>');
    await flushPromises();

    expect(
      wrapper.get('[data-testid="track-power-A"] .power__state').text(),
    ).toBe('ON');
  });

  it('counts new layout changes and lists them newest first in the event log', async () => {
    const { pinia, station } = await connectedApp();
    const wrapper = mount(SafetyStrip, { global: { plugins: [pinia] } });

    // What the station says on connecting sets the scene; it is not news.
    station.receives('<H 4 0>');
    station.receives('<H 5 1>');
    await flushPromises();

    expect(wrapper.find('[data-testid="events-unread"]').exists()).toBe(false);

    station.receives('<H 4 1>');
    station.receives('<H 5 0>');
    await flushPromises();

    expect(wrapper.get('[data-testid="events-unread"]').text()).toBe('2');
    expect(
      wrapper.get('[data-testid="events-button"]').attributes('aria-label'),
    ).toBe('Events, 2 new');

    const log = wrapper.get('[data-testid="event-log"]').text();

    expect(log.indexOf('Turnout 5 closed')).toBeLessThan(
      log.indexOf('Turnout 4 thrown'),
    );
  });
});
