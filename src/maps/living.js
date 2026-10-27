import { room, sideDoor } from './util.js';

const SHELF = 'A shelf with books covered in a thick layer of dust. Looks like they have not been touched in ages.';

export default {
  id: 'living',
  name: 'Living Room',
  theme: { floor: 'wood', wall: 'damask' },
  ambient: 0.5,
  tiles: room({
    11: '..............oo..',
    12: '.............oooo.',
    13: '.............xoox.',
  }),
  props: [
    { t: 'door_side', x: 0, y: 4, side: 'L', text: 'The door back to the hallway.' },
    { t: 'bookshelf', x: 2, y: 2, cobweb: true, text: SHELF },
    { t: 'bookshelf', x: 4, y: 2, text: SHELF },
    { t: 'window', x: 6, y: 1, text: 'Heavy curtains, rotten through. Nothing but darkness outside.' },
    { t: 'fireplace', x: 8, y: 2, hide: true, text: ['A fireplace full of cold ash.', 'Something in the ashes looks like a small bone.'] },
    { t: 'picture', x: 11, y: 1, kind: 'portrait', blood: true, text: "A portrait of the house's owner, maybe. He is weeping blood." },
    { t: 'tv', x: 14, y: 3, text: "An old looking TV. Looks like it doesn't turn on anymore." },
    { t: 'piano', x: 16, y: 3, hide: true, text: ['An upright piano. A few keys are missing.', 'One of them is stained red.'] },
    { t: 'plant', x: 18, y: 3, text: 'A dead plant in a cracked pot.' },
    { t: 'armchair', x: 6, y: 4, text: 'A worn armchair. The seat is still warm.' },
    { t: 'sofa_back', x: 13, y: 6, text: 'A torn sofa facing the TV. The stuffing is coming out.' },
    { t: 'rug', x: 6, y: 7, tw: 6, th: 4, color: 0x5b4636 },
    { t: 'table_small', x: 8, y: 8, hide: true, plates: false, candle: true, text: 'A coffee table. A candle stub and a ring of something sticky.' },
    { t: 'blood', x: 4, y: 10, kind: 'splat' },
    { t: 'debris', x: 12, y: 11, n: 5 },
  ],
  doors: [...sideDoor(0, 4, 'hall_g', [11, 11, 'left'])],
};
