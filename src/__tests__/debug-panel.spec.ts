import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it } from 'vitest';

import DebugPanel from '@/components/panels/DebugPanel.vue';
import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';

function mountPanel() {
  const pinia = createPinia();

  setActivePinia(pinia);

  const wrapper = mount(DebugPanel, {
    global: { plugins: [pinia] },
  });

  return { wrapper, store: useConnectionStore() };
}

describe('Debug panel', () => {
  it('renders the raw traffic log while connected to the emulator', async () => {
    const { wrapper, store } = mountPanel();
    const emulator = new MockTransport();

    await store.connect(emulator);
    emulator.receives('<p1><p0>');

    await flushPromises();

    expect(wrapper.get('[data-test="trace-list"]').text()).toContain('<p1>');
    expect(wrapper.get('[data-test="trace-list"]').text()).toContain('<p0>');
  });

  it('sends a raw command and logs it as sent', async () => {
    const { wrapper, store } = mountPanel();

    await store.connect(new MockTransport());

    await wrapper.get('[data-test="command-input"]').setValue('<1>');
    await wrapper.get('[data-test="send-command"]').trigger('click');

    const sent = store.trace.filter((entry) => entry.direction === 'sent');

    expect(sent).toHaveLength(3); // handshake <s> + <=> + our <1>
    expect(sent.map((entry) => entry.text)).toContain('<1>');
  });
});
