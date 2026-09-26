import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import LocoDesk from '@/components/throttle/LocoDesk.vue';
import { useLocosStore } from '@/stores/locos';
import { useMapsStore } from '@/stores/maps';

import { connectedApp } from './helpers';

async function desk() {
  const app = await connectedApp();
  const locos = useLocosStore();

  locos.saveLoco(3, '37 025 · Class 37');
  locos.acquire(3);

  const wrapper = mount(LocoDesk, {
    props: { throttle: locos.throttles[0] },
    global: { plugins: [app.pinia, app.router] },
  });

  return { ...app, locos, wrapper };
}

describe('loco desk', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('names the loco and gives the speed control an accessible name and value', async () => {
    const { wrapper } = await desk();

    expect(wrapper.get('[data-testid="desk-title"]').text()).toContain(
      '37 025 · Class 37',
    );
    expect(wrapper.get('[data-testid="desk-title"]').text()).toContain(
      'Address 3',
    );

    const slider = wrapper.get('[data-testid="speed-slider"]');

    expect(slider.attributes('aria-label')).toBe('Speed, 37 025 · Class 37');
    expect(slider.attributes('aria-valuetext')).toBe('0 of 126, forward');
  });

  it('drives: speed, direction and an immediate stop', async () => {
    const { wrapper, station } = await desk();

    await wrapper.get('[data-testid="speed-slider"]').setValue('30');
    expect(station.sent).toContain('<t 3 30 1>');

    await wrapper
      .get('[data-testid="direction-toggle"] button')
      .trigger('click');
    expect(station.sent).toContain('<t 3 30 0>');

    await wrapper.get('[data-testid="estop"]').trigger('click');
    expect(station.sent.at(-1)).toBe('<t 3 -1 0>');
    expect(wrapper.get('[data-testid="estop"]').text()).toBe('Stopped');
  });

  it('toggles latching functions and reports their state to assistive tech', async () => {
    const { wrapper, station } = await desk();
    const headlight = wrapper.get('[data-function="0"]');

    expect(headlight.attributes('aria-pressed')).toBe('false');

    await headlight.trigger('click');

    expect(station.sent).toContain('<F 3 0 1>');
    expect(headlight.attributes('aria-pressed')).toBe('true');
  });

  it('holds a momentary function from the keyboard as well as the pointer', async () => {
    const { wrapper, station } = await desk();
    // The default map's F2 is the horn, a press-and-hold function.
    const horn = wrapper.get('[data-function="2"]');

    await horn.trigger('keydown', { key: ' ' });
    expect(station.sent.at(-1)).toBe('<F 3 2 1>');

    await horn.trigger('keyup', { key: ' ' });
    expect(station.sent.at(-1)).toBe('<F 3 2 0>');
  });

  it('changes the function map and releases the cab from its menu', async () => {
    const app = await desk();
    const maps = useMapsStore();
    const mapId = maps.createMap('Switcher', [
      { fn: 0, label: 'Lights', momentary: false },
    ]);
    await flushPromises();

    await app.wrapper.get('[data-testid="function-map"]').setValue(mapId);
    expect(app.locos.throttles[0]?.mapId).toBe(mapId);

    await app.wrapper.get('[data-testid="release"]').trigger('click');
    expect(app.locos.throttles).toEqual([]);
    expect(app.station.sent).toContain('<- 3>');
  });

  it('offers a compact drive form when adding a second loco', async () => {
    const app = await desk();
    const wrapper = mount(LocoDesk, {
      props: { throttle: app.locos.throttles[0], canAdd: true },
      global: { plugins: [app.pinia, app.router] },
    });

    expect(wrapper.find('[data-testid="desk-add"]').exists()).toBe(true);
    expect(
      wrapper
        .get('[data-testid="drive-form"]')
        .find('[data-testid="drive-name"]')
        .exists(),
    ).toBe(false);
  });

  it('shows only the functions a map keeps, counting them in the heading', async () => {
    const app = await connectedApp();
    const locos = useLocosStore();
    const maps = useMapsStore();
    const mapId = maps.createMap('Shunter', [
      { fn: 0, label: 'Lights', momentary: false },
      { fn: 1, label: 'Sound', momentary: false },
      { fn: 2, label: 'Horn', momentary: true, hidden: true },
    ]);

    locos.saveLoco(8, '08 648', mapId);
    locos.acquire(8, mapId);
    await flushPromises();

    const wrapper = mount(LocoDesk, {
      props: { throttle: locos.throttles[0] },
      global: { plugins: [app.pinia, app.router] },
    });

    expect(wrapper.get('.desk__functions-title').text()).toBe('Functions · 2');
    expect(
      wrapper
        .findAll('.desk__keys [data-testid="fun"]')
        .map((key) => key.text()),
    ).toEqual(['Lights', 'Sound']);
  });
});
