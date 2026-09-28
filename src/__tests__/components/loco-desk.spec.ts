import type { VueWrapper } from '@vue/test-utils';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import LocoDesk from '@/components/throttle/LocoDesk.vue';
import { useLocosStore } from '@/stores/locos';
import { useMapsStore } from '@/stores/maps';

import type { ConnectedApp } from './helpers';
import { connectedApp } from './helpers';

describe('loco desk', () => {
  let app: ConnectedApp;
  let locos: ReturnType<typeof useLocosStore>;
  let wrapper: VueWrapper;

  function mountDesk(props: Record<string, unknown> = {}): VueWrapper {
    return mount(LocoDesk, {
      props: { throttle: locos.throttles[0], ...props },
      global: { plugins: [app.pinia, app.router] },
    });
  }

  beforeEach(async () => {
    localStorage.clear();
    app = await connectedApp();
    locos = useLocosStore();
    locos.saveLoco(3, '37 025 · Class 37');
    locos.acquire(3);
    wrapper = mountDesk();
  });

  it.each(['37 025 · Class 37', 'Address 3'])('shows %s in the title', (text) => {
    expect(wrapper.get('[data-testid="desk-title"]').text()).toContain(text);
  });

  it('says the title opens the loco\'s settings', () => {
    expect(wrapper.get('[data-testid="desk-title"]').text()).toContain(', settings');
  });

  it('names the stop key after the loco', () => {
    expect(wrapper.get('[data-testid="estop"]').attributes('aria-label')).toBe('Stop, 37 025 · Class 37');
  });

  // The slider already tells assistive tech the speed.
  it('keeps the speed readout from being announced as well', () => {
    expect(wrapper.get('[data-testid="speed-readout"]').attributes('aria-hidden')).toBe('true');
  });

  it('names the speed control after the loco', () => {
    expect(wrapper.get('[data-testid="speed-slider"]').attributes('aria-label')).toBe('Speed, 37 025 · Class 37');
  });

  it('describes the speed in words', () => {
    expect(wrapper.get('[data-testid="speed-slider"]').attributes('aria-valuetext')).toBe('0 of 126, forward');
  });

  it('sends the speed set on the slider', async () => {
    await wrapper.get('[data-testid="speed-slider"]').setValue('30');

    expect(app.station.sent).toContain('<t 3 30 1>');
  });

  it('reverses at the same speed', async () => {
    await wrapper.get('[data-testid="speed-slider"]').setValue('30');
    await wrapper.get('[data-testid="direction-toggle"] button').trigger('click');

    expect(app.station.sent).toContain('<t 3 30 0>');
  });

  describe('when stop is pressed', () => {
    beforeEach(async () => {
      await wrapper.get('[data-testid="estop"]').trigger('click');
    });

    it('stops the loco at once', () => {
      expect(app.station.sent.at(-1)).toBe('<t 3 -1 1>');
    });

    it('says the loco is stopped', () => {
      expect(wrapper.get('[data-testid="estop"]').text()).toBe('Stopped');
    });

    it('says so to a screen reader too', () => {
      expect(wrapper.get('[data-testid="estop"]').attributes('aria-label')).toBe('Stopped, 37 025 · Class 37');
    });
  });

  it('shows a latching function that is off as not pressed', () => {
    expect(wrapper.get('[data-function="0"]').attributes('aria-pressed')).toBe('false');
  });

  describe('when a latching function is clicked', () => {
    beforeEach(async () => {
      await wrapper.get('[data-function="0"]').trigger('click');
    });

    it('turns it on', () => {
      expect(app.station.sent).toContain('<F 3 0 1>');
    });

    it('shows it pressed', () => {
      expect(wrapper.get('[data-function="0"]').attributes('aria-pressed')).toBe('true');
    });
  });

  // The default map's F2 is the horn, a press-and-hold function.
  it('sounds a momentary function while Space is held', async () => {
    await wrapper.get('[data-function="2"]').trigger('keydown', { key: ' ' });

    expect(app.station.sent.at(-1)).toBe('<F 3 2 1>');
  });

  it('silences a momentary function when Space is released', async () => {
    await wrapper.get('[data-function="2"]').trigger('keydown', { key: ' ' });
    await wrapper.get('[data-function="2"]').trigger('keyup', { key: ' ' });

    expect(app.station.sent.at(-1)).toBe('<F 3 2 0>');
  });

  it('changes the function map from its menu', async () => {
    const mapId = useMapsStore().createMap('Switcher', [{ fn: 0, label: 'Lights', momentary: false }]);

    await flushPromises();
    await wrapper.get('[data-testid="function-map"]').setValue(mapId);

    expect(locos.throttles[0]?.mapId).toBe(mapId);
  });

  describe('when released from its menu', () => {
    beforeEach(async () => {
      await wrapper.get('[data-testid="release"]').trigger('click');
    });

    it('closes the throttle', () => {
      expect(locos.throttles).toEqual([]);
    });

    it('frees the loco\'s slot on the station', () => {
      expect(app.station.sent).toContain('<- 3>');
    });
  });

  describe('when another loco can be added', () => {
    let adding: VueWrapper;

    beforeEach(() => {
      adding = mountDesk({ canAdd: true });
    });

    it('offers a way to add one', () => {
      expect(adding.find('[data-testid="desk-add"]').exists()).toBe(true);
    });

    it('uses the compact drive form, without a name field', () => {
      expect(adding.get('[data-testid="drive-form"]').find('[data-testid="drive-name"]').exists()).toBe(false);
    });
  });
});

describe('loco desk with a function map that hides a key', () => {
  let wrapper: VueWrapper;

  beforeEach(async () => {
    localStorage.clear();

    const app = await connectedApp();
    const locos = useLocosStore();
    const mapId = useMapsStore().createMap('Shunter', [
      { fn: 0, label: 'Lights', momentary: false },
      { fn: 1, label: 'Sound', momentary: false },
      { fn: 2, label: 'Horn', momentary: true, hidden: true },
    ]);

    locos.saveLoco(8, '08 648', mapId);
    locos.acquire(8);
    await flushPromises();
    wrapper = mount(LocoDesk, {
      props: { throttle: locos.throttles[0] },
      global: { plugins: [app.pinia, app.router] },
    });
  });

  it('shows only the functions the map keeps', () => {
    expect(wrapper.findAll('[data-testid="desk-keys"] [data-testid="fun"]').map(key => key.text())).toEqual([
      'Lights',
      'Sound',
    ]);
  });

  it('counts them in the heading', () => {
    expect(wrapper.get('[data-testid="functions-title"]').text()).toBe('Functions · 2');
  });
});

describe('loco desk for a loco on the Command Station\'s roster', () => {
  let wrapper: VueWrapper;

  beforeEach(async () => {
    localStorage.clear();

    const app = await connectedApp();
    const locos = useLocosStore();

    app.station.receives('<jR 10><jR 10 "Pannier" "Lights/*Whistle">');
    await flushPromises();
    locos.acquire(10);
    wrapper = mount(LocoDesk, {
      props: { throttle: locos.throttles[0] },
      global: { plugins: [app.pinia, app.router] },
    });
  });

  it('shows the roster\'s function names', () => {
    expect(wrapper.findAll('[data-testid="desk-keys"] [data-testid="fun"]').map(key => key.text())).toEqual([
      'Lights',
      'Whistle',
    ]);
  });

  it('offers them as a function map', () => {
    expect(wrapper.get('[data-testid="function-map"]').element).toHaveProperty('value', 'station');
  });
});

// Saved on the roster's names while on another Command Station, whose roster
// had it; this one does not.
describe('loco desk on the roster\'s names, for a loco this roster lacks', () => {
  let wrapper: VueWrapper;

  beforeEach(async () => {
    localStorage.clear();

    const app = await connectedApp();
    const locos = useLocosStore();

    locos.saveLoco(3, 'Tank', 'station');
    locos.acquire(3);
    wrapper = mount(LocoDesk, {
      props: { throttle: locos.throttles[0] },
      global: { plugins: [app.pinia, app.router] },
    });
  });

  it('shows every key', () => {
    expect(wrapper.findAll('[data-testid="desk-keys"] [data-testid="fun"]')).toHaveLength(32);
  });

  it('still shows which map it is on', () => {
    expect(wrapper.get('[data-testid="function-map"]').element).toHaveProperty('value', 'station');
  });
});
