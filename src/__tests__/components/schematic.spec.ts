import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import SchematicPanel from '@/components/panels/SchematicPanel.vue';

import { EMULATOR_BANNER, connectedApp } from './helpers';

async function panel(banner: string) {
  const { pinia, station } = await connectedApp();

  station.receives(banner);
  station.receives('<jT 1 2>');
  station.receives('<jT 1 C ""><jT 2 T "">');
  station.receives('<Q 20>');
  await flushPromises();

  const wrapper = mount(SchematicPanel, { global: { plugins: [pinia] } });

  return { station, wrapper };
}

describe('schematic panel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('draws the emulator sample, lights the occupied section and throws a turnout', async () => {
    const { station, wrapper } = await panel(EMULATOR_BANNER);

    expect(wrapper.find('[data-testid="schematic"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="section-20"]').text()).toBe('Platform 1 · Occupied');

    const turnout = wrapper.get('[data-testid="diagram-turnout-1"]');

    expect(turnout.attributes('aria-label')).toBe('Turnout 1, closed. Press to throw.');

    await turnout.trigger('keydown', { key: 'Enter' });

    expect(station.sent.at(-1)).toBe('<T 1 T>');
    // Pending until the station confirms, never assumed.
    expect(turnout.classes()).toContain('turnout--pending');

    station.receives('<H 1 1>');
    await flushPromises();

    expect(turnout.classes()).not.toContain('turnout--pending');
    expect(turnout.attributes('aria-label')).toBe('Turnout 1, thrown. Press to close.');
  });

  it('flashes the new route into place whenever the station reports the points moving', async () => {
    const { station, wrapper } = await panel(EMULATOR_BANNER);

    // Opening the diagram shows how things are, with nothing flashing.
    expect(wrapper.find('.changing-over').exists()).toBe(false);

    // Moved by another Throttle: no press here, just the station's report.
    station.receives('<H 1 1>');
    await flushPromises();

    expect(wrapper.get('[data-testid="leg-turnout-1-thrown"]').classes()).toContain('changing-over');
    expect(wrapper.get('[data-testid="leg-turnout-1-closed"]').classes()).not.toContain('changing-over');
  });

  it('shows route tiles for a Command Station with no diagram', async () => {
    const { station, wrapper } = await panel('<iDCC-EX V-5.6.6 / ESP32 / EX-CSB1 G-test>');

    expect(wrapper.find('[data-testid="schematic"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="turnout-state-2"]').text()).toBe('Thrown');

    await wrapper.get('[data-testid="turnout-2"]').trigger('click');

    expect(station.sent.at(-1)).toBe('<T 2 C>');
  });
});
