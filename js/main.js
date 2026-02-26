// ============================================================
// O CANADA: Power & Politics in the True North, 1950–2030
// main.js — UI rendering and interaction
// ============================================================

let G = null; // GameEngine instance
let currentEventIndex = 0;
let lastElectionResults = null;
let pendingPolicyChoice = null;

// ── Screen Management ─────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Setup Screen ──────────────────────────────────────────────

function initSetupScreen() {
  let selectedParty = null;
  let selectedDiff = 'normal';

  document.querySelectorAll('.party-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.party-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedParty = card.dataset.party;
      document.getElementById('start-game-btn').disabled = false;
      applyPartyTheme(selectedParty);
    });
  });

  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDiff = btn.dataset.diff;
    });
  });

  document.getElementById('start-game-btn').addEventListener('click', () => {
    if (!selectedParty) return;
    startGame(selectedParty, selectedDiff);
  });
}

function applyPartyTheme(partyId) {
  const party = PARTIES[partyId];
  document.documentElement.style.setProperty('--party-color', party.color);
  document.documentElement.style.setProperty('--party-color-light', party.colorLight);
  document.documentElement.style.setProperty('--party-color-dark', party.colorDark);
}

// ── Game Start ────────────────────────────────────────────────

function startGame(party, difficulty) {
  G = new GameEngine(party, difficulty);
  applyPartyTheme(party);
  showScreen('screen-game');
  renderGame();
  startCampaignPhase();
}

// ── Map Rendering ─────────────────────────────────────────────

function buildMap() {
  const svg = document.getElementById('canada-map');
  svg.innerHTML = '';

  // Water background
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', 0); bg.setAttribute('y', 0);
  bg.setAttribute('width', 905); bg.setAttribute('height', 295);
  bg.style.fill = '#071020';
  svg.appendChild(bg);

  for (const [code, data] of Object.entries(PROVINCES)) {
    const { x, y, w, h } = data.tile;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('province-tile');
    g.dataset.province = code;

    // Background rect
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x + 2);
    rect.setAttribute('y', y + 2);
    rect.setAttribute('width', w - 4);
    rect.setAttribute('height', h - 4);
    rect.setAttribute('rx', 4);
    rect.classList.add('province-rect');
    g.appendChild(rect);

    // Province abbreviation
    const abbr = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    abbr.setAttribute('x', x + w / 2);
    abbr.setAttribute('y', y + h / 2 - 6);
    abbr.classList.add('province-abbr');
    abbr.textContent = code;
    g.appendChild(abbr);

    // Seat count
    const seats = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    seats.setAttribute('x', x + w / 2);
    seats.setAttribute('y', y + h / 2 + 10);
    seats.classList.add('province-seats');
    seats.textContent = `${data.seats} seats`;
    g.appendChild(seats);

    // Campaign token indicators
    for (let i = 0; i < 3; i++) {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', x + w / 2 - 14 + i * 14);
      dot.setAttribute('cy', y + h - 12);
      dot.setAttribute('r', 5);
      dot.classList.add('campaign-dot');
      dot.dataset.dotIndex = i;
      g.appendChild(dot);
    }

    g.addEventListener('click', () => onProvinceClick(code, x + w / 2, y + h));
    g.addEventListener('mouseenter', () => showTooltip(code, x + w / 2, y + h));
    g.addEventListener('mouseleave', hideTooltip);

    svg.appendChild(g);
  }

  // Ocean label
  const ocean = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  ocean.setAttribute('x', 580);
  ocean.setAttribute('y', 55);
  ocean.classList.add('ocean-label');
  ocean.textContent = '— CANADA —';
  svg.appendChild(ocean);
}

function updateMapColors() {
  for (const [code] of Object.entries(PROVINCES)) {
    const g = document.querySelector(`[data-province="${code}"]`);
    if (!g) continue;

    const leader = G.getLeadingParty(code);
    const tokens = G.provinces[code].campaignTokens;
    const color = PARTIES[leader]?.color || '#555';

    const rect = g.querySelector('.province-rect');
    rect.style.fill = color;
    rect.style.opacity = G.phase === 'campaign' ? '0.85' : '1';

    // Highlight player's province during campaign
    if (G.phase === 'campaign' && leader === G.playerParty) {
      rect.style.filter = 'brightness(1.3)';
    } else {
      rect.style.filter = '';
    }

    // Update campaign dots
    const dots = g.querySelectorAll('.campaign-dot');
    dots.forEach((dot, i) => {
      dot.style.fill = i < tokens ? PARTIES[G.playerParty].colorLight : 'rgba(255,255,255,0.2)';
      dot.style.display = G.phase === 'campaign' ? 'block' : 'none';
    });
  }
}

// ── Tooltip ───────────────────────────────────────────────────

function showTooltip(code, x, y) {
  if (!G) return;
  const tooltip = document.getElementById('province-tooltip');
  const prov = PROVINCES[code];
  const support = G.provinces[code].support;

  const validParties = Object.keys(PARTIES).filter(p => {
    if (p === 'BQ' && code !== 'QC') return false;
    if (PARTIES[p].establishedYear && G.year < PARTIES[p].establishedYear) return false;
    return true;
  });

  let totalSupport = 0;
  for (const p of validParties) {
    totalSupport += Math.max(0, support[p] || 0);
  }

  const parties = Object.entries(support)
    .filter(([p]) => validParties.includes(p))
    .map(([p, v]) => [p, totalSupport > 0 ? (Math.max(0, v) / totalSupport) * 100 : 0])
    .sort((a, b) => b[1] - a[1]);

  let html = `<strong>${prov.name}</strong><br><em>${prov.seats} seats</em><hr>`;
  for (const [party, pct] of parties) {
    const color = PARTIES[party]?.color || '#ccc';
    html += `<div class="tip-row">
      <span class="tip-dot" style="background:${color}"></span>
      <span>${PARTIES[party]?.shortName || party}</span>
      <span class="tip-pct">${Math.round(pct)}%</span>
    </div>`;
  }

  tooltip.innerHTML = html;
  tooltip.classList.remove('hidden');

  // Position tooltip
  const mapRect = document.getElementById('map-panel').getBoundingClientRect();
  const svgEl = document.getElementById('canada-map');
  const svgRect = svgEl.getBoundingClientRect();
  const scaleX = svgRect.width / 905;
  const scaleY = svgRect.height / 295;

  const rawLeft = x * scaleX + svgRect.left - mapRect.left - 80;
  const rawTop = y * scaleY + svgRect.top - mapRect.top + 10;
  const maxLeft = mapRect.width - 175;
  tooltip.style.left = Math.max(4, Math.min(rawLeft, maxLeft)) + 'px';
  tooltip.style.top = Math.min(rawTop, mapRect.height - 120) + 'px';
}

function hideTooltip() {
  document.getElementById('province-tooltip').classList.add('hidden');
}

// ── Header ────────────────────────────────────────────────────

function updateHeader() {
  document.getElementById('current-year').textContent = G.year;
  document.getElementById('player-party-name').textContent = PARTIES[G.playerParty].shortName;
  document.getElementById('player-party-name').style.color = PARTIES[G.playerParty].color;

  const totals = G.getNationalTotals();
  const playerSeats = totals[G.playerParty]?.seats || 0;
  document.getElementById('player-seats-display').textContent = `~${playerSeats} seats`;

  document.getElementById('total-seats').textContent = G.totalPlayerSeats;
  document.getElementById('times-pm').textContent = G.timesPM;
  document.getElementById('current-score').textContent = G.score;
  document.getElementById('election-count').textContent =
    `${G.electionIndex + 1}/${ELECTION_SCHEDULE.length}`;
}

// ── National Polling Bar ──────────────────────────────────────

function updatePollingBar() {
  const totals = G.getNationalTotals();
  const container = document.getElementById('polling-bar');
  if (!container) return;

  const validParties = Object.keys(PARTIES).filter(p => {
    if (PARTIES[p].establishedYear && G.year < PARTIES[p].establishedYear) return false;
    return true;
  });

  const total = validParties.reduce((s, p) => s + (totals[p]?.avgSupport || 0), 0);
  container.innerHTML = '';

  for (const party of validParties) {
    const pct = total > 0 ? ((totals[party]?.avgSupport || 0) / total * 100) : 0;
    const seg = document.createElement('div');
    seg.className = 'poll-segment';
    seg.style.width = pct + '%';
    seg.style.background = PARTIES[party].color;
    seg.title = `${PARTIES[party].shortName}: ${Math.round(pct)}%`;
    seg.innerHTML = `<span>${Math.round(pct)}%</span>`;
    container.appendChild(seg);
  }
}

// ── Province Standings List ───────────────────────────────────

function updateStandings() {
  const container = document.getElementById('province-standings');
  container.innerHTML = '';

  const sortedProvinces = Object.entries(PROVINCES)
    .sort((a, b) => b[1].seats - a[1].seats);

  for (const [code, data] of sortedProvinces) {
    const leader = G.getLeadingParty(code);
    const provSupport = G.provinces[code].support;
    const support = provSupport[leader] || 0;

    const validParties = Object.keys(PARTIES).filter(p => {
      if (p === 'BQ' && code !== 'QC') return false;
      if (PARTIES[p].establishedYear && G.year < PARTIES[p].establishedYear) return false;
      return true;
    });

    let totalSupport = 0;
    for (const p of validParties) {
      totalSupport += Math.max(0, provSupport[p] || 0);
    }
    const pct = totalSupport > 0 ? (Math.max(0, support) / totalSupport) * 100 : 0;

    const color = PARTIES[leader]?.color || '#555';

    const row = document.createElement('div');
    row.className = 'standing-row';
    row.innerHTML = `
      <span class="st-dot" style="background:${color}"></span>
      <span class="st-prov">${code}</span>
      <span class="st-party" style="color:${color}">${PARTIES[leader]?.shortName || leader}</span>
      <span class="st-pct">${Math.round(pct)}%</span>
      <span class="st-seats">${data.seats}s</span>
    `;
    container.appendChild(row);
  }
}

// ── Campaign Phase ────────────────────────────────────────────

function startCampaignPhase() {
  G.phase = 'campaign';

  // Draw and apply events
  const events = G.drawEvents();
  if (events.length > 0) {
    currentEventIndex = 0;
    showEventCard(events[currentEventIndex]);
    return; // Events shown first, then campaign
  }

  enterCampaign();
}

function showEventCard(event) {
  G.phase = 'event';
  document.getElementById('campaign-section').classList.add('hidden');
  document.getElementById('event-section').classList.remove('hidden');
  document.getElementById('action-buttons').classList.add('hidden');
  document.getElementById('standings-section').classList.add('hidden');
  document.getElementById('policies-section').classList.add('hidden');

  document.getElementById('event-year-label').textContent = G.year;
  document.getElementById('event-title').textContent = event.title;
  document.getElementById('event-description').textContent = event.description;

  // Show effects
  const efxEl = document.getElementById('event-effects');
  efxEl.innerHTML = '';
  for (const eff of event.effects) {
    const partyId = eff.party === 'SELF' ? G.playerParty :
      eff.party === 'LEADER' ? 'CPC' : eff.party;
    const partyName = PARTIES[partyId]?.shortName || eff.party;
    const target = eff.province || eff.region || 'all';
    const sign = eff.delta > 0 ? '+' : '';
    const color = eff.delta > 0 ? '#7fc97f' : '#fc8d59';
    const div = document.createElement('div');
    div.className = 'effect-row';
    div.innerHTML = `<span style="color:${PARTIES[partyId]?.color}">${partyName}</span>
      <span class="eff-target">${target.toUpperCase()}</span>
      <span style="color:${color}">${sign}${eff.delta}%</span>`;
    efxEl.appendChild(div);
  }

  document.getElementById('event-dismiss-btn').onclick = () => {
    G.applyEvent(event);
    currentEventIndex++;
    if (currentEventIndex < G.pendingEvents.length) {
      showEventCard(G.pendingEvents[currentEventIndex]);
    } else {
      enterCampaign();
    }
  };

  renderGame();
}

function enterCampaign() {
  G.phase = 'campaign';

  document.getElementById('campaign-section').classList.remove('hidden');
  document.getElementById('event-section').classList.add('hidden');
  document.getElementById('action-buttons').classList.remove('hidden');
  document.getElementById('standings-section').classList.remove('hidden');
  document.getElementById('policies-section').classList.remove('hidden');

  updateCPDisplay();
  updatePolicies();
  renderGame();

  document.getElementById('run-election-btn').onclick = triggerElection;
}

function onProvinceClick(code, x, y) {
  if (!G || G.phase !== 'campaign') return;

  if (pendingPolicyChoice) {
    const card = pendingPolicyChoice;
    const choice = card.requiresChoice === 'region' ? PROVINCES[code].region : code;

    const result = G.playPolicyCard(card.id, choice);
    if (!result.ok) {
      showMessage(result.reason, 'warn');
    } else {
      const choiceName = card.requiresChoice === 'region' ? choice : PROVINCES[code].name;
      showMessage(`Played ${card.name} on ${choiceName}!`, 'info');
    }
    pendingPolicyChoice = null;
    updateCPDisplay();
    updatePolicies();
    renderGame();
    return;
  }

  const result = G.campaignInProvince(code);
  if (!result.ok) {
    showMessage(result.reason, 'warn');
    return;
  }
  updateCPDisplay();
  updatePolicies();
  renderGame();
  showMessage(`Campaigning in ${PROVINCES[code].name}! (+7% support)`, 'info');

  if (x !== undefined && y !== undefined && !document.getElementById('province-tooltip').classList.contains('hidden')) {
    showTooltip(code, x, y);
  }
}

function updateCPDisplay() {
  document.getElementById('cp-remaining').textContent = G.cpRemaining;
  document.getElementById('cp-remaining').style.color =
    G.cpRemaining <= 2 ? '#fc8d59' : '#7fc97f';
}

function updatePolicies() {
  const container = document.getElementById('policies-list');
  if (!container) return;
  container.innerHTML = '';

  if (G.phase !== 'campaign') return;

  const policies = G.availablePolicies;
  if (policies.length === 0) {
    container.innerHTML = '<p class="cp-hint">No policies available.</p>';
    return;
  }

  policies.forEach(card => {
    if (G.usedPolicies.has(card.id)) return;

    const div = document.createElement('div');
    div.className = 'policy-card-ui';
    const canAfford = G.cpRemaining >= card.cost;
    const isPending = pendingPolicyChoice && pendingPolicyChoice.id === card.id;

    if (!canAfford) div.classList.add('disabled');
    if (isPending) div.classList.add('pending');

    div.innerHTML = `
      <div class="pol-name">${card.name} (${card.cost} CP)</div>
      <div class="pol-desc">${card.description}</div>
    `;

    div.onclick = () => onPolicyClick(card);
    container.appendChild(div);
  });
}

function onPolicyClick(card) {
  if (G.phase !== 'campaign') return;
  if (G.cpRemaining < card.cost) {
    showMessage('Not enough CP for ' + card.name, 'warn');
    return;
  }

  if (card.requiresChoice) {
    if (pendingPolicyChoice && pendingPolicyChoice.id === card.id) {
      pendingPolicyChoice = null;
      showMessage('Policy cancelled.', 'info');
    } else {
      pendingPolicyChoice = card;
      showMessage(`Click a ${card.requiresChoice} on the map for ${card.name}!`, 'info');
    }
    updatePolicies();
    return;
  }

  // Play directly
  const res = G.playPolicyCard(card.id, null);
  if (res.ok) {
    showMessage(`Played ${card.name}!`, 'info');
    pendingPolicyChoice = null;
    updateCPDisplay();
    updatePolicies();
    renderGame();
  } else {
    showMessage(res.reason, 'warn');
  }
}

// ── Election ──────────────────────────────────────────────────

function triggerElection() {
  G.phase = 'election';
  pendingPolicyChoice = null;
  G.runAICampaign();
  lastElectionResults = G.runElection();
  showElectionResults(lastElectionResults);
}

function showElectionResults(results) {
  showScreen('screen-results');

  document.getElementById('results-year').textContent =
    `${results.year} Federal Election`;

  // Seat totals bar
  const bar = document.getElementById('results-seat-bar');
  bar.innerHTML = '';
  const allSeats = Object.entries(results.totalSeats).sort((a, b) => b[1] - a[1]);
  const total = Object.values(results.totalSeats).reduce((s, v) => s + v, 0);

  for (const [party, seats] of allSeats) {
    const seg = document.createElement('div');
    seg.className = 'seat-segment';
    seg.style.width = (seats / total * 100) + '%';
    seg.style.background = PARTIES[party]?.color || '#555';
    seg.innerHTML = `<span>${PARTIES[party]?.shortName || party}<br>${seats}</span>`;
    bar.appendChild(seg);
  }

  // Majority line indicator
  const majorityLine = document.createElement('div');
  majorityLine.className = 'majority-line';
  majorityLine.style.left = '50.3%';
  majorityLine.title = '170 seats — majority';
  bar.appendChild(majorityLine);

  // Province results grid
  const grid = document.getElementById('results-provinces');
  grid.innerHTML = '';

  const sortedBySeats = Object.entries(PROVINCES).sort((a, b) => b[1].seats - a[1].seats);
  for (const [code, data] of sortedBySeats) {
    const pSeats = results.provinceResults[code];
    const winner = Object.entries(pSeats || {}).sort((a, b) => b[1] - a[1])[0];
    if (!winner) continue;
    const [winParty, winSeats] = winner;
    const color = PARTIES[winParty]?.color || '#555';

    const cell = document.createElement('div');
    cell.className = 'result-province';
    cell.style.borderLeft = `4px solid ${color}`;
    cell.innerHTML = `
      <div class="rp-name">${code}</div>
      <div class="rp-winner" style="color:${color}">${PARTIES[winParty]?.shortName || winParty}</div>
      <div class="rp-seats">${winSeats}/${data.seats}</div>
    `;
    grid.appendChild(cell);
  }

  // Verdict
  const verdict = document.getElementById('results-verdict');
  const playerColor = PARTIES[G.playerParty].color;
  let verdictHTML = '';

  if (results.winner === G.playerParty) {
    verdictHTML = `<div class="verdict-win">
      <h2>🍁 Victory!</h2>
      <p>Your party won a <strong>${results.government}</strong> with <strong>${results.playerSeats} seats</strong>.</p>
      <p>You form the Government of Canada.</p>
    </div>`;
  } else {
    const playerSeats = results.playerSeats;
    const winnerName = PARTIES[results.winner]?.shortName || results.winner;
    verdictHTML = `<div class="verdict-loss">
      <h2>The ${winnerName} Win</h2>
      <p>Your party won <strong style="color:${playerColor}">${playerSeats} seats</strong>.</p>
      <p>The ${winnerName} form the ${results.government} government.</p>
    </div>`;
  }

  verdict.innerHTML = verdictHTML;

  // Button — check if this was the LAST election
  const continueBtn = document.getElementById('continue-btn');
  const isLastElection = G.electionIndex >= ELECTION_SCHEDULE.length - 1;
  if (isLastElection) {
    continueBtn.textContent = 'See Final Results →';
    continueBtn.onclick = showGameOver;
  } else {
    continueBtn.textContent = `Continue to ${ELECTION_SCHEDULE[G.electionIndex + 1]} →`;
    continueBtn.onclick = advanceToNextElection;
  }
}

function advanceToNextElection() {
  const hasMore = G.advance();
  if (!hasMore) {
    showGameOver();
    return;
  }
  showScreen('screen-game');
  renderGame();
  startCampaignPhase();
}

// ── Game Over ─────────────────────────────────────────────────

function showGameOver() {
  showScreen('screen-gameover');
  const result = G.getFinalScore();

  document.getElementById('final-score-value').textContent = result.score;
  document.getElementById('final-grade').textContent = result.grade;
  document.getElementById('final-comment').textContent = result.comment;
  document.getElementById('final-pm-count').textContent = result.timesPM;
  document.getElementById('final-total-seats').textContent = result.totalSeats;

  // History table
  const tbody = document.getElementById('history-tbody');
  tbody.innerHTML = '';
  for (const h of G.history) {
    const tr = document.createElement('tr');
    const winner = PARTIES[h.winner]?.shortName || h.winner;
    const wColor = PARTIES[h.winner]?.color || '#fff';
    const pColor = PARTIES[G.playerParty]?.color || '#fff';
    const isPM = h.winner === G.playerParty;
    tr.innerHTML = `
      <td>${h.year}</td>
      <td style="color:${pColor}">${h.playerSeats}</td>
      <td style="color:${wColor}">${winner} (${h.winnerSeats})</td>
      <td>${h.government}</td>
      <td>${isPM ? '✓ PM' : '—'}</td>
    `;
    tbody.appendChild(tr);
  }

  document.getElementById('play-again-btn').onclick = () => location.reload();
}

// ── Render All ────────────────────────────────────────────────

function renderGame() {
  updateMapColors();
  updateHeader();
  updatePollingBar();
  updateStandings();
}

// ── Utility ───────────────────────────────────────────────────

function showMessage(msg, type = 'info') {
  const el = document.getElementById('game-message');
  if (!el) return;
  el.textContent = msg;
  el.className = `game-message ${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 2500);
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  buildMap();
  initSetupScreen();
  showScreen('screen-setup');
});
