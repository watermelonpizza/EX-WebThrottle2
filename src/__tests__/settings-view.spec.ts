import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useMapsStore } from '@/stores/maps';
import { usePanelsStore } from '@/stores/panels';
import { useSettingsStore } from '@/stores/settings';
import SettingsView from '@/views/SettingsView.vue';

function mountView() {
  const pinia = createPinia();

  setActivePinia(pinia);

  const wrapper = mount(SettingsView, {
    global: { plugins: [pinia] },
  });

  return {
    wrapper,
    maps: useMapsStore(),
    panels: usePanelsStore(),
    settings: useSettingsStore(),
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('Settings view', () => {
  it('shows an empty function-map list', () => {
    const { wrapper } = mountView();

    expect(wrapper.get('[data-test="page-title"]').text()).toBe('Settings');
    expect(wrapper.text()).toContain('No custom maps yet');
    expect(wrapper.find('[data-test="new-map"]').exists()).toBe(true);
  });

  it('creates a map from the editor', async () => {
    const { wrapper, maps } = mountView();

    await wrapper.get('[data-test="new-map"]').trigger('click');

    expect(wrapper.findAll('[data-test="function-label"]')).toHaveLength(32);

    await wrapper.get('[data-test="map-name"]').setValue('Steam sound');
    await wrapper.get('[data-test="save-map"]').trigger('click');

    expect(maps.maps).toEqual([
      expect.objectContaining({ name: 'Steam sound' }),
    ]);
    expect(maps.maps[0].functions).toHaveLength(32);
  });

  it('lists existing maps and deletes them', async () => {
    const { wrapper, maps } = mountView();

    const id = maps.createMap('Diesel', []);
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('[data-test="map-entry"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('Diesel');

    await wrapper.get('[data-test="delete-map"]').trigger('click');

    expect(maps.maps).toEqual([]);
    expect(id).toBeTruthy();
  });

  it('lists arrangements by their full names', () => {
    const { wrapper } = mountView();

    expect(wrapper.text()).toContain('Driving');
    expect(wrapper.text()).toContain('Operations');
    expect(wrapper.text()).toContain('System');
  });

  it('switches the console arrangement', async () => {
    const { wrapper, panels } = mountView();

    await wrapper.get('[data-test="arrangement-system"]').trigger('click');

    expect(panels.arrangement).toBe('system');
    expect(
      wrapper.get('[data-test="arrangement-system"]').attributes('class'),
    ).toContain('console-layout__choice--active');
  });

  it('toggles panel visibility', async () => {
    const { wrapper, panels } = mountView();

    await wrapper.get('[data-test="panel-toggle-debug"]').setValue(false);

    expect(panels.isOpen('debug')).toBe(false);

    await wrapper.get('[data-test="panel-toggle-debug"]').setValue(true);

    expect(panels.isOpen('debug')).toBe(true);
  });

  it('switches the theme', async () => {
    const { wrapper, settings } = mountView();

    await wrapper.get('[data-test="theme-dark"]').trigger('click');

    expect(settings.theme).toBe('dark');
  });
});
