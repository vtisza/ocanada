/**
 * tests/game-engine.test.js
 * Unit tests for the GameEngine class.
 */

const TOTAL_SEATS = 338;
const MAJORITY = 170;
const PLAYER_PARTIES = ['LPC', 'CPC', 'NDP'];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Create a fresh engine with Math.random seeded to a fixed value. */
function makeEngine(party = 'LPC', diff = 'normal') {
  return new GameEngine(party, diff);
}

/** Sum all values in a plain object. */
function sumObj(obj) {
  return Object.values(obj).reduce((a, b) => a + b, 0);
}

// ── Constructor ───────────────────────────────────────────────────────────────

describe('GameEngine constructor', () => {
  test.each(PLAYER_PARTIES)('initialises for party %s', (party) => {
    const g = makeEngine(party);
    expect(g.playerParty).toBe(party);
    expect(g.electionIndex).toBe(0);
    expect(g.year).toBe(ELECTION_SCHEDULE[0]);
    expect(g.phase).toBe('campaign');
    expect(g.timesPM).toBe(0);
    expect(g.totalPlayerSeats).toBe(0);
    expect(g.score).toBe(0);
  });

  test.each([
    ['easy', 14, 6],
    ['normal', 10, 10],
    ['hard', 7, 14],
  ])('difficulty %s gives player %i CP and AI %i CP', (diff, playerCP, aiCP) => {
    const g = makeEngine('LPC', diff);
    expect(g.cpRemaining).toBe(playerCP);
    expect(g.aiCpBudget[diff]).toBe(aiCP);
  });

  test('all provinces are initialised with support data', () => {
    const g = makeEngine();
    for (const code of Object.keys(PROVINCES)) {
      expect(g.provinces[code]).toBeDefined();
      expect(typeof g.provinces[code].support).toBe('object');
      expect(g.provinces[code].campaignTokens).toBe(0);
    }
  });

  test('province support is a copy, not the original reference', () => {
    const g = makeEngine();
    g.provinces.ON.support.LPC = 999;
    expect(STARTING_SUPPORT.ON.LPC).not.toBe(999);
  });

  test('availablePolicies includes "all" cards', () => {
    const g = makeEngine('LPC');
    const allCards = POLICY_CARDS.filter(c => c.party === 'all');
    for (const card of allCards) {
      expect(g.availablePolicies.find(c => c.id === card.id)).toBeDefined();
    }
  });

  test('availablePolicies includes party-specific cards for the player party', () => {
    const g = makeEngine('CPC');
    const cpcCards = POLICY_CARDS.filter(c => c.party === 'CPC');
    for (const card of cpcCards) {
      expect(g.availablePolicies.find(c => c.id === card.id)).toBeDefined();
    }
  });

  test('availablePolicies excludes other parties\' cards', () => {
    const g = makeEngine('LPC');
    const cpcOnly = POLICY_CARDS.filter(c => c.party === 'CPC');
    for (const card of cpcOnly) {
      expect(g.availablePolicies.find(c => c.id === card.id)).toBeUndefined();
    }
  });

  test('event deck is populated', () => {
    const g = makeEngine();
    expect(g.eventDeck.length).toBeGreaterThan(0);
    expect(g.eventDeck.length).toBeLessThanOrEqual(EVENTS.length);
  });
});

// ── calculateSeats ─────────────────────────────────────────────────────────────

describe('GameEngine.calculateSeats', () => {
  test.each(Object.keys(PROVINCES || {}))('%s: seat totals equal province seats', (code) => {
    const g = makeEngine();
    const seats = g.calculateSeats(code);
    expect(sumObj(seats)).toBe(PROVINCES[code].seats);
  });

  test('no province has negative seat allocations', () => {
    const g = makeEngine();
    for (const code of Object.keys(PROVINCES)) {
      const seats = g.calculateSeats(code);
      for (const s of Object.values(seats)) {
        expect(s).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('BQ receives 0 seats outside Quebec', () => {
    const g = makeEngine();
    for (const code of Object.keys(PROVINCES)) {
      if (code === 'QC') continue;
      const seats = g.calculateSeats(code);
      expect(seats.BQ || 0).toBe(0);
    }
  });

  test('BQ is excluded from calculations before establishedYear', () => {
    const g = makeEngine();
    g.year = 1980; // BQ not yet established
    const seats = g.calculateSeats('QC');
    expect(seats.BQ || 0).toBe(0);
  });

  test('BQ can win seats in QC after its establishedYear', () => {
    const g = makeEngine();
    g.year = 2000;
    // Give BQ dominant support in QC
    g.provinces.QC.support.BQ = 80;
    g.provinces.QC.support.LPC = 10;
    g.provinces.QC.support.CPC = 5;
    g.provinces.QC.support.NDP = 5;
    const seats = g.calculateSeats('QC');
    expect(seats.BQ).toBeGreaterThan(0);
  });

  test('dominant party wins disproportionate share (FPTP exaggeration)', () => {
    const g = makeEngine();
    // LPC 70%, CPC 20%, NDP 10%
    g.provinces.ON.support.LPC = 70;
    g.provinces.ON.support.CPC = 20;
    g.provinces.ON.support.NDP = 10;
    g.provinces.ON.support.BQ = 0;
    const seats = g.calculateSeats('ON');
    const totalON = PROVINCES.ON.seats;
    // With FPTP, 70% support should yield well over 70% of seats
    expect(seats.LPC / totalON).toBeGreaterThan(0.70);
  });

  test('returns empty object when all support is zero', () => {
    const g = makeEngine();
    for (const p of Object.keys(PARTIES)) {
      g.provinces.PE.support[p] = 0;
    }
    const seats = g.calculateSeats('PE');
    expect(sumObj(seats)).toBe(0);
  });
});

// ── runElection ───────────────────────────────────────────────────────────────

describe('GameEngine.runElection', () => {
  // Pin Math.random to avoid flakiness in AI-run elections
  let mockRandom;
  beforeEach(() => { mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5); });
  afterEach(() => { mockRandom.mockRestore(); });

  test(`national seat total is always ${TOTAL_SEATS}`, () => {
    const g = makeEngine();
    const results = g.runElection();
    expect(sumObj(results.totalSeats)).toBe(TOTAL_SEATS);
  });

  test('returns a winner string', () => {
    const g = makeEngine();
    const results = g.runElection();
    expect(typeof results.winner).toBe('string');
    expect(PARTIES[results.winner]).toBeDefined();
  });

  test('government is "majority" when winner has >= 170 seats', () => {
    const g = makeEngine('LPC');
    // Give LPC overwhelming support everywhere
    for (const code of Object.keys(PROVINCES)) {
      g.provinces[code].support.LPC = 90;
      g.provinces[code].support.CPC = 5;
      g.provinces[code].support.NDP = 5;
      g.provinces[code].support.BQ = 0;
    }
    const results = g.runElection();
    expect(results.winnerSeats).toBeGreaterThanOrEqual(MAJORITY);
    expect(results.government).toBe('majority');
  });

  test('government is "minority" when winner has < 170 seats', () => {
    const g = makeEngine('LPC');
    // Split provinces so no one gets a majority (winner gets 163 seats)
    for (const code of Object.keys(PROVINCES)) {
      if (code === 'ON' || code === 'BC') {
        g.provinces[code].support.LPC = 50;
        g.provinces[code].support.CPC = 10;
        g.provinces[code].support.NDP = 10;
        g.provinces[code].support.BQ = 0;
      } else if (code === 'QC' || code === 'AB') {
        g.provinces[code].support.LPC = 10;
        g.provinces[code].support.CPC = 50;
        g.provinces[code].support.NDP = 10;
        g.provinces[code].support.BQ = 0;
      } else {
        g.provinces[code].support.LPC = 10;
        g.provinces[code].support.CPC = 10;
        g.provinces[code].support.NDP = 50;
        g.provinces[code].support.BQ = 0;
      }
    }
    const results = g.runElection();
    expect(results.winnerSeats).toBeLessThan(MAJORITY);
    expect(results.government).toBe('minority');
  });

  test('playerSeats reflects the player party seat count', () => {
    const g = makeEngine('NDP');
    const results = g.runElection();
    expect(results.playerSeats).toBe(results.totalSeats.NDP || 0);
  });

  test('isPM is true when player party wins', () => {
    const g = makeEngine('LPC');
    for (const code of Object.keys(PROVINCES)) {
      Object.keys(PARTIES).forEach(p => g.provinces[code].support[p] = p === 'LPC' ? 80 : 5);
    }
    const results = g.runElection();
    expect(results.isPM).toBe(results.winner === 'LPC');
  });

  test('appends to history on each call', () => {
    const g = makeEngine();
    expect(g.history).toHaveLength(0);
    g.runElection();
    expect(g.history).toHaveLength(1);
    g.runElection();
    expect(g.history).toHaveLength(2);
  });

  test('totalPlayerSeats accumulates', () => {
    const g = makeEngine('LPC');
    for (const code of Object.keys(PROVINCES)) {
      Object.keys(PARTIES).forEach(p => g.provinces[code].support[p] = p === 'LPC' ? 80 : 5);
    }
    const r1 = g.runElection();
    const r2 = g.runElection();
    expect(g.totalPlayerSeats).toBe(r1.playerSeats + r2.playerSeats);
  });

  test('timesPM increments when player wins', () => {
    const g = makeEngine('LPC');
    for (const code of Object.keys(PROVINCES)) {
      Object.keys(PARTIES).forEach(p => g.provinces[code].support[p] = p === 'LPC' ? 90 : 3);
    }
    g.runElection();
    expect(g.timesPM).toBe(1);
    g.runElection();
    expect(g.timesPM).toBe(2);
  });

  test('score increases by 100 for majority win', () => {
    const g = makeEngine('LPC');
    for (const code of Object.keys(PROVINCES)) {
      Object.keys(PARTIES).forEach(p => g.provinces[code].support[p] = p === 'LPC' ? 90 : 3);
    }
    g.runElection();
    // score = 100 (majority PM bonus) + playerSeats
    expect(g.score).toBeGreaterThanOrEqual(100);
  });
});

// ── campaignInProvince ────────────────────────────────────────────────────────

describe('GameEngine.campaignInProvince', () => {
  test('returns { ok: true } on a valid campaign', () => {
    const g = makeEngine();
    expect(g.campaignInProvince('ON')).toEqual({ ok: true });
  });

  test('costs 2 campaign points', () => {
    const g = makeEngine('LPC', 'normal'); // 10 CP
    g.campaignInProvince('ON');
    expect(g.cpRemaining).toBe(8);
  });

  test('boosts player support by 7% (capped at 90)', () => {
    const g = makeEngine('LPC');
    const before = g.provinces.ON.support.LPC;
    g.campaignInProvince('ON');
    expect(g.provinces.ON.support.LPC).toBe(Math.min(90, before + 7));
  });

  test('increments campaign token count', () => {
    const g = makeEngine();
    expect(g.provinces.ON.campaignTokens).toBe(0);
    g.campaignInProvince('ON');
    expect(g.provinces.ON.campaignTokens).toBe(1);
  });

  test('fails with { ok: false } when not enough CP', () => {
    const g = makeEngine('LPC', 'hard'); // 7 CP
    g.cpRemaining = 1;
    const result = g.campaignInProvince('ON');
    expect(result.ok).toBe(false);
    expect(typeof result.reason).toBe('string');
  });

  test('does not modify state when CP is insufficient', () => {
    const g = makeEngine();
    g.cpRemaining = 1;
    const tokensBefore = g.provinces.ON.campaignTokens;
    const supportBefore = g.provinces.ON.support.LPC;
    g.campaignInProvince('ON');
    expect(g.provinces.ON.campaignTokens).toBe(tokensBefore);
    expect(g.provinces.ON.support.LPC).toBe(supportBefore);
  });

  test('fails when province already has 3 tokens', () => {
    const g = makeEngine();
    g.campaignInProvince('ON');
    g.campaignInProvince('ON');
    g.campaignInProvince('ON');
    const result = g.campaignInProvince('ON');
    expect(result.ok).toBe(false);
  });

  test('support is capped at 90', () => {
    const g = makeEngine('LPC');
    g.provinces.PE.support.LPC = 88;
    g.campaignInProvince('PE');
    expect(g.provinces.PE.support.LPC).toBe(90);
  });

  test('can campaign 3 times in the same province when CP allows', () => {
    const g = makeEngine('LPC', 'easy'); // 14 CP
    expect(g.campaignInProvince('ON').ok).toBe(true);
    expect(g.campaignInProvince('ON').ok).toBe(true);
    expect(g.campaignInProvince('ON').ok).toBe(true);
    expect(g.provinces.ON.campaignTokens).toBe(3);
    expect(g.cpRemaining).toBe(14 - 6);
  });
});

// ── uncampaignInProvince ──────────────────────────────────────────────────────

describe('GameEngine.uncampaignInProvince', () => {
  test('returns true when a token is removed', () => {
    const g = makeEngine();
    g.campaignInProvince('ON');
    expect(g.uncampaignInProvince('ON')).toBe(true);
  });

  test('returns false when no tokens present', () => {
    const g = makeEngine();
    expect(g.uncampaignInProvince('ON')).toBe(false);
  });

  test('refunds 2 CP', () => {
    const g = makeEngine('LPC', 'normal'); // 10 CP
    g.campaignInProvince('ON'); // 8 remaining
    g.uncampaignInProvince('ON');
    expect(g.cpRemaining).toBe(10);
  });

  test('reduces support by 7 (floor at 0)', () => {
    const g = makeEngine('LPC');
    const before = g.provinces.ON.support.LPC;
    g.campaignInProvince('ON');
    g.uncampaignInProvince('ON');
    expect(g.provinces.ON.support.LPC).toBeCloseTo(before);
  });

  test('support does not go below 0', () => {
    const g = makeEngine('LPC');
    g.provinces.NL.support.LPC = 3;
    g.provinces.NL.campaignTokens = 1;
    g.uncampaignInProvince('NL');
    expect(g.provinces.NL.support.LPC).toBeGreaterThanOrEqual(0);
  });
});

// ── applyEvent ────────────────────────────────────────────────────────────────

describe('GameEngine.applyEvent', () => {
  test('adjusts support by the specified delta', () => {
    const g = makeEngine('LPC');
    const before = g.provinces.ON.support.LPC;
    g.applyEvent({
      effects: [{ party: 'LPC', province: 'ON', delta: 10 }],
    });
    expect(g.provinces.ON.support.LPC).toBeCloseTo(before + 10);
  });

  test('SELF resolves to the player party', () => {
    const g = makeEngine('NDP');
    const before = g.provinces.SK.support.NDP;
    g.applyEvent({
      effects: [{ party: 'SELF', province: 'SK', delta: 5 }],
    });
    expect(g.provinces.SK.support.NDP).toBeCloseTo(before + 5);
  });

  test('LEADER resolves to the leading opponent party', () => {
    const g = makeEngine('NDP');
    // LPC dominates everywhere → LEADER should be LPC
    for (const code of Object.keys(PROVINCES)) {
      g.provinces[code].support.LPC = 60;
      g.provinces[code].support.CPC = 25;
      g.provinces[code].support.NDP = 10;
      g.provinces[code].support.BQ = 0;
    }
    const before = g.provinces.ON.support.LPC;
    g.applyEvent({
      effects: [{ party: 'LEADER', province: 'ON', delta: -5 }],
    });
    expect(g.provinces.ON.support.LPC).toBeCloseTo(before - 5);
  });

  test('region "all" applies delta to every province', () => {
    const g = makeEngine('LPC');
    const before = {};
    for (const code of Object.keys(PROVINCES)) {
      before[code] = g.provinces[code].support.LPC;
    }
    g.applyEvent({
      effects: [{ party: 'LPC', region: 'all', delta: 3 }],
    });
    for (const code of Object.keys(PROVINCES)) {
      expect(g.provinces[code].support.LPC).toBeCloseTo(
        Math.min(95, before[code] + 3), 5
      );
    }
  });

  test('region "west" applies delta only to BC and AB', () => {
    const g = makeEngine('LPC');
    const beforeBC = g.provinces.BC.support.LPC;
    const beforeON = g.provinces.ON.support.LPC;
    g.applyEvent({
      effects: [{ party: 'LPC', region: 'west', delta: 10 }],
    });
    expect(g.provinces.BC.support.LPC).toBeCloseTo(Math.min(95, beforeBC + 10));
    expect(g.provinces.ON.support.LPC).toBeCloseTo(beforeON); // untouched
  });

  test('BQ effect applies only to QC even when region is "all"', () => {
    const g = makeEngine('LPC');
    g.year = 2000;
    const beforeQC = g.provinces.QC.support.BQ || 0;
    const beforeON = g.provinces.ON.support.BQ || 0;
    g.applyEvent({
      effects: [{ party: 'BQ', region: 'all', delta: 10 }],
    });
    expect(g.provinces.QC.support.BQ).toBeCloseTo(Math.min(95, beforeQC + 10));
    expect(g.provinces.ON.support.BQ || 0).toBeCloseTo(beforeON); // not changed
  });

  test('support is clamped to [0, 95]', () => {
    const g = makeEngine('LPC');
    g.provinces.AB.support.LPC = 2;
    g.applyEvent({
      effects: [{ party: 'LPC', province: 'AB', delta: -50 }],
    });
    expect(g.provinces.AB.support.LPC).toBeGreaterThanOrEqual(0);

    g.provinces.AB.support.LPC = 93;
    g.applyEvent({
      effects: [{ party: 'LPC', province: 'AB', delta: +50 }],
    });
    expect(g.provinces.AB.support.LPC).toBeLessThanOrEqual(95);
  });

  test('unknown party ref is silently ignored', () => {
    const g = makeEngine('LPC');
    expect(() => {
      g.applyEvent({
        effects: [{ party: 'UNKNOWN', province: 'ON', delta: 10 }],
      });
    }).not.toThrow();
  });
});

// ── drawEvents ────────────────────────────────────────────────────────────────

describe('GameEngine.drawEvents', () => {
  beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(0.3));
  afterEach(() => jest.restoreAllMocks());

  test('returns only events whose year range includes the current year', () => {
    const g = makeEngine();
    g.year = 1955;
    const drawn = g.drawEvents();
    for (const e of drawn) {
      expect(e.minYear).toBeLessThanOrEqual(1955);
      expect(e.maxYear).toBeGreaterThanOrEqual(1955);
    }
  });

  test('drawn events are removed from the deck', () => {
    const g = makeEngine();
    g.year = 1955;
    const deckSizeBefore = g.eventDeck.length;
    const drawn = g.drawEvents();
    expect(g.eventDeck.length).toBe(deckSizeBefore - drawn.length);
    for (const e of drawn) {
      expect(g.eventDeck.includes(e)).toBe(false);
    }
  });

  test('drawn events are stored in pendingEvents', () => {
    const g = makeEngine();
    g.year = 1960;
    const drawn = g.drawEvents();
    expect(g.pendingEvents).toEqual(drawn);
  });

  test('draws at most 2 events', () => {
    const g = makeEngine();
    g.year = 1968;
    const drawn = g.drawEvents();
    expect(drawn.length).toBeLessThanOrEqual(2);
  });

  test('returns empty array when no events match the year', () => {
    const g = makeEngine();
    g.year = 1951; // Before any event minYear
    const drawn = g.drawEvents();
    expect(drawn).toEqual([]);
  });
});

// ── advance ───────────────────────────────────────────────────────────────────

describe('GameEngine.advance', () => {
  beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(0.5));
  afterEach(() => jest.restoreAllMocks());

  test('returns true when there are more elections', () => {
    const g = makeEngine();
    expect(g.advance()).toBe(true);
  });

  test('increments electionIndex', () => {
    const g = makeEngine();
    g.advance();
    expect(g.electionIndex).toBe(1);
  });

  test('updates year to the next scheduled election', () => {
    const g = makeEngine();
    g.advance();
    expect(g.year).toBe(ELECTION_SCHEDULE[1]);
  });

  test('resets cpRemaining to the difficulty budget', () => {
    const g = makeEngine('LPC', 'normal');
    g.cpRemaining = 0;
    g.advance();
    expect(g.cpRemaining).toBe(10);
  });

  test('resets all campaign tokens to 0', () => {
    const g = makeEngine();
    g.provinces.ON.campaignTokens = 2;
    g.provinces.BC.campaignTokens = 1;
    g.advance();
    for (const code of Object.keys(PROVINCES)) {
      expect(g.provinces[code].campaignTokens).toBe(0);
    }
  });

  test('returns false after the last election', () => {
    const g = makeEngine();
    g.electionIndex = ELECTION_SCHEDULE.length - 1;
    expect(g.advance()).toBe(false);
  });

  test('all support values remain in [0, 95] after drift', () => {
    const g = makeEngine();
    g.advance();
    for (const [, provState] of Object.entries(g.provinces)) {
      for (const val of Object.values(provState.support)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(95);
      }
    }
  });
});

// ── isGameOver ────────────────────────────────────────────────────────────────

describe('GameEngine.isGameOver', () => {
  test('returns false at the start', () => {
    expect(makeEngine().isGameOver()).toBe(false);
  });

  test('returns false at the last election (index = length - 1)', () => {
    const g = makeEngine();
    g.electionIndex = ELECTION_SCHEDULE.length - 1;
    expect(g.isGameOver()).toBe(false);
  });

  test('returns true when electionIndex reaches ELECTION_SCHEDULE.length', () => {
    const g = makeEngine();
    g.electionIndex = ELECTION_SCHEDULE.length;
    expect(g.isGameOver()).toBe(true);
  });
});

// ── getLeadingParty ───────────────────────────────────────────────────────────

describe('GameEngine.getLeadingParty', () => {
  test('returns the party with the highest support', () => {
    const g = makeEngine();
    g.provinces.BC.support.LPC = 10;
    g.provinces.BC.support.CPC = 60;
    g.provinces.BC.support.NDP = 20;
    g.provinces.BC.support.BQ = 0;
    expect(g.getLeadingParty('BC')).toBe('CPC');
  });

  test('BQ cannot lead outside QC even with high support', () => {
    const g = makeEngine();
    g.year = 2000;
    g.provinces.ON.support.BQ = 999;
    g.provinces.ON.support.LPC = 1;
    g.provinces.ON.support.CPC = 1;
    g.provinces.ON.support.NDP = 1;
    const leader = g.getLeadingParty('ON');
    expect(leader).not.toBe('BQ');
  });

  test('returns a valid party id', () => {
    const g = makeEngine();
    for (const code of Object.keys(PROVINCES)) {
      const leader = g.getLeadingParty(code);
      expect(PARTIES[leader]).toBeDefined();
    }
  });
});

// ── getNationalTotals ─────────────────────────────────────────────────────────

describe('GameEngine.getNationalTotals', () => {
  beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(0.5));
  afterEach(() => jest.restoreAllMocks());

  test(`seat totals sum to ${TOTAL_SEATS}`, () => {
    const g = makeEngine();
    const totals = g.getNationalTotals();
    const total = Object.values(totals).reduce((s, t) => s + t.seats, 0);
    expect(total).toBe(TOTAL_SEATS);
  });

  test('avgSupport is a non-negative number for all parties', () => {
    const g = makeEngine();
    const totals = g.getNationalTotals();
    for (const t of Object.values(totals)) {
      expect(typeof t.avgSupport).toBe('number');
      expect(t.avgSupport).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── getFinalScore ─────────────────────────────────────────────────────────────

describe('GameEngine.getFinalScore', () => {
  const cases = [
    [2500, 'S', 'Political Legend'],
    [2000, 'A', 'Dominant Force'],
    [1500, 'B', 'Major Player'],
    [1000, 'C', 'Contender'],
    [500, 'D', 'Minor Party'],
    [0, 'F', 'Fringe Party'],
  ];

  test.each(cases)('score %i → grade %s (%s)', (score, grade, comment) => {
    const g = makeEngine();
    g.score = score;
    const result = g.getFinalScore();
    expect(result.grade).toBe(grade);
    expect(result.comment).toBe(comment);
    expect(result.score).toBe(score);
  });

  test('returns timesPM and totalSeats', () => {
    const g = makeEngine();
    g.timesPM = 3;
    g.totalPlayerSeats = 450;
    const result = g.getFinalScore();
    expect(result.timesPM).toBe(3);
    expect(result.totalSeats).toBe(450);
  });

  test('score just below threshold gives lower grade', () => {
    const g = makeEngine();
    g.score = 1999;
    expect(g.getFinalScore().grade).toBe('B');
    g.score = 2000;
    expect(g.getFinalScore().grade).toBe('A');
  });
});

// ── _resolveTargetProvinces ───────────────────────────────────────────────────

describe('GameEngine._resolveTargetProvinces', () => {
  test('province effect returns single-element array', () => {
    const g = makeEngine();
    const result = g._resolveTargetProvinces({ province: 'ON' });
    expect(result).toEqual(['ON']);
  });

  test('region "all" returns all province codes', () => {
    const g = makeEngine();
    const result = g._resolveTargetProvinces({ region: 'all' });
    expect(new Set(result)).toEqual(new Set(Object.keys(PROVINCES)));
  });

  test('region "atlantic" returns only Atlantic provinces', () => {
    const g = makeEngine();
    const result = g._resolveTargetProvinces({ region: 'atlantic' });
    expect(result.sort()).toEqual(REGIONS.atlantic.sort());
  });

  test('province "CHOICE" returns empty array', () => {
    const g = makeEngine();
    const result = g._resolveTargetProvinces({ province: 'CHOICE' });
    expect(result).toEqual([]);
  });

  test('unknown region returns empty array', () => {
    const g = makeEngine();
    const result = g._resolveTargetProvinces({ region: 'nonexistent' });
    expect(result).toEqual([]);
  });
});

// ── _getLeadingOpponentParty ──────────────────────────────────────────────────

describe('GameEngine._getLeadingOpponentParty', () => {
  test('never returns the player party', () => {
    const g = makeEngine('LPC');
    // Make CPC dominant
    for (const code of Object.keys(PROVINCES)) {
      g.provinces[code].support.CPC = 90;
      g.provinces[code].support.LPC = 5;
      g.provinces[code].support.NDP = 5;
      g.provinces[code].support.BQ = 0;
    }
    expect(g._getLeadingOpponentParty()).toBe('CPC');
  });

  test('returns a valid party id', () => {
    const g = makeEngine('NDP');
    const leader = g._getLeadingOpponentParty();
    expect(PARTIES[leader]).toBeDefined();
    expect(leader).not.toBe('NDP');
  });
});
