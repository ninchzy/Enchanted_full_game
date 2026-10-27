// Ground floor hallway. Shown as a narrow corridor in the middle third of the screen;
// everything left and right of it stays black. Front door on the top wall, the stairs
// to the upper floor to its left.
const BARRIER = 'The front door is boarded up and chained shut... from the inside.';
// the switch that opens the door to the hidden room once the front door is unlocked
const MECHANISM = [
  'There is also some kind of mechanism barely visible in the right corner of the door.',
  'It looks like a switch for something.',
];
// the rusty key from the safe opens the workshop
const WORKSHOP_LOCK = { flag: 'workshop_unlocked', key: 'rusty_key' };

export default {
  id: 'hall_g',
  name: 'Hallway',
  theme: { floor: 'wood', wall: 'damask' },
  ambient: 0.45,
  corridor: 'vertical', // the seeker stops against a side wall here, out of the way
  tiles: [
    '      #######       ',
    '      #SSWWW#       ',
    '      #SSWWW#       ',
    '      LSS...R       ',
    '      LSS...R       ',
    '      LSS...R       ',
    '      LSS...R       ',
    '      L.....R       ',
    '      L.....R       ',
    '      L.....R       ',
    '      L.....R       ',
    '      L.....R       ',
    '      L.....R       ',
    '      L.....R       ',
    '      L.....R       ',
    '      L.....R       ',
    '      L.....R       ',
    '      L.....R       ',
    '      L..oo.R       ',
    '      L.x.x.R       ',
    '      L.....R       ',
    '      #######       ',
  ],
  props: [
    // the heavy metal key opens it (see src/puzzles.js)... and there is a portal behind it
    { t: 'door_front', x: 9, y: 1, unless: 'portal_open', text: [BARRIER, "I won't get out this way.", ...MECHANISM], use: { rusty_key: "The key doesn't even come close to fitting the padlock." } },
    // the portal; once the amulet is broken, only the empty doorway is left
    {
      t: 'portal',
      x: 9,
      y: 1,
      if: 'portal_open',
      looks: [['portal_broken', { empty: true }]],
      text: ['Where the door was, something swirls and hums.', 'It will not let me through.'],
    },
    { t: 'doormat', x: 9, y: 3, tw: 2 },
    { t: 'clock', x: 11, y: 3, text: 'A grandfather clock. The pendulum hangs still. It stopped at 3:33.' },
    { t: 'cobweb', x: 11, y: 1, corner: 'tr' },
    { t: 'rug', x: 8, y: 8, tw: 3, th: 9, vertical: true, color: 0x4f3b33 },

    // side doors (left wall: bathroom, bedroom, spare bedroom; right wall: kitchen, living room, workshop)
    { t: 'door_side', x: 6, y: 7, side: 'L', text: 'The bathroom door.' },
    { t: 'door_side', x: 6, y: 10, side: 'L', text: 'The bedroom door.' },
    { t: 'door_side', x: 6, y: 16, side: 'L', blood: true, text: 'The door to the spare bedroom. There is a bloody smear on it.' },
    { t: 'door_side', x: 12, y: 7, side: 'R', text: 'The kitchen door.' },
    { t: 'door_side', x: 12, y: 10, side: 'R', text: 'The living room door.' },
    { t: 'door_side', x: 12, y: 16, side: 'R', mark: true, text: 'The workshop door. Someone carved an X into it.' },

    // decoration along the side walls
    { t: 'picture_side', x: 6, y: 4, side: 'L', text: 'A small painting of a woman. Her face has been scratched out.' },
    { t: 'picture_side', x: 12, y: 4, side: 'R', text: 'A painting of a house. This house.' },
    { t: 'picture_side', x: 6, y: 13, side: 'L', text: 'A family portrait. Every face is turned away.' },
    { t: 'picture_side', x: 12, y: 13, side: 'R', blood: true, text: "A portrait of an old man. Something red is running from its eyes." },
    { t: 'picture_side', x: 12, y: 19, side: 'R', text: 'An empty frame.' },
    { t: 'sidetable', x: 7, y: 13, text: 'A side table with a vase of dead flowers. They crumble at the touch.' },
    { t: 'sidetable', x: 11, y: 14, text: 'A little cabinet with a vase. The water in it has gone black.' },
    { t: 'plant', x: 7, y: 20, text: 'A potted plant. Long dead.' },
    { t: 'plant', x: 11, y: 20, text: 'A dried-out plant. The soil smells like rust.' },

    // decay
    { t: 'blood', x: 8, y: 14, th: 3, kind: 'drag', from: 'v' },
    { t: 'blood', x: 7, y: 17, kind: 'splat' },
    { t: 'debris', x: 8, y: 18, n: 4 },
    { t: 'debris', x: 10, y: 17, n: 3 },
    // the back door is in the bottom wall, which we can't see: a doormat marks the way out
    { t: 'doormat', x: 9, y: 20, tw: 2, text: 'A doormat. The back door to the yard is right here.' },
  ],
  doors: [
    { x: 7, y: 1, to: 'landing', at: [12, 3, 'down'] },
    { x: 8, y: 1, to: 'landing', at: [13, 3, 'down'] },
    { x: 6, y: 7, to: 'bathroom', at: [18, 12, 'left'] },
    { x: 6, y: 8, to: 'bathroom', at: [18, 12, 'left'] },
    { x: 6, y: 10, to: 'bedroom', at: [18, 5, 'left'] },
    { x: 6, y: 11, to: 'bedroom', at: [18, 5, 'left'] },
    { x: 6, y: 16, to: 'spare', at: [18, 5, 'left'] },
    { x: 6, y: 17, to: 'spare', at: [18, 5, 'left'] },
    { x: 12, y: 7, to: 'kitchen', at: [1, 12, 'right'] },
    { x: 12, y: 8, to: 'kitchen', at: [1, 12, 'right'] },
    { x: 12, y: 10, to: 'living', at: [1, 5, 'right'] },
    { x: 12, y: 11, to: 'living', at: [1, 5, 'right'] },
    { x: 12, y: 16, to: 'workshop', at: [1, 5, 'right'], lock: WORKSHOP_LOCK },
    { x: 12, y: 17, to: 'workshop', at: [1, 5, 'right'], lock: WORKSHOP_LOCK },
    { x: 9, y: 21, to: 'backyard', at: [11, 3, 'down'] },
    { x: 10, y: 21, to: 'backyard', at: [12, 3, 'down'] },
  ],
  // stepping in front of the empty doorway once the amulet is broken starts ending 1
  stepScenes: [{ tiles: ['9,3', '10,3'], if: 'portal_broken', scene: 'ending1' }],
  // the portal's hum, once it is there: loudest right in front of it, quieter around
  // that, silent everywhere else (see game.updateAmbience). Tiles are "x,y": volume.
  ambience: {
    sound: 'portalHum',
    if: 'portal_open',
    tiles: {
      // right in front of the portal
      '9,3': 1, '10,3': 1,
      // 40% quieter: the stairs beside it and the row below
      '8,2': 0.6, '8,3': 0.6, '9,4': 0.6, '10,4': 0.6,
      // 70% quieter: the ring around that
      '8,1': 0.3, '7,2': 0.3, '7,3': 0.3, '8,4': 0.3, '9,5': 0.3, '10,5': 0.3, '11,4': 0.3,
    },
  },
  // the hooded figure is not part of the map any more: he moves through the whole house
  // (see src/seeker.js; he starts next to the stairs)
};
