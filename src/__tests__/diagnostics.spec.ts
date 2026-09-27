import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import type { CommandDef } from '@/stores/diagnostics';
import { useDiagnosticsStore } from '@/stores/diagnostics';

describe('diagnostics store', () => {
  let station: MockTransport;
  let diagnostics: ReturnType<typeof useDiagnosticsStore>;

  // Looks a command up the way the search box does, by its pattern.
  function command(pattern: string): CommandDef {
    for (const commands of diagnostics.search(pattern).values()) {
      const found = commands.find(candidate => candidate.pattern === pattern);

      if (found) {
        return found;
      }
    }

    throw new Error(`no command ${pattern}`);
  }

  beforeEach(async () => {
    setActivePinia(createPinia());
    station = new MockTransport();
    await useConnectionStore().connect(station);
    diagnostics = useDiagnosticsStore();
  });

  it('groups search results the way the catalog groups them', () => {
    const groups = [...diagnostics.search('turnout')];

    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every(([group, commands]) => commands.every(found => found.group === group))).toBe(true);
  });

  it.each([
    { pattern: '<s>', form: false, reason: 'it is plain' },
    { pattern: '<1 track>', form: true, reason: 'it needs a value filled in' },
    { pattern: '<->', form: true, reason: 'it is hard to undo, so it waits for a confirm' },
  ])('asks for a form for $pattern: $form, as $reason', ({ pattern, form }) => {
    expect(diagnostics.needsForm(command(pattern))).toBe(form);
  });

  describe('a command with its value missing', () => {
    it('cannot be sent', () => {
      expect(diagnostics.canSend(command('<1 track>'), [''])).toBe(false);
    });

    it('is refused and not sent', () => {
      const sent = diagnostics.send(command('<1 track>'), ['']);

      expect(sent).toBe(false);
      expect(station.sent).not.toContain('<1 >');
    });
  });

  describe('a command with every value filled in', () => {
    it('previews with the value in place', () => {
      expect(diagnostics.preview(command('<1 track>'), ['A'])).toBe('<1 A>');
    });

    it('can be sent', () => {
      expect(diagnostics.canSend(command('<1 track>'), ['A'])).toBe(true);
    });

    it('is sent', () => {
      const sent = diagnostics.send(command('<1 track>'), ['A']);

      expect(sent).toBe(true);
      expect(station.sent.at(-1)).toBe('<1 A>');
    });
  });

  it('explains a sent command value by value, from the catalog notes', () => {
    const explained = diagnostics.explain({ direction: 'sent', text: '<t 3 30 1>', at: 0 });

    expect(explained?.pattern).toBe('<t loco speed direction>');
    expect(explained?.parameters).toEqual([
      { name: 'loco', value: '3', meaning: undefined },
      { name: 'speed', value: '30', meaning: '0 to 126, -1 is an emergency stop' },
      { name: 'direction', value: '1', meaning: '1 forward, 0 reverse' },
    ]);
  });

  it('explains a reply', () => {
    expect(diagnostics.explain({ direction: 'received', text: '<p1>', at: 0 })?.summary).toBe('Track power state');
  });

  it('says nothing about traffic it does not know', () => {
    expect(diagnostics.explain({ direction: 'sent', text: '<unknown>', at: 0 })).toBeUndefined();
  });
});
