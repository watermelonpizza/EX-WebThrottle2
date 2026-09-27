import type { VueWrapper } from '@vue/test-utils';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import App from '@/App.vue';
import { routes } from '@/router';

import type { ConnectedApp } from './helpers';
import { connectedApp } from './helpers';

beforeEach(() => {
  localStorage.clear();
});

describe('console before a Command Station is connected', () => {
  let wrapper: VueWrapper;

  beforeEach(async () => {
    const pinia = createPinia();

    setActivePinia(pinia);

    const router = createRouter({ history: createMemoryHistory(), routes });

    await router.push('/');
    wrapper = mount(App, { global: { plugins: [pinia, router] } });
    await flushPromises();
  });

  it('shows only the connect screen', () => {
    expect(wrapper.get('[data-testid="page-title"]').text()).toBe('Connect to your Command Station');
  });

  it('has no Stop all yet', () => {
    expect(wrapper.find('[data-testid="stop-all"]').exists()).toBe(false);
  });
});

describe('console on the Points role link', () => {
  let app: ConnectedApp;
  let wrapper: VueWrapper;

  beforeEach(async () => {
    app = await connectedApp('/points');
    wrapper = mount(App, { global: { plugins: [app.pinia, app.router] } });
    await flushPromises();
  });

  it.each(['panel-schematic', 'panel-points'])('lays out the %s panel', (testId) => {
    expect(wrapper.find(`[data-testid="${testId}"]`).exists()).toBe(true);
  });

  it('leaves out the throttles panel', () => {
    expect(wrapper.find('[data-testid="panel-throttles"]').exists()).toBe(false);
  });

  it('marks the Points role as the current page', () => {
    expect(wrapper.get('[data-testid="role-points"]').attributes('aria-current')).toBe('page');
  });

  it('keeps Stop all on screen', () => {
    expect(wrapper.find('[data-testid="stop-all"]').exists()).toBe(true);
  });

  describe('after moving to the Diagnostics role', () => {
    beforeEach(async () => {
      await app.router.push('/diagnostics');
      // Diagnostics loads on demand; wait for its panels to arrive and render.
      await vi.dynamicImportSettled();
      await flushPromises();
    });

    it.each(['trace-list', 'commands-panel'])('shows the %s', (testId) => {
      expect(wrapper.find(`[data-testid="${testId}"]`).exists()).toBe(true);
    });

    it('keeps Stop all on screen', () => {
      expect(wrapper.find('[data-testid="stop-all"]').exists()).toBe(true);
    });
  });
});
