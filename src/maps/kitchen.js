import { sideDoor } from './util.js';

const COUNTER = 'A kitchen counter covered in grease and dust.';
const PANTRY = 'Pantry shelves. Jars of something pickled. I hope it is vegetables.';

// Two rooms: the kitchen on the left and the pantry on the right, joined by a doorway
// in the dividing wall. The pantry stays pitch black until you step into it.
export default {
  id: 'kitchen',
  name: 'Kitchen',
  theme: { floor: 'checker', wall: 'kitchen' },
  ambient: 0.5,
  tiles: [
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '####################',
    '#WWWWWWWWWWWWW#WWWW#',
    '#WWWWWWWWWWWWW#WWWW#',
    '#..................#',
    '#..................#',
    '#.............#....#',
    '#.............#....#',
    '#......o......#....#',
    '#....xooo.....#....#',
    '####################',
  ],
  zones: [{ id: 'pantry', mask: [15, 5, 5, 10], reveal: [14, 5, 6, 10] }],
  props: [
    { t: 'door_side', x: 0, y: 11, side: 'L', text: 'The door back to the hallway.' },

    // kitchen
    { t: 'uppercab', x: 1, y: 6, text: 'A cupboard. Chipped plates, nothing else.' },
    { t: 'window', x: 3, y: 6, text: 'The window over the sink. Something moved outside. Probably.' },
    { t: 'uppercab', x: 5, y: 6, open: true, text: 'The cupboard hangs open. Mostly empty.' },
    { t: 'uppercab', x: 7, y: 6, text: 'A cupboard. Locked, for some reason.' },
    { t: 'counter', x: 1, y: 8, dishes: true, text: 'Dirty dishes. They have been here a very long time.' },
    { t: 'counter', x: 2, y: 8, hide: true, text: COUNTER },
    { t: 'counter', x: 3, y: 8, kind: 'sink', text: 'The sink is clogged with something dark.' },
    { t: 'counter', x: 4, y: 8, knife: true, text: 'A kitchen knife covered in dried blood. Better leave it.' },
    { t: 'counter', x: 5, y: 8, hide: true, text: COUNTER },
    { t: 'counter', x: 6, y: 8, kind: 'stove', text: 'An old gas stove. Cold. There is a pot on it... I would rather not look inside.' },
    { t: 'counter', x: 7, y: 8, hide: true, text: COUNTER },
    { t: 'fridge', x: 8, y: 8, hide: true, text: ['An old fridge. It is dead silent.', 'Something is leaking from under the door. The smell is awful.'] },
    { t: 'picture', x: 11, y: 6, kind: 'landscape', text: 'A cheerful painting of a farm. It feels out of place here.' },
    { t: 'cobweb', x: 13, y: 6, corner: 'tr' },
    { t: 'chair', x: 10, y: 9, dir: 'down', text: 'A kitchen chair.' },
    { t: 'table', x: 9, y: 10, hide: true, cloth: true, plates: true, text: ['The table is set for dinner.', 'The food rotted away a long time ago.'] },
    { t: 'chair', x: 10, y: 12, dir: 'up', text: 'A kitchen chair.' },
    { t: 'chair', x: 12, y: 11, dir: 'fallen', text: 'A chair, knocked over. Someone got up in a hurry.' },
    { t: 'plates', x: 4, y: 10, text: 'Broken plates.' },
    { t: 'blood', x: 4, y: 9, kind: 'splat' },
    { t: 'debris', x: 11, y: 13, n: 5 },

    // doorway to the pantry
    { t: 'doorway', x: 14, y: 8, side: 'L', text: 'A doorway into the pantry. It is pitch black in there.' },

    // pantry
    { t: 'shelf_metal', x: 17, y: 8, pantry: true, text: PANTRY },
    { t: 'shelf_metal', x: 18, y: 10, wall: 'right', pantry: true, text: 'More shelves. The labels on the jars have been scratched off.' },
    { t: 'barrel', x: 15, y: 12, hide: true, text: 'A barrel of flour, gone grey with mold.' },
    { t: 'sack', x: 15, y: 13, text: 'A sack of potatoes. They have grown long, pale roots.' },
    { t: 'sack', x: 16, y: 13, text: 'A sack. Something inside it is still moving.' },
    { t: 'crate', x: 18, y: 13, hide: true, text: 'A crate of rotten apples.' },
    { t: 'cobweb', x: 15, y: 6, corner: 'tl' },
    { t: 'blood', x: 16, y: 10, kind: 'splat' },
  ],
  doors: [...sideDoor(0, 11, 'hall_g', [11, 8, 'left'])],
};
