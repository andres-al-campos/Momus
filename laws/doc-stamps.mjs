// Law: each feature file carries a stamp, "Checked YYYY-MM-DD HH:MM, at <version>.", and each
// Principle and Call starts "YYYY-MM-DD HH:MM, <version>.", with a time that isn't in the future
// and a version Momus has had. A session reading a file rereads it against the code when that
// code changed since the stamp (features/README.md, Keeping it current). The README and the
// guides in docs/ are held to the same form once they have a stamp.
//
// Can't catch a stamp set without a reread.
//
// Usage: node laws/doc-stamps.mjs [repo-root]

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const current = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')).version;
const STAMP = /^Checked (.+), at (\S+)\.$/m;
const ENTRY = /^- (\d{4}-\d\d-\d\d)\b(.*)/; // a dated Principle or Call
const md = (dir) => fs.existsSync(path.join(root, dir))
  ? fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith('.md')).map((f) => `${dir}/${f}`)
  : [];
const required = md('features').filter((f) => f !== 'features/README.md');
const docs = [...required, 'README.md', ...md('docs')];

// Every version manifest.json has had, so a typo'd version doesn't pass for a real one.
const known = new Set([current]);
try {
  const log = execFileSync('git', ['log', '-p', '--format=', '--', 'manifest.json'], { cwd: root, encoding: 'utf8' });
  for (const m of log.matchAll(/^[-+ ]\s*"version": "([^"]+)"/gm)) known.add(m[1]);
} catch {} // not a git checkout: only the current version is known

const now = new Date();
const stampNow = () => {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}`;
};
// Problems with a time and version, or none.
const check = (time, version) => {
  const m = time.match(/^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)$/);
  const when = m && new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]);
  // Date rolls 25:00 over to the next day; a real time reads back the same.
  if (!when || when.getMonth() !== m[2] - 1 || when.getDate() !== +m[3] || when.getHours() !== +m[4]) return `"${time}" isn't a time like ${stampNow()}`;
  if (when > now) return `${time} is in the future`;
  if (!known.has(version)) return `${version} is a version manifest.json has never had (now ${current})`;
};

const failures = [];
let stamped = 0;
for (const doc of docs) {
  const stamp = fs.readFileSync(path.join(root, doc), 'utf8').match(STAMP);
  if (!stamp) {
    if (required.includes(doc)) {
      failures.push(`${doc} has no stamp. Read it against the code, then add under its title: ` +
        `"Checked ${stampNow()}, at ${current}."`);
    }
    continue;
  }
  stamped++;
  const problem = check(stamp[1], stamp[2]);
  if (problem) failures.push(`${doc}'s stamp: ${problem}. Set it to when you read the doc against the code, like "Checked ${stampNow()}, at ${current}."`);
}

let entries = 0;
for (const file of ['AGENTS.md', ...required]) {
  fs.readFileSync(path.join(root, file), 'utf8').split('\n').forEach((line, i) => {
    const entry = line.match(ENTRY);
    if (!entry) return;
    entries++;
    const prefix = line.match(/^- (\d{4}-\d\d-\d\d \d\d:\d\d), (\S+?)\. /);
    const problem = prefix ? check(prefix[1], prefix[2])
      : `starts "${line.slice(2, 22)}…" without a time and version`;
    if (problem) failures.push(`${file}:${i + 1}: ${problem}. Start it with when the call was made and Momus's version then, like "- ${stampNow()}, ${current}. ".`);
  });
}

if (failures.length) {
  for (const f of failures) console.error(`✗ doc-stamps: ${f}`);
  process.exit(1);
}
console.log(`✓ doc-stamps: ${stamped} docs stamped, ${entries} Principles and Calls dated, each with a time and version Momus has had`);
