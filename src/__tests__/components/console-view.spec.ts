import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import App from '@/App.vue';
import { routes } from '@/router';

import { connectedApp } from './helpers';

describe('console', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows only the connect screen until a Command Station is connected', async () => {
    const pinia = createPinia();

    setActivePinia(pinia);

    const router = createRouter({ history: createMemoryHistory(), routes });

    await router.push('/');

    const wrapper = mount(App, { global: { plugins: [pinia, router] } });

    await flushPromises();

    expect(wrapper.get('[data-testid="page-title"]').text()).toBe(
      'Connect to your Command Station',
    );
    expect(wrapper.find('[data-testid="stop-all"]').exists()).toBe(false);
  });

  it('lays out the panels of the role in the link, with Stop all always present', async () => {
    const { pinia, router } = await connectedApp('/points');
    const wrapper = mount(App, { global: { plugins: [pinia, router] } });

    await flushPromises();

    expect(wrapper.find('[data-testid="panel-schematic"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="panel-points"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="panel-throttles"]').exists()).toBe(
      false,
    );
    expect(
      wrapper.get('[data-testid="role-points"]').attributes('aria-current'),
    ).toBe('page');
    expect(wrapper.find('[data-testid="stop-all"]').exists()).toBe(true);

    await router.push('/diagnostics');
    // Diagnostics loads on demand; wait for its panels to arrive and render.
    await vi.dynamicImportSettled();
    await flushPromises();

    expect(wrapper.find('[data-testid="trace-list"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="commands-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="stop-all"]').exists()).toBe(true);
  });
});
