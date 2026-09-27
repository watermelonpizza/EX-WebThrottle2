import type { VueWrapper } from '@vue/test-utils';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import EventsPanel from '@/components/panels/EventsPanel.vue';
import SafetyStrip from '@/components/shell/SafetyStrip.vue';
import { PANEL_TYPES } from '@/components/workspace/panels';
import { isLayoutNode, panel } from '@/core/workspace';

import type { ConnectedApp } from './helpers';
import { connectedApp } from './helpers';

describe('events panel', () => {
  it('is registered as a workspace panel type', () => {
    expect(PANEL_TYPES.events.component).toBe(EventsPanel);
  });

  it('is a panel a layout can place', () => {
    expect(isLayoutNode(panel('events'))).toBe(true);
  });

  describe('while it is on screen', () => {
    let app: ConnectedApp;
    let strip: VueWrapper;
    let log: VueWrapper;

    async function receive(frames: string): Promise<void> {
      app.station.receives(frames);
      await flushPromises();
    }

    beforeEach(async () => {
      localStorage.clear();
      app = await connectedApp();
      strip = mount(SafetyStrip, { global: { plugins: [app.pinia] } });
      log = mount(EventsPanel, { global: { plugins: [app.pinia] } });
      await receive('<H 4 0><H 4 1>');
    });

    it('lists a change', () => {
      expect(log.text()).toContain('Turnout 4 thrown');
    });

    it('counts it as read, so the strip shows none new', () => {
      expect(strip.find('[data-testid="events-unread"]').exists()).toBe(false);
    });

    // With the panel gone, the next change waits for the operator.
    it('leaves the next change new once the panel is closed', async () => {
      log.unmount();
      await receive('<H 4 0>');

      expect(strip.get('[data-testid="events-unread"]').text()).toBe('1');
    });
  });
});
