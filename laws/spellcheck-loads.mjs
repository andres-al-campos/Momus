// Law: the spell checker loads in the content scripts' scope and catches
// misspellings.
//
// Every saved scrape once reported 0 spelling errors across ~4,000 reviews:
// content.js injected lib/typo.js as a <script> tag, which runs in the page's
// world, so `Typo` was undefined in the content script and a stub that passes
// every word took over. This loads the manifest's content scripts in order
// into one shared scope, as the browser does, and checks real misspellings.
//
// Usage: node laws/spellcheck-loads.mjs [repo-root]

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const scripts = manifest.content_scripts[0].js;

const fail = (msg) => {
  console.error(`✗ spellcheck-loads: ${msg}`);
  process.exit(1);
};

const fakeBrowser = {
  runtime: {
    getURL: (p) => path.join(root, p),
    onMessage: { addListener: () => {} },
  },
};
const context = vm.createContext({
  console: { log: () => {}, warn: () => {}, error: () => {} },
  globalThis: undefined,
  browser: fakeBrowser,
  chrome: fakeBrowser,
  // Content scripts fetch extension files by URL; here the URL is a path.
  fetch: async (p) => ({ text: async () => fs.readFileSync(p, 'utf8') }),
  // A <script> tag would land in the page's world, not this scope: never
  // define what it loads here.
  document: {
    createElement: () => ({}),
    head: { appendChild: (el) => setTimeout(() => el.onload?.(), 0) },
    querySelector: () => null,
    querySelectorAll: () => [],
  },
  setTimeout,
  module: undefined,
});
context.globalThis = context;

for (const file of scripts) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

const count = (text) => vm.runInContext(`(async () =>
  countSpellingErrors(${JSON.stringify(text)}, await initDictionary()))()`, context);

const typos = 'The aparment managment would not recieve my rent';
const result = await count(typos);
if (result !== 3) {
  fail(`expected 3 spelling errors in "${typos}", got ${result}. ` +
    'The spell checker is not loading in the content scripts. List lib/typo.js in manifest.json ' +
    'content_scripts before content/content.js, and construct Typo directly instead of injecting a <script> tag.');
}

// Words that once counted as typos: lowercased contractions, curly
// apostrophes from phones, and staff names, which made 5★ reviews look
// twice as misspelled as 1★ ones.
const clean = "I've lived here since May and I didn’t regret it. Charlyce and Ronya at Greystar were great.";
const falsePositives = await count(clean);
if (falsePositives !== 0) {
  fail(`expected 0 spelling errors in "${clean}", got ${falsePositives}. ` +
    'countSpellingErrors in content/scraper.js must keep each word\'s case, turn curly apostrophes into straight ones, ' +
    'and skip capitalised words the dictionary doesn\'t know (names).');
}
console.log('✓ spellcheck-loads: content scripts catch 3 of 3 misspellings and pass names and contractions');
