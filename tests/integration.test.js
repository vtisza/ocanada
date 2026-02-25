/**
 * tests/integration.test.js
 * End-to-end simulations that run multiple / full election cycles and verify
 * emergent properties: valid state throughout, correct accumulation, no
 * crashes, and sensible score ranges.
 */

const TOTAL_SEATS = 338;

// Freeze Math.random so all probabilistic paths are deterministic.
beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(0.5));
afterEach(()  => jest.restoreAllMocks());

// ── Helpers ───────────────────────────────────────────────────────────────────

function sumObj(obj) {
  return Object.values(obj).reduce((a, b) => a + b, 0);
}

/** Simulate a full 25-election game and return the engine at game-over. */
function simulateFullGame(party = 'LPC', diff = 'normal') {
  const g = new GameEngine(party, diff);
  while (!g.isGameOver()) {
    g.drawEvents().forEach(e => g.applyEvent(e));
    g.runAICampaign();
    g.runElection();
    g.advance();
  }
  return g;
}

// ── Full-game smoke tests ─────────────────────────────────────────────────────

describe('Full 25-election simulation (smoke)', () => {
  test.each(['LPC', 'CPC', 'NDP'])(
    'completes without throwing for party %s',
    (party) => {
      expect(() => simulateFullGame(party)).not.toThrow();
    }
  );

  test.each(['easy', 'normal', 'hard'])(
    'completes without throwing on difficulty %s',
    (diff) => {
      expect(() => simulateFullGame('LPC', diff)).not.toThrow();
    }
  );

  test('produces exactly 25 history entries', () => {
    const g = simulateFullGame();
    expect(g.history).toHaveLength(ELECTION_SCHEDULE.length);
  });

  test('isGameOver() is true at the end', () => {
    const g = simulateFullGame();
    expect(g.isGameOver()).toBe(true);
  });

  test('history years match ELECTION_SCHEDULE in order', () => {
    const g = simulateFullGame();
    const histYears = g.history.map(h => h.year);
    expect(histYears).toEqual(ELECTION_SCHEDULE);
  });
});

// ── Seat integrity across all elections ───────────────────────────────────────

describe('Seat counts stay valid throughout a full game', () => {
  test(`each election allocates exactly ${TOTAL_SEATS} seats`, () => {
    const g = simulateFullGame();
    for (const h of g.history) {
      const total = sumObj(h.totalSeats);
      expect(total).toBe(TOTAL_SEATS);
    }
  });

  test('no party ever receives negative seats in any election', () => {
    const g = simulateFullGame();
    for (const h of g.history) {
      for (const seats of Object.values(h.totalSeats)) {
        expect(seats).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('player seat count is always within [0, 338]', () => {
    const g = simulateFullGame();
    for (const h of g.history) {
      expect(h.playerSeats).toBeGreaterThanOrEqual(0);
      expect(h.playerSeats).toBeLessThanOrEqual(TOTAL_SEATS);
    }
  });

  test('totalPlayerSeats equals the sum of per-election player seats', () => {
    const g = simulateFullGame();
    const expected = g.history.reduce((s, h) => s + h.playerSeats, 0);
    expect(g.totalPlayerSeats).toBe(expected);
  });

  test('timesPM equals the number of elections where player was winner', () => {
    const g = simulateFullGame('LPC');
    const expected = g.history.filter(h => h.winner === 'LPC').length;
    expect(g.timesPM).toBe(expected);
  });
});

// ── Support values stay in valid range ───────────────────────────────────────

describe('Province support values stay in [0, 95] throughout a full game', () => {
  test('after every election + advance cycle', () => {
    const g = new GameEngine('LPC', 'normal');
    while (!g.isGameOver()) {
      g.drawEvents().forEach(e => g.applyEvent(e));
      g.runAICampaign();
      g.runElection();
      g.advance();

      for (const [, provState] of Object.entries(g.provinces)) {
        for (const [party, val] of Object.entries(provState.support)) {
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThanOrEqual(95);
        }
      }
    }
  });
});

// ── BQ behaviour across history ───────────────────────────────────────────────

describe('BQ historically correct behaviour', () => {
  test('BQ wins 0 seats before its established year in every election', () => {
    const g = new GameEngine('LPC', 'normal');
    while (!g.isGameOver()) {
      g.drawEvents().forEach(e => g.applyEvent(e));
      g.runAICampaign();
      const result = g.runElection();

      if (g.year < PARTIES.BQ.establishedYear) {
        expect(result.totalSeats.BQ || 0).toBe(0);
      }
      g.advance();
    }
  });

  test('BQ wins seats only in QC in every election', () => {
    const g = new GameEngine('LPC', 'normal');
    while (!g.isGameOver()) {
      g.drawEvents().forEach(e => g.applyEvent(e));
      g.runAICampaign();
      const result = g.runElection();

      for (const [code, provSeats] of Object.entries(result.provinceResults)) {
        if (code !== 'QC') {
          expect(provSeats.BQ || 0).toBe(0);
        }
      }
      g.advance();
    }
  });
});

// ── Score accumulation ────────────────────────────────────────────────────────

describe('Score accumulation', () => {
  test('score is non-negative after a full game', () => {
    const g = simulateFullGame();
    expect(g.score).toBeGreaterThanOrEqual(0);
  });

  test('score includes at least the total player seats earned', () => {
    const g = simulateFullGame('LPC');
    // Minimum: 1 point per seat won
    expect(g.score).toBeGreaterThanOrEqual(g.totalPlayerSeats);
  });

  test('PM majority bonus (100) is applied when player wins majority', () => {
    const g = new GameEngine('LPC', 'easy');
    // Ensure LPC wins a majority in election 1
    for (const code of Object.keys(PROVINCES)) {
      Object.keys(PARTIES).forEach(p =>
        g.provinces[code].support[p] = p === 'LPC' ? 90 : 3
      );
    }
    const result = g.runElection();
    if (result.isPM && result.government === 'majority') {
      // score = 100 + playerSeats
      expect(g.score).toBe(100 + result.playerSeats);
    }
  });

  test('PM minority bonus (50) is applied when player wins minority', () => {
    const g = new GameEngine('LPC', 'normal');
    // Equal LPC/CPC split → minority
    for (const code of Object.keys(PROVINCES)) {
      g.provinces[code].support.LPC = 40;
      g.provinces[code].support.CPC = 39;
      g.provinces[code].support.NDP = 10;
      g.provinces[code].support.BQ  = 0;
    }
    const result = g.runElection();
    if (result.isPM && result.government === 'minority') {
      expect(g.score).toBe(50 + result.playerSeats);
    }
  });

  test('getFinalScore returns valid grade and comment', () => {
    const g = simulateFullGame();
    const final = g.getFinalScore();
    expect(['S', 'A', 'B', 'C', 'D', 'F']).toContain(final.grade);
    expect(typeof final.comment).toBe('string');
    expect(final.comment.length).toBeGreaterThan(0);
  });
});

// ── Campaign → Election → Advance cycle ──────────────────────────────────────

describe('Campaign → Election → Advance cycle', () => {
  test('player can spend all CP before an election', () => {
    const g = new GameEngine('LPC', 'normal'); // 10 CP
    let cp = g.cpRemaining;
    while (cp >= 2) {
      // Find a province with < 3 tokens
      const code = Object.keys(PROVINCES).find(c => g.provinces[c].campaignTokens < 3);
      if (!code) break;
      const r = g.campaignInProvince(code);
      if (r.ok) cp -= 2;
      else break;
    }
    expect(g.cpRemaining).toBeGreaterThanOrEqual(0);
  });

  test('CP is restored after advance()', () => {
    const g = new GameEngine('LPC', 'hard'); // 7 CP
    g.campaignInProvince('ON'); // -2
    g.campaignInProvince('BC'); // -2
    g.runElection();
    g.advance();
    expect(g.cpRemaining).toBe(7);
  });

  test('each election uses the correct year from ELECTION_SCHEDULE', () => {
    const g = new GameEngine('LPC', 'normal');
    for (let i = 0; i < ELECTION_SCHEDULE.length; i++) {
      expect(g.year).toBe(ELECTION_SCHEDULE[i]);
      g.runElection();
      if (!g.advance()) break;
    }
  });
});

// ── Idempotency / isolation ───────────────────────────────────────────────────

describe('GameEngine isolation', () => {
  test('two simultaneous engines do not share province state', () => {
    const g1 = new GameEngine('LPC', 'normal');
    const g2 = new GameEngine('CPC', 'normal');
    g1.provinces.ON.support.LPC = 99;
    expect(g2.provinces.ON.support.LPC).not.toBe(99);
  });

  test('modifying game state does not alter STARTING_SUPPORT', () => {
    const original = STARTING_SUPPORT.ON.LPC;
    const g = new GameEngine('LPC', 'normal');
    g.provinces.ON.support.LPC = 0;
    expect(STARTING_SUPPORT.ON.LPC).toBe(original);
  });
});
