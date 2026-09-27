import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import CommandsPanel from '@/components/panels/CommandsPanel.vue';
import OutputsPanel from '@/components/panels/OutputsPanel.vue';
import PointsPanel from '@/components/panels/PointsPanel.vue';
import SensorsPanel from '@/components/panels/SensorsPanel.vue';
import ThrottlesPanel from '@/components/panels/ThrottlesPanel.vue';
import TrafficPanel from '@/components/panels/TrafficPanel.vue';
import FunctionKeys from '@/components/throttle/FunctionKeys.vue';
import { DEFAULT_FUNCTIONS } from '@/core/loco/functions';
import { useLocosStore } from '@/stores/locos';

import { connectedApp } from './helpers';

describe('workspace panels', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows and switches reported outputs, points, and sensors', async () => {
    const { pinia, station } = await connectedApp();
    const outputs = mount(OutputsPanel, { global: { plugins: [pinia] } });
    const points = mount(PointsPanel, { global: { plugins: [pinia] } });
    const sensors = mount(SensorsPanel, { global: { plugins: [pinia] } });

    expect(outputs.text()).toContain('No outputs');
    expect(points.text()).toContain('No turnouts');
    expect(sensors.text()).toContain('No sensors');

    station.receives('<jT 4><jT 4 C "Yard"><Y 7 100 0 0><q 9><Q 10>');
    await flushPromises();

    expect(points.get('[data-testid="turnout-4"]').text()).toContain('Yard');
    expect(outputs.get('[data-testid="output-7"]').text()).toContain('OFF');
    expect(sensors.get('[data-testid="sensor-9"]').text()).toContain('Clear');
    expect(sensors.get('[data-testid="sensor-10"]').text()).toContain(
      'Occupied',
    );

    await outputs.get('[data-testid="output-7"]').trigger('click');
    await points.get('[data-testid="turnout-4"]').trigger('click');
    expect(station.sent).toContain('<Z 7 1>');
    expect(station.sent).toContain('<T 4 T>');
  });

  it('searches commands, sends simple commands, and confirms risky ones', async () => {
    const { pinia, station } = await connectedApp();
    const wrapper = mount(CommandsPanel, { global: { plugins: [pinia] } });

    await wrapper.get('[data-testid="lookup-search"]').setValue('power');
    expect(
      wrapper.findAll('[data-testid="lookup-command"]').length,
    ).toBeGreaterThan(0);

    await wrapper.get('[data-testid="lookup-search"]').setValue('forget every');
    const command = wrapper.get('[data-testid="lookup-command"] button');

    await command.trigger('click');
    expect(wrapper.get('[data-testid="lookup-send"]').text()).toContain(
      'Confirm',
    );
    await wrapper.get('[data-testid="lookup-send"]').trigger('submit');
    expect(station.sent).toContain('<->');

    await wrapper
      .get('[data-testid="lookup-search"]')
      .setValue('Power on one track');
    await wrapper.get('[data-testid="lookup-command"] button').trigger('click');
    await wrapper.get('[data-testid="lookup-value-0"]').setValue('A');
    expect(wrapper.get('[data-testid="lookup-preview"]').text()).toBe('<1 A>');
    await wrapper.get('[data-testid="lookup-send"]').trigger('submit');
    expect(station.sent).toContain('<1 A>');

    await wrapper
      .get('[data-testid="lookup-search"]')
      .setValue('no such command');
    expect(wrapper.text()).toContain('No commands match');
  });

  it('shows raw and explained traffic and sends entered commands', async () => {
    const { pinia, station } = await connectedApp();
    const wrapper = mount(TrafficPanel, { global: { plugins: [pinia] } });

    expect(wrapper.find('[data-testid="trace-entry"]').exists()).toBe(true);
    await wrapper.get('[data-testid="command-input"]').setValue(' <1> ');
    await wrapper.get('[data-testid="traffic-send-form"]').trigger('submit');
    expect(station.sent).toContain('<1>');

    station.receives('<p1>');
    await flushPromises();
    await wrapper.get('[data-testid="trace-row"]').trigger('click');
    expect(wrapper.find('[data-testid="trace-details"]').exists()).toBe(true);
    await wrapper.get('[data-testid="traffic-raw"]').trigger('click');
    await wrapper.get('[data-testid="traffic-explained"]').trigger('click');
    await wrapper.get('[data-testid="command-input"]').setValue('   ');
    await wrapper.get('[data-testid="traffic-send-form"]').trigger('submit');
    await wrapper.get('[data-testid="command-input"]').setValue('<unknown>');
    await wrapper.get('[data-testid="traffic-send-form"]').trigger('submit');
    await flushPromises();
    const rows = wrapper.findAll('[data-testid="trace-row"]');

    await rows.at(-1)?.trigger('click');
    expect(wrapper.text()).toContain('does not know this');
    await wrapper.get('[data-testid="traffic-raw"]').trigger('click');
    expect(wrapper.get('[data-testid="trace-list"]').element.tagName).toBe(
      'TEXTAREA',
    );
    expect(
      (wrapper.get('[data-testid="trace-list"]').element as HTMLTextAreaElement)
        .value,
    ).toContain('<p1>');
  });

  it('drives an unnamed loco and supports the compact form', async () => {
    const { pinia, station } = await connectedApp();
    const wrapper = mount(ThrottlesPanel, { global: { plugins: [pinia] } });
    const address = wrapper.get('[data-testid="drive-address"]');

    await address.setValue('8');
    await wrapper.get('[data-testid="drive-name"]').setValue('Yard loco');
    await wrapper.get('[data-testid="drive-form"]').trigger('submit');

    expect(station.sent).toContain('<t 8>');
    expect(useLocosStore().roster[0]?.name).toBe('Yard loco');
  });

  it('shows the empty throttle form and an acquired throttle', async () => {
    const { pinia } = await connectedApp();
    const wrapper = mount(ThrottlesPanel, { global: { plugins: [pinia] } });

    expect(wrapper.text()).toContain('Drive a loco');
    const locos = useLocosStore();

    locos.saveLoco(3, 'Switcher');
    locos.acquire(3);
    await flushPromises();
    expect(wrapper.text()).toContain('Switcher');
  });
});

describe('function keys', () => {
  it('toggles latching keys and emits press and release for momentary keys', async () => {
    const functions = DEFAULT_FUNCTIONS.slice(0, 3);
    const wrapper = mount(FunctionKeys, {
      props: { functions, states: [], limit: 3 },
    });

    await wrapper.get('[data-function="0"]').trigger('click');
    await wrapper.get('[data-function="2"]').trigger('pointerdown');
    await wrapper.get('[data-function="2"]').trigger('pointerup');
    await wrapper.get('[data-function="2"]').trigger('pointerleave');
    await wrapper.get('[data-function="2"]').trigger('pointercancel');
    await wrapper
      .get('[data-function="2"]')
      .trigger('keydown', { key: ' ', repeat: true });
    await wrapper
      .get('[data-function="2"]')
      .trigger('keydown', { key: 'Enter' });
    await wrapper.get('[data-function="2"]').trigger('keyup', { key: 'Enter' });
    await wrapper.get('[data-function="0"]').trigger('keyup', { key: ' ' });

    expect(wrapper.emitted('set')).toEqual([
      [0, true],
      [2, true],
      [2, false],
      [2, true],
      [2, false],
    ]);
  });
});
