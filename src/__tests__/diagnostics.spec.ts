import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import type { CommandDef } from '@/stores/diagnostics';
import { useDiagnosticsStore } from '@/stores/diagnostics';

async function setup() {
  const station = new MockTransport();

  await useConnectionStore().connect(station);

  const diagnostics = useDiagnosticsStore();

  // Looks a command up the way the search box does, by its pattern.
  function command(pattern: string): CommandDef {
    for (const commands of diagnostics.search(pattern).values()) {
      const found = commands.find((candidate) => candidate.pattern === pattern);

      if (found) {
        return found;
      }
    }

    throw new Error(`no command ${pattern}`);
  }

  return { station, diagnostics, command };
}

describe('diagnostics store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('groups search results the way the catalog groups them', async () => {
    const { diagnostics } = await setup();
    const groups = diagnostics.search('turnout');

    expect(groups.size).toBeGreaterThan(0);

    for (const [group, commands] of groups) {
      expect(commands.every((command) => command.group === group)).toBe(true);
    }
  });

  it('sends a plain command on one click, and asks for a form otherwise', async () => {
    const { diagnostics, command } = await setup();

    expect(diagnostics.needsForm(command('<s>'))).toBe(false);
    // Needs a value filled in.
    expect(diagnostics.needsForm(command('<1 track>'))).toBe(true);
    // Hard to undo, so it waits for a confirm.
    expect(diagnostics.needsForm(command('<->'))).toBe(true);
  });

  it('sends a command only once every value it needs is filled in', async () => {
    const { diagnostics, command, station } = await setup();
    const powerOne = command('<1 track>');

    expect(diagnostics.canSend(powerOne, [''])).toBe(false);
    expect(diagnostics.send(powerOne, [''])).toBe(false);
    expect(station.sent).not.toContain('<1 >');

    expect(diagnostics.preview(powerOne, ['A'])).toBe('<1 A>');
    expect(diagnostics.canSend(powerOne, ['A'])).toBe(true);
    expect(diagnostics.send(powerOne, ['A'])).toBe(true);
    expect(station.sent.at(-1)).toBe('<1 A>');
  });

  it('explains a sent command value by value, from the catalog notes', async () => {
    const { diagnostics } = await setup();
    const explained = diagnostics.explain({
      direction: 'sent',
      text: '<t 3 30 1>',
      at: 0,
    });

    expect(explained?.pattern).toBe('<t loco speed direction>');
    expect(explained?.parameters).toEqual([
      { name: 'loco', value: '3', meaning: undefined },
      {
        name: 'speed',
        value: '30',
        meaning: '0 to 126, -1 is an emergency stop',
      },
      { name: 'direction', value: '1', meaning: '1 forward, 0 reverse' },
    ]);
  });

  it('explains a reply, and says nothing about traffic it does not know', async () => {
    const { diagnostics } = await setup();

    expect(
      diagnostics.explain({ direction: 'received', text: '<p1>', at: 0 })
        ?.summary,
    ).toBe('Track power state');
    expect(
      diagnostics.explain({ direction: 'sent', text: '<unknown>', at: 0 }),
    ).toBeUndefined();
  });
});
