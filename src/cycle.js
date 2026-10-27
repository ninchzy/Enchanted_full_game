// The game's rhythm: the player explores for 5 minutes, then the hooded figure searches
// for 2. Five rounds of that, then he sleeps for 10 minutes (the player explores freely),
// wakes and searches again, and the whole thing starts over.
//
// For testing, the durations can be shortened in the address bar, in seconds:
//   http://localhost:5173/?roam=20&seek=40&sleep=30

const ROUNDS = 5;

function durations() {
  const q = new URLSearchParams(location.search);
  const n = (k, d) => (q.has(k) && Number(q.get(k)) > 0 ? Number(q.get(k)) : d);
  return { roam: n('roam', 5 * 60), seek: n('seek', 2 * 60), sleep: n('sleep', 10 * 60) };
}

export class Cycle {
  constructor(game) {
    this.game = game;
    const d = (this.durations = durations());
    this.phases = [];
    for (let i = 0; i < ROUNDS; i++) this.phases.push({ kind: 'roam', dur: d.roam }, { kind: 'seek', dur: d.seek });
    this.phases.push({ kind: 'sleep', dur: d.sleep }, { kind: 'seek', dur: d.seek });
    this.index = 0;
    this.left = this.phases[0].dur;
  }

  get phase() {
    return this.phases[this.index];
  }

  /** the phase after this one */
  get next() {
    return this.phases[(this.index + 1) % this.phases.length];
  }

  update(dt) {
    this.left -= dt;
    if (this.left > 0) return;
    const ended = this.phase;
    this.index = (this.index + 1) % this.phases.length;
    this.left = this.phase.dur;
    const s = this.game.seeker;
    if (this.phase.kind === 'seek') {
      if (ended.kind === 'sleep') s.wake();
      s.startSeek();
    } else if (this.phase.kind === 'sleep') {
      s.endSeek();
      s.goToSleep();
    } else {
      s.endSeek();
    }
  }
}
