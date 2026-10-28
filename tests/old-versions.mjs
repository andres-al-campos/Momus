// Law: build.sh moves other versions' zips into artifacts/old_versions/ and leaves this
// version's alone. Archiving its own zips, a rebuild at the same version left a copy of
// itself in old_versions/ (Chronicle's build did). Runs build.sh's own archive block on
// scratch zips.
//
// Usage: node tests/old-versions.mjs [repo-root]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const build = fs.readFileSync(path.join(root, 'build.sh'), 'utf8');
const block = build.match(/^mkdir -p artifacts\/old_versions\n[\s\S]*?^shopt -u nullglob$/m);
if (!block) {
  console.error('✗ old-versions: build.sh has no archive block from "mkdir -p artifacts/old_versions" to "shopt -u nullglob". If it moved, update tests/old-versions.mjs to find it.');
  process.exit(1);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'momus-old-versions-'));
const failures = [];
try {
  fs.mkdirSync(path.join(dir, 'artifacts'));
  for (const v of ['9.0.0', '9.1.0']) for (const b of ['firefox', 'chrome']) {
    fs.writeFileSync(path.join(dir, 'artifacts', `momus-${v}-${b}.zip`), '');
  }
  execFileSync('bash', ['-c', `VERSION=9.1.0\n${block[0]}`], { cwd: dir, stdio: 'ignore' });
  const kept = fs.readdirSync(path.join(dir, 'artifacts')).filter((f) => f.endsWith('.zip')).sort().join(', ');
  const old = fs.readdirSync(path.join(dir, 'artifacts/old_versions')).sort().join(', ');
  if (kept !== 'momus-9.1.0-chrome.zip, momus-9.1.0-firefox.zip') {
    failures.push(`this version's zips must stay in artifacts/, found: ${kept || 'none'}. The archive loop in build.sh should skip them.`);
  }
  if (old !== 'momus-9.0.0-chrome.zip, momus-9.0.0-firefox.zip') {
    failures.push(`other versions' zips must move to artifacts/old_versions/, found there: ${old || 'none'}. Look at the archive loop in build.sh.`);
  }
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

if (failures.length) {
  for (const f of failures) console.error(`✗ old-versions: ${f}`);
  process.exit(1);
}
console.log("✓ old-versions: a build moves other versions' zips to artifacts/old_versions/ and never archives its own");
