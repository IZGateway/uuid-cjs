'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const uuid = require('../index.js');

const { NIL, MAX, validate, parse, stringify, version, v1, v3, v4, v5, v6, v7 } = uuid;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DNS_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// ── 4.12 CJS Consumer loads ────────────────────────────────────────────────────
describe('4.12 CJS consumer loads all exports', () => {
  it('exposes all expected exports', () => {
    const expected = ['NIL', 'MAX', 'validate', 'parse', 'stringify', 'version', 'v1', 'v3', 'v4', 'v5', 'v6', 'v7'];
    for (const name of expected) {
      assert.ok(name in uuid, `missing export: ${name}`);
    }
  });
});

// ── 4.3 validate ──────────────────────────────────────────────────────────────
describe('4.3 validate', () => {
  it('accepts a valid v4 UUID', () => assert.ok(validate('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')));
  it('accepts NIL UUID', () => assert.ok(validate(NIL)));
  it('accepts MAX UUID', () => assert.ok(validate(MAX)));
  it('rejects a non-UUID string', () => assert.ok(!validate('not-a-uuid')));
  it('rejects a number', () => assert.ok(!validate(42)));
  it('rejects null', () => assert.ok(!validate(null)));
  it('rejects undefined', () => assert.ok(!validate(undefined)));
  it('rejects an object', () => assert.ok(!validate({})));
});

// ── 4.4 parse / stringify ─────────────────────────────────────────────────────
describe('4.4 parse and stringify', () => {
  it('round-trips a UUID', () => {
    const original = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    assert.equal(stringify(parse(original)), original);
  });

  it('parse returns a Uint8Array of 16 bytes', () => {
    const bytes = parse(NIL);
    assert.ok(bytes instanceof Uint8Array);
    assert.equal(bytes.length, 16);
    assert.ok(bytes.every(b => b === 0));
  });

  it('parse throws TypeError on invalid input', () => {
    assert.throws(() => parse('not-a-uuid'), TypeError);
  });

  it('stringify throws TypeError on too-short array', () => {
    assert.throws(() => stringify(new Uint8Array(5)), TypeError);
  });

  it('stringify respects offset', () => {
    const original = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const padded = new Uint8Array(20);
    padded.set(parse(original), 4);
    assert.equal(stringify(padded, 4), original);
  });
});

// ── 4.5 version ───────────────────────────────────────────────────────────────
describe('4.5 version', () => {
  it('returns 4 for a v4 UUID', () => assert.equal(version('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'), 4));
  it('returns 1 for NIL (version nibble 0)', () => assert.equal(version(NIL), 0));
  it('throws TypeError on invalid input', () => {
    assert.throws(() => version('not-a-uuid'), TypeError);
  });
  it('returns correct version for generated v1', () => assert.equal(version(String(v1())), 1));
  it('returns correct version for generated v3', () => assert.equal(version(String(v3('hello', DNS_NS))), 3));
  it('returns correct version for generated v4', () => assert.equal(version(String(v4())), 4));
  it('returns correct version for generated v5', () => assert.equal(version(String(v5('hello', DNS_NS))), 5));
  it('returns correct version for generated v6', () => assert.equal(version(String(v6())), 6));
  it('returns correct version for generated v7', () => assert.equal(version(String(v7())), 7));
});

// ── 4.6 v4 ───────────────────────────────────────────────────────────────────
describe('4.6 v4', () => {
  it('returns a valid UUID string', () => assert.match(v4(), UUID_REGEX));
  it('two calls produce different values', () => assert.notEqual(v4(), v4()));
  it('buffer write mode fills buf and returns it', () => {
    const buf = new Uint8Array(16);
    const result = v4(undefined, buf);
    assert.strictEqual(result, buf);
    assert.match(stringify(buf), UUID_REGEX);
  });
});

// ── 4.7 v3 ───────────────────────────────────────────────────────────────────
describe('4.7 v3', () => {
  it('produces the known output vector for (hello, DNS namespace)', () => {
    assert.equal(v3('hello', DNS_NS), '0bacede4-4014-3f9d-b720-173f68a1c933');
  });
});

// ── 4.8 v5 ───────────────────────────────────────────────────────────────────
describe('4.8 v5', () => {
  it('produces the known output vector for (hello, DNS namespace)', () => {
    assert.equal(v5('hello', DNS_NS), '9342d47a-1bab-5709-9869-c840b2eac501');
  });
});

// ── 4.9 v1 ───────────────────────────────────────────────────────────────────
describe('4.9 v1', () => {
  it('returns a valid UUID string', () => assert.match(String(v1()), UUID_REGEX));
  it('version nibble is 1', () => assert.equal(version(String(v1())), 1));
  it('successive calls produce different values', () => assert.notEqual(String(v1()), String(v1())));
});

// ── 4.10 v6 ──────────────────────────────────────────────────────────────────
describe('4.10 v6', () => {
  it('returns a valid UUID string', () => assert.match(String(v6()), UUID_REGEX));
  it('version nibble is 6', () => assert.equal(version(String(v6())), 6));
  it('lexicographic sort equals chronological order', () => {
    const a = String(v6());
    const b = String(v6());
    assert.ok(a <= b, `expected ${a} <= ${b}`);
  });
});

// ── 4.11 v7 ──────────────────────────────────────────────────────────────────
describe('4.11 v7', () => {
  it('returns a valid UUID string', () => assert.match(String(v7()), UUID_REGEX));
  it('version nibble is 7', () => assert.equal(version(String(v7())), 7));
  it('lexicographic sort equals chronological order', () => {
    const a = String(v7());
    const b = String(v7());
    assert.ok(a <= b, `expected ${a} <= ${b}`);
  });
});
