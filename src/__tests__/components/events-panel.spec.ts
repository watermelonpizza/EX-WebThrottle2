import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import EventsPanel from '@/components/panels/EventsPanel.vue';
import SafetyStrip from '@/components/shell/SafetyStrip.vue';
import { PANEL_TYPES } from '@/components/workspace/panels';
import { isLayoutNode, panel } from '@/core/workspace';

import { connectedApp } from './helpers';

describe('events panel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is a workspace panel a layout can place', () => {
    expect(PANEL_TYPES.events.component).toBe(EventsPanel);
    expect(isLayoutNode(panel('events'))).toBe(true);
  });

  it('counts changes as read while it is on screen, so the strip shows none new', async () => {
    const { pinia, station } = await connectedApp();
    const strip = mount(SafetyStrip, { global: { plugins: [pinia] } });
    const log = mount(EventsPanel, { global: { plugins: [pinia] } });

    station.receives('<H 4 0>');
    station.receives('<H 4 1>');
    await flushPromises();

    expect(log.text()).toContain('Turnout 4 thrown');
    expect(strip.find('[data-testid="events-unread"]').exists()).toBe(false);

    // With the panel gone, the next change waits for the operator.
    log.unmount();
    station.receives('<H 4 0>');
    await flushPromises();

    expect(strip.get('[data-testid="events-unread"]').text()).toBe('1');
  });
});
