import { defineStore } from 'pinia';

import type { CommandDef } from '@/core/protocol/commands';
import {
  buildCommand,
  isComplete,
  matchCommand,
  searchCommands,
} from '@/core/protocol/commands';
import { describeResponse } from '@/core/protocol/responses';
import type { TraceEntry } from '@/stores/connection';
import { useConnectionStore } from '@/stores/connection';

export type { CommandDef };

export interface TraceParameter {
  name: string;
  value: string;
  meaning?: string;
}

export interface TraceExplanation {
  pattern: string;
  summary: string;
  detail: string;
  parameters: TraceParameter[];
  needs?: string;
}

// Diagnostics: looking up and sending native commands by hand, and explaining
// the raw traffic. It imports the command catalog and reply explanations
// directly, and only the Diagnostics panels use it, so they download with
// those panels and nowhere else.
export const useDiagnosticsStore = defineStore('diagnostics', () => {
  const connection = useConnectionStore();

  // Matching commands, grouped as the catalog groups them.
  function search(query: string): Map<string, CommandDef[]> {
    return Map.groupBy(searchCommands(query), command => command.group);
  }

  // A command sends on one click unless it needs values filled in, or is
  // risky enough to want a confirm; those open a small form instead.
  function needsForm(command: CommandDef): boolean {
    return command.inputs.length > 0 || command.risky;
  }

  function preview(command: CommandDef, values: string[]): string {
    return buildCommand(command, values);
  }

  function canSend(command: CommandDef, values: string[]): boolean {
    return isComplete(command, values);
  }

  // Sends the command with its values, if every required one is filled in.
  function send(command: CommandDef, values: string[] = []): boolean {
    if (!isComplete(command, values)) {
      return false;
    }

    connection.send(buildCommand(command, values));

    return true;
  }

  // What a traced line means: a reply from the station's catalog of replies,
  // or a sent command matched against the command catalog, with each value
  // explained where the catalog's detail notes (name: meaning) cover it.
  function explain(entry: TraceEntry): TraceExplanation | undefined {
    if (entry.direction === 'received') {
      return describeResponse(entry.text);
    }

    const match = matchCommand(entry.text);

    if (!match) {
      return undefined;
    }

    return {
      pattern: match.command.pattern,
      summary: match.command.summary,
      detail: match.command.detail,
      needs: match.command.needs,
      parameters: match.parameters.map(({ input, value }) => ({
        name: input.name,
        value,
        meaning: match.command.detail
          .split(' · ')
          .find(note => note.startsWith(`${input.name}:`))
          ?.slice(input.name.length + 1)
          .trim(),
      })),
    };
  }

  return { search, needsForm, preview, canSend, send, explain };
});
