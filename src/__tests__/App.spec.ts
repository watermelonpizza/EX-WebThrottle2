import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';

import App from '@/App.vue';
import { routes } from '@/router';
import { usePanelsStore } from '@/stores/panels';
import { useSettingsStore } from '@/stores/settings';

function mountApp() {
  localStorage.clear();

  const pinia = createPinia();
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  });

  const wrapper = mount(App, {
    global: {
      plugins: [pinia, router],
    },
  });

  return { wrapper, router, pinia };
}

describe('App shell', () => {
  it('renders a slim header, the settings button, and the bottom status bar', async () => {
    const { wrapper } = mountApp();

    const brand = wrapper.get('[data-test="brand"]');

    expect(brand.attributes('href')).toBe('/');
    expect(brand.find('img').attributes('src')).toContain('WebThrottle.png');
    expect(wrapper.find('[data-test="settings-link"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="toggle-debug"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="shell-status"]').text()).toBe(
      'disconnected',
    );
  });

  it('navigates to settings and shows its content', async () => {
    const { wrapper, router } = mountApp();
    await router.push('/settings');
    await router.isReady();
    await flushPromises();

    expect(wrapper.get('[data-test="page-title"]').text()).toBe('Settings');
  });

  it('changes theme from the settings picker', async () => {
    const { wrapper, router, pinia } = mountApp();
    const settings = useSettingsStore(pinia);

    await router.push('/settings');
    await router.isReady();
    await flushPromises();

    await wrapper.get('[data-test="theme-dark"]').trigger('click');

    expect(settings.theme).toBe('dark');
    expect(
      wrapper.get('[data-test="theme-dark"]').attributes('class'),
    ).toContain('theme-picker__choice--active');
  });

  it('opens a closed panel from the settings screen', async () => {
    const { wrapper, router, pinia } = mountApp();
    const panels = usePanelsStore(pinia);

    panels.closePanel('debug');
    await router.push('/settings');
    await router.isReady();
    await flushPromises();

    await wrapper.get('[data-test="panel-toggle-debug"]').setValue(true);

    expect(panels.isOpen('debug')).toBe(true);
  });
});
