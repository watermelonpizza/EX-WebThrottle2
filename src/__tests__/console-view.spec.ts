import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';

import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import { useLocosStore } from '@/stores/locos';
import { usePanelsStore } from '@/stores/panels';
import ConsoleView from '@/views/ConsoleView.vue';

function mountView() {
  localStorage.clear();

  const pinia = createPinia();

  setActivePinia(pinia);

  const wrapper = mount(ConsoleView, {
    global: { plugins: [pinia] },
  });

  return {
    wrapper,
    pinia,
    connection: useConnectionStore(),
    locos: useLocosStore(),
  };
}

describe('Console view', () => {
  it('prompts to connect while disconnected', () => {
    const { wrapper } = mountView();

    expect(wrapper.get('[data-test="status"]').text()).toBe('disconnected');
    expect(wrapper.find('[data-test="connect-serial"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="connect-emulator"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Connect to your DCC-EX command station');
  });

  it('saves a locomotive to the roster', async () => {
    const { wrapper, connection, locos } = mountView();

    // The roster form lives on the console, which appears once connected.
    await connection.connect(new MockTransport());

    await wrapper.get('[data-test="new-loco-address"]').setValue(7);
    await wrapper.get('[data-test="new-loco-name"]').setValue('Shunter');
    await wrapper.get('[data-test="add-loco"]').trigger('click');

    expect(locos.roster).toEqual([
      expect.objectContaining({ address: 7, name: 'Shunter' }),
    ]);
    expect(wrapper.text()).toContain('Shunter');
  });

  it('drives a saved locomotive over the emulator', async () => {
    const { wrapper, connection, locos } = mountView();
    const emulator = new MockTransport();

    locos.saveLoco(7, 'Shunter');
    await connection.connect(emulator);

    await wrapper.get('[data-test="drive"]').trigger('click');

    expect(locos.throttles).toEqual([
      expect.objectContaining({ address: 7, name: 'Shunter' }),
    ]);
    expect(wrapper.find('[data-test="throttle-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="speed-slider"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="estop"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="direction-toggle"]').exists()).toBe(true);
    expect(locos.throttles[0].functions).toHaveLength(32);
  });

  it('shows control state reconciled from broadcasts', async () => {
    const { wrapper, connection, locos } = mountView();
    const emulator = new MockTransport();

    locos.acquire(7);
    await connection.connect(emulator);
    emulator.receives('<l 7 0 134 5>\n');
    await flushPromises();
    await nextTick();

    expect(locos.throttles[0].speed).toBe(5);
    expect(locos.throttles[0].functions[0]).toBe(true);
    expect(wrapper.text()).toContain('Headlight');
  });

  it('shows every panel once connected, and honours panel toggles', async () => {
    const { wrapper, connection, pinia } = mountView();
    const panels = usePanelsStore(pinia);

    await connection.connect(new MockTransport());

    expect(wrapper.find('[data-test="panel-layout"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="panel-locos"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="panel-driving"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="panel-debug"]').exists()).toBe(true);

    panels.closePanel('locos');
    await nextTick();

    expect(wrapper.find('[data-test="panel-locos"]').exists()).toBe(false);

    panels.openPanel('locos');
    await nextTick();

    expect(wrapper.find('[data-test="panel-locos"]').exists()).toBe(true);
  });
});
