// Splits a stream of received text into complete DCC-EX frames. The command
// station scans its input for every < and takes the text up to the next >,
// ignoring anything outside, so frames are separated by the brackets alone and
// never by newlines. Any trailing piece that looks like a frame still arriving
// is handed back as "rest" so the next chunk can be appended to it.

export interface Frames {
  frames: string[];
  rest: string;
}

export function extractFrames(text: string): Frames {
  const frames: string[] = [];
  let searchFrom = 0;

  while (true) {
    const open = text.indexOf('<', searchFrom);

    if (open === -1) return { frames, rest: '' };

    const close = text.indexOf('>', open);

    if (close === -1) return { frames, rest: text.slice(open) };

    frames.push(text.slice(open + 1, close));

    searchFrom = close + 1;
  }
}
