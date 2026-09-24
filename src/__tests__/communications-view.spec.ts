import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import { describe, expect, it } from 'vitest';

import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import CommunicationsView from '@/views/CommunicationsView.vue';

function mountView() {
  const pinia = createPinia();

  setActivePinia(pinia);

  const wrapper = mount(CommunicationsView, {
    global: {
      plugins: [pinia, createVuetify()],
    },
  });

  return { wrapper, store: useConnectionStore() };
}

describe('Communications view', () => {
  it('shows the disconnected state and the connect controls', () => {
    const { wrapper } = mountView();

    expect(wrapper.get('[data-test="status"]').text()).toBe('disconnected');
    expect(wrapper.find('[data-test="connect-serial"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="connect-emulator"]').exists()).toBe(true);
    expect(
      wrapper.get('[data-test="disconnect"]').attributes('disabled'),
    ).toBeDefined();
  });

  it('renders the raw traffic log while connected to the emulator', async () => {
    const { wrapper, store } = mountView();
    const emulator = new MockTransport();

    await store.connect(emulator);
    emulator.receives('<p1><p0>');

    await flushPromises();

    expect(wrapper.get('[data-test="status"]').text()).toBe('connected');
    expect(wrapper.get('[data-test="trace-list"]').text()).toContain('<p1>');
    expect(wrapper.get('[data-test="trace-list"]').text()).toContain('<p0>');
  });
});
