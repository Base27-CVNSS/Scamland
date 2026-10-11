'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/vietflex-loader.js'), 'utf8');
const sdk = () => ({vietflexMap() {}, ZoomControl() {}});

function fixture({scriptReady = true, styleReady = true} = {}) {
  const scripts = [];
  const removed = [];
  const timers = new Map();
  let nextTimer = 0;
  const window = scriptReady ? {Vietflex:sdk()} : {};
  const link = {sheet:styleReady ? {} : null, removeAttribute:name => removed.push(name)};
  const document = {getElementById:() => link, createElement:() => ({}), head:{appendChild:s => scripts.push(s)}};
  const context = {window, document, Promise, Error,
    setTimeout:fn => {timers.set(++nextTimer, fn);return nextTimer;},
    clearTimeout:id => timers.delete(id)};
  vm.runInNewContext(source, context);
  return {window, link, scripts, removed, timers, ready:window.ScamlandVietflexReady};
}

test('successful CDN resources avoid duplicate SDK and stylesheet requests', async () => {
  const f = fixture();
  await f.ready;
  assert.equal(f.scripts.length, 0);
  assert.equal(f.link.href, undefined);
  assert.equal(f.timers.size, 0);
});

test('failed CDN SDK recovers only after the local SDK has initialized', async () => {
  const f = fixture({scriptReady:false});
  let ready = false;
  f.ready.then(() => {ready = true;});
  await Promise.resolve();
  assert.equal(ready, false);
  assert.equal(f.scripts[0].src, 'vendor/vietflex.js');
  f.window.Vietflex = sdk();
  f.scripts[0].onload();
  await f.ready;
  assert.equal(f.timers.size, 0);
});

test('startup waits for both local assets when both CDN resources fail', async () => {
  const f = fixture({scriptReady:false, styleReady:false});
  let ready = false;
  f.ready.then(() => {ready = true;});
  assert.equal(f.link.href, 'vendor/vietflex.css');
  assert.deepEqual(f.removed, ['integrity', 'crossorigin']);
  f.window.Vietflex = sdk();
  f.scripts[0].onload();
  await Promise.resolve();
  assert.equal(ready, false);
  f.link.onload();
  await f.ready;
  assert.equal(f.timers.size, 0);
});

test('unavailable local SDK rejects startup with a usable failure', async () => {
  const f = fixture({scriptReady:false});
  f.scripts[0].onerror();
  await assert.rejects(f.ready, /local SDK could not load/);
  assert.equal(f.timers.size, 0);
});

test('a stalled local SDK has a bounded wait', async () => {
  const f = fixture({scriptReady:false});
  [...f.timers.values()][0]();
  await assert.rejects(f.ready, /local SDK timed out/);
  assert.equal(f.timers.size, 0);
});
