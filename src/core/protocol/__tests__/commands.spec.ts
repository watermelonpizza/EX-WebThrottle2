import { describe, expect, it } from 'vitest';

import type { CommandDef } from '../commands';
import {
  COMMANDS,
  buildCommand,
  isComplete,
  matchCommand,
  searchCommands,
} from '../commands';

function command(pattern: string): CommandDef {
  const found = COMMANDS.find(entry => entry.pattern === pattern);

  if (!found) {
    throw new Error(`no command ${pattern}`);
  }

  return found;
}

function patterns(query: string): string[] {
  return searchCommands(query).map(entry => entry.pattern);
}

describe('command list', () => {
  const all = COMMANDS.map(entry => entry.pattern);

  it('gives every command a unique pattern', () => {
    expect(new Set(all).size).toBe(all.length);
  });

  it('frames every pattern in < >', () => {
    expect(all.every(pattern => /^<.+>$/.test(pattern))).toBe(true);
  });

  describe('the pattern <T id DCC address subaddress>', () => {
    const create = command('<T id DCC address subaddress>');

    it('takes T as its opcode', () => {
      expect(create.opcode).toBe('T');
    });

    it('splits the rest into keywords and inputs by case', () => {
      expect(create.parts).toEqual([
        { kind: 'input', name: 'id', quoted: false, optional: false },
        { kind: 'keyword', text: 'DCC' },
        { kind: 'input', name: 'address', quoted: false, optional: false },
        { kind: 'input', name: 'subaddress', quoted: false, optional: false },
      ]);
    });

    it('lists its inputs in order', () => {
      expect(create.inputs.map(input => input.name)).toEqual(['id', 'address', 'subaddress']);
    });
  });

  it('keeps a lower case opcode literal', () => {
    expect(command('<t loco speed direction>').opcode).toBe('t');
  });

  it('reads every input after a lower case opcode', () => {
    expect(command('<t loco speed direction>').inputs).toHaveLength(3);
  });

  it('marks quoted inputs', () => {
    expect(command('<C WIFI "ssid" "password">').inputs).toEqual([
      { kind: 'input', name: 'ssid', quoted: true, optional: false },
      { kind: 'input', name: 'password', quoted: true, optional: false },
    ]);
  });

  it('marks an optional input', () => {
    expect(command('<M register byte [moreBytes]>').inputs.at(-1)).toEqual({
      kind: 'input',
      name: 'moreBytes',
      quoted: false,
      optional: true,
    });
  });

  it.each([
    { pattern: '</ PAUSE>', needs: 'EX-RAIL', from: 'its group' },
    { pattern: '<L>', needs: 'EX-RAIL with LCC', from: 'the command itself' },
    { pattern: '<y vpin STOP>', needs: 'DFPlayer', from: 'its group' },
    { pattern: '<s>', needs: '', from: 'nowhere, as it needs nothing' },
  ])('takes what $pattern needs from $from', ({ pattern, needs }) => {
    expect(command(pattern).needs).toBe(needs);
  });

  it('asks for a confirm only on the commands that are hard to undo', () => {
    expect(COMMANDS.filter(entry => entry.risky).map(entry => entry.pattern)).toEqual([
      '<->',
      '<e>',
      '<C RESET>',
      '<D RESET>',
      '<+>',
      '<D HAL RESET>',
    ]);
  });
});

describe('matchCommand', () => {
  it('matches a sent frame to its command and input values', () => {
    expect(matchCommand('<T 7 DCC 12 0>')).toMatchObject({
      command: { pattern: '<T id DCC address subaddress>' },
      parameters: [
        { input: { name: 'id' }, value: '7' },
        { input: { name: 'address' }, value: '12' },
        { input: { name: 'subaddress' }, value: '0' },
      ],
    });
  });

  it('prefers the most specific command', () => {
    expect(matchCommand('<1 MAIN>')?.command.pattern).toBe('<1 MAIN>');
  });

  describe('a frame with quoted values', () => {
    const wifi = matchCommand('<C WIFI "Yard WiFi" "secret">');

    it('matches its command', () => {
      expect(wifi?.command.pattern).toBe('<C WIFI "ssid" "password">');
    });

    it('reads the values without their quotes', () => {
      expect(wifi?.parameters.map(({ input, value }) => [input.name, value])).toEqual([
        ['ssid', 'Yard WiFi'],
        ['password', 'secret'],
      ]);
    });
  });

  it('reads an optional value to the end of the frame', () => {
    expect(matchCommand('<M 0 FF 00 01>')?.parameters.at(-1)?.value).toBe('00 01');
  });

  it('does not match an unknown frame', () => {
    expect(matchCommand('<p1>')).toBeUndefined();
  });
});

describe('buildCommand', () => {
  it.each(['<s>', '<D CABS>'])('frames %s, which has no inputs', (pattern) => {
    expect(buildCommand(command(pattern), [])).toBe(pattern);
  });

  it('fills inputs in order between the keywords', () => {
    expect(buildCommand(command('<T id DCC address subaddress>'), ['5', '10', '0'])).toBe('<T 5 DCC 10 0>');
  });

  it.each([
    { pattern: '<JT id>', values: ['3'], built: '<JT 3>' },
    { pattern: '<+atCommand>', values: ['CIFSR'], built: '<+CIFSR>' },
  ])('keeps the words of $pattern that touch the opcode together', ({ pattern, values, built }) => {
    expect(buildCommand(command(pattern), values)).toBe(built);
  });

  it('quotes text values once', () => {
    expect(buildCommand(command('<C WIFI "ssid" "password">'), ['Layout', '"secret"'])).toBe('<C WIFI "Layout" "secret">');
  });

  it.each([
    { values: [' 0 ', 'FF', ''], built: '<M 0 FF>', what: 'leaves out a blank optional input and trims the rest' },
    { values: ['0', 'FF', '00 01'], built: '<M 0 FF 00 01>', what: 'includes an optional input that is filled in' },
  ])('$what', ({ values, built }) => {
    expect(buildCommand(command('<M register byte [moreBytes]>'), values)).toBe(built);
  });
});

describe('isComplete', () => {
  it.each([
    { pattern: '<T id T>', values: [''], complete: false, when: 'a required input is empty' },
    { pattern: '<T id T>', values: ['  '], complete: false, when: 'a required input is blank' },
    { pattern: '<T id T>', values: ['4'], complete: true, when: 'every required input is filled' },
    { pattern: '<M register byte [moreBytes]>', values: ['0', 'FF'], complete: true, when: 'only an optional input is missing' },
    { pattern: '<s>', values: [], complete: true, when: 'there are no inputs' },
  ])('is $complete for $pattern when $when', ({ pattern, values, complete }) => {
    expect(isComplete(command(pattern), values)).toBe(complete);
  });
});

describe('searchCommands', () => {
  it('lists everything for an empty search', () => {
    expect(searchCommands('  ')).toHaveLength(COMMANDS.length);
  });

  it('matches every word, in any order, across summary and group', () => {
    const found = patterns('main power');

    expect(found).toEqual(expect.arrayContaining(['<1 MAIN>', '<0 MAIN>']));
    expect(found).not.toContain('<1 PROG>');
  });

  it.each([
    { query: 'turnout', pattern: '<T id T>' },
    { query: 'TRACK', pattern: '<=>' },
  ])('finds $pattern by the word "$query"', ({ query, pattern }) => {
    expect(patterns(query)).toContain(pattern);
  });

  it('finds commands by their opcode', () => {
    expect(patterns('JT')).toEqual(['<JT>', '<JT id>']);
  });

  it.each([
    { query: '<JT>', pattern: '<JT>' },
    { query: '<J T>', pattern: '<JT>' },
    { query: '<1 main>', pattern: '<1 MAIN>' },
  ])('finds $pattern typed as $query', ({ query, pattern }) => {
    expect(patterns(query)).toContain(pattern);
  });

  it('finds nothing for an unknown word', () => {
    expect(searchCommands('zzzz')).toEqual([]);
  });
});
