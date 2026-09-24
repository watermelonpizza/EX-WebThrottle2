import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import { describe, expect, it } from 'vitest';

import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import ThrottlesView from '@/views/ThrottlesView.vue';

function mountView() {
  const pinia = createPinia();

  setActivePinia(pinia);

  const wrapper = mount(ThrottlesView, {
    global: {
      plugins: [pinia, createVuetify()],
    },
  });

  return { wrapper, store: useConnectionStore() };
}

describe('Throttles view', () => {
  it('prompts to connect when disconnected', () => {
    const { wrapper } = mountView();

    expect(wrapper.text()).toContain('Connect to your command station');
    expect(wrapper.find('[data-test="connect-serial"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="connect-emulator"]').exists()).toBe(true);
  });

  it('shows the connected state once a transport is connected', async () => {
    const { wrapper, store } = mountView();
    const emulator = new MockTransport();

    await store.connect(emulator);

    expect(wrapper.get('[data-test="status"]').text()).toBe('connected');
    expect(wrapper.text()).toContain('next stage');
  });
});
