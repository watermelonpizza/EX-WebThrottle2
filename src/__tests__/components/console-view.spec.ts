import type { VueWrapper } from '@vue/test-utils';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import App from '@/App.vue';
import { MockTransport } from '@/core/transport';
import { routes } from '@/router';
import { useConnectionStore } from '@/stores/connection';

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

  it('names the page in the browser tab', () => {
    expect(document.title).toBe('Connect · WebThrottle');
  });
});

// The page you were on goes when the connection comes or goes, and the
// keyboard focus would go with it.
describe('console as the connection comes and goes', () => {
  let wrapper: VueWrapper;

  function focused(): string | undefined {
    return (document.activeElement as HTMLElement).dataset.testid;
  }

  beforeEach(async () => {
    const pinia = createPinia();

    setActivePinia(pinia);

    const router = createRouter({ history: createMemoryHistory(), routes });

    await router.push('/control');
    wrapper = mount(App, { global: { plugins: [pinia, router] }, attachTo: document.body });
    await flushPromises();
    await useConnectionStore().connect(new MockTransport());
    await flushPromises();
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('starts at the heading naming the role once connected', () => {
    expect(focused()).toBe('role-title');
  });

  it('starts at the connect page heading once disconnected', async () => {
    await useConnectionStore().disconnect();
    await flushPromises();

    expect(focused()).toBe('page-title');
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

  it('names the role in the browser tab', () => {
    expect(document.title).toBe('Points · WebThrottle');
  });

  it('names the role in a heading for screen readers', () => {
    expect(wrapper.get('[data-testid="role-title"]').text()).toBe('Points');
  });

  it('names Settings in the browser tab once there', async () => {
    await app.router.push('/settings');
    await flushPromises();

    expect(document.title).toBe('Settings · WebThrottle');
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
