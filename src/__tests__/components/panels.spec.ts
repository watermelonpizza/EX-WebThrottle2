import type { VueWrapper } from '@vue/test-utils';
import { flushPromises, mount } from '@vue/test-utils';
import type { Component } from 'vue';
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

import type { ConnectedApp } from './helpers';
import { connectedApp } from './helpers';

describe('workspace panels', () => {
  let app: ConnectedApp;

  function mountPanel(panel: Component): VueWrapper {
    return mount(panel, { global: { plugins: [app.pinia] } });
  }

  beforeEach(async () => {
    localStorage.clear();
    app = await connectedApp();
  });

  describe('accessory panels', () => {
    it.each([
      { name: 'outputs', panel: OutputsPanel, empty: 'No outputs' },
      { name: 'points', panel: PointsPanel, empty: 'No turnouts' },
      { name: 'sensors', panel: SensorsPanel, empty: 'No sensors' },
    ])('say the $name panel is empty before the station lists any', ({ panel, empty }) => {
      expect(mountPanel(panel).text()).toContain(empty);
    });

    describe('once the station lists them', () => {
      beforeEach(async () => {
        app.station.receives('<jT 4><jT 4 C "Yard"><Y 7 100 0 0><q 9><Q 10>');
        await flushPromises();
      });

      it('show a turnout by its description', () => {
        const points = mountPanel(PointsPanel);

        expect(points.get('[data-testid="turnout-4"]').text()).toContain('Yard');
      });

      it('show an output that is off', () => {
        const outputs = mountPanel(OutputsPanel);

        expect(outputs.get('[data-testid="output-7"]').text()).toContain('OFF');
      });

      it.each([
        { id: 9, state: 'Clear' },
        { id: 10, state: 'Occupied' },
      ])('show sensor $id as $state', ({ id, state }) => {
        const sensors = mountPanel(SensorsPanel);

        expect(sensors.get(`[data-testid="sensor-${id}"]`).text()).toContain(state);
      });

      it('turn an output on when it is clicked', async () => {
        const outputs = mountPanel(OutputsPanel);

        await outputs.get('[data-testid="output-7"]').trigger('click');

        expect(app.station.sent).toContain('<Z 7 1>');
      });

      it('throw a closed turnout when it is clicked', async () => {
        const points = mountPanel(PointsPanel);

        await points.get('[data-testid="turnout-4"]').trigger('click');

        expect(app.station.sent).toContain('<T 4 T>');
      });
    });
  });

  describe('commands panel', () => {
    let wrapper: VueWrapper;

    async function search(text: string): Promise<void> {
      await wrapper.get('[data-testid="lookup-search"]').setValue(text);
    }

    async function pickFirstMatch(): Promise<void> {
      await wrapper.get('[data-testid="lookup-command"] button').trigger('click');
    }

    async function send(): Promise<void> {
      await wrapper.get('[data-testid="lookup-send"]').trigger('submit');
    }

    beforeEach(() => {
      wrapper = mountPanel(CommandsPanel);
    });

    it('lists the commands that match a search', async () => {
      await search('power');

      expect(wrapper.findAll('[data-testid="lookup-command"]').length).toBeGreaterThan(0);
    });

    it('says when no command matches', async () => {
      await search('no such command');

      expect(wrapper.text()).toContain('No commands match');
    });

    describe('with a risky command picked', () => {
      beforeEach(async () => {
        await search('forget every');
        await pickFirstMatch();
      });

      it('asks for confirmation before sending', () => {
        expect(wrapper.get('[data-testid="lookup-send"]').text()).toContain('Confirm');
      });

      it('sends the command once confirmed', async () => {
        await send();

        expect(app.station.sent).toContain('<->');
      });
    });

    describe('with a command that takes a value', () => {
      beforeEach(async () => {
        await search('Power on one track');
        await pickFirstMatch();
        await wrapper.get('[data-testid="lookup-value-0"]').setValue('A');
      });

      it('previews the command with the value filled in', () => {
        expect(wrapper.get('[data-testid="lookup-preview"]').text()).toBe('<1 A>');
      });

      it('sends the filled-in command', async () => {
        await send();

        expect(app.station.sent).toContain('<1 A>');
      });
    });
  });

  describe('traffic panel', () => {
    let wrapper: VueWrapper;

    async function sendTyped(text: string): Promise<void> {
      await wrapper.get('[data-testid="command-input"]').setValue(text);
      await wrapper.get('[data-testid="traffic-send-form"]').trigger('submit');
      await flushPromises();
    }

    beforeEach(async () => {
      wrapper = mountPanel(TrafficPanel);
      app.station.receives('<p1>');
      await flushPromises();
    });

    it('lists the traffic so far', () => {
      expect(wrapper.find('[data-testid="trace-entry"]').exists()).toBe(true);
    });

    it('sends a typed command without the spaces around it', async () => {
      await sendTyped(' <1> ');

      expect(app.station.sent).toContain('<1>');
    });

    it('does not send a blank command', async () => {
      const before = app.station.sent.length;

      await sendTyped('   ');

      expect(app.station.sent).toHaveLength(before);
    });

    it('shows the details of a row when it is clicked', async () => {
      await wrapper.get('[data-testid="trace-row"]').trigger('click');

      expect(wrapper.find('[data-testid="trace-details"]').exists()).toBe(true);
    });

    it('explains that the station does not know a command it cannot place', async () => {
      await sendTyped('<unknown>');
      await wrapper.findAll('[data-testid="trace-row"]').at(-1)?.trigger('click');

      expect(wrapper.text()).toContain('does not know this');
    });

    describe('in the raw view', () => {
      beforeEach(async () => {
        await wrapper.get('[data-testid="traffic-raw"]').trigger('click');
      });

      it('shows the traffic as plain text', () => {
        const list = wrapper.get('[data-testid="trace-list"]').element as HTMLTextAreaElement;

        expect(list.tagName).toBe('TEXTAREA');
        expect(list.value).toContain('<p1>');
      });

      it('goes back to the explained rows', async () => {
        await wrapper.get('[data-testid="traffic-explained"]').trigger('click');

        expect(wrapper.find('[data-testid="trace-row"]').exists()).toBe(true);
      });
    });
  });

  describe('throttles panel', () => {
    it('offers the drive form before any loco is acquired', () => {
      expect(mountPanel(ThrottlesPanel).text()).toContain('Drive a loco');
    });

    it('shows an acquired loco by its saved name', async () => {
      const wrapper = mountPanel(ThrottlesPanel);
      const locos = useLocosStore();

      locos.saveLoco(3, 'Switcher');
      locos.acquire(3);
      await flushPromises();

      expect(wrapper.text()).toContain('Switcher');
    });

    describe('when a new loco is driven from the form', () => {
      beforeEach(async () => {
        const wrapper = mountPanel(ThrottlesPanel);

        await wrapper.get('[data-testid="drive-address"]').setValue('8');
        await wrapper.get('[data-testid="drive-name"]').setValue('Yard loco');
        await wrapper.get('[data-testid="drive-form"]').trigger('submit');
      });

      it('acquires it from the station', () => {
        expect(app.station.sent).toContain('<t 8>');
      });

      it('saves it to the roster under its name', () => {
        expect(useLocosStore().roster[0]?.name).toBe('Yard loco');
      });
    });
  });
});

describe('function keys', () => {
  // F0 (lights) latches; F2 (horn) is momentary.
  const functions = DEFAULT_FUNCTIONS.slice(0, 3);
  let wrapper: VueWrapper;

  function key(fn: number): ReturnType<VueWrapper['get']> {
    return wrapper.get(`[data-function="${fn}"]`);
  }

  beforeEach(() => {
    wrapper = mount(FunctionKeys, { props: { functions, states: [], limit: 3 } });
  });

  it('turns a latching key on when it is clicked', async () => {
    await key(0).trigger('click');

    expect(wrapper.emitted('set')).toEqual([[0, true]]);
  });

  it('ignores a key release on a latching key', async () => {
    await key(0).trigger('keyup', { key: ' ' });

    expect(wrapper.emitted('set')).toBeUndefined();
  });

  it('sounds a momentary key while the pointer holds it', async () => {
    await key(2).trigger('pointerdown');

    expect(wrapper.emitted('set')).toEqual([[2, true]]);
  });

  it.each(['pointerup', 'pointerleave', 'pointercancel'])(
    'silences a held momentary key on %s',
    async (event) => {
      await key(2).trigger('pointerdown');
      await key(2).trigger(event);

      expect(wrapper.emitted('set')?.at(-1)).toEqual([2, false]);
    },
  );

  it('does not silence a momentary key twice', async () => {
    await key(2).trigger('pointerdown');
    await key(2).trigger('pointerup');
    await key(2).trigger('pointerleave');

    expect(wrapper.emitted('set')).toHaveLength(2);
  });

  it('sounds a momentary key while Enter is held', async () => {
    await key(2).trigger('keydown', { key: 'Enter' });

    expect(wrapper.emitted('set')).toEqual([[2, true]]);
  });

  it('silences a momentary key when Enter is released', async () => {
    await key(2).trigger('keydown', { key: 'Enter' });
    await key(2).trigger('keyup', { key: 'Enter' });

    expect(wrapper.emitted('set')?.at(-1)).toEqual([2, false]);
  });

  it('ignores key repeat on a momentary key', async () => {
    await key(2).trigger('keydown', { key: ' ', repeat: true });

    expect(wrapper.emitted('set')).toBeUndefined();
  });
});
