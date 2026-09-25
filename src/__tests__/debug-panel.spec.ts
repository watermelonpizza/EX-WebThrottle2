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
    props: { rawMode: false },
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

  it('expands sent commands and received responses with their parameter meanings', async () => {
    const { wrapper, store } = mountPanel();
    const emulator = new MockTransport();

    await store.connect(emulator);
    store.send('<T 3 T>');
    store.send('<t 4 5 1>');
    emulator.receives('<H 3 1><mystery>');
    await flushPromises();

    const sentRow = wrapper
      .findAll('[data-test="trace-entry"]')
      .find((entry) => entry.text().includes('<T 3 T>'));

    expect(sentRow).toBeDefined();
    await sentRow!.get('[data-test="trace-row"]').trigger('click');

    expect(sentRow!.get('[data-test="trace-row"]').attributes('aria-expanded')).toBe(
      'true',
    );
    expect(sentRow!.get('[data-test="trace-details"]').text()).toContain(
      'Throw a turnout',
    );
    expect(sentRow!.get('[data-test="trace-details"]').text()).toContain(
      'id3',
    );

    const speedRow = wrapper
      .findAll('[data-test="trace-entry"]')
      .find((entry) => entry.text().includes('<t 4 5 1>'));

    expect(speedRow).toBeDefined();
    await speedRow!.get('[data-test="trace-row"]').trigger('click');
    expect(speedRow!.get('[data-test="trace-details"]').text()).toContain(
      '1 forward, 0 reverse',
    );

    const receivedRow = wrapper
      .findAll('[data-test="trace-entry"]')
      .find((entry) => entry.text().includes('<H 3 1>'));

    expect(receivedRow).toBeDefined();
    await receivedRow!.get('[data-test="trace-row"]').trigger('click');

    expect(receivedRow!.get('[data-test="trace-details"]').text()).toContain(
      'Turnout state',
    );
    expect(receivedRow!.get('[data-test="trace-details"]').text()).toContain(
      'Thrown',
    );

    const unknownRow = wrapper
      .findAll('[data-test="trace-entry"]')
      .find((entry) => entry.text().includes('<mystery>'));

    expect(unknownRow).toBeDefined();
    await unknownRow!.get('[data-test="trace-row"]').trigger('click');
    expect(unknownRow!.get('[data-test="trace-details"]').text()).toContain(
      'No matching response definition',
    );
  });
});
