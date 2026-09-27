import type { VueWrapper } from '@vue/test-utils';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import DriveForm from '@/components/throttle/DriveForm.vue';
import { useLocosStore } from '@/stores/locos';

import type { ConnectedApp } from './helpers';
import { connectedApp } from './helpers';

describe('drive form', () => {
  let app: ConnectedApp;
  let locos: ReturnType<typeof useLocosStore>;

  function mountForm(): VueWrapper {
    return mount(DriveForm, { global: { plugins: [app.pinia] } });
  }

  beforeEach(async () => {
    localStorage.clear();
    app = await connectedApp();
    locos = useLocosStore();
  });

  describe('driving every saved loco at once', () => {
    beforeEach(async () => {
      locos.saveLoco(3, '37 025');
      locos.saveLoco(8, '08 648');
      await mountForm().get('[data-testid="drive-all-saved"]').trigger('click');
    });

    it('puts each one on a desk', () => {
      expect(locos.throttles.map(throttle => throttle.address)).toEqual([3, 8]);
    });

    it('acquires each one from the station', () => {
      expect(app.station.sent).toEqual(expect.arrayContaining(['<t 3>', '<t 8>']));
    });
  });

  describe('with locos 12 and 14 moving on another Throttle', () => {
    let wrapper: VueWrapper;

    beforeEach(async () => {
      locos.saveLoco(12, 'Shunter');
      wrapper = mountForm();
      app.station.receives('<l 12 0 169 0><l 14 0 23 0>');
      await flushPromises();
    });

    it('offers a saved one by name', () => {
      expect(wrapper.get('[data-testid="drive-moving-12"]').text()).toContain('Shunter');
    });

    it('offers another with its speed and direction', () => {
      expect(wrapper.get('[data-testid="drive-moving-14"]').text()).toContain('22 REV');
    });

    describe('driving them all here', () => {
      beforeEach(async () => {
        await wrapper.get('[data-testid="drive-all-moving"]').trigger('click');
      });

      it('puts them on desks', () => {
        expect(locos.throttles.map(throttle => throttle.address)).toEqual([12, 14]);
      });

      it('stops offering them', () => {
        expect(wrapper.find('[data-testid="drive-all-moving"]').exists()).toBe(false);
      });
    });
  });
});
