import { room, sideDoor } from './util.js';

export default {
  id: 'summoning',
  name: 'Summoning Room',
  theme: { floor: 'darkwood', wall: 'occult' },
  ambient: 0.76,
  music: 'ritualRoom', // its own track instead of the background music (see src/audio.js)
  tiles: room({
    10: '................o.',
    11: '...............oo.',
    12: '...............ox.',
  }),
  props: [
    { t: 'door_side', x: 0, y: 11, side: 'L', text: 'The door back to the landing.' },
    { t: 'bookshelf', x: 2, y: 2, dark: true, occult: true, text: ['Books bound in something that is not leather.', 'Skulls and jars fill the gaps between them.'] },
    { t: 'writing', x: 5, y: 1, tw: 3, text: 'Symbols written in blood. I cannot read them, but they make my bones ache.' },
    { t: 'handprint', x: 8, y: 1, text: 'A bloody handprint. Then another, sliding down the wall.' },
    { t: 'altar', x: 9, y: 3, hide: true, text: ['An altar draped in black cloth.', 'A skull, a dagger, and a book written in blood.'] },
    { t: 'chains', x: 12, y: 1, text: 'Chains with shackles, bolted to the wall.' },
    { t: 'chains', x: 13, y: 1, text: 'The shackles are worn smooth.' },
    { t: 'cage', x: 15, y: 3, text: 'An iron cage. There are bones inside.' },
    { t: 'pentagram', x: 7, y: 5, text: 'A circle drawn on the floor in blood. Fresh blood.' },
    { t: 'candle', x: 9, y: 4, text: 'A black candle. The flame does not flicker when I breathe on it.' },
    { t: 'candle', x: 13, y: 6, text: 'A black candle.' },
    { t: 'candle', x: 12, y: 10, text: 'A black candle.' },
    { t: 'candle', x: 7, y: 10, text: 'A black candle.' },
    { t: 'candle', x: 6, y: 6, text: 'A black candle.' },
    { t: 'bones', x: 4, y: 8, text: 'Bones. Small ones.' },
    { t: 'bones', x: 14, y: 11, text: 'More bones. Picked clean.' },
    { t: 'blood', x: 2, y: 11, tw: 4, kind: 'drag' },
    { t: 'blood', x: 13, y: 12, kind: 'pool', tw: 2 },
  ],
  doors: [...sideDoor(0, 11, 'landing', [18, 11, 'left'])],
};
