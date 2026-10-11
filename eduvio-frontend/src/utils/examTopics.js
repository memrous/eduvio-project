const BULLET = /^\s*(?:[-*•–]|\d+[.)])\s+/

/** A pasted list → one topic title per non-empty line, without bullets or numbering. */
export const parseTopicList = (text) =>
  String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(BULLET, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
