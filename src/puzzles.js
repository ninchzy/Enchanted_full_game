import { play, soundLength } from './audio.js';
import { me, mePause } from './cutscene/lines.js';
import { DIARY } from './diary.js';
import { useAmulet } from './cutscene/finale.js';

// The items hidden around the house, what they open, and what using them does.
//
// SPOTS ties a script to an object, by map and by the object's key (the same key the
// editor uses: "type@x,y" from the map file, or "new:<uid>" for objects added in the
// editor). A spot can have:
//   investigate(game, hit)  - replaces the plain "show its text" when SPACE is pressed
//   use: { item: (game) => ... }  - what using an item on it does
// Door locks are set on the doors in the map files: lock: { flag, key, keep }.

/** a prop's text as a list of pages */
const pages = (t) => (Array.isArray(t) ? t : t ? [t] : []);

/**
 * An object with an item to take: its text, then a Yes / No question; Yes adds the item
 * (after the `found` lines, if any). Once taken, only the first line of its text is shown.
 */
function take({ item, flag, ask = 'Take it?', extra = null, found = null }) {
  return {
    investigate(g, hit) {
      const text = pages(hit.text);
      if (g.flags.has(flag)) return g.say(text[0] ?? '...');
      g.say(extra ? [...text, extra] : text, () =>
        g.choice.show(['Yes', 'No'], (pick) => {
          if (pick !== 'Yes') return;
          g.flags.add(flag);
          if (found) g.say(found, () => g.say(g.giveItem(item)));
          else g.say(g.giveItem(item));
        }, ask),
      );
    },
  };
}

/** the diary in the hidden room: its text, then "Read it?" opens the book */
const DIARY_SPOT = {
  investigate(g, hit) {
    g.say(pages(hit.text), () => g.choice.show(['Yes', 'No'], (pick) => pick === 'Yes' && g.book.show(DIARY), 'Read it?'));
  },
};

/** the piano in the living room: the keys from the mattress fit its gap; the heavy key is inside */
const PIANO = {
  use: {
    piano_keys: (g) => {
      g.removeItem('piano_keys');
      g.flags.add('piano_open');
      play('unlock', 0.9);
      g.say('Keys click into place and the area above the keys opens up, revealing a heavy metal key inside.', () => g.say(g.giveItem('heavy_key')));
    },
  },
};

/**
 * The painting in the bedroom hides a safe: 4412. The first time, its text leads to the
 * lock; after that, straight to the lock (until it is open).
 */
const SAFE = {
  investigate(g, hit) {
    const text = pages(hit.text);
    if (g.flags.has('safe_open')) return g.say([text[0], 'The safe behind it is open. There is nothing else inside.']);
    const lock = () =>
      g.codeLock.show({
        code: '4412',
        onSolve: () => {
          g.flags.add('safe_open');
          play('unlock', 0.9);
          g.say(g.giveItem('rusty_key'));
        },
      });
    if (g.flags.has('safe_seen')) return lock();
    g.say(text, () => {
      g.flags.add('safe_seen');
      lock();
    });
  },
};

/** the well in the backyard: tie the rope on, then lower the bucket */
const WELL = {
  investigate(g, hit) {
    // once the key has been pulled up, it has nothing more to say
    if (g.flags.has('well_bucket')) {
      return g.say(['An old stone well.', "Looks like it hasn't been used in decades.", 'It is too dark to see the bottom.']);
    }
    g.say(pages(hit.text));
  },
  use: {
    rope: (g) =>
      g.runScene(async (d) => {
        g.removeItem('rope');
        await d.tween(0.6, (k) => (g.blackG.alpha = k));
        play('rope');
        await d.wait((soundLength('rope') ?? 1.7) + 0.4);
        g.flags.add('well_rope');
        g.refresh(); // the well now has the rope on it (the scene fades back in with the timers)
      }),
    bucket: (g) => {
      if (!g.flags.has('well_rope')) {
        return g.say(["It's no use if I just throw the bucket down the well.", 'I should find something to tie it to.']);
      }
      g.runScene(async (d) => {
        g.removeItem('bucket');
        await d.tween(0.6, (k) => (g.blackG.alpha = k));
        play('splash');
        await d.wait(2.3 + 1); // the splash, then a second of quiet
        play('ropePull');
        await d.wait(4.2);
        g.flags.add('well_bucket');
        g.refresh(); // the bucket stands next to the well now, in a puddle
        g.timersHidden = false; // back with the timers, then the key
        await d.wait(0.3);
        await d.tween(0.6, (k) => (g.blackG.alpha = 1 - k));
        await d.say(g.giveItem('spare_key'));
      });
    },
  },
};

/** the front door, boarded and chained: the heavy key opens it... onto a portal */
const FRONT_DOOR = {
  use: {
    heavy_key: (g) => {
      if (g.cycle.phase.kind === 'seek') return g.say("I don't have time for that right now.");
      g.runScene(async (d) => {
        g.removeItem('heavy_key');
        play('unlock', 1);
        await d.wait(1.1);
        g.flags.add('portal_open');
        g.refresh(); // the door is gone; a portal hangs where it stood
        await d.wait(1.0);
        // (if the amulet was already broken, there is no portal to throw him back)
        if (g.flags.has('portal_broken')) return d.say('The door swings open.');

        // he steps up to it... and is thrown back
        const p = g.player;
        p.face('up');
        const y0 = p.sprite.y;
        await d.tween(0.7, (k) => (p.sprite.y = y0 - Math.sin(k * Math.PI * 0.5) * 7));
        play('push', 1);
        play('pushback', 1);
        let back = 0;
        while (back < 2 && g.world.canMove(p.tx, p.ty + back, 'down', p)) back++;
        if (back) {
          p.from = [p.tx, p.ty];
          p.ty += back;
          p.t = 0;
          p.stepTime = 0.22 * back;
          p.moving = true; // still facing the portal: pushed, not walking
        } else p.sync();
        await d.until(() => !p.moving);
        await d.wait(2);

        await d.say(me('No...'));
        g.flags.add('portal_music'); // the music changes for good
        await d.wait(3);
        await d.say([
          me("This...this can't be..."),
          me("I...I can't...leave...?"),
          me("I CAN'T LEEAVEE!", { shake: true }),
          mePause('...'),
          me("There has to be another way...this can't be the end..."),
        ]);
        // the door has thrown a switch: it opens the door to the hidden room (src/maps/passage.js)
        await d.wait(1);
        const click = 'The mechanism of the door clicked in place when I opened the doors.';
        if (g.flags.has('trapdoor_open')) await d.say([click, 'Maybe it has something to do with <b>that</b> door.']);
        else {
          await d.say([
            click,
            "You're not sure what it does. You have not yet found any place within this house that has any sort of mechanism of this type.",
            me('I should check the rooms again. I probably missed something.'),
          ]);
        }
      });
    },
  },
};

export const SPOTS = {
  attic: { 'sheet@31,6': take({ item: 'paper', flag: 'got_paper', ask: 'Open it?' }) },
  bedroom: { 'picture@5,1': SAFE },
  // the right-hand metal shelf (added in the editor), with the rope on a lower shelf
  workshop: { 'new:mvf3d3w4qqjc': take({ item: 'rope', flag: 'got_rope' }) },
  shed: { 'garden_tools@2,1': take({ item: 'bucket', flag: 'got_bucket' }) },
  backyard: {
    'well@15,13': WELL,
    // the stump with the axe (added in the editor): where the amulet can be broken
    'new:mvf3l1gttsxu': { use: { strange_amulet: useAmulet } },
  },
  // (the small key for the trapdoor; the heavy metal key is in the piano)
  summoning: { 'altar@9,3': take({ item: 'small_key', flag: 'got_small_key' }) },
  hall_g: {
    'door_front@9,1': FRONT_DOOR,
    'portal@9,1': {
      investigate(g, hit) {
        if (g.flags.has('portal_broken')) return g.say('The doorway stands empty now.');
        g.say(pages(hit.text));
      },
    },
  },
  cellar: {
    'rack@2,5': take({ item: 'strange_amulet', flag: 'got_amulet', ask: 'Pick it up?' }),
    'seated_skeleton@9,7': DIARY_SPOT,
  },
  spare: {
    'bed_single@6,3': take({
      item: 'piano_keys',
      flag: 'got_piano_keys',
      ask: 'Search the mattress?',
      found: [
        'You stick your hand into the hole in the mattress.',
        'You squeeze your boney fingers between the springs as they clank and ding deeper into it.',
        'Something slithers across your hand. Chills go down your spine.',
        'You feel something light and plastic, a few pieces actually.',
        "That doesn't feel like something that should be there, so you pull them out.",
      ],
    }),
  },
  living: { 'piano@16,3': PIANO },
};

export const spotFor = (mapId, key) => (key ? SPOTS[mapId]?.[key] ?? null : null);
