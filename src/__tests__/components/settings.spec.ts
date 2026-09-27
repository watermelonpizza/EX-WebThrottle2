import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FunctionMaps from '@/components/settings/FunctionMaps.vue';
import SavedLocos from '@/components/settings/SavedLocos.vue';
import ThemeChoice from '@/components/settings/ThemeChoice.vue';
import { useLocosStore } from '@/stores/locos';
import { useMapsStore } from '@/stores/maps';
import { useSettingsStore } from '@/stores/settings';

function pinia() {
  const value = createPinia();

  setActivePinia(value);
  localStorage.clear();

  return value;
}

describe('settings components', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('changes the selected theme', async () => {
    const wrapper = mount(ThemeChoice, { global: { plugins: [pinia()] } });

    await wrapper.get('[data-testid="theme-dark"] input').setValue(true);

    expect(useSettingsStore().theme).toBe('dark');
    expect(wrapper.get('[data-testid="theme-dark"]').text()).toContain(
      'In use',
    );
  });

  it('saves, edits, and deletes a loco', async () => {
    const value = pinia();
    const mapId = useMapsStore().createMap('Switcher map', []);

    useLocosStore().saveLoco(99, 'Existing', mapId);
    const wrapper = mount(SavedLocos, { global: { plugins: [value] } });

    expect(wrapper.get('[data-testid="roster-99"]').text()).toContain(
      'Switcher map',
    );
    await wrapper.get('[data-testid="new-loco-address"]').setValue('12');
    await wrapper.get('[data-testid="new-loco-name"]').setValue('Shunter');
    await wrapper.get('[data-testid="saved-loco-form"]').trigger('submit');

    expect(wrapper.get('[data-testid="roster-12"]').text()).toContain(
      'Shunter',
    );

    await wrapper.get('[data-testid="roster-12"] button').trigger('click');
    expect(wrapper.get('[data-testid="new-loco-name"]').element).toHaveProperty(
      'value',
      'Shunter',
    );

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await wrapper
      .get('[data-testid="roster-12"] [data-testid="delete-loco"]')
      .trigger('click');
    expect(wrapper.find('[data-testid="roster-12"]').exists()).toBe(true);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await wrapper
      .get('[data-testid="roster-12"] [data-testid="delete-loco"]')
      .trigger('click');
    expect(wrapper.find('[data-testid="roster-12"]').exists()).toBe(false);
  });

  it('does not save invalid loco details', async () => {
    const wrapper = mount(SavedLocos, { global: { plugins: [pinia()] } });

    await wrapper.get('[data-testid="new-loco-address"]').setValue('0');
    await wrapper.get('[data-testid="new-loco-name"]').setValue('Nope');
    expect(wrapper.get('[data-testid="add-loco"]').attributes('disabled')).toBe(
      '',
    );

    await wrapper.get('[data-testid="new-loco-address"]').setValue('3');
    await wrapper.get('[data-testid="new-loco-name"]').setValue('   ');
    expect(wrapper.get('[data-testid="add-loco"]').attributes('disabled')).toBe(
      '',
    );
  });

  it('creates, edits, cancels, and deletes a function map', async () => {
    const value = pinia();
    const wrapper = mount(FunctionMaps, { global: { plugins: [value] } });

    await wrapper.get('[data-testid="new-map"]').trigger('click');
    await wrapper.get('[data-testid="function-map-form"]').trigger('submit');
    expect(wrapper.find('[data-testid="map-entry"]').exists()).toBe(false);
    await wrapper.get('[data-testid="function-momentary"]').setValue(true);
    await wrapper.get('[data-testid="function-visible"]').setValue(false);
    await wrapper.get('[data-testid="map-name"]').setValue('Switcher');
    await wrapper.get('[data-testid="function-map-form"]').trigger('submit');

    expect(wrapper.get('[data-testid="map-entry"]').text()).toContain(
      'Switcher',
    );

    await wrapper.get('[data-testid="edit-map"]').trigger('click');
    await wrapper.get('[data-testid="map-name"]').setValue('Yard switcher');
    await wrapper.get('[data-testid="function-map-form"]').trigger('submit');
    expect(wrapper.get('[data-testid="map-entry"]').text()).toContain(
      'Yard switcher',
    );

    await wrapper.get('[data-testid="edit-map"]').trigger('click');
    await wrapper
      .get('[data-testid="function-map-form"] button[type="button"]')
      .trigger('click');
    expect(wrapper.find('[data-testid="function-map-form"]').exists()).toBe(
      false,
    );

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await wrapper.get('[data-testid="delete-map"]').trigger('click');
    expect(wrapper.find('[data-testid="map-entry"]').exists()).toBe(true);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await wrapper.get('[data-testid="delete-map"]').trigger('click');
    expect(wrapper.find('[data-testid="map-entry"]').exists()).toBe(false);
    expect(useMapsStore().maps).toHaveLength(0);
  });
});
