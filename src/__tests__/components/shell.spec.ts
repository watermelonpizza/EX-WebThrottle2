import type { VueWrapper } from '@vue/test-utils';
import { flushPromises, mount } from '@vue/test-utils';
import type { MockInstance } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ConnectScreen from '@/components/shell/ConnectScreen.vue';
import TopBar from '@/components/shell/TopBar.vue';
import SettingsView from '@/views/SettingsView.vue';
import { useConnectionStore } from '@/stores/connection';
import { useLocosStore } from '@/stores/locos';

import type { ConnectedApp } from './helpers';
import { connectedApp } from './helpers';

beforeEach(() => {
  localStorage.clear();
});

// The address rules themselves are tested in core/transport; this checks the
// connect page shows their verdict and only connects to a good address.
describe('connect screen', () => {
  let connect: MockInstance;
  let wrapper: VueWrapper;

  async function submit(address: string): Promise<void> {
    await wrapper.get('[data-testid="emulator-url"]').setValue(address);
    await wrapper.get('[data-testid="connect-form"]').trigger('submit');
  }

  beforeEach(async () => {
    const app = await connectedApp();

    connect = vi.spyOn(useConnectionStore(), 'connectToEmulator');
    wrapper = mount(ConnectScreen, { global: { plugins: [app.pinia, app.router] } });
  });

  describe('with an http:// address', () => {
    beforeEach(async () => {
      await wrapper.get('[data-testid="emulator-url"]').setValue('http://localhost:4444');
    });

    it('explains the address must start with ws://', () => {
      expect(wrapper.get('[data-testid="emulator-url-error"]').text()).toContain('must start with ws://');
    });

    it('disables the connect button', () => {
      expect(wrapper.get('[data-testid="connect-emulator"]').attributes('disabled')).toBe('');
    });

    it('does not connect when the form is submitted', async () => {
      await wrapper.get('[data-testid="connect-form"]').trigger('submit');

      expect(connect).not.toHaveBeenCalled();
    });
  });

  it('connects to a good address', async () => {
    await submit('ws://localhost:4444');

    expect(connect).toHaveBeenCalledWith('ws://localhost:4444');
  });
});

describe('top bar', () => {
  let app: ConnectedApp;

  function mountBar(): VueWrapper {
    return mount(TopBar, { global: { plugins: [app.pinia, app.router] } });
  }

  beforeEach(async () => {
    app = await connectedApp();
  });

  describe('with two locos moving', () => {
    let wrapper: VueWrapper;

    beforeEach(async () => {
      const locos = useLocosStore();

      locos.saveLoco(3, 'Switcher');
      locos.saveLoco(8, 'Shunter');
      locos.acquire(3);
      locos.acquire(8);
      locos.setSpeed(3, 20);
      locos.setSpeed(8, 10);
      app.station.receives('<iDCC-EX V-5.6.6 / HOST / HOST_SHIELD G-x>');
      await flushPromises();
      wrapper = mountBar();
    });

    it('warns which locos are moving before disconnecting', () => {
      expect(wrapper.get('[data-testid="disconnect-warning"]').text()).toContain('Switcher');
    });

    it('stops everything when asked to stop and disconnect', async () => {
      await wrapper.get('[data-testid="stop-and-disconnect"]').trigger('click');
      await flushPromises();

      expect(app.station.sent).toContain('<!>');
    });
  });

  describe('disconnecting with no loco moving', () => {
    beforeEach(async () => {
      await mountBar().get('[data-testid="disconnect"]').trigger('click');
      await flushPromises();
    });

    it('disconnects', () => {
      expect(useConnectionStore().status).toBe('disconnected');
    });

    it('does not stop anything', () => {
      expect(app.station.sent).not.toContain('<!>');
    });
  });
});

describe('settings view', () => {
  let wrapper: VueWrapper;

  beforeEach(async () => {
    const app = await connectedApp('/settings');

    wrapper = mount(SettingsView, { global: { plugins: [app.pinia, app.router] } });
  });

  it('leads back to the console while connected', () => {
    expect(wrapper.get('[data-testid="settings-back"]').text()).toContain('Back to the console');
  });

  it('leads back to connect once disconnected', async () => {
    await useConnectionStore().disconnect();

    expect(wrapper.get('[data-testid="settings-back"]').text()).toContain('Back to connect');
  });
});
