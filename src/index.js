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

/** Return 16 cryptographically random bytes. */
function defaultRng() {
  return crypto.randomBytes(16);
}

/**
 * Resolve random bytes from options or the default RNG.
 * Always returns a fresh Uint8Array copy so callers can mutate it safely.
 * @param {object|undefined} options
 * @returns {Uint8Array}
 */
function resolveRnds(options) {
  const src = (options && (options.random ?? options.rng?.())) || defaultRng();
  return new Uint8Array(src);
}

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
 *
 * When called with no arguments, delegates to `crypto.randomUUID()` for
 * maximum performance. When `options.random` or `options.rng` is provided,
 * those bytes are used instead — enabling deterministic output in tests.
 *
 * @param {object} [options]
 * @param {Uint8Array} [options.random] 16 pre-generated random bytes
 * @param {function} [options.rng] function returning 16 random bytes
 * @param {Uint8Array} [buf] optional output buffer
 * @param {number} [offset=0]
 * @returns {string|Uint8Array}
 */
function v4(options, buf, offset) {
  if (!buf && !options) {
    return crypto.randomUUID();
  }
  const rnds = resolveRnds(options);
  rnds[6] = (rnds[6] & 0x0f) | 0x40;  // version 4
  rnds[8] = (rnds[8] & 0x3f) | 0x80;  // variant 10
  return output(rnds.subarray(0, 16), buf, offset);
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

const _v1State = {
  msecs: -Infinity,
  nsecs: 0,
  clockseq: undefined,
  node: undefined,
};

/**
 * Update the shared v1/v6 state for a new timestamp.
 * @param {object} state
 * @param {number} now  Date.now() in ms
 * @param {Uint8Array} rnds  16 random bytes used to seed clockseq/node on reset
 */
function updateV1State(state, now, rnds) {
  if (now === state.msecs) {
    state.nsecs++;
    if (state.nsecs >= 10000) {
      state.node = undefined;
      state.nsecs = 0;
    }
  } else if (now > state.msecs) {
    state.nsecs = 0;
  } else {
    // Clock went backward — reset node to force a new clock sequence
    state.node = undefined;
  }

  if (!state.node) {
    state.node = Array.from(rnds.slice(10, 16));
    state.node[0] |= 0x01;  // multicast bit — marks as randomly generated
    state.clockseq = ((rnds[8] << 8) | rnds[9]) & 0x3fff;
  }

  state.msecs = now;
}

/**
 * Build the raw 16-byte layout for a v1 UUID from resolved field values.
 * Uses the same integer arithmetic as the reference uuid@14 implementation.
 * @param {number} msecs  ms since Unix epoch
 * @param {number} nsecs  100-ns counter within current ms (0–9999)
 * @param {number} clockseq
 * @param {number[]} node  6-byte node ID array
 * @returns {Uint8Array}
 */
function buildV1Bytes(msecs, nsecs, clockseq, node) {
  // Add Gregorian epoch offset (ms between 1582-10-15 and 1970-01-01)
  const msUuid = msecs + 12219292800000;
  // Lower 32 bits of the 60-bit 100-ns timestamp (includes nsecs sub-ms counter)
  const tl = ((msUuid & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  // Upper 28 bits of the 60-bit timestamp
  const tmh = ((msUuid / 0x100000000) * 10000) & 0xfffffff;

  const bytes = new Uint8Array(16);
  bytes[0] = (tl >>> 24) & 0xff;
  bytes[1] = (tl >>> 16) & 0xff;
  bytes[2] = (tl >>> 8) & 0xff;
  bytes[3] = tl & 0xff;
  bytes[4] = (tmh >>> 8) & 0xff;
  bytes[5] = tmh & 0xff;
  bytes[6] = ((tmh >>> 24) & 0x0f) | 0x10;  // version 1
  bytes[7] = (tmh >>> 16) & 0xff;
  bytes[8] = (clockseq >>> 8) | 0x80;        // variant 10
  bytes[9] = clockseq & 0xff;
  for (let i = 0; i < 6; i++) bytes[10 + i] = node[i];
  return bytes;
}

// ── v1 ─────────────────────────────────────────────────────────────────────────

/**
 * Generate a time-based (version 1) UUID.
 *
 * When called with no options, uses shared process-level state for
 * monotonicity and a random node ID (multicast bit set). Options allow
 * full deterministic control for testing or special applications.
 *
 * @param {object} [options]
 * @param {Uint8Array} [options.random] 16 random bytes (used for node/clockseq defaults)
 * @param {function} [options.rng] function returning 16 random bytes
 * @param {number} [options.msecs] timestamp override in ms since Unix epoch
 * @param {number} [options.nsecs] 100-ns sub-millisecond counter override (0–9999)
 * @param {number} [options.clockseq] clock sequence override
 * @param {number[]} [options.node] 6-byte node ID array override
 * @param {Uint8Array} [buf]
 * @param {number} [offset=0]
 * @returns {string|Uint8Array}
 */
function v1(options, buf, offset) {
  const rnds = resolveRnds(options);
  let msecs, nsecs, clockseq, node;

  if (options) {
    msecs    = options.msecs    !== undefined ? options.msecs    : Date.now();
    nsecs    = options.nsecs    !== undefined ? options.nsecs    : 0;
    clockseq = options.clockseq !== undefined ? options.clockseq : ((rnds[8] << 8) | rnds[9]) & 0x3fff;
    node     = options.node     || (function () {
      const n = Array.from(rnds.slice(10, 16));
      n[0] |= 0x01;
      return n;
    }());
  } else {
    const now = Date.now();
    updateV1State(_v1State, now, rnds);
    msecs    = _v1State.msecs;
    nsecs    = _v1State.nsecs;
    clockseq = _v1State.clockseq;
    node     = _v1State.node;
  }

  return output(buildV1Bytes(msecs, nsecs, clockseq, node), buf, offset);
}

// ── v6 ─────────────────────────────────────────────────────────────────────────

/**
 * Rearrange v1 bytes into v6 byte order (most-significant time bits first).
 * This is the same bit-shuffle used by uuid@14's v1ToV6 transform.
 * @param {Uint8Array} v1b
 * @returns {Uint8Array}
 */
function v1ToV6(v1b) {
  return Uint8Array.of(
    ((v1b[6] & 0x0f) << 4) | ((v1b[7] >> 4) & 0x0f),
    ((v1b[7] & 0x0f) << 4) | ((v1b[4] & 0xf0) >> 4),
    ((v1b[4] & 0x0f) << 4) | ((v1b[5] & 0xf0) >> 4),
    ((v1b[5] & 0x0f) << 4) | ((v1b[0] & 0xf0) >> 4),
    ((v1b[0] & 0x0f) << 4) | ((v1b[1] & 0xf0) >> 4),
    ((v1b[1] & 0x0f) << 4) | ((v1b[2] & 0xf0) >> 4),
    0x60 | (v1b[2] & 0x0f),  // version 6
    v1b[3],
    v1b[8], v1b[9],           // clock_seq (variant already set)
    v1b[10], v1b[11], v1b[12], v1b[13], v1b[14], v1b[15],  // node
  );
}

/**
 * Generate a reordered time-based (version 6) UUID.
 * Identical to v1 except time bits are placed most-significant-first so that
 * lexicographic sort order equals chronological order.
 *
 * Accepts the same options as v1.
 *
 * @param {object} [options] — same fields as v1 options
 * @param {Uint8Array} [buf]
 * @param {number} [offset=0]
 * @returns {string|Uint8Array}
 */
function v6(options, buf, offset) {
  const rnds = resolveRnds(options);
  let msecs, nsecs, clockseq, node;

  if (options) {
    msecs    = options.msecs    !== undefined ? options.msecs    : Date.now();
    nsecs    = options.nsecs    !== undefined ? options.nsecs    : 0;
    clockseq = options.clockseq !== undefined ? options.clockseq : ((rnds[8] << 8) | rnds[9]) & 0x3fff;
    node     = options.node     || (function () {
      const n = Array.from(rnds.slice(10, 16));
      n[0] |= 0x01;
      return n;
    }());
  } else {
    const now = Date.now();
    updateV1State(_v1State, now, rnds);
    msecs    = _v1State.msecs;
    nsecs    = _v1State.nsecs;
    clockseq = _v1State.clockseq;
    node     = _v1State.node;
  }

  return output(v1ToV6(buildV1Bytes(msecs, nsecs, clockseq, node)), buf, offset);
}

// ── v7 ─────────────────────────────────────────────────────────────────────────

const _v7State = { msecs: -Infinity, seq: 0 };

/**
 * Update the shared v7 monotonic sequence state.
 * @param {object} state
 * @param {number} now   Date.now() in ms
 * @param {Uint8Array} rnds  16 random bytes used to seed seq on a new ms
 */
function updateV7State(state, now, rnds) {
  if (now > state.msecs) {
    // New millisecond — seed sequence from random bytes
    state.seq = ((rnds[6] << 23) | (rnds[7] << 16) | (rnds[8] << 8) | rnds[9]) >>> 0;
    state.msecs = now;
  } else {
    // Same or retrograde ms — increment and guard against overflow
    state.seq = (state.seq + 1) | 0;
    if (state.seq === 0) state.msecs++;
  }
}

/**
 * Generate a Unix timestamp + random (version 7) UUID.
 *
 * @param {object} [options]
 * @param {Uint8Array} [options.random] 16 random bytes
 * @param {function} [options.rng] function returning 16 random bytes
 * @param {number} [options.msecs] timestamp override in ms since Unix epoch
 * @param {number} [options.seq] 32-bit sub-ms monotonic sequence override
 * @param {Uint8Array} [buf]
 * @param {number} [offset=0]
 * @returns {string|Uint8Array}
 */
function v7(options, buf, offset) {
  const rnds = resolveRnds(options);
  let msecs, seq;

  if (options) {
    msecs = options.msecs !== undefined ? options.msecs : Date.now();
    seq   = options.seq   !== undefined ? options.seq
      : ((rnds[6] << 23) | (rnds[7] << 16) | (rnds[8] << 8) | rnds[9]) >>> 0;
  } else {
    const now = Date.now();
    updateV7State(_v7State, now, rnds);
    msecs = _v7State.msecs;
    seq   = _v7State.seq;
  }

  const bytes = new Uint8Array(16);
  // Bytes 0–5: 48-bit Unix timestamp in ms (big-endian)
  bytes[0] = (msecs / 0x10000000000) & 0xff;
  bytes[1] = (msecs / 0x100000000) & 0xff;
  bytes[2] = (msecs / 0x1000000) & 0xff;
  bytes[3] = (msecs / 0x10000) & 0xff;
  bytes[4] = (msecs / 0x100) & 0xff;
  bytes[5] = msecs & 0xff;
  // Byte 6: version 7 + top 4 bits of seq
  bytes[6] = 0x70 | ((seq >>> 28) & 0x0f);
  bytes[7] = (seq >>> 20) & 0xff;
  // Byte 8: variant 10 + next 6 bits of seq
  bytes[8] = 0x80 | ((seq >>> 14) & 0x3f);
  bytes[9] = (seq >>> 6) & 0xff;
  // Byte 10: low 6 bits of seq + 2 random bits; bytes 11–15: random
  bytes[10] = ((seq << 2) & 0xff) | (rnds[10] & 0x03);
  bytes[11] = rnds[11];
  bytes[12] = rnds[12];
  bytes[13] = rnds[13];
  bytes[14] = rnds[14];
  bytes[15] = rnds[15];

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
