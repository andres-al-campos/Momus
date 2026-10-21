// Law: each feature file says which version it was last checked against and which code it
// covers, and comes due for a reread once that code changes (features/README.md, Keeping it
// current). The README and the guides in docs/ are held to their stamps once they have one.
//
// Usage: node laws/doc-stamps.mjs [repo-root]

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const versionAt = (rev) => JSON.parse(git('show', `${rev}:manifest.json`)).version;

try {
  git('rev-parse', '--git-dir');
} catch {
  console.log('✓ doc-stamps: skipped, not a git checkout (stamps are compared against history)');
  process.exit(0);
}

const current = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')).version;
// One line, so an edit that only re-stamps is easy to tell from a real one.
const STAMP = /^Checked against (\d+\.\d+\.\d+)\. Covers (.+)\.$/m;
const md = (dir) => fs.existsSync(path.join(root, dir))
  ? fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith('.md')).map((f) => `${dir}/${f}`)
  : [];
const required = md('features').filter((f) => f !== 'features/README.md');
const docs = [...required, 'README.md', ...md('docs')];

// The first commit at each version: a doc stamped X is checked against the code from there on.
let firstCommit;
const commitOf = (version) => {
  if (!firstCommit) {
    firstCommit = new Map();
    for (const commit of git('log', '--reverse', '--format=%H', '--', 'manifest.json').split('\n')) {
      try {
        const v = versionAt(commit);
        if (!firstCommit.has(v)) firstCommit.set(v, commit);
      } catch {} // a commit where manifest.json didn't parse has no version to anchor to
    }
  }
  return firstCommit.get(version);
};

const failures = [];
const restamp = `Read it against the code, fix what's no longer true, and set its stamp to ${current}.`;
for (const doc of docs) {
  const stamp = fs.readFileSync(path.join(root, doc), 'utf8').match(STAMP);
  if (!stamp) {
    if (required.includes(doc)) {
      failures.push(`${doc} has no stamp. Read it against the code, then add under its title: ` +
        `"Checked against ${current}. Covers \`path/\`, \`file.js\`." naming the code it describes.`);
    }
    continue;
  }
  const [, version, coversText] = stamp;
  const covers = [...coversText.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  if (!covers.length) {
    failures.push(`${doc}'s stamp covers nothing. List the code it describes in backticks, like Covers \`popup/\`.`);
    continue;
  }
  const missing = covers.filter((p) => !fs.existsSync(path.join(root, p)));
  if (missing.length) {
    failures.push(`${doc} covers ${missing.map((p) => `\`${p}\``).join(', ')}, which doesn't exist. ` +
      'Point the stamp at the code the doc describes now.');
    continue;
  }
  if (version === current) continue;
  const since = commitOf(version);
  if (!since) {
    failures.push(`${doc} is stamped ${version}, a version manifest.json has never had. ` +
      `Use the version it was read against: ${current} if you read it now.`);
    continue;
  }
  // A doc whose only edit is a new stamp hasn't changed, so re-stamping a feature file doesn't
  // make the README due again. (git diff -I can't do this: its '^$' matches every line.)
  const stampOnly = (f) => f.endsWith('.md') && git('diff', '--unified=0', since, '--', f).split('\n')
    .filter((l) => /^[-+]/.test(l) && !/^(---|\+\+\+) /.test(l))
    .every((l) => STAMP.test(l.slice(1)) || !l.slice(1).trim());
  const changed = git('diff', '--name-only', since, '--', ...covers)
    .split('\n').filter((f) => f && f !== doc && !stampOnly(f));
  if (changed.length) {
    const where = changed.slice(0, 3).map((f) => {
      let commit;
      try {
        git('diff', '--quiet', 'HEAD', '--', f);
        commit = git('log', '-1', '--format=%h', `${since}..`, '--', f);
      } catch {} // --quiet exits 1 when the file has uncommitted changes
      return `${f} (${commit || 'uncommitted'})`;
    }).join(', ') + (changed.length > 3 ? ` and ${changed.length - 3} more` : '');
    failures.push(`${doc} is checked against ${version}, but ${where} changed since. ${restamp}`);
  }
}

if (failures.length) {
  for (const f of failures) console.error(`✗ doc-stamps: ${f}`);
  process.exit(1);
}
const stamped = docs.filter((d) => STAMP.test(fs.readFileSync(path.join(root, d), 'utf8')));
console.log(`✓ doc-stamps: ${stamped.length} docs are stamped and none covers code changed since`);
