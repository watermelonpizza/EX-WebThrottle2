import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import type { Transport } from '@/core/transport';
import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import { useLocosStore } from '@/stores/locos';
import { usePanelsStore } from '@/stores/panels';
import ConsoleView from '@/views/ConsoleView.vue';

function mountView() {
  localStorage.clear();

  const pinia = createPinia();

  setActivePinia(pinia);

  const wrapper = mount(ConsoleView, {
    global: { plugins: [pinia] },
  });

  return {
    wrapper,
    pinia,
    connection: useConnectionStore(),
    locos: useLocosStore(),
  };
}

describe('Console view', () => {
  it('prompts to connect while disconnected', () => {
    const { wrapper } = mountView();

    expect(wrapper.get('[data-test="status"]').text()).toBe('disconnected');
    expect(wrapper.find('[data-test="connect-serial"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="connect-emulator"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Choose how to reach your DCC-EX command station');
  });

  it('validates and uses a custom emulator WebSocket URL', async () => {
    const { wrapper, connection } = mountView();
    const connect = vi
      .spyOn(connection, 'connectToEmulator')
      .mockResolvedValue();
    const url = wrapper.get('[data-test="emulator-url"]');
    const button = wrapper.get('[data-test="connect-emulator"]');

    await url.setValue('http://192.168.1.25:4555');

    expect(wrapper.get('[data-test="emulator-url-error"]').text()).toContain(
      'ws:// or wss://',
    );
    expect(button.attributes('disabled')).toBeDefined();

    await url.setValue('ws://192.168.1.25:4555/command-station');

    expect(wrapper.find('[data-test="emulator-url-error"]').exists()).toBe(
      false,
    );
    expect(button.attributes('disabled')).toBeUndefined();

    await wrapper
      .get('[data-test="emulator-connect-form"]')
      .trigger('submit');

    expect(connect).toHaveBeenCalledWith(
      'ws://192.168.1.25:4555/command-station',
    );
  });

  it('shows a connection error after the emulator cannot connect', async () => {
    const { wrapper, connection } = mountView();
    const failing: Transport = {
      name: 'Emulator',
      connected: false,
      connect: async () => {
        throw new Error('server unavailable');
      },
      disconnect: async () => {},
      send: () => {},
      onData: () => () => {},
    };

    await connection.connect(failing);
    await nextTick();

    const alert = wrapper.get('[data-test="connection-error"]');

    expect(alert.attributes('role')).toBe('alert');
    expect(alert.text()).toBe(
      'Could not connect to Emulator. Check it is running and try again.',
    );
  });

  it('updates the status lamp while connecting', async () => {
    const { wrapper, connection } = mountView();
    const opened = Promise.withResolvers<void>();
    const transport: Transport = {
      name: 'Waiting',
      connected: false,
      connect: async () => {
        await opened.promise;
        transport.connected = true;
      },
      disconnect: async () => {},
      send: () => {},
      onData: () => () => {},
    };

    const connecting = connection.connect(transport);

    await nextTick();

    expect(wrapper.get('[data-test="status"] .lamp').classes()).toContain(
      'lamp--danger',
    );

    opened.resolve();
    await connecting;
  });

  it('saves a locomotive to the roster', async () => {
    const { wrapper, connection, locos } = mountView();

    // The roster form lives on the console, which appears once connected.
    await connection.connect(new MockTransport());

    await wrapper.get('[data-test="new-loco-address"]').setValue(7);
    await wrapper.get('[data-test="new-loco-name"]').setValue('Shunter');
    await wrapper.get('[data-test="add-loco"]').trigger('click');

    expect(locos.roster).toEqual([
      expect.objectContaining({ address: 7, name: 'Shunter' }),
    ]);
    expect(wrapper.text()).toContain('Shunter');
  });

  it('drives a saved locomotive over the emulator', async () => {
    const { wrapper, connection, locos } = mountView();
    const emulator = new MockTransport();

    locos.saveLoco(7, 'Shunter');
    await connection.connect(emulator);

    await wrapper.get('[data-test="drive"]').trigger('click');

    expect(locos.throttles).toEqual([
      expect.objectContaining({ address: 7, name: 'Shunter' }),
    ]);
    expect(wrapper.find('[data-test="throttle-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="speed-slider"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="estop"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="direction-toggle"]').exists()).toBe(true);
    expect(locos.throttles[0].functions).toHaveLength(32);
  });

  it('only sends momentary function commands while the button is held', async () => {
    const { wrapper, connection, locos } = mountView();
    const emulator = new MockTransport();

    locos.saveLoco(7, 'Shunter');
    await connection.connect(emulator);
    await wrapper.get('[data-test="drive"]').trigger('click');

    const horn = wrapper.find('[data-function="2"]');

    await horn.trigger('pointerenter');
    await horn.trigger('pointerleave');

    expect(emulator.sent).not.toContain('<F 7 2 0>');

    await horn.trigger('pointerdown');
    await horn.trigger('pointerleave');
    await horn.trigger('pointerup');

    expect(emulator.sent.filter((command) => command.startsWith('<F 7 2 '))).toEqual([
      '<F 7 2 1>',
      '<F 7 2 0>',
    ]);
  });

  it('shows control state reconciled from broadcasts', async () => {
    const { wrapper, connection, locos } = mountView();
    const emulator = new MockTransport();

    locos.acquire(7);
    await connection.connect(emulator);
    emulator.receives('<l 7 0 134 5>\n');
    await flushPromises();
    await nextTick();

    expect(locos.throttles[0].speed).toBe(5);
    expect(locos.throttles[0].functions[0]).toBe(true);
    expect(wrapper.text()).toContain('Headlight');
  });

  it('toggles the debug panel between raw and described log modes', async () => {
    const { wrapper, connection } = mountView();

    await connection.connect(new MockTransport());

    const toggle = wrapper.get('[data-test="debug-mode-toggle"]');

    expect(toggle.text()).toBe('Raw');
    expect(wrapper.find('[data-test="trace-row"]').exists()).toBe(true);

    await toggle.trigger('click');

    const rawLog = wrapper.get('[data-test="trace-list"]');

    expect(toggle.text()).toBe('Nice');
    expect(toggle.attributes('aria-pressed')).toBe('true');
    expect(rawLog.element).toBeInstanceOf(HTMLTextAreaElement);
    expect((rawLog.element as HTMLTextAreaElement).readOnly).toBe(true);
    expect((rawLog.element as HTMLTextAreaElement).value).toContain('<s>');
    expect(wrapper.find('[data-test="trace-row"]').exists()).toBe(false);

    await toggle.trigger('click');

    expect(toggle.attributes('aria-pressed')).toBe('false');
    expect(wrapper.find('[data-test="trace-row"]').exists()).toBe(true);
  });

  it('shows every panel once connected, and honours panel toggles', async () => {
    const { wrapper, connection, pinia } = mountView();
    const panels = usePanelsStore(pinia);

    await connection.connect(new MockTransport());

    expect(wrapper.find('[data-test="panel-layout"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="panel-locos"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="panel-driving"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="panel-debug"]').exists()).toBe(true);
    // The command lookup belongs to the debugging arrangement only.
    expect(wrapper.find('[data-test="panel-commands"]').exists()).toBe(false);

    panels.togglePanel('locos');
    await nextTick();

    expect(wrapper.find('[data-test="panel-locos"]').exists()).toBe(false);

    panels.togglePanel('locos');
    await nextTick();

    expect(wrapper.find('[data-test="panel-locos"]').exists()).toBe(true);
  });

  it('shows only the debug console and commands when debugging', async () => {
    const { wrapper, connection, pinia } = mountView();
    const panels = usePanelsStore(pinia);

    await connection.connect(new MockTransport());
    panels.setArrangement('debugging');
    await nextTick();

    const shown = wrapper
      .findAll('.workspace__panel')
      .map((panel) => panel.attributes('data-test'));

    expect(shown).toEqual(['panel-debug', 'panel-commands']);

    panels.togglePanel('commands');
    await nextTick();

    expect(wrapper.find('[data-test="panel-commands"]').exists()).toBe(false);
  });
});
