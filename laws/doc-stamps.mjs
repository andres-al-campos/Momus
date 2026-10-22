// Law: each feature file carries a stamp, "Checked against <version>.", naming a version Momus
// has had. A session reading a file compares the stamp with manifest.json and rereads the file
// against the code when the app has moved past it (features/README.md, Keeping it current). The
// README and the guides in docs/ are held to the same form once they have a stamp.
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
const STAMP = /^Checked against (\S+)\.$/m;
const md = (dir) => fs.existsSync(path.join(root, dir))
  ? fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith('.md')).map((f) => `${dir}/${f}`)
  : [];
const required = md('features').filter((f) => f !== 'features/README.md');
const docs = [...required, 'README.md', ...md('docs')];

// Every version manifest.json has had, so a typo'd stamp doesn't pass for a real one.
let known;
try {
  known = new Set(execFileSync('git', ['log', '-p', '--format=', '--', 'manifest.json'], { cwd: root, encoding: 'utf8' })
    .match(/^[-+ ]\s*"version": "[^"]+"/gm)?.map((l) => l.match(/"version": "([^"]+)"/)[1]));
} catch {
  known = undefined; // not a git checkout: only the current version is known
}

const failures = [];
let stamped = 0;
for (const doc of docs) {
  const stamp = fs.readFileSync(path.join(root, doc), 'utf8').match(STAMP);
  if (!stamp) {
    if (required.includes(doc)) {
      failures.push(`${doc} has no stamp. Read it against the code, then add under its title: "Checked against ${current}."`);
    }
    continue;
  }
  stamped++;
  const version = stamp[1];
  if (version !== current && !known?.has(version)) {
    failures.push(`${doc} is stamped ${version}, a version manifest.json has never had. ` +
      `Use the version it was read against: ${current} if you read it now.`);
  }
}

if (failures.length) {
  for (const f of failures) console.error(`✗ doc-stamps: ${f}`);
  process.exit(1);
}
console.log(`✓ doc-stamps: ${stamped} docs are stamped with a version Momus has had`);
