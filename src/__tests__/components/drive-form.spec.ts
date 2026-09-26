import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import DriveForm from '@/components/throttle/DriveForm.vue';
import { useLocosStore } from '@/stores/locos';

import { connectedApp } from './helpers';

describe('drive form', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('drives every saved loco at once', async () => {
    const { pinia, station } = await connectedApp();
    const locos = useLocosStore();

    locos.saveLoco(3, '37 025');
    locos.saveLoco(8, '08 648');

    const wrapper = mount(DriveForm, { global: { plugins: [pinia] } });

    await wrapper.get('[data-testid="drive-all-saved"]').trigger('click');

    expect(locos.throttles.map((throttle) => throttle.address)).toEqual([3, 8]);
    expect(station.sent).toContain('<t 8>');
  });

  it('offers the locos moving on the layout, by name where saved', async () => {
    const { pinia, station } = await connectedApp();
    const locos = useLocosStore();

    locos.saveLoco(12, 'Shunter');

    const wrapper = mount(DriveForm, { global: { plugins: [pinia] } });

    // Another Throttle is running locos 12 and 14.
    station.receives('<l 12 0 169 0><l 14 0 23 0>');
    await flushPromises();

    expect(wrapper.get('[data-testid="drive-moving-12"]').text()).toContain(
      'Shunter',
    );
    expect(wrapper.get('[data-testid="drive-moving-14"]').text()).toContain(
      '22 REV',
    );

    await wrapper.get('[data-testid="drive-all-moving"]').trigger('click');

    expect(locos.throttles.map((throttle) => throttle.address)).toEqual([
      12, 14,
    ]);
    expect(wrapper.find('[data-testid="drive-all-moving"]').exists()).toBe(
      false,
    );
  });
});
