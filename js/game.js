// ============================================================
// O CANADA: Power & Politics in the True North, 1950–2030
// game.js — Core game engine
// ============================================================

class GameEngine {
  constructor(playerParty, difficulty) {
    this.playerParty = playerParty;
    this.difficulty = difficulty; // 'easy' | 'normal' | 'hard'

    // Campaign points budget per election cycle
    this.cpBudget = { easy: 14, normal: 10, hard: 7 };
    this.aiCpBudget = { easy: 6, normal: 10, hard: 14 };

    this.electionIndex = 0; // Which election we're on
    this.year = ELECTION_SCHEDULE[0];

    // Province state: support percentages and campaign tokens
    this.provinces = {};
    for (const [code, data] of Object.entries(PROVINCES)) {
      this.provinces[code] = {
        support: { ...STARTING_SUPPORT[code] },
        campaignTokens: 0,
      };
    }

    // Deck of events (shuffle a copy)
    this.eventDeck = this._buildEventDeck();
    this.pendingEvents = []; // Events to show this cycle

    // Policy cards available to player
    this.availablePolicies = POLICY_CARDS.filter(
      p => p.party === 'all' || p.party === playerParty
    );
    this.usedPolicies = new Set();

    // Historical record
    this.history = []; // { year, seats: {LPC, CPC, NDP, BQ}, winner, playerSeats }

    // Scoring
    this.totalPlayerSeats = 0;
    this.timesPM = 0;
    this.score = 0;

    // Current phase
    this.phase = 'campaign'; // 'campaign' | 'event' | 'election' | 'results'

    // Campaign points remaining this cycle
    this.cpRemaining = this.cpBudget[difficulty];
  }

  // ── Seat Calculation ────────────────────────────────────────

  /**
   * Calculate seat distribution for a province using a modified
   * FPTP model. Higher support gets a disproportionate share
   * (simulating how FPTP amplifies majorities).
   */
  calculateSeats(provinceCode) {
    const prov = PROVINCES[provinceCode];
    const support = this.provinces[provinceCode].support;

    // Only include BQ in Quebec
    const validParties = Object.keys(PARTIES).filter(p => {
      if (p === 'BQ' && provinceCode !== 'QC') return false;
      if (PARTIES[p].establishedYear && this.year < PARTIES[p].establishedYear) return false;
      return true;
    });

    const vals = {};
    let total = 0;
    for (const p of validParties) {
      const s = Math.max(0, support[p] || 0);
      vals[p] = Math.pow(s, 1.6); // FPTP exaggeration
      total += vals[p];
    }

    if (total === 0) return {};

    const seats = {};
    let allocated = 0;
    const totalSeats = prov.seats;

    // Proportional allocation with rounding
    for (const p of validParties) {
      seats[p] = Math.floor((vals[p] / total) * totalSeats);
      allocated += seats[p];
    }

    // Distribute remaining seats to parties with largest remainders
    const remainders = validParties.map(p => ({
      p,
      rem: (vals[p] / total) * totalSeats - Math.floor((vals[p] / total) * totalSeats),
    })).sort((a, b) => b.rem - a.rem);

    for (let i = 0; i < totalSeats - allocated; i++) {
      seats[remainders[i].p] = (seats[remainders[i].p] || 0) + 1;
    }

    return seats;
  }

  /**
   * Run the election across all provinces. Returns full results object.
   */
  runElection() {
    const totalSeats = {};
    const provinceResults = {};

    for (const code of Object.keys(PROVINCES)) {
      const seats = this.calculateSeats(code);
      provinceResults[code] = seats;
      for (const [party, s] of Object.entries(seats)) {
        totalSeats[party] = (totalSeats[party] || 0) + s;
      }
    }

    // Determine winner (most seats)
    const partySeats = Object.entries(totalSeats).sort((a, b) => b[1] - a[1]);
    const winner = partySeats[0][0];
    const winnerSeats = partySeats[0][1];
    const majority = 170; // 338 / 2 + 1
    const government = winnerSeats >= majority ? 'majority' : 'minority';

    const results = {
      year: this.year,
      totalSeats,
      provinceResults,
      winner,
      winnerSeats,
      government,
      playerSeats: totalSeats[this.playerParty] || 0,
      isPM: winner === this.playerParty,
    };

    // Update history and score
    this.history.push(results);
    this.totalPlayerSeats += results.playerSeats;
    if (results.isPM) {
      this.timesPM++;
      this.score += government === 'majority' ? 100 : 50;
    } else if (results.playerSeats >= 55) {
      this.score += 25; // Official opposition
    }
    this.score += results.playerSeats;

    return results;
  }

  // ── Campaign Phase ──────────────────────────────────────────

  /**
   * Player campaigns in a province (costs 2 CP, boosts support by +7%).
   */
  campaignInProvince(provinceCode) {
    const cost = 2;
    if (this.cpRemaining < cost) return { ok: false, reason: 'Not enough Campaign Points.' };
    if (this.provinces[provinceCode].campaignTokens >= 3) {
      return { ok: false, reason: 'Province already has max campaign tokens.' };
    }

    this.provinces[provinceCode].campaignTokens++;
    this.provinces[provinceCode].support[this.playerParty] =
      Math.min(90, (this.provinces[provinceCode].support[this.playerParty] || 0) + 7);
    this.cpRemaining -= cost;
    return { ok: true };
  }

  /**
   * Remove a campaign token from a province (refunds CP).
   */
  uncampaignInProvince(provinceCode) {
    if (this.provinces[provinceCode].campaignTokens <= 0) return false;
    this.provinces[provinceCode].campaignTokens--;
    this.provinces[provinceCode].support[this.playerParty] =
      Math.max(0, (this.provinces[provinceCode].support[this.playerParty] || 0) - 7);
    this.cpRemaining += 2;
    return true;
  }

  // ── AI Campaign ─────────────────────────────────────────────

  /**
   * Run AI campaigns for all non-player parties.
   */
  runAICampaign() {
    const budget = this.aiCpBudget[this.difficulty];
    const aiParties = Object.keys(PARTIES).filter(p => p !== this.playerParty);

    for (const party of aiParties) {
      if (PARTIES[party].establishedYear && this.year < PARTIES[party].establishedYear) continue;

      let cpLeft = budget;
      const provinceCodes = Object.keys(PROVINCES);

      // Sort provinces by "value" for this AI party:
      // high support + many seats = high priority
      const ranked = provinceCodes
        .filter(code => {
          if (party === 'BQ' && code !== 'QC') return false;
          return true;
        })
        .map(code => ({
          code,
          value: (this.provinces[code].support[party] || 0) * PROVINCES[code].seats,
        }))
        .sort((a, b) => b.value - a.value);

      for (const { code } of ranked) {
        if (cpLeft < 2) break;
        const bonus = this.difficulty === 'hard' ? 8 : this.difficulty === 'normal' ? 6 : 4;
        this.provinces[code].support[party] = Math.min(90,
          (this.provinces[code].support[party] || 0) + bonus + Math.random() * 4 - 2);
        cpLeft -= 2;
      }
    }
  }

  // ── Events ──────────────────────────────────────────────────

  _buildEventDeck() {
    return [...EVENTS].sort(() => Math.random() - 0.5);
  }

  /**
   * Draw events relevant to the current year (1–2 events per cycle).
   */
  drawEvents() {
    const relevant = this.eventDeck.filter(e =>
      e.minYear <= this.year && e.maxYear >= this.year
    );
    // Pick 1–2 events
    const count = Math.random() < 0.4 ? 2 : 1;
    const drawn = relevant.sort(() => Math.random() - 0.5).slice(0, count);

    // Remove drawn events from deck
    for (const e of drawn) {
      const idx = this.eventDeck.indexOf(e);
      if (idx >= 0) this.eventDeck.splice(idx, 1);
    }

    this.pendingEvents = drawn;
    return drawn;
  }

  /**
   * Apply a single event's effects to the province support values.
   */
  applyEvent(event) {
    for (const effect of event.effects) {
      const targets = this._resolveTargetProvinces(effect);
      for (const code of targets) {
        const partyId = this._resolveEffectParty(effect.party);
        if (!partyId) continue;
        // Only apply BQ effects in Quebec
        if (partyId === 'BQ' && code !== 'QC') continue;
        const current = this.provinces[code].support[partyId] || 0;
        this.provinces[code].support[partyId] = Math.max(0, Math.min(95, current + effect.delta));
      }
    }
  }

  _resolveEffectParty(partyRef) {
    if (partyRef === 'SELF') return this.playerParty;
    if (partyRef === 'LEADER') return this._getLeadingOpponentParty();
    if (PARTIES[partyRef]) return partyRef;
    return null;
  }

  _getLeadingOpponentParty() {
    const totals = {};
    for (const code of Object.keys(PROVINCES)) {
      for (const [p, s] of Object.entries(this.provinces[code].support)) {
        if (p === this.playerParty) continue;
        totals[p] = (totals[p] || 0) + s * PROVINCES[code].seats;
      }
    }
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'CPC';
  }

  _resolveTargetProvinces(effect) {
    if (effect.province) {
      if (effect.province === 'CHOICE') return []; // handled externally
      return [effect.province];
    }
    if (effect.region) {
      if (effect.region === 'all') return Object.keys(PROVINCES);
      return REGIONS[effect.region] || [];
    }
    return [];
  }

  // ── Advance Game ────────────────────────────────────────────

  /**
   * Move to next election. Returns false if game is over.
   */
  advance() {
    this.electionIndex++;
    if (this.electionIndex >= ELECTION_SCHEDULE.length) return false;

    this.year = ELECTION_SCHEDULE[this.electionIndex];
    this.cpRemaining = this.cpBudget[this.difficulty];

    // Reset campaign tokens
    for (const code of Object.keys(PROVINCES)) {
      this.provinces[code].campaignTokens = 0;
    }

    // Apply some natural support drift (regression toward historical mean)
    this._applyDrift();

    return true;
  }

  /**
   * Natural drift — support gravitates slightly toward historical baseline
   * and adds noise to keep the game interesting.
   */
  _applyDrift() {
    for (const [code, provState] of Object.entries(this.provinces)) {
      const base = STARTING_SUPPORT[code];
      for (const party of Object.keys(PARTIES)) {
        const current = provState.support[party] || 0;
        const baseline = base[party] || 0;
        const drift = (baseline - current) * 0.15; // 15% regression
        const noise = (Math.random() - 0.5) * 6; // ±3% random noise
        provState.support[party] = Math.max(0, Math.min(95, current + drift + noise));
      }
    }
  }

  // ── Queries ─────────────────────────────────────────────────

  isGameOver() {
    return this.electionIndex >= ELECTION_SCHEDULE.length;
  }

  getLeadingParty(provinceCode) {
    const support = this.provinces[provinceCode].support;
    return Object.entries(support)
      .filter(([p]) => p !== 'BQ' || provinceCode === 'QC')
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'LPC';
  }

  getNationalTotals() {
    const totals = {};
    for (const [code, provState] of Object.entries(this.provinces)) {
      for (const [party, support] of Object.entries(provState.support)) {
        if (!totals[party]) totals[party] = { weightedSupport: 0, seats: 0 };
        totals[party].weightedSupport += support * PROVINCES[code].seats;
        totals[party].seats += this.calculateSeats(code)[party] || 0;
      }
    }
    // Convert to average percentages
    const totalWeight = Object.values(PROVINCES).reduce((s, p) => s + p.seats, 0);
    for (const party of Object.keys(totals)) {
      totals[party].avgSupport = totals[party].weightedSupport / totalWeight;
    }
    return totals;
  }

  getFinalScore() {
    let grade, comment;
    const s = this.score;
    if (s >= 2500) { grade = 'S'; comment = 'Political Legend'; }
    else if (s >= 2000) { grade = 'A'; comment = 'Dominant Force'; }
    else if (s >= 1500) { grade = 'B'; comment = 'Major Player'; }
    else if (s >= 1000) { grade = 'C'; comment = 'Contender'; }
    else if (s >= 500)  { grade = 'D'; comment = 'Minor Party'; }
    else                { grade = 'F'; comment = 'Fringe Party'; }
    return { score: s, grade, comment, timesPM: this.timesPM, totalSeats: this.totalPlayerSeats };
  }
}
