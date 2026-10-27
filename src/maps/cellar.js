import { room } from './util.js';

// The concrete room at the end of the secret passage.
export default {
  id: 'cellar',
  name: '???',
  theme: { floor: 'concrete', wall: 'concrete' },
  ambient: 0.74,
  music: 'ritualRoom', // the same track as the summoning room
  lights: [{ x: 160, y: 112, r: 110, a: 0.35, flicker: true }],
  tiles: room(),
  props: [
    { t: 'exit_bottom', x: 9, y: 14, text: 'The way back to the passage.' },
    { t: 'shackled', x: 3, y: 1, text: ['A skeleton hanging by its wrists.', 'It looks just like me.'] },
    { t: 'shackled', x: 5, y: 1, text: 'Another one. The wrists are still locked in the shackles.' },
    { t: 'tools_wall', x: 7, y: 1, text: 'Cleavers, saws, hooks. None of these are for woodworking.' },
    { t: 'writing', x: 11, y: 1, tw: 3, text: 'Tally marks scratched and painted in blood. Hundreds of them.' },
    { t: 'handprint', x: 14, y: 1, text: 'A bloody handprint, dragged down the wall.' },
    { t: 'iron_maiden', x: 16, y: 2, text: ['An iron maiden. It is standing open.', 'The spikes inside are not rusted. They are red.'] },
    { t: 'rack', x: 2, y: 5, hide: true, text: 'A rack. The ropes are still tied in loops, waiting.' },
    { t: 'torture_chair', x: 14, y: 5, text: 'A chair covered in iron spikes. There are straps on the armrests.' },
    {
      t: 'seated_skeleton',
      x: 9,
      y: 7,
      text: [
        'A skeleton slumps in a chair in the middle of the room, about to slide off it.',
        'It looks exactly like me.',
        'A diary is slipping out of its lap.',
        "...I don't think I should touch it. Not yet.",
      ],
    },
    { t: 'candle', x: 8, y: 8, black: false, text: 'A candle at the foot of the chair. Someone keeps it lit.' },
    { t: 'candle', x: 11, y: 8, black: false, text: 'A candle. The wax has pooled into a thick puddle.' },
    { t: 'drain', x: 10, y: 10, text: 'A drain in the floor, crusted with dried blood.' },
    { t: 'cage', x: 16, y: 8, text: 'A cage. The bars are bent outward.' },
    { t: 'corpse', x: 3, y: 10, kind: 'shroud', text: 'A body wrapped in a dirty sheet and tied with rope. It has soaked through.' },
    { t: 'corpse', x: 13, y: 10, kind: 'body', text: ['A body lying face down, one arm reaching for the door.', 'I can not tell how long it has been here.'] },
    { t: 'corpse', x: 5, y: 12, kind: 'bones', text: ['What is left of someone like me.', 'The bones are scratched, as if something chewed on them.'] },
    { t: 'blood', x: 12, y: 12, tw: 2, kind: 'pool' },
    { t: 'bucket', x: 17, y: 12, text: 'A bucket full of something I am not going to look at.' },
    { t: 'bone_pile', x: 15, y: 12, text: 'A pile of bones swept into the corner.' },
    { t: 'ribcage', x: 3, y: 8, text: 'A ribcage, picked clean.' },
    { t: 'bone', x: 11, y: 5, text: 'A thigh bone. There are teeth marks on it.' },
    { t: 'skull', x: 7, y: 5, text: 'A skull, rolled away from the rest of its body.' },
    { t: 'blood', x: 6, y: 8, tw: 3, kind: 'drag' },
  ],
  doors: [
    { x: 9, y: 14, to: 'passage', at: [35, 7, 'down'] },
    { x: 10, y: 14, to: 'passage', at: [36, 7, 'down'] },
  ],
};
