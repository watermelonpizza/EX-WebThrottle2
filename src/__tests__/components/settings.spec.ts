import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import type { Pinia } from 'pinia';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FunctionMaps from '@/components/settings/FunctionMaps.vue';
import SavedLocos from '@/components/settings/SavedLocos.vue';
import ThemeChoice from '@/components/settings/ThemeChoice.vue';
import { useLocosStore } from '@/stores/locos';
import { useMapsStore } from '@/stores/maps';
import { useSettingsStore } from '@/stores/settings';

function pinia(): Pinia {
  const value = createPinia();

  setActivePinia(value);
  localStorage.clear();

  return value;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('theme choice', () => {
  let wrapper: VueWrapper;

  beforeEach(async () => {
    wrapper = mount(ThemeChoice, { global: { plugins: [pinia()] } });
    await wrapper.get('[data-testid="theme-dark"] input').setValue(true);
  });

  it('uses the chosen theme', () => {
    expect(useSettingsStore().theme).toBe('dark');
  });

  it('marks the chosen theme as in use', () => {
    expect(wrapper.get('[data-testid="theme-dark"]').text()).toContain('In use');
  });
});

describe('saved locos', () => {
  let wrapper: VueWrapper;

  async function fillIn(address: string, name: string): Promise<void> {
    await wrapper.get('[data-testid="new-loco-address"]').setValue(address);
    await wrapper.get('[data-testid="new-loco-name"]').setValue(name);
  }

  async function deleteLoco(confirmed: boolean): Promise<void> {
    vi.spyOn(window, 'confirm').mockReturnValue(confirmed);
    await wrapper.get('[data-testid="roster-99"] [data-testid="delete-loco"]').trigger('click');
  }

  beforeEach(() => {
    const value = pinia();
    const mapId = useMapsStore().createMap('Switcher map', []);

    useLocosStore().saveLoco(99, 'Existing', mapId);
    wrapper = mount(SavedLocos, { global: { plugins: [value] } });
  });

  it('shows the function map a saved loco uses', () => {
    expect(wrapper.get('[data-testid="roster-99"]').text()).toContain('Switcher map');
  });

  it('lists a newly saved loco by name', async () => {
    await fillIn('12', 'Shunter');
    await wrapper.get('[data-testid="saved-loco-form"]').trigger('submit');

    expect(wrapper.get('[data-testid="roster-12"]').text()).toContain('Shunter');
  });

  it.each([
    { reason: 'address 0', address: '0', name: 'Nope' },
    { reason: 'a blank name', address: '3', name: '   ' },
  ])('will not add a loco with $reason', async ({ address, name }) => {
    await fillIn(address, name);

    expect(wrapper.get('[data-testid="add-loco"]').attributes('disabled')).toBe('');
  });

  it('fills the form with a saved loco to edit it', async () => {
    await wrapper.get('[data-testid="roster-99"] button').trigger('click');

    expect(wrapper.get('[data-testid="new-loco-name"]').element).toHaveProperty('value', 'Existing');
  });

  it('keeps a loco when deleting it is cancelled', async () => {
    await deleteLoco(false);

    expect(wrapper.find('[data-testid="roster-99"]').exists()).toBe(true);
  });

  it('deletes a loco once deleting it is confirmed', async () => {
    await deleteLoco(true);

    expect(wrapper.find('[data-testid="roster-99"]').exists()).toBe(false);
  });
});

describe('function maps', () => {
  let wrapper: VueWrapper;

  async function submit(): Promise<void> {
    await wrapper.get('[data-testid="function-map-form"]').trigger('submit');
  }

  beforeEach(async () => {
    wrapper = mount(FunctionMaps, { global: { plugins: [pinia()] } });
    await wrapper.get('[data-testid="new-map"]').trigger('click');
  });

  it('will not save a map without a name', async () => {
    await submit();

    expect(wrapper.find('[data-testid="map-entry"]').exists()).toBe(false);
  });

  describe('with a map saved', () => {
    async function deleteMap(confirmed: boolean): Promise<void> {
      vi.spyOn(window, 'confirm').mockReturnValue(confirmed);
      await wrapper.get('[data-testid="delete-map"]').trigger('click');
    }

    beforeEach(async () => {
      await wrapper.get('[data-testid="function-momentary"]').setValue(true);
      await wrapper.get('[data-testid="function-visible"]').setValue(false);
      await wrapper.get('[data-testid="map-name"]').setValue('Switcher');
      await submit();
    });

    it('lists it by name', () => {
      expect(wrapper.get('[data-testid="map-entry"]').text()).toContain('Switcher');
    });

    it('keeps the first function as momentary and hidden', () => {
      expect(useMapsStore().maps[0]?.functions[0]).toMatchObject({ momentary: true, hidden: true });
    });

    it('lists it under a new name after an edit', async () => {
      await wrapper.get('[data-testid="edit-map"]').trigger('click');
      await wrapper.get('[data-testid="map-name"]').setValue('Yard switcher');
      await submit();

      expect(wrapper.get('[data-testid="map-entry"]').text()).toContain('Yard switcher');
    });

    it('closes the form when an edit is cancelled', async () => {
      await wrapper.get('[data-testid="edit-map"]').trigger('click');
      await wrapper.get('[data-testid="function-map-form"] button[type="button"]').trigger('click');

      expect(wrapper.find('[data-testid="function-map-form"]').exists()).toBe(false);
    });

    it('keeps it when deleting it is cancelled', async () => {
      await deleteMap(false);

      expect(wrapper.find('[data-testid="map-entry"]').exists()).toBe(true);
    });

    describe('once deleting it is confirmed', () => {
      beforeEach(() => deleteMap(true));

      it('takes it off the list', () => {
        expect(wrapper.find('[data-testid="map-entry"]').exists()).toBe(false);
      });

      it('removes it from the saved maps', () => {
        expect(useMapsStore().maps).toHaveLength(0);
      });
    });
  });
});
