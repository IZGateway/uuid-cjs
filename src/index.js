'use strict';

const crypto = require('crypto');

// ── Constants ──────────────────────────────────────────────────────────────────

const NIL = '00000000-0000-0000-0000-000000000000';
const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

// ── Helpers ────────────────────────────────────────────────────────────────────

const HEX = [];
for (let i = 0; i < 256; i++) {
  HEX[i] = (i + 0x100).toString(16).slice(1);
}

const REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Convert a 16-byte Uint8Array to a UUID string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToString(bytes) {
  return (
    HEX[bytes[0]] + HEX[bytes[1]] + HEX[bytes[2]] + HEX[bytes[3]] + '-' +
    HEX[bytes[4]] + HEX[bytes[5]] + '-' +
    HEX[bytes[6]] + HEX[bytes[7]] + '-' +
    HEX[bytes[8]] + HEX[bytes[9]] + '-' +
    HEX[bytes[10]] + HEX[bytes[11]] + HEX[bytes[12]] +
    HEX[bytes[13]] + HEX[bytes[14]] + HEX[bytes[15]]
  );
}

/**
 * Write a UUID into a buffer at offset, or return the UUID string.
 * @param {Uint8Array} bytes 16-byte UUID bytes
 * @param {Uint8Array|null} buf optional output buffer
 * @param {number} offset byte offset into buf
 * @returns {string|Uint8Array}
 */
function output(bytes, buf, offset) {
  if (buf) {
    buf.set(bytes, offset || 0);
    return buf;
  }
  return bytesToString(bytes);
}

// ── validate ───────────────────────────────────────────────────────────────────

/**
 * Return true if str is a valid UUID string (any version), false otherwise.
 * Never throws — returns false for non-string input.
 * @param {any} str
 * @returns {boolean}
 */
function validate(str) {
  return typeof str === 'string' && REGEX.test(str);
}

// ── parse ──────────────────────────────────────────────────────────────────────

/**
 * Parse a UUID string into a Uint8Array of 16 bytes.
 * @param {string} uuid
 * @returns {Uint8Array}
 * @throws {TypeError} if uuid is not a valid UUID string
 */
function parse(uuid) {
  if (!validate(uuid)) {
    throw new TypeError('Invalid UUID');
  }
  const hex = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// ── stringify ──────────────────────────────────────────────────────────────────

/**
 * Convert a 16-byte array (or array-like) to a UUID string.
 * @param {ArrayLike<number>} arr
 * @param {number} [offset=0]
 * @returns {string}
 * @throws {TypeError} if arr does not have at least offset+16 bytes
 */
function stringify(arr, offset) {
  offset = offset || 0;
  if (!arr || arr.length < offset + 16) {
    throw new TypeError('Invalid UUID bytes');
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = arr[offset + i];
  }
  return bytesToString(bytes);
}

// ── version ────────────────────────────────────────────────────────────────────

/**
 * Return the version number (1–7) of a UUID string.
 * @param {string} uuid
 * @returns {number}
 * @throws {TypeError} if uuid is not a valid UUID string
 */
function version(uuid) {
  if (!validate(uuid)) {
    throw new TypeError('Invalid UUID');
  }
  return parseInt(uuid[14], 16);
}

// ── v4 ─────────────────────────────────────────────────────────────────────────

/**
 * Generate a random (version 4) UUID.
 * @param {object} [options]
 * @param {Uint8Array} [buf] optional output buffer
 * @param {number} [offset=0]
 * @returns {string|Uint8Array}
 */
function v4(options, buf, offset) {
  const str = crypto.randomUUID();
  if (!buf) {
    return str;
  }
  return output(parse(str), buf, offset);
}

// ── v3 / v5 shared helper ─────────────────────────────────────────────────────

/**
 * Compute a name-based UUID using the given hash algorithm.
 * @param {string} algorithm 'md5' or 'sha1'
 * @param {number} ver version nibble (3 or 5)
 * @param {string|Uint8Array} name
 * @param {string|Uint8Array} namespace UUID string or 16-byte array
 * @param {Uint8Array} [buf]
 * @param {number} [offset]
 * @returns {string|Uint8Array}
 */
function namespacedHash(algorithm, ver, name, namespace, buf, offset) {
  const nsBytes = typeof namespace === 'string' ? parse(namespace) : namespace;
  const nameBytes = typeof name === 'string'
    ? Buffer.from(name, 'utf8')
    : Buffer.from(name);

  const hash = crypto.createHash(algorithm);
  hash.update(Buffer.from(nsBytes));
  hash.update(nameBytes);
  const digest = hash.digest();

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = digest[i];
  }

  // Set version nibble
  bytes[6] = (bytes[6] & 0x0f) | (ver << 4);
  // Set variant bits (10xx)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return output(bytes, buf, offset);
}

// ── v3 ─────────────────────────────────────────────────────────────────────────

/**
 * Generate a name-based (MD5, version 3) UUID.
 * @param {string|Uint8Array} name
 * @param {string|Uint8Array} namespace
 * @param {Uint8Array} [buf]
 * @param {number} [offset]
 * @returns {string|Uint8Array}
 */
function v3(name, namespace, buf, offset) {
  return namespacedHash('md5', 3, name, namespace, buf, offset);
}

// ── v5 ─────────────────────────────────────────────────────────────────────────

/**
 * Generate a name-based (SHA-1, version 5) UUID.
 * @param {string|Uint8Array} name
 * @param {string|Uint8Array} namespace
 * @param {Uint8Array} [buf]
 * @param {number} [offset]
 * @returns {string|Uint8Array}
 */
function v5(name, namespace, buf, offset) {
  return namespacedHash('sha1', 5, name, namespace, buf, offset);
}

// ── v1 / v6 shared state ──────────────────────────────────────────────────────

// RFC 4122 epoch offset: difference between 1582-10-15 00:00:00 UTC and Unix epoch in 100-ns units
const GREGORIAN_OFFSET_MS = 12219292800000n;

let _v1clockSeq = crypto.randomBytes(2).readUInt16LE(0) & 0x3fff;
let _v1nodeId = crypto.randomBytes(6);
// Set multicast bit per RFC 4122 §4.5 for random node IDs
_v1nodeId[0] |= 0x01;

let _v1lastTime = 0n;

/**
 * Get the current v1 timestamp in 100-nanosecond intervals since UUID epoch.
 * Increments clock sequence if called within the same millisecond.
 * @returns {{ ts: bigint, clockSeq: number }}
 */
function v1Timestamp() {
  let msNow = BigInt(Date.now());
  // Convert ms since Unix epoch to 100-ns intervals since UUID epoch
  let ts = (msNow + GREGORIAN_OFFSET_MS) * 10000n;

  if (ts <= _v1lastTime) {
    _v1clockSeq = (_v1clockSeq + 1) & 0x3fff;
    ts = _v1lastTime + 1n;
  }
  _v1lastTime = ts;
  return { ts, clockSeq: _v1clockSeq };
}

// ── v1 ─────────────────────────────────────────────────────────────────────────

/**
 * Generate a time-based (version 1) UUID.
 * Uses a random node ID (multicast bit set) and monotonic clock sequence.
 * @param {object} [options]
 * @param {Uint8Array} [buf]
 * @param {number} [offset]
 * @returns {string|Uint8Array}
 */
function v1(options, buf, offset) {
  const { ts, clockSeq } = v1Timestamp();

  // v1 layout:
  // time_low (32 bits) | time_mid (16 bits) | time_hi_and_version (16 bits)
  // clock_seq_hi_and_reserved (8 bits) | clock_seq_low (8 bits) | node (48 bits)
  const tLow = Number(ts & 0xffffffffn);
  const tMid = Number((ts >> 32n) & 0xffffn);
  const tHi = Number((ts >> 48n) & 0x0fffn);

  const bytes = new Uint8Array(16);
  bytes[0] = (tLow >>> 24) & 0xff;
  bytes[1] = (tLow >>> 16) & 0xff;
  bytes[2] = (tLow >>> 8) & 0xff;
  bytes[3] = tLow & 0xff;
  bytes[4] = (tMid >>> 8) & 0xff;
  bytes[5] = tMid & 0xff;
  bytes[6] = 0x10 | (tHi >>> 8);  // version 1
  bytes[7] = tHi & 0xff;
  bytes[8] = 0x80 | ((clockSeq >>> 8) & 0x3f);  // variant 10
  bytes[9] = clockSeq & 0xff;
  for (let i = 0; i < 6; i++) {
    bytes[10 + i] = _v1nodeId[i];
  }

  return output(bytes, buf, offset);
}

// ── v6 ─────────────────────────────────────────────────────────────────────────

/**
 * Generate a reordered time-based (version 6) UUID.
 * Same as v1 but with time bits reordered for lexicographic sort = chronological order.
 * @param {object} [options]
 * @param {Uint8Array} [buf]
 * @param {number} [offset]
 * @returns {string|Uint8Array}
 */
function v6(options, buf, offset) {
  const { ts, clockSeq } = v1Timestamp();

  // v6 reorders the time fields so the most significant bits come first:
  // time_high (32 bits of upper time) | time_mid (16 bits) | time_low_and_version (16 bits)
  const tHigh = Number((ts >> 28n) & 0xffffffffn);
  const tMid = Number((ts >> 12n) & 0xffffn);
  const tLow = Number(ts & 0x0fffn);

  const bytes = new Uint8Array(16);
  bytes[0] = (tHigh >>> 24) & 0xff;
  bytes[1] = (tHigh >>> 16) & 0xff;
  bytes[2] = (tHigh >>> 8) & 0xff;
  bytes[3] = tHigh & 0xff;
  bytes[4] = (tMid >>> 8) & 0xff;
  bytes[5] = tMid & 0xff;
  bytes[6] = 0x60 | (tLow >>> 8);  // version 6
  bytes[7] = tLow & 0xff;
  bytes[8] = 0x80 | ((clockSeq >>> 8) & 0x3f);  // variant 10
  bytes[9] = clockSeq & 0xff;
  for (let i = 0; i < 6; i++) {
    bytes[10 + i] = _v1nodeId[i];
  }

  return output(bytes, buf, offset);
}

// ── v7 ─────────────────────────────────────────────────────────────────────────

/**
 * Generate a Unix timestamp + random (version 7) UUID.
 * @param {object} [options]
 * @param {Uint8Array} [buf]
 * @param {number} [offset]
 * @returns {string|Uint8Array}
 */
function v7(options, buf, offset) {
  const msNow = BigInt(Date.now());
  const rand = crypto.randomBytes(10);

  const bytes = new Uint8Array(16);
  // Bytes 0–5: 48-bit Unix timestamp in milliseconds (big-endian)
  bytes[0] = Number((msNow >> 40n) & 0xffn);
  bytes[1] = Number((msNow >> 32n) & 0xffn);
  bytes[2] = Number((msNow >> 24n) & 0xffn);
  bytes[3] = Number((msNow >> 16n) & 0xffn);
  bytes[4] = Number((msNow >> 8n) & 0xffn);
  bytes[5] = Number(msNow & 0xffn);
  // Byte 6: version 7 + 4 random bits
  bytes[6] = 0x70 | (rand[0] & 0x0f);
  // Byte 7: 8 random bits
  bytes[7] = rand[1];
  // Byte 8: variant 10 + 6 random bits
  bytes[8] = 0x80 | (rand[2] & 0x3f);
  // Bytes 9–15: 56 random bits
  for (let i = 0; i < 7; i++) {
    bytes[9 + i] = rand[3 + i];
  }

  return output(bytes, buf, offset);
}

// ── Exports ────────────────────────────────────────────────────────────────────

module.exports = {
  NIL,
  MAX,
  validate,
  parse,
  stringify,
  version,
  v1,
  v3,
  v4,
  v5,
  v6,
  v7,
};
