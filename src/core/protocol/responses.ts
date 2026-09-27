export interface ResponseParameter {
  name: string;
  value: string;
  meaning: string;
}

export interface ResponseDescription {
  pattern: string;
  summary: string;
  detail: string;
  parameters: ResponseParameter[];
}

interface ResponseDefinition extends Omit<ResponseDescription, 'parameters'> {
  match(frame: string): ResponseParameter[] | undefined;
}

function parameter(
  name: string,
  value: string,
  meaning: string,
): ResponseParameter {
  return { name, value, meaning };
}

const CATALOG: ResponseDefinition[] = [
  {
    pattern: '<iDCC-EX version / processor / motor driver / build>',
    summary: 'Command-station identification',
    detail: 'The station sends this identification frame in response to <s>.',
    match(frame) {
      const match
        = /^<iDCC-?EX\s+V-?([^/\s]+)\s*\/\s*([^/]+?)\s*\/\s*([^/]+?)(?:\s*\/\s*([^>]+))?>$/i.exec(
          frame,
        );

      if (!match) {
        return undefined;
      }

      const driverAndBuild = /^(.*?)\s+(G-\S+)$/.exec(match[3].trim());
      const motorDriver = driverAndBuild?.[1] ?? match[3].trim();
      const build = match[4]?.trim() ?? driverAndBuild?.[2];

      return [
        parameter('Version', match[1], 'CommandStation-EX firmware version.'),
        parameter('Processor', match[2].trim(), 'Microcontroller type.'),
        parameter('Motor driver', motorDriver, 'Track motor-driver hardware.'),
        ...(build
          ? [parameter('Build', build, 'Firmware build or source revision.')]
          : []),
      ];
    },
  },
  {
    pattern: '<@ screen row "text">',
    summary: 'Virtual display update',
    detail: 'The station is sending text to a row on a virtual LCD display.',
    match(frame) {
      const match = /^<@\s+(\d+)\s+(\d+)\s+"([^"]*)">$/.exec(frame);

      if (!match) {
        return undefined;
      }

      return [
        parameter('Display', match[1], 'Virtual display receiving the text.'),
        parameter('Row', match[2], 'Row on that display.'),
        parameter(
          'Text',
          match[3],
          'Literal text the station displays on that row.',
        ),
      ];
    },
  },
  {
    pattern: '<p state [track]>',
    summary: 'Track power state',
    detail:
      'A power status reply or broadcast. Track changes may generate these without a request.',
    match(frame) {
      const match = /^<p([01])(?:\s+([^>]+))?>$/.exec(frame);

      if (match) {
        return [
          parameter(
            'State',
            match[1],
            match[1] === '1' ? 'Power is on.' : 'Power is off.',
          ),
          ...(match[2]
            ? [
                parameter(
                  'Track',
                  match[2],
                  'The track group this state applies to.',
                ),
              ]
            : []),
        ];
      }

      const track = /^<p([A-Ha-h])>$/.exec(frame);

      if (!track) {
        return undefined;
      }

      const isOn = track[1] === track[1].toUpperCase();

      return [
        parameter(
          'Track output',
          track[1].toUpperCase(),
          'Command-station output A–H.',
        ),
        parameter(
          'State',
          isOn ? 'on' : 'off',
          'Uppercase means powered; lowercase means off.',
        ),
      ];
    },
  },
  {
    pattern: '<= track mode [loco]>',
    summary: 'Track-output assignment',
    detail:
      'Reports how a track output is configured, usually after <=> or a mode change.',
    match(frame) {
      const match = /^<=\s+([A-H])\s+(\S+)(?:\s+(\d+))?>$/.exec(frame);

      if (!match) {
        return undefined;
      }

      return [
        parameter('Track output', match[1], 'Command-station output A–H.'),
        parameter(
          'Mode',
          match[2],
          'Signal or operating mode assigned to this output.',
        ),
        ...(match[3]
          ? [
              parameter(
                'Loco address',
                match[3],
                'Address used when this output is in DC mode.',
              ),
            ]
          : []),
      ];
    },
  },
  {
    pattern: '<l loco register speedByte functionMap>',
    summary: 'Loco speed and function state',
    detail:
      'A loco-state broadcast. The register field is retained for legacy compatibility.',
    match(frame) {
      const match = /^<l\s+(\d+)\s+(-?\d+)\s+(\d+)\s+(\d+)>$/.exec(frame);

      if (!match) {
        return undefined;
      }

      return [
        parameter('Loco address', match[1], 'DCC address of the locomotive.'),
        parameter(
          'Register',
          match[2],
          'Legacy field; clients normally ignore it.',
        ),
        parameter(
          'Speed byte',
          match[3],
          'Packed speed, direction and stop state; decode using the DCC-EX speed-byte rules.',
        ),
        parameter(
          'Function map',
          match[4],
          'Bit field: bit 0 is F0, bit 1 is F1, and so on.',
        ),
      ];
    },
  },
  {
    pattern: '<H turnout state>',
    summary: 'Turnout state',
    detail: 'Broadcast when a turnout changes state.',
    match(frame) {
      const match = /^<H\s+(\d+)\s+([01])>$/.exec(frame);

      if (!match) {
        return undefined;
      }

      return [
        parameter(
          'Turnout id',
          match[1],
          'Identifier assigned to the turnout.',
        ),
        parameter('State', match[2], match[2] === '1' ? 'Thrown.' : 'Closed.'),
      ];
    },
  },
  {
    pattern: '<jT turnout-id ...>',
    summary: 'Turnout list',
    detail:
      'Lists the turnout ids the command station can report, usually in response to <JT>.',
    match(frame) {
      const match = /^<jT(?:\s+([\d\s]+))?>$/.exec(frame);

      if (!match) {
        return undefined;
      }

      const ids = match[1]?.trim() ?? '';

      return [
        parameter(
          'Turnout ids',
          ids || '(none)',
          'Each number identifies a turnout available on the layout.',
        ),
      ];
    },
  },
  {
    pattern: '<jT turnout-id T|C ["description"]>',
    summary: 'Turnout details',
    detail: 'Describes one turnout, usually in response to <JT id>.',
    match(frame) {
      const match = /^<jT\s+(\d+)\s+([TC])(?:\s+"(.*)")?>$/.exec(frame);

      if (!match) {
        return undefined;
      }

      return [
        parameter(
          'Turnout id',
          match[1],
          'Identifier assigned to the turnout.',
        ),
        parameter('State', match[2], match[2] === 'T' ? 'Thrown.' : 'Closed.'),
        ...(match[3] !== undefined
          ? [
              parameter(
                'Description',
                match[3],
                'Optional EX-RAIL label for the turnout.',
              ),
            ]
          : []),
      ];
    },
  },
  {
    pattern: '<jT turnout-id X>',
    summary: 'Turnout not available',
    detail: 'The station cannot provide details for the requested turnout id.',
    match(frame) {
      const match = /^<jT\s+(\d+)\s+X>$/.exec(frame);

      return match
        ? [
            parameter(
              'Turnout id',
              match[1],
              'The id that could not be found or reported.',
            ),
          ]
        : undefined;
    },
  },
  {
    pattern: '<Y id pin flags state>',
    summary: 'Output definition and state',
    detail:
      'One configured output returned while the station lists its outputs.',
    match(frame) {
      const match = /^<Y\s+(\d+)\s+(\d+)\s+(\d+)\s+([01])>$/.exec(frame);

      if (!match) {
        return undefined;
      }

      return [
        parameter('Output id', match[1], 'Identifier assigned to this output.'),
        parameter('Pin', match[2], 'Hardware pin used by the output.'),
        parameter('Flags', match[3], 'Output configuration flags.'),
        parameter(
          'State',
          match[4],
          match[4] === '1' ? 'Active.' : 'Inactive.',
        ),
      ];
    },
  },
  {
    pattern: '<Y id state>',
    summary: 'Output state',
    detail: 'Acknowledges an output change or reports a single output state.',
    match(frame) {
      const match = /^<Y\s+(\d+)\s+([01])>$/.exec(frame);

      if (!match) {
        return undefined;
      }

      return [
        parameter('Output id', match[1], 'Identifier assigned to this output.'),
        parameter(
          'State',
          match[2],
          match[2] === '1' ? 'Active.' : 'Inactive.',
        ),
      ];
    },
  },
  {
    pattern: '<Q sensor-id pin pullup>',
    summary: 'Sensor definition',
    detail:
      'Describes a configured sensor returned while sensor definitions are listed.',
    match(frame) {
      const match = /^<Q\s+(\d+)\s+(\d+)\s+(\d+)>$/.exec(frame);

      if (!match) {
        return undefined;
      }

      return [
        parameter('Sensor id', match[1], 'Identifier assigned to the sensor.'),
        parameter('Pin', match[2], 'Hardware input pin used by the sensor.'),
        parameter(
          'Pull-up',
          match[3],
          'Whether the input uses a pull-up resistor (1 = on).',
        ),
      ];
    },
  },
  {
    pattern: '<Q sensor-id>',
    summary: 'Sensor active',
    detail: 'The sensor reports occupied or active.',
    match(frame) {
      const match = /^<Q\s+(\d+)>$/.exec(frame);

      return match
        ? [
            parameter(
              'Sensor id',
              match[1],
              'Identifier assigned to the active sensor.',
            ),
          ]
        : undefined;
    },
  },
  {
    pattern: '<q sensor-id>',
    summary: 'Sensor clear',
    detail: 'The sensor reports unoccupied or inactive.',
    match(frame) {
      const match = /^<q\s+(\d+)>$/.exec(frame);

      return match
        ? [
            parameter(
              'Sensor id',
              match[1],
              'Identifier assigned to the inactive sensor.',
            ),
          ]
        : undefined;
    },
  },
  {
    pattern: '<e turnouts sensors outputs>',
    summary: 'Stored inventory counts',
    detail:
      'Reports the number of turnout, sensor and output definitions stored by the station.',
    match(frame) {
      const match = /^<e\s+(\d+)\s+(\d+)\s+(\d+)>$/.exec(frame);

      if (!match) {
        return undefined;
      }

      return [
        parameter(
          'Turnouts',
          match[1],
          'Number of stored turnout definitions.',
        ),
        parameter('Sensors', match[2], 'Number of stored sensor definitions.'),
        parameter('Outputs', match[3], 'Number of stored output definitions.'),
      ];
    },
  },
  {
    pattern: '<!PAUSED|RESUMED>',
    summary: 'Layout pause state',
    detail: 'Reply to a query about whether the layout is paused.',
    match(frame) {
      const match = /^<!(PAUSED|RESUMED)>$/.exec(frame);

      return match
        ? [
            parameter(
              'State',
              match[1],
              match[1] === 'PAUSED'
                ? 'The layout is paused.'
                : 'The layout is running.',
            ),
          ]
        : undefined;
    },
  },
  {
    pattern: '<O>',
    summary: 'Operation completed',
    detail:
      'The station acknowledged a command that does not return other data.',
    match: frame => (frame === '<O>' ? [] : undefined),
  },
  {
    pattern: '<X>',
    summary: 'Command rejected',
    detail:
      'The station did not understand the command or could not apply it. The frame contains no further reason.',
    match: frame => (frame === '<X>' ? [] : undefined),
  },
];

export function describeResponse(
  frame: string,
): ResponseDescription | undefined {
  const trimmed = frame.trim();

  for (const response of CATALOG) {
    const parameters = response.match(trimmed);

    if (parameters) {
      return {
        pattern: response.pattern,
        summary: response.summary,
        detail: response.detail,
        parameters,
      };
    }
  }

  return undefined;
}
