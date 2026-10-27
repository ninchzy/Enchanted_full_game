// Runs a cutscene written as an async script, on the game's clock: wait, tween, wait until
// something happens, say a few lines. Everything advances from the game loop (update),
// so the scene keeps time with the frames and stops when the game does. abort() cancels
// the whole script, e.g. when the player exits to the title in the middle of it.

export class Aborted extends Error {}

export class Director {
  constructor(game) {
    this.game = game;
    this.jobs = [];
    this.each = [];
    this.aborted = false;
  }

  add(job) {
    if (this.aborted) return Promise.reject(new Aborted());
    return new Promise((resolve, reject) => this.jobs.push({ t: 0, ...job, resolve, reject }));
  }

  wait(sec) {
    return this.add({ dur: sec });
  }

  /** call fn(k) every frame with k going from 0 to 1 over `sec` seconds */
  tween(sec, fn) {
    fn(0);
    return this.add({ dur: sec, fn });
  }

  /** resolves on the first frame `test()` is true */
  until(test) {
    return this.add({ test });
  }

  /** show lines in the message box; resolves when the last one is closed */
  say(pages) {
    let done = false;
    this.game.say(pages, () => (done = true));
    return this.until(() => done);
  }

  /** run fn(time) every frame until stopped, or fn() every `sec` seconds (then fn runs once now) */
  repeat(fn, sec = 0) {
    const r = { fn, sec, t: 0, total: 0 };
    if (sec) fn();
    this.each.push(r);
    return { stop: () => (this.each = this.each.filter((x) => x !== r)) };
  }

  stopRepeats() {
    this.each = [];
  }

  update(dt) {
    for (const r of [...this.each]) {
      r.total += dt;
      if (!r.sec) r.fn(r.total);
      else if ((r.t += dt) >= r.sec) {
        r.t -= r.sec;
        r.fn();
      }
    }
    for (const j of [...this.jobs]) {
      j.t += dt;
      if (j.test) {
        if (!j.test()) continue;
      } else {
        j.fn?.(Math.min(1, j.t / j.dur));
        if (j.t < j.dur) continue;
      }
      this.jobs = this.jobs.filter((x) => x !== j);
      j.resolve();
    }
  }

  abort() {
    this.aborted = true;
    for (const j of this.jobs) j.reject(new Aborted());
    this.jobs = [];
    this.each = [];
  }
}

export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
