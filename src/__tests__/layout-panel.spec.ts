import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it } from 'vitest';

import LayoutPanel from '@/components/panels/LayoutPanel.vue';
import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';

async function mountPanel() {
  const pinia = createPinia();

  setActivePinia(pinia);

  const wrapper = mount(LayoutPanel, { global: { plugins: [pinia] } });
  const connection = useConnectionStore();
  const station = new MockTransport();

  await connection.connect(station);
  await flushPromises();

  return { wrapper, connection, station };
}

describe('Layout panel', () => {
  it('says so when the station has nothing set up, and never claims routes', async () => {
    const { wrapper } = await mountPanel();

    expect(wrapper.text()).toContain('no turnouts, outputs or sensors');
    expect(wrapper.text()).toContain('Routes and automations are not listed');
  });

  it('shows what the station reports and switches a turnout', async () => {
    const { wrapper, station } = await mountPanel();

    station.receives('<jT 1><jT 1 C "Yard entry"><Y 10 100 0 0><Q 20>');
    await flushPromises();

    const turnout = wrapper.get('[data-test="turnout-1"]');

    expect(turnout.text()).toContain('Yard entry');
    expect(turnout.text()).toContain('Closed');
    expect(wrapper.get('[data-test="output-10"]').text()).toContain('Output 10');
    expect(wrapper.get('[data-test="sensor-20"]').text()).toContain('Active');
    expect(wrapper.text()).not.toContain('no turnouts, outputs or sensors');

    await wrapper.get('[data-test="turnout-toggle-1"]').trigger('click');

    expect(station.sent).toContain('<T 1 T>');
  });

  it('falls back to the turnout id when the station gives no description', async () => {
    const { wrapper, station } = await mountPanel();

    station.receives('<jT 4><jT 4 T "">');
    await flushPromises();

    expect(wrapper.get('[data-test="turnout-4"]').text()).toContain(
      'Turnout 4',
    );
    expect(wrapper.get('[data-test="turnout-toggle-4"]').text()).toBe('Close');
  });
});
