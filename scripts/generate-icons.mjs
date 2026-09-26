/**
 * PWA আইকন তৈরি — কোনো বাইরের প্যাকেজ ছাড়া, শুধু Node বিল্ট-ইন (zlib) দিয়ে।
 * `src/app/icon.svg`-এর ডিজাইনই পিক্সেলে এঁকে PNG এনকোড করা হয়।
 *
 * চালানো: node scripts/generate-icons.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------------ PNG */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ আঁকা */

// 192-স্পেসে ডিজাইন, তারপর যেকোনো সাইজে স্কেল
const D = 192;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function bgColor(y01) {
  // #34d399 → #10b981 (55%) → #0d9488
  const top = [52, 211, 153];
  const mid = [16, 185, 129];
  const bot = [13, 148, 136];
  if (y01 < 0.55) {
    const t = y01 / 0.55;
    return [lerp(top[0], mid[0], t), lerp(top[1], mid[1], t), lerp(top[2], mid[2], t)];
  }
  const t = (y01 - 0.55) / 0.45;
  return [lerp(mid[0], bot[0], t), lerp(mid[1], bot[1], t), lerp(mid[2], bot[2], t)];
}

// rounded-rect SDF (192-স্পেস) — ঋণাত্মক মানে ভেতরে
function rrSdf(px, py, x, y, w, h, r) {
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  const dx = px - cx;
  const dy = py - cy;
  const outside = Math.hypot(dx, dy);
  const insideX = Math.max(x + r - px, px - (x + w - r), 0);
  const insideY = Math.max(y + r - py, py - (y + h - r), 0);
  if (px >= x && px <= x + w && py >= y && py <= y + h) {
    if (outside === 0) return -Math.min(r, Math.min(insideX || r, insideY || r));
    return -Math.min(insideX, insideY) * 0 + -1 * Math.min(r - outside, r);
  }
  return outside;
}

function smoothstep(e0, e1, x) {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

function drawIcon(size, { maskable = false } = {}) {
  const buf = new Uint8ClampedArray(size * size * 4);
  const k = size / D; // 192-স্পেস → পিক্সেল
  // maskable: কনটেন্ট মাঝের নিরাপদ বৃত্তে (66%)
  const g = maskable ? 0.68 : 1;
  const toGlyph = (px) => 96 + (px / k - 96) * (maskable ? 1 / 1 : 1); // পিক্সেল→192
  void toGlyph;

  const shapes = [
    // হাতল (আংটা): উপরের অর্ধ-বলয় — কেন্দ্র (96,72), বাইরে r=33, ভেতরে r=24
    { kind: "ring-top", cx: 96, cy: 72, rO: 33, rI: 24, color: [255, 255, 255], alpha: 0.92 },
    // সামিয়ানা
    { kind: "rr", x: 40, y: 74, w: 112, h: 20, r: 7, color: [255, 255, 255], alpha: 0.94 },
    // দোকান ঘর
    { kind: "rr", x: 48, y: 98, w: 96, h: 44, r: 9, color: [255, 255, 255], alpha: 0.8 },
    // খতিয়ানের লাইন (গাঢ় সবুজ)
    { kind: "rr", x: 66, y: 112, w: 24, h: 8, r: 4, color: [15, 118, 110], alpha: 1 },
    { kind: "rr", x: 102, y: 112, w: 24, h: 8, r: 4, color: [15, 118, 110], alpha: 1 },
    { kind: "rr", x: 66, y: 128, w: 44, h: 8, r: 4, color: [15, 118, 110], alpha: 1 },
  ];

  for (let j = 0; j < size; j++) {
    const y01 = j / (size - 1);
    for (let i = 0; i < size; i++) {
      // ব্যাকগ্রাউন্ড গ্রেডিয়েন্ট
      let [r, gC, b] = bgColor(y01);
      let a = 1;
      // 192-স্পেস কোঅর্ডিনেট (maskable-এ কেন্দ্রের দিকে সংকুচিত)
      let gx = (i + 0.5) / k;
      let gy = (j + 0.5) / k;
      if (maskable) {
        gx = 96 + (gx - 96) / g;
        gy = 96 + (gy - 96) / g;
      }
      const aa = 1.2 / k; // ~1.2px ফেদার
      for (const s of shapes) {
        let cov = 0;
        if (s.kind === "rr") {
          const d = rrSdf(gx, gy, s.x, s.y, s.w, s.h, s.r);
          cov = 1 - smoothstep(-aa, aa, d);
        } else if (s.kind === "ring-top") {
          if (gy <= s.cy + aa) {
            const dist = Math.hypot(gx - s.cx, gy - s.cy);
            const outer = 1 - smoothstep(s.rO - aa, s.rO + aa, dist);
            const inner = 1 - smoothstep(s.rI - aa, s.rI + aa, dist);
            cov = Math.max(0, outer - inner);
          }
        }
        if (cov > 0) {
          const sa = s.alpha * cov;
          r = s.color[0] * sa + r * (1 - sa);
          gC = s.color[1] * sa + gC * (1 - sa);
          b = s.color[2] * sa + b * (1 - sa);
        }
      }
      const o = (j * size + i) * 4;
      buf[o] = r;
      buf[o + 1] = gC;
      buf[o + 2] = b;
      buf[o + 3] = 255 * a;
    }
  }
  return encodePng(size, size, buf);
}

const targets = [
  ["public/icons/icon-192.png", 192, {}],
  ["public/icons/icon-512.png", 512, {}],
  ["public/icons/maskable-512.png", 512, { maskable: true }],
  ["public/apple-touch-icon.png", 180, {}],
];

for (const [rel, size, opts] of targets) {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, drawIcon(size, opts));
  console.log("✓", rel, `${size}x${size}`);
}
console.log("আইকন তৈরি সম্পন্ন — public/icons/ ও apple-touch-icon.png");
