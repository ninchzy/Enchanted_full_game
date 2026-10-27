// Cut a seamless loop out of a long 16-bit PCM WAV:
//   node tools/cut-loop.mjs <in.wav> <out.wav> <start seconds> <length seconds> [crossfade seconds]
// The last `crossfade` seconds blend into the audio just before `start`, so jumping from
// the end of the loop back to its start continues the sound without a click.
import { readFileSync, writeFileSync } from 'node:fs';

const [inPath, outPath, startS, lenS, xfS = '0.3'] = process.argv.slice(2);
if (!lenS) {
  console.log('usage: node tools/cut-loop.mjs <in.wav> <out.wav> <start s> <length s> [crossfade s]');
  process.exit(1);
}
const buf = readFileSync(inPath);
let p = 12, fmt = null, data = null;
while (p + 8 <= buf.length) {
  const id = buf.toString('ascii', p, p + 4), size = buf.readUInt32LE(p + 4);
  if (id === 'fmt ') fmt = { tag: buf.readUInt16LE(p + 8), ch: buf.readUInt16LE(p + 10), rate: buf.readUInt32LE(p + 12), bits: buf.readUInt16LE(p + 22) };
  if (id === 'data') { data = p + 8; break; }
  p += 8 + size + (size % 2);
}
if (fmt.tag !== 1 || fmt.bits !== 16) throw new Error('only 16-bit PCM WAV is supported');

const frame = 2 * fmt.ch;
const start = Math.round(Number(startS) * fmt.rate);
const len = Math.round(Number(lenS) * fmt.rate);
const xf = Math.min(start, Math.round(Number(xfS) * fmt.rate));
const sample = (i, c) => buf.readInt16LE(data + i * frame + c * 2);

const out = Buffer.alloc(44 + len * frame);
out.write('RIFF', 0); out.writeUInt32LE(36 + len * frame, 4); out.write('WAVE', 8);
out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(fmt.ch, 22);
out.writeUInt32LE(fmt.rate, 24); out.writeUInt32LE(fmt.rate * frame, 28); out.writeUInt16LE(frame, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(len * frame, 40);
for (let i = 0; i < len; i++) {
  const k = i >= len - xf ? (i - (len - xf)) / xf : 0; // 0 → 1 over the crossfade
  for (let c = 0; c < fmt.ch; c++) {
    let v = sample(start + i, c);
    if (k > 0) {
      // equal-power blend into what comes right before the loop's start
      const lead = sample(start - xf + (i - (len - xf)), c);
      v = v * Math.cos((k * Math.PI) / 2) + lead * Math.sin((k * Math.PI) / 2);
    }
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v))), 44 + i * frame + c * 2);
  }
}
writeFileSync(outPath, out);
console.log(`wrote ${outPath}: ${(len / fmt.rate).toFixed(2)} s from ${startS} s, ${(xf / fmt.rate).toFixed(2)} s crossfade`);
