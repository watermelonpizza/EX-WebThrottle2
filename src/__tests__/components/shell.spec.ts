import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ConnectScreen from '@/components/shell/ConnectScreen.vue';
import TopBar from '@/components/shell/TopBar.vue';
import SettingsView from '@/views/SettingsView.vue';
import { useConnectionStore } from '@/stores/connection';
import { useLocosStore } from '@/stores/locos';

import { connectedApp } from './helpers';

describe('connection and shell components', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('validates WebSocket addresses before connecting', async () => {
    const app = await connectedApp();
    const connection = useConnectionStore();
    const connect = vi.spyOn(connection, 'connectToEmulator');
    const wrapper = mount(ConnectScreen, {
      global: { plugins: [app.pinia, app.router] },
    });
    const url = wrapper.get('[data-testid="emulator-url"]');

    await url.setValue('');
    expect(wrapper.get('[data-testid="emulator-url-error"]').text()).toContain(
      'Enter a WebSocket URL',
    );
    await url.setValue('not a URL');
    expect(wrapper.get('[data-testid="emulator-url-error"]').text()).toContain(
      'full WebSocket URL',
    );
    await url.setValue('http://localhost:4444');
    expect(wrapper.get('[data-testid="emulator-url-error"]').text()).toContain(
      'must start with ws://',
    );
    await url.setValue('ws://user:pass@localhost:4444');
    expect(wrapper.get('[data-testid="emulator-url-error"]').text()).toContain(
      'username or password',
    );
    await url.setValue('ws://localhost:4444');
    await wrapper.get('[data-testid="connect-form"]').trigger('submit');
    expect(connect).toHaveBeenCalledWith('ws://localhost:4444');
  });

  it('shows connection details and safely disconnects a moving loco', async () => {
    const app = await connectedApp();
    const locos = useLocosStore();
    locos.saveLoco(3, 'Switcher');
    locos.saveLoco(8, 'Shunter');
    locos.acquire(3);
    locos.acquire(8);
    locos.setSpeed(3, 20);
    locos.setSpeed(8, 10);
    app.station.receives('<iDCC-EX V-5.6.6 / HOST / HOST_SHIELD G-x>');
    await flushPromises();
    const wrapper = mount(TopBar, {
      global: { plugins: [app.pinia, app.router] },
    });

    expect(wrapper.get('[data-testid="disconnect-warning"]').text()).toContain(
      'Switcher',
    );
    await wrapper.get('[data-testid="stop-and-disconnect"]').trigger('click');
    await flushPromises();
    expect(app.station.sent).toContain('<!>');
  });

  it('disconnects without stopping when no loco is moving', async () => {
    const app = await connectedApp();
    const wrapper = mount(TopBar, {
      global: { plugins: [app.pinia, app.router] },
    });

    await wrapper.get('[data-testid="disconnect"]').trigger('click');
    await flushPromises();
    expect(useConnectionStore().status).toBe('disconnected');
  });

  it('renders settings with the appropriate way back', async () => {
    const app = await connectedApp('/settings');
    const wrapper = mount(SettingsView, {
      global: { plugins: [app.pinia, app.router] },
    });

    expect(wrapper.get('[data-testid="settings-back"]').text()).toContain(
      'Back to the console',
    );

    await useConnectionStore().disconnect();
    expect(wrapper.get('[data-testid="settings-back"]').text()).toContain(
      'Back to connect',
    );
  });
});
