/**
 * tests/data.test.js
 * Static data integrity — ensures the game data is self-consistent
 * before any game logic runs.
 */

const TOTAL_SEATS        = 338;
const TOTAL_PROVINCES    = 13;
const TOTAL_ELECTIONS    = 25;
const MAJORITY_THRESHOLD = 170;
const KNOWN_PARTY_IDS    = ['LPC', 'CPC', 'NDP', 'BQ'];
const KNOWN_REGION_KEYS  = ['west', 'prairies', 'central', 'atlantic', 'north', 'all'];

// ── PARTIES ──────────────────────────────────────────────────────────────────

describe('PARTIES', () => {
  test('contains exactly 4 parties', () => {
    expect(Object.keys(PARTIES)).toHaveLength(4);
  });

  test.each(KNOWN_PARTY_IDS)('%s has all required fields', (id) => {
    const p = PARTIES[id];
    expect(p).toBeDefined();
    expect(typeof p.id).toBe('string');
    expect(typeof p.name).toBe('string');
    expect(typeof p.shortName).toBe('string');
    expect(typeof p.color).toBe('string');
    expect(typeof p.colorLight).toBe('string');
    expect(typeof p.colorDark).toBe('string');
  });

  test.each(KNOWN_PARTY_IDS)('%s color is a valid CSS hex', (id) => {
    expect(PARTIES[id].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(PARTIES[id].colorLight).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(PARTIES[id].colorDark).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test('BQ is marked as Quebec-only', () => {
    expect(PARTIES.BQ.quebecOnly).toBe(true);
  });

  test('BQ has an establishedYear', () => {
    expect(typeof PARTIES.BQ.establishedYear).toBe('number');
    expect(PARTIES.BQ.establishedYear).toBeGreaterThan(1950);
  });

  test('party ids match their own id field', () => {
    for (const [key, p] of Object.entries(PARTIES)) {
      expect(p.id).toBe(key);
    }
  });
});

// ── PROVINCES ─────────────────────────────────────────────────────────────────

describe('PROVINCES', () => {
  test(`contains exactly ${TOTAL_PROVINCES} provinces/territories`, () => {
    expect(Object.keys(PROVINCES)).toHaveLength(TOTAL_PROVINCES);
  });

  test(`seat totals sum to ${TOTAL_SEATS}`, () => {
    const total = Object.values(PROVINCES).reduce((s, p) => s + p.seats, 0);
    expect(total).toBe(TOTAL_SEATS);
  });

  test(`majority threshold is seats/2 + 1 = ${MAJORITY_THRESHOLD}`, () => {
    expect(Math.floor(TOTAL_SEATS / 2) + 1).toBe(MAJORITY_THRESHOLD);
  });

  test.each(Object.keys(PROVINCES || {}))('%s has all required fields', (code) => {
    const p = PROVINCES[code];
    expect(typeof p.name).toBe('string');
    expect(typeof p.abbr).toBe('string');
    expect(p.abbr).toBe(code);
    expect(typeof p.region).toBe('string');
    expect(typeof p.seats).toBe('number');
    expect(p.seats).toBeGreaterThanOrEqual(1);
    expect(typeof p.tile).toBe('object');
    expect(typeof p.tile.x).toBe('number');
    expect(typeof p.tile.y).toBe('number');
    expect(typeof p.tile.w).toBe('number');
    expect(typeof p.tile.h).toBe('number');
  });

  test('tile dimensions are positive', () => {
    for (const [code, p] of Object.entries(PROVINCES)) {
      expect(p.tile.w).toBeGreaterThan(0);
      expect(p.tile.h).toBeGreaterThan(0);
    }
  });

  test('all tile x+w values fit within 905 viewBox width', () => {
    for (const [code, p] of Object.entries(PROVINCES)) {
      expect(p.tile.x + p.tile.w).toBeLessThanOrEqual(905);
    }
  });

  test('all tile y+h values fit within 295 viewBox height', () => {
    for (const [code, p] of Object.entries(PROVINCES)) {
      expect(p.tile.y + p.tile.h).toBeLessThanOrEqual(295);
    }
  });

  test('every province region exists in REGIONS', () => {
    for (const p of Object.values(PROVINCES)) {
      expect(REGIONS[p.region]).toBeDefined();
    }
  });
});

// ── REGIONS ────────────────────────────────────────────────────────────────────

describe('REGIONS', () => {
  test('has all expected keys', () => {
    for (const key of KNOWN_REGION_KEYS) {
      expect(REGIONS[key]).toBeDefined();
    }
  });

  test('"all" region contains every province code', () => {
    const all = new Set(REGIONS.all);
    for (const code of Object.keys(PROVINCES)) {
      expect(all.has(code)).toBe(true);
    }
  });

  test('"all" region has no duplicate codes', () => {
    const codes = REGIONS.all;
    expect(new Set(codes).size).toBe(codes.length);
  });

  test('every code in non-all regions is a valid province', () => {
    for (const [region, codes] of Object.entries(REGIONS)) {
      if (region === 'all') continue;
      for (const code of codes) {
        expect(PROVINCES[code]).toBeDefined();
      }
    }
  });

  test('every province belongs to at least one named region (excluding "all")', () => {
    const named = Object.entries(REGIONS)
      .filter(([k]) => k !== 'all')
      .flatMap(([, codes]) => codes);
    const namedSet = new Set(named);
    for (const code of Object.keys(PROVINCES)) {
      expect(namedSet.has(code)).toBe(true);
    }
  });
});

// ── STARTING_SUPPORT ──────────────────────────────────────────────────────────

describe('STARTING_SUPPORT', () => {
  test('covers every province', () => {
    for (const code of Object.keys(PROVINCES)) {
      expect(STARTING_SUPPORT[code]).toBeDefined();
    }
  });

  test('has no extra provinces', () => {
    for (const code of Object.keys(STARTING_SUPPORT)) {
      expect(PROVINCES[code]).toBeDefined();
    }
  });

  test.each(Object.keys(PROVINCES || {}))('%s support values are non-negative numbers', (code) => {
    const s = STARTING_SUPPORT[code];
    for (const [party, val] of Object.entries(s)) {
      expect(typeof val).toBe('number');
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });

  test('BQ support is 0 in every non-QC province', () => {
    for (const [code, s] of Object.entries(STARTING_SUPPORT)) {
      if (code !== 'QC') {
        expect(s.BQ).toBe(0);
      }
    }
  });

  test('LPC, CPC, and NDP support keys exist for every province', () => {
    for (const [code, s] of Object.entries(STARTING_SUPPORT)) {
      expect(typeof s.LPC).toBe('number');
      expect(typeof s.CPC).toBe('number');
      expect(typeof s.NDP).toBe('number');
    }
  });

  test('no individual support value exceeds 100', () => {
    for (const [code, s] of Object.entries(STARTING_SUPPORT)) {
      for (const val of Object.values(s)) {
        expect(val).toBeLessThanOrEqual(100);
      }
    }
  });
});

// ── ELECTION_SCHEDULE ─────────────────────────────────────────────────────────

describe('ELECTION_SCHEDULE', () => {
  test(`contains exactly ${TOTAL_ELECTIONS} elections`, () => {
    expect(ELECTION_SCHEDULE).toHaveLength(TOTAL_ELECTIONS);
  });

  test('starts in 1953', () => {
    expect(ELECTION_SCHEDULE[0]).toBe(1953);
  });

  test('ends in 2029', () => {
    expect(ELECTION_SCHEDULE[TOTAL_ELECTIONS - 1]).toBe(2029);
  });

  test('is strictly ascending (no duplicate years)', () => {
    for (let i = 1; i < ELECTION_SCHEDULE.length; i++) {
      expect(ELECTION_SCHEDULE[i]).toBeGreaterThan(ELECTION_SCHEDULE[i - 1]);
    }
  });

  test('all years are integers between 1950 and 2030', () => {
    for (const year of ELECTION_SCHEDULE) {
      expect(Number.isInteger(year)).toBe(true);
      expect(year).toBeGreaterThanOrEqual(1950);
      expect(year).toBeLessThanOrEqual(2030);
    }
  });
});

// ── EVENTS ────────────────────────────────────────────────────────────────────

describe('EVENTS', () => {
  test('there are events defined', () => {
    expect(EVENTS.length).toBeGreaterThan(0);
  });

  test.each(
    (EVENTS || []).map((e, i) => [e.id || `event[${i}]`, e])
  )('%s has required fields', (id, event) => {
    expect(typeof event.id).toBe('string');
    expect(typeof event.title).toBe('string');
    expect(typeof event.description).toBe('string');
    expect(typeof event.minYear).toBe('number');
    expect(typeof event.maxYear).toBe('number');
    expect(Array.isArray(event.effects)).toBe(true);
    expect(event.effects.length).toBeGreaterThan(0);
  });

  test('every event has minYear <= maxYear', () => {
    for (const e of EVENTS) {
      expect(e.minYear).toBeLessThanOrEqual(e.maxYear);
    }
  });

  test('every event year range overlaps the election schedule', () => {
    const first = ELECTION_SCHEDULE[0];
    const last  = ELECTION_SCHEDULE[ELECTION_SCHEDULE.length - 1];
    for (const e of EVENTS) {
      const overlaps = e.maxYear >= first && e.minYear <= last;
      expect(overlaps).toBe(true);
    }
  });

  test('all event ids are unique', () => {
    const ids = EVENTS.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('all effects have a numeric delta', () => {
    for (const event of EVENTS) {
      for (const eff of event.effects) {
        expect(typeof eff.delta).toBe('number');
        expect(isFinite(eff.delta)).toBe(true);
      }
    }
  });

  test('all effect party refs are valid', () => {
    const validRefs = new Set([...Object.keys(PARTIES), 'SELF', 'LEADER']);
    for (const event of EVENTS) {
      for (const eff of event.effects) {
        expect(validRefs.has(eff.party)).toBe(true);
      }
    }
  });

  test('all effect province refs are valid province codes', () => {
    for (const event of EVENTS) {
      for (const eff of event.effects) {
        if (eff.province && eff.province !== 'CHOICE') {
          expect(PROVINCES[eff.province]).toBeDefined();
        }
      }
    }
  });

  test('all effect region refs are valid region keys', () => {
    const validRegions = new Set(Object.keys(REGIONS));
    for (const event of EVENTS) {
      for (const eff of event.effects) {
        if (eff.region) {
          expect(validRegions.has(eff.region)).toBe(true);
        }
      }
    }
  });

  test('every effect targets either a province OR a region, not both', () => {
    for (const event of EVENTS) {
      for (const eff of event.effects) {
        const hasProvince = Boolean(eff.province);
        const hasRegion   = Boolean(eff.region);
        // Exactly one of province/region must be set
        expect(hasProvince !== hasRegion).toBe(true);
      }
    }
  });
});

// ── POLICY_CARDS ──────────────────────────────────────────────────────────────

describe('POLICY_CARDS', () => {
  test('there are policy cards defined', () => {
    expect(POLICY_CARDS.length).toBeGreaterThan(0);
  });

  test('all ids are unique', () => {
    const ids = POLICY_CARDS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test.each(
    (POLICY_CARDS || []).map(c => [c.id, c])
  )('%s has required fields', (id, card) => {
    expect(typeof card.id).toBe('string');
    expect(typeof card.name).toBe('string');
    expect(typeof card.description).toBe('string');
    expect(typeof card.cost).toBe('number');
    expect(card.cost).toBeGreaterThan(0);
    expect(Array.isArray(card.effects)).toBe(true);
  });

  test('party field is "all" or a known party id', () => {
    const valid = new Set([...Object.keys(PARTIES), 'all']);
    for (const card of POLICY_CARDS) {
      expect(valid.has(card.party)).toBe(true);
    }
  });

  test('all effect party refs are valid', () => {
    const valid = new Set([...Object.keys(PARTIES), 'SELF', 'LEADER']);
    for (const card of POLICY_CARDS) {
      for (const eff of card.effects) {
        expect(valid.has(eff.party)).toBe(true);
      }
    }
  });
});
