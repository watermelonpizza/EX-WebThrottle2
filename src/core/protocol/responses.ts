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

// Route button states EXRAIL sends in <jB id state>, from manageRouteState in
// CommandStation-EX EXRAIL2.cpp. 3 is not used.
const ROUTE_STATES: Record<string, string> = {
  0: 'Inactive: shown as normal.',
  1: 'Active: throttles show it as set or running.',
  2: 'Hidden: throttles leave the button out.',
  4: 'Disabled: shown, but cannot be started.',
};

// DCC packet kinds, in the order of PendingType in CommandStation-EX DCCQueue.h.
const PACKET_TYPES = [
  'Other packet, such as an accessory or a CV write on the main track.',
  'Loco functions, group 1.',
  'Loco functions, group 2.',
  'Loco functions, group 3.',
  'Loco functions, group 4.',
  'Loco functions, group 5.',
  'Loco speed or emergency stop.',
  'Accessory switched on, then off again after a short delay.',
  'Accessory switched off.',
  'Unused slot.',
];

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
                'Optional EXRAIL label for the turnout.',
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
    pattern: '<jA route-id ...>',
    summary: 'Route list',
    detail:
      'Lists the routes and automations EXRAIL has, usually in response to <JA>. Empty without EXRAIL.',
    match(frame) {
      const match = /^<jA(?:\s+([\d\s]+))?>$/.exec(frame);

      if (!match) {
        return undefined;
      }

      return [
        parameter(
          'Route ids',
          match[1]?.trim() || '(none)',
          'Each number identifies a route or automation.',
        ),
      ];
    },
  },
  {
    pattern: '<jA route-id R|A "description">',
    summary: 'Route details',
    detail: 'Describes one route or automation, usually in response to <JA id>.',
    match(frame) {
      const match = /^<jA\s+(\d+)\s+([RA])\s+"(.*)">$/.exec(frame);

      if (!match) {
        return undefined;
      }

      return [
        parameter('Route id', match[1], 'Identifier assigned to the route.'),
        parameter(
          'Type',
          match[2],
          match[2] === 'R'
            ? 'A route: it sets turnouts/points for a driver.'
            : 'An automation: it drives the loco it is started with.',
        ),
        parameter('Description', match[3], 'The name EXRAIL gives it.'),
      ];
    },
  },
  {
    pattern: '<jA route-id X "">',
    summary: 'Route not available',
    detail: 'EXRAIL has no route or automation with the requested id.',
    match(frame) {
      const match = /^<jA\s+(\d+)\s+X(?:\s+"")?>$/.exec(frame);

      return match
        ? [parameter('Route id', match[1], 'The id that could not be found.')]
        : undefined;
    },
  },
  {
    pattern: '<jB route-id state>',
    summary: 'Route state',
    detail:
      'EXRAIL changed how throttles should show a route button. It is sent to every throttle.',
    match(frame) {
      const match = /^<jB\s+(\d+)\s+(\d+)>$/.exec(frame);

      if (!match) {
        return undefined;
      }

      return [
        parameter('Route id', match[1], 'Identifier assigned to the route.'),
        parameter(
          'State',
          match[2],
          ROUTE_STATES[match[2]] ?? 'A state WebThrottle does not know.',
        ),
      ];
    },
  },
  {
    pattern: '<jB route-id "caption">',
    summary: 'Route caption',
    detail:
      'EXRAIL changed the text on a route button. It is sent to every throttle.',
    match(frame) {
      const match = /^<jB\s+(\d+)\s+"(.*)">$/.exec(frame);

      if (!match) {
        return undefined;
      }

      return [
        parameter('Route id', match[1], 'Identifier assigned to the route.'),
        parameter('Caption', match[2], 'Text to show on the button.'),
      ];
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
    pattern: '<* New DCC queue slot type= length= loco= q1= q2= created= *>',
    summary: 'New DCC queue slot',
    detail:
      'A diagnostic, not a reply: the station made a new slot to queue a DCC packet for the track. Slots are reused once their packet is sent, so this normally shows only a few times after start-up. The host emulator sends nothing to a track, so it shows this for every packet.',
    match(frame) {
      const match
        = /^<\*\s*New DCC queue slot type=(\d+) length=(\d+) loco=(\d+) q1=(\d+) q2=(\d+) created=(\d+)\s*\*>$/.exec(
          frame,
        );

      if (!match) {
        return undefined;
      }

      return [
        parameter(
          'Type',
          match[1],
          PACKET_TYPES[Number(match[1])] ?? 'A packet type WebThrottle does not know.',
        ),
        parameter('Length', match[2], 'Bytes in the DCC packet.'),
        parameter(
          'Loco',
          match[3],
          match[3] === '0'
            ? 'Not for one loco.'
            : 'DCC address the packet is for.',
        ),
        parameter(
          'High-priority queue',
          match[4],
          'Packets already waiting there: speeds and stops.',
        ),
        parameter(
          'Low-priority queue',
          match[5],
          'Packets already waiting there: functions, accessories and others.',
        ),
        parameter('Slots made', match[6], 'Slots made before this one.'),
      ];
    },
  },
  {
    pattern: '<* text *>',
    summary: 'Diagnostic message',
    detail:
      'Text the station writes for people reading its log. Throttles do not act on it.',
    match(frame) {
      const match = /^<\*\s*([\s\S]*?)\s*\*>$/.exec(frame);

      return match
        ? [parameter('Text', match[1], 'What the station wrote.')]
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
