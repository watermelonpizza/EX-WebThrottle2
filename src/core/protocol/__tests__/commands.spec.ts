import { describe, expect, it } from 'vitest';

import {
  COMMANDS,
  buildCommand,
  isComplete,
  matchCommand,
  searchCommands,
} from '../commands';

function command(pattern: string) {
  const found = COMMANDS.find((entry) => entry.pattern === pattern);

  if (!found) {
    throw new Error(`no command ${pattern}`);
  }

  return found;
}

function patterns(query: string): string[] {
  return searchCommands(query).map((entry) => entry.pattern);
}

describe('command list', () => {
  it('gives every command a unique, framed pattern', () => {
    const all = COMMANDS.map((entry) => entry.pattern);

    expect(new Set(all).size).toBe(all.length);
    expect(all.every((pattern) => /^<.+>$/.test(pattern))).toBe(true);
  });

  it('splits a pattern into keywords and inputs by case', () => {
    const create = command('<T id DCC address subaddress>');

    expect(create.opcode).toBe('T');
    expect(create.parts).toEqual([
      { kind: 'input', name: 'id', quoted: false, optional: false },
      { kind: 'keyword', text: 'DCC' },
      { kind: 'input', name: 'address', quoted: false, optional: false },
      { kind: 'input', name: 'subaddress', quoted: false, optional: false },
    ]);
    expect(create.inputs.map((input) => input.name)).toEqual([
      'id',
      'address',
      'subaddress',
    ]);
  });

  it('keeps a lower case opcode literal', () => {
    const speed = command('<t loco speed direction>');

    expect(speed.opcode).toBe('t');
    expect(speed.inputs).toHaveLength(3);
  });

  it('marks quoted and optional inputs', () => {
    expect(command('<C WIFI "ssid" "password">').inputs).toEqual([
      { kind: 'input', name: 'ssid', quoted: true, optional: false },
      { kind: 'input', name: 'password', quoted: true, optional: false },
    ]);
    expect(command('<M register byte [moreBytes]>').inputs.at(-1)).toEqual({
      kind: 'input',
      name: 'moreBytes',
      quoted: false,
      optional: true,
    });
  });

  it('takes a group need unless the command has its own', () => {
    expect(command('</ PAUSE>').needs).toBe('EX-RAIL');
    expect(command('<L>').needs).toBe('EX-RAIL with LCC');
    expect(command('<y vpin STOP>').needs).toBe('DFPlayer');
    expect(command('<s>').needs).toBe('');
  });

  it('asks for a confirm only on the commands that are hard to undo', () => {
    expect(
      COMMANDS.filter((entry) => entry.risky).map((entry) => entry.pattern),
    ).toEqual(['<->', '<e>', '<C RESET>', '<D RESET>', '<+>', '<D HAL RESET>']);
  });
});

describe('matchCommand', () => {
  it('matches a sent frame to its most specific command and input values', () => {
    expect(matchCommand('<T 7 DCC 12 0>')).toMatchObject({
      command: { pattern: '<T id DCC address subaddress>' },
      parameters: [
        { input: { name: 'id' }, value: '7' },
        { input: { name: 'address' }, value: '12' },
        { input: { name: 'subaddress' }, value: '0' },
      ],
    });
    expect(matchCommand('<1 MAIN>')?.command.pattern).toBe('<1 MAIN>');
  });

  it('matches quoted and optional values', () => {
    const wifi = matchCommand('<C WIFI "Yard WiFi" "secret">');

    expect(wifi?.command.pattern).toBe('<C WIFI "ssid" "password">');
    expect(
      wifi?.parameters.map(({ input, value }) => [input.name, value]),
    ).toEqual([
      ['ssid', 'Yard WiFi'],
      ['password', 'secret'],
    ]);
    expect(matchCommand('<M 0 FF 00 01>')?.parameters.at(-1)?.value).toBe(
      '00 01',
    );
  });

  it('does not match an unknown frame', () => {
    expect(matchCommand('<p1>')).toBeUndefined();
  });
});

describe('buildCommand', () => {
  it('frames a command with no inputs', () => {
    expect(buildCommand(command('<s>'), [])).toBe('<s>');
    expect(buildCommand(command('<D CABS>'), [])).toBe('<D CABS>');
  });

  it('fills inputs in order between the keywords', () => {
    expect(
      buildCommand(command('<T id DCC address subaddress>'), ['5', '10', '0']),
    ).toBe('<T 5 DCC 10 0>');
  });

  it('keeps words that touch the opcode together', () => {
    expect(buildCommand(command('<JT id>'), ['3'])).toBe('<JT 3>');
    expect(buildCommand(command('<+atCommand>'), ['CIFSR'])).toBe('<+CIFSR>');
  });

  it('quotes text values once', () => {
    expect(
      buildCommand(command('<C WIFI "ssid" "password">'), [
        'Layout',
        '"secret"',
      ]),
    ).toBe('<C WIFI "Layout" "secret">');
  });

  it('leaves out a blank optional input and trims the rest', () => {
    const packet = command('<M register byte [moreBytes]>');

    expect(buildCommand(packet, [' 0 ', 'FF', ''])).toBe('<M 0 FF>');
    expect(buildCommand(packet, ['0', 'FF', '00 01'])).toBe('<M 0 FF 00 01>');
  });
});

describe('isComplete', () => {
  it('needs every required input filled', () => {
    const throwTurnout = command('<T id T>');
    const packet = command('<M register byte [moreBytes]>');

    expect(isComplete(throwTurnout, [''])).toBe(false);
    expect(isComplete(throwTurnout, ['  '])).toBe(false);
    expect(isComplete(throwTurnout, ['4'])).toBe(true);
    expect(isComplete(packet, ['0', 'FF'])).toBe(true);
    expect(isComplete(command('<s>'), [])).toBe(true);
  });
});

describe('searchCommands', () => {
  it('lists everything for an empty search', () => {
    expect(searchCommands('  ')).toHaveLength(COMMANDS.length);
  });

  it('matches every word, in any order, across summary and group', () => {
    const found = patterns('main power');

    expect(found).toContain('<1 MAIN>');
    expect(found).toContain('<0 MAIN>');
    expect(found).not.toContain('<1 PROG>');
  });

  it('finds commands by a common word', () => {
    expect(patterns('turnout')).toContain('<T id T>');
    expect(patterns('TRACK')).toContain('<=>');
  });

  it('finds a command typed the way it is sent', () => {
    expect(patterns('JT')).toEqual(['<JT>', '<JT id>']);
    expect(patterns('<JT>')).toContain('<JT>');
    expect(patterns('<J T>')).toContain('<JT>');
    expect(patterns('<1 main>')).toContain('<1 MAIN>');
  });

  it('finds nothing for an unknown word', () => {
    expect(searchCommands('zzzz')).toEqual([]);
  });
});
