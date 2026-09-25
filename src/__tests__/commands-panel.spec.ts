import type { VueWrapper } from '@vue/test-utils';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, describe, expect, it } from 'vitest';

import CommandsPanel from '@/components/panels/CommandsPanel.vue';
import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';

const mounted: VueWrapper[] = [];

afterEach(() => {
  // Attached to the document so focus can be checked; unmount so tests do not
  // leak panels into each other.
  mounted.splice(0).forEach((wrapper) => wrapper.unmount());
});

async function mountPanel() {
  const pinia = createPinia();

  setActivePinia(pinia);

  const wrapper = mount(CommandsPanel, {
    global: { plugins: [pinia] },
    attachTo: document.body,
  });
  const store = useConnectionStore();

  mounted.push(wrapper);
  await store.connect(new MockTransport());

  // Only what the panel sends, not the connect handshake.
  const sent = () =>
    store.trace
      .filter((entry) => entry.direction === 'sent')
      .map((entry) => entry.text)
      .slice(2);

  return { wrapper, sent };
}

function row(wrapper: VueWrapper, pattern: string) {
  const found = wrapper
    .findAll('[data-test="lookup-command"]')
    .find((entry) => entry.get('.lookup__pattern').text() === pattern);

  if (!found) {
    throw new Error(`no row for ${pattern}`);
  }

  return found;
}

describe('Commands panel', () => {
  it('lists every command under its group, and filters by search', async () => {
    const { wrapper } = await mountPanel();

    expect(wrapper.text()).toContain('Power and tracks');
    expect(wrapper.text()).toContain('<T id DCC address subaddress>');

    await wrapper.get('[data-test="lookup-search"]').setValue('clock fast');

    const shown = wrapper
      .findAll('.lookup__pattern')
      .map((pattern) => pattern.text());

    expect(shown).toEqual(['<JC>', '<JC minutes rate>']);

    await wrapper.get('[data-test="lookup-search"]').setValue('zzzz');

    expect(wrapper.text()).toContain('No commands match');
  });

  it('sends a command without inputs on one click', async () => {
    const { wrapper, sent } = await mountPanel();

    await row(wrapper, '<#>').get('button').trigger('click');

    expect(sent()).toEqual(['<#>']);
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('opens a command with inputs, and sends it once they are filled', async () => {
    const { wrapper, sent } = await mountPanel();
    const throwTurnout = row(wrapper, '<T id T>');

    await throwTurnout.get('button').trigger('click');
    await flushPromises();

    const value = throwTurnout.get('[data-test="lookup-value-0"]');
    const send = throwTurnout.get('[data-test="lookup-send"]');

    expect(sent()).toEqual([]);
    expect(document.activeElement).toBe(value.element);
    expect(send.attributes('disabled')).toBeDefined();

    await value.setValue('4');

    expect(throwTurnout.get('[data-test="lookup-preview"]').text()).toBe(
      '<T 4 T>',
    );
    expect(send.attributes('disabled')).toBeUndefined();

    // Pressing Enter in an input submits its form.
    await throwTurnout.get('form').trigger('submit');

    expect(sent()).toEqual(['<T 4 T>']);
  });

  it('closes an open command when it is clicked again', async () => {
    const { wrapper } = await mountPanel();
    const head = row(wrapper, '<T id T>').get('button');

    await head.trigger('click');

    expect(head.attributes('aria-expanded')).toBe('true');

    await head.trigger('click');

    expect(head.attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('waits for a confirm before sending a risky command', async () => {
    const { wrapper, sent } = await mountPanel();
    const erase = row(wrapper, '<e>');

    await erase.get('button').trigger('click');

    expect(sent()).toEqual([]);
    expect(erase.text()).toContain('hard to undo');

    await erase.get('[data-test="lookup-send"]').trigger('click');

    expect(sent()).toEqual(['<e>']);
    expect(erase.find('form').exists()).toBe(false);
  });
});
