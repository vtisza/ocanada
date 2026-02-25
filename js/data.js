// ============================================================
// O CANADA: Power & Politics in the True North, 1950–2030
// data.js — All static game data
// ============================================================

const PARTIES = {
  LPC: {
    id: 'LPC', name: 'Liberal Party of Canada', shortName: 'Liberal',
    color: '#D71920', colorLight: '#FF6B6B', colorDark: '#8B0000',
    description: 'Centrist. Strong in Ontario, Quebec, Atlantic Canada. Focuses on social programs and national unity.',
    ideology: 'Centre / Centre-Left',
  },
  CPC: {
    id: 'CPC', name: 'Progressive Conservative / Conservative', shortName: 'Conservative',
    color: '#1A4FBA', colorLight: '#6699DD', colorDark: '#0A2060',
    description: 'Centre-Right. Strong in Western Canada and rural Ontario. Fiscal responsibility and free enterprise.',
    ideology: 'Centre-Right',
  },
  NDP: {
    id: 'NDP', name: 'NDP / CCF', shortName: 'NDP',
    color: '#F37021', colorLight: '#FFB366', colorDark: '#8B4000',
    description: 'Left. Strong in Prairie provinces and BC. Workers\' rights, universal healthcare, progressive policies.',
    ideology: 'Centre-Left / Left',
  },
  BQ: {
    id: 'BQ', name: 'Bloc Québécois', shortName: 'Bloc Québécois',
    color: '#00ADEF', colorLight: '#66DDFF', colorDark: '#005577',
    description: 'Quebec sovereigntist party. Only runs in Quebec. Centre-left on social issues.',
    ideology: 'Quebec Nationalism',
    quebecOnly: true,
    establishedYear: 1991,
  },
};

// Province tiles on the schematic map (x, y, w, h in SVG units)
// Canvas: 905 × 295
const PROVINCES = {
  YT: { name: 'Yukon', abbr: 'YT', region: 'north', seats: 1,
        tile: { x: 5,   y: 5,  w: 105, h: 70 }, established: 1898 },
  NT: { name: 'Northwest Territories', abbr: 'NT', region: 'north', seats: 1,
        tile: { x: 120, y: 5,  w: 225, h: 70 }, established: 1870 },
  NU: { name: 'Nunavut', abbr: 'NU', region: 'north', seats: 1,
        tile: { x: 355, y: 5,  w: 225, h: 70 }, established: 1999 },
  BC: { name: 'British Columbia', abbr: 'BC', region: 'west', seats: 42,
        tile: { x: 5,   y: 85, w: 105, h: 100 } },
  AB: { name: 'Alberta', abbr: 'AB', region: 'west', seats: 34,
        tile: { x: 120, y: 85, w: 105, h: 100 } },
  SK: { name: 'Saskatchewan', abbr: 'SK', region: 'prairies', seats: 14,
        tile: { x: 235, y: 85, w: 105, h: 100 } },
  MB: { name: 'Manitoba', abbr: 'MB', region: 'prairies', seats: 14,
        tile: { x: 350, y: 85, w: 105, h: 100 } },
  ON: { name: 'Ontario', abbr: 'ON', region: 'central', seats: 121,
        tile: { x: 465, y: 85, w: 145, h: 100 } },
  QC: { name: 'Québec', abbr: 'QC', region: 'central', seats: 78,
        tile: { x: 620, y: 80, w: 155, h: 105 } },
  NL: { name: 'Newfoundland & Labrador', abbr: 'NL', region: 'atlantic', seats: 7,
        tile: { x: 785, y: 80, w: 115, h: 105 } },
  NB: { name: 'New Brunswick', abbr: 'NB', region: 'atlantic', seats: 10,
        tile: { x: 620, y: 195, w: 90,  h: 80 } },
  NS: { name: 'Nova Scotia', abbr: 'NS', region: 'atlantic', seats: 11,
        tile: { x: 720, y: 195, w: 90,  h: 80 } },
  PE: { name: 'Prince Edward Island', abbr: 'PE', region: 'atlantic', seats: 4,
        tile: { x: 820, y: 195, w: 80,  h: 80 } },
};

// Region groupings for events
const REGIONS = {
  west:     ['BC', 'AB'],
  prairies: ['SK', 'MB'],
  central:  ['ON', 'QC'],
  atlantic: ['NB', 'NS', 'PE', 'NL'],
  north:    ['YT', 'NT', 'NU'],
  all:      Object.keys(PROVINCES),
};

// Starting support values (1953 baseline, approximate)
// Based on 1953 federal election and provincial political landscapes
const STARTING_SUPPORT = {
  YT: { LPC: 55, CPC: 30, NDP: 15, BQ: 0 },
  NT: { LPC: 55, CPC: 30, NDP: 15, BQ: 0 },
  NU: { LPC: 50, CPC: 25, NDP: 25, BQ: 0 },
  BC: { LPC: 35, CPC: 25, NDP: 33, BQ: 0 },
  AB: { LPC: 20, CPC: 30, NDP:  5, BQ: 0 },  // Social Credit dominated (mapped to CPC)
  SK: { LPC: 40, CPC: 15, NDP: 45, BQ: 0 },  // CCF stronghold
  MB: { LPC: 50, CPC: 30, NDP: 18, BQ: 0 },
  ON: { LPC: 47, CPC: 43, NDP: 10, BQ: 0 },
  QC: { LPC: 68, CPC: 28, NDP:  4, BQ: 0 },
  NB: { LPC: 52, CPC: 43, NDP:  5, BQ: 0 },
  NS: { LPC: 50, CPC: 44, NDP:  6, BQ: 0 },
  PE: { LPC: 55, CPC: 44, NDP:  1, BQ: 0 },
  NL: { LPC: 72, CPC: 25, NDP:  3, BQ: 0 },
};

// Federal election schedule
const ELECTION_SCHEDULE = [
  1953, 1957, 1958, 1962, 1963, 1965, 1968, 1972, 1974,
  1979, 1980, 1984, 1988, 1993, 1997, 2000, 2004, 2006,
  2008, 2011, 2015, 2019, 2021, 2025, 2029,
];

// Historical event cards
// Effects: { party, province|region, delta }
// delta > 0 = gain, delta < 0 = loss
// province can be a province code, region name, or 'all'
const EVENTS = [
  // ── 1950s ──
  {
    id: 'E001', minYear: 1953, maxYear: 1957,
    title: 'The Pipeline Debate',
    description: 'The Liberal government uses closure to ram through a controversial pipeline bill, outraging Parliament and the press.',
    effects: [
      { party: 'LPC', region: 'all',     delta: -8 },
      { party: 'CPC', region: 'all',     delta: +6 },
      { party: 'NDP', region: 'all',     delta: +3 },
    ],
  },
  {
    id: 'E002', minYear: 1953, maxYear: 1960,
    title: 'Avro Arrow Cancellation',
    description: 'The PC government cancels the CF-105 Avro Arrow, killing Canada\'s world-leading fighter jet program and thousands of aerospace jobs.',
    effects: [
      { party: 'CPC', province: 'ON',    delta: -10 },
      { party: 'LPC', province: 'ON',    delta: +5  },
      { party: 'NDP', province: 'ON',    delta: +4  },
    ],
  },
  {
    id: 'E003', minYear: 1953, maxYear: 1962,
    title: 'Diefenbaker\'s Northern Vision',
    description: 'PM Diefenbaker\'s "Roads to Resources" program sparks excitement about northern development.',
    effects: [
      { party: 'CPC', region: 'north',   delta: +12 },
      { party: 'CPC', region: 'prairies',delta: +6  },
    ],
  },
  {
    id: 'E004', minYear: 1958, maxYear: 1963,
    title: 'Bomarc Missile Crisis',
    description: 'A dispute over nuclear warheads splits the PC cabinet and embarrasses Canada on the world stage.',
    effects: [
      { party: 'CPC', region: 'all',     delta: -9  },
      { party: 'LPC', region: 'all',     delta: +5  },
    ],
  },

  // ── 1960s ──
  {
    id: 'E010', minYear: 1960, maxYear: 1968,
    title: 'Quiet Revolution in Quebec',
    description: 'Quebec undergoes rapid modernization, secularization, and a surge of nationalist sentiment.',
    effects: [
      { party: 'LPC', province: 'QC',    delta: -6  },
      { party: 'NDP', province: 'QC',    delta: -4  },
    ],
  },
  {
    id: 'E011', minYear: 1962, maxYear: 1968,
    title: 'Pearson\'s Medicare',
    description: 'The Liberal government introduces universal hospital insurance and lays the groundwork for medicare.',
    effects: [
      { party: 'LPC', region: 'all',     delta: +7  },
      { party: 'NDP', region: 'all',     delta: +4  },
      { party: 'CPC', region: 'all',     delta: -4  },
    ],
  },
  {
    id: 'E012', minYear: 1965, maxYear: 1968,
    title: 'Expo 67 & Centennial Pride',
    description: 'Montreal\'s World\'s Fair and Canada\'s 100th birthday trigger an outpouring of national pride.',
    effects: [
      { party: 'LPC', region: 'all',     delta: +8  },
    ],
  },
  {
    id: 'E013', minYear: 1966, maxYear: 1970,
    title: 'Trudeaumania!',
    description: 'Pierre Trudeau\'s charismatic leadership sparks unprecedented excitement about the Liberal Party.',
    effects: [
      { party: 'LPC', region: 'all',     delta: +14 },
      { party: 'CPC', region: 'all',     delta: -7  },
      { party: 'NDP', region: 'all',     delta: -4  },
    ],
  },

  // ── 1970s ──
  {
    id: 'E020', minYear: 1970, maxYear: 1975,
    title: 'October Crisis',
    description: 'The FLQ kidnaps politicians in Quebec. Trudeau invokes the War Measures Act — popular nationally but divisive in Quebec.',
    effects: [
      { party: 'LPC', region: 'all',     delta: +6  },
      { party: 'LPC', province: 'QC',    delta: -5  },
    ],
  },
  {
    id: 'E021', minYear: 1972, maxYear: 1975,
    title: 'NDP Holds the Balance of Power',
    description: 'The NDP supports the minority Liberal government, winning significant policy concessions.',
    effects: [
      { party: 'NDP', region: 'all',     delta: +8  },
      { party: 'LPC', region: 'all',     delta: +3  },
    ],
  },
  {
    id: 'E022', minYear: 1973, maxYear: 1978,
    title: 'Global Oil Crisis',
    description: 'OPEC oil embargo sends energy prices soaring. Alberta booms; central Canada struggles.',
    effects: [
      { party: 'CPC', province: 'AB',    delta: +10 },
      { party: 'CPC', province: 'SK',    delta: +5  },
      { party: 'LPC', province: 'ON',    delta: -5  },
      { party: 'LPC', province: 'QC',    delta: -5  },
    ],
  },
  {
    id: 'E023', minYear: 1975, maxYear: 1979,
    title: 'Parti Québécois Elected',
    description: 'René Lévesque\'s PQ wins the 1976 Quebec election, putting Quebec sovereignty on the agenda.',
    effects: [
      { party: 'LPC', province: 'QC',    delta: -8  },
      { party: 'BQ',  province: 'QC',    delta: +10 },
      { party: 'LPC', region: 'all',     delta: -3  },
    ],
  },
  {
    id: 'E024', minYear: 1977, maxYear: 1981,
    title: 'Bill 101 — French Language Charter',
    description: 'Quebec\'s Charter of the French Language makes French the only official language of Quebec.',
    effects: [
      { party: 'BQ',  province: 'QC',    delta: +8  },
      { party: 'LPC', province: 'QC',    delta: +4  },
      { party: 'CPC', province: 'QC',    delta: -5  },
    ],
  },

  // ── 1980s ──
  {
    id: 'E030', minYear: 1979, maxYear: 1982,
    title: 'Quebec Referendum — Non l\'emporte',
    description: 'Quebecers vote 60-40 to stay in Canada. Trudeau promises constitutional renewal.',
    effects: [
      { party: 'LPC', province: 'QC',    delta: +10 },
      { party: 'LPC', region: 'all',     delta: +5  },
      { party: 'BQ',  province: 'QC',    delta: -8  },
    ],
  },
  {
    id: 'E031', minYear: 1980, maxYear: 1984,
    title: 'National Energy Program',
    description: 'Trudeau\'s NEP caps oil prices and taxes Alberta\'s energy revenues, sparking massive western alienation.',
    effects: [
      { party: 'LPC', province: 'AB',    delta: -25 },
      { party: 'LPC', province: 'BC',    delta: -10 },
      { party: 'LPC', province: 'SK',    delta: -8  },
      { party: 'CPC', province: 'AB',    delta: +20 },
      { party: 'CPC', province: 'BC',    delta: +8  },
    ],
  },
  {
    id: 'E032', minYear: 1981, maxYear: 1985,
    title: 'Constitution Repatriated',
    description: 'Canada gets its own Constitution and Charter of Rights, but Quebec never signs. Legacy is mixed.',
    effects: [
      { party: 'LPC', region: 'all',     delta: +5  },
      { party: 'LPC', province: 'QC',    delta: -6  },
    ],
  },
  {
    id: 'E033', minYear: 1983, maxYear: 1987,
    title: 'Mulroney\'s Free Trade Push',
    description: 'PC PM Mulroney negotiates the Canada-US Free Trade Agreement, deeply dividing Canadians.',
    effects: [
      { party: 'CPC', region: 'west',    delta: +8  },
      { party: 'CPC', province: 'QC',    delta: +5  },
      { party: 'LPC', region: 'all',     delta: -4  },
      { party: 'NDP', region: 'all',     delta: +4  },
    ],
  },
  {
    id: 'E034', minYear: 1987, maxYear: 1991,
    title: 'Meech Lake Accord',
    description: 'Constitutional talks to bring Quebec into the Constitution fall apart, reigniting separatist sentiment.',
    effects: [
      { party: 'BQ',  province: 'QC',    delta: +10 },
      { party: 'CPC', region: 'all',     delta: -6  },
      { party: 'LPC', province: 'QC',    delta: -5  },
    ],
  },
  {
    id: 'E035', minYear: 1989, maxYear: 1992,
    title: 'GST Introduced',
    description: 'The 7% Goods and Services Tax is wildly unpopular, haunting the PC government.',
    effects: [
      { party: 'CPC', region: 'all',     delta: -10 },
      { party: 'LPC', region: 'all',     delta: +6  },
      { party: 'NDP', region: 'all',     delta: +3  },
    ],
  },

  // ── 1990s ──
  {
    id: 'E040', minYear: 1990, maxYear: 1994,
    title: 'Charlottetown Accord Fails',
    description: 'A broad constitutional accord fails in a national referendum, killing PC momentum and boosting Reform.',
    effects: [
      { party: 'CPC', region: 'all',     delta: -12 },
      { party: 'LPC', region: 'all',     delta: +5  },
      { party: 'NDP', region: 'all',     delta: +3  },
    ],
  },
  {
    id: 'E041', minYear: 1991, maxYear: 1995,
    title: 'Reform Party Surge',
    description: 'Preston Manning\'s Reform Party taps into western alienation and fiscal conservatism, devastating PC support in the West.',
    effects: [
      { party: 'CPC', province: 'AB',    delta: -18 },
      { party: 'CPC', province: 'BC',    delta: -12 },
      { party: 'CPC', province: 'SK',    delta: -8  },
      { party: 'CPC', province: 'MB',    delta: -6  },
    ],
  },
  {
    id: 'E042', minYear: 1993, maxYear: 1997,
    title: 'Chrétien\'s Deficit Cutting',
    description: 'The Liberal government makes dramatic spending cuts, balancing the budget by 1998.',
    effects: [
      { party: 'LPC', region: 'all',     delta: +7  },
      { party: 'NDP', region: 'all',     delta: -5  },
    ],
  },
  {
    id: 'E043', minYear: 1994, maxYear: 1997,
    title: 'Quebec Referendum 1995 — Non Wins by a Hair',
    description: 'Quebec votes 50.6% to remain in Canada. The near-miss shakes the nation.',
    effects: [
      { party: 'LPC', province: 'QC',    delta: +6  },
      { party: 'LPC', region: 'all',     delta: +4  },
      { party: 'BQ',  province: 'QC',    delta: -4  },
    ],
  },
  {
    id: 'E044', minYear: 1997, maxYear: 2002,
    title: 'Economic Boom (1990s Tech)',
    description: 'Canada shares in the global economic boom. Unemployment falls, budget surpluses grow.',
    effects: [
      { party: 'LPC', region: 'all',     delta: +8  },
    ],
  },

  // ── 2000s ──
  {
    id: 'E050', minYear: 2001, maxYear: 2004,
    title: '9/11 and the War on Terror',
    description: 'Canada joins the response to 9/11 in Afghanistan but refuses to join the Iraq War.',
    effects: [
      { party: 'LPC', region: 'all',     delta: +5  },
      { party: 'NDP', region: 'all',     delta: +3  },
    ],
  },
  {
    id: 'E051', minYear: 2003, maxYear: 2006,
    title: 'Sponsorship Scandal',
    description: 'The Liberals are engulfed by a scandal using federal funds to promote federalism in Quebec.',
    effects: [
      { party: 'LPC', province: 'QC',    delta: -18 },
      { party: 'LPC', region: 'all',     delta: -10 },
      { party: 'BQ',  province: 'QC',    delta: +12 },
      { party: 'CPC', region: 'all',     delta: +8  },
    ],
  },
  {
    id: 'E052', minYear: 2003, maxYear: 2005,
    title: 'PC + Reform Alliance Merge',
    description: 'The right unites under Stephen Harper\'s Conservative Party of Canada, ending 10 years of vote splitting.',
    effects: [
      { party: 'CPC', province: 'AB',    delta: +12 },
      { party: 'CPC', province: 'BC',    delta: +8  },
      { party: 'CPC', province: 'SK',    delta: +6  },
      { party: 'CPC', province: 'MB',    delta: +5  },
      { party: 'CPC', province: 'ON',    delta: +5  },
    ],
  },
  {
    id: 'E053', minYear: 2005, maxYear: 2010,
    title: 'Harper\'s Accountability Act',
    description: 'Harper\'s minority government passes landmark ethics reforms, winning public trust.',
    effects: [
      { party: 'CPC', region: 'all',     delta: +6  },
      { party: 'LPC', region: 'all',     delta: -4  },
    ],
  },
  {
    id: 'E054', minYear: 2007, maxYear: 2010,
    title: 'Global Financial Crisis',
    description: 'The 2008 recession hits Canada. The Harper government launches a major stimulus program.',
    effects: [
      { party: 'NDP', region: 'all',     delta: +6  },
      { party: 'LPC', region: 'all',     delta: +4  },
      { party: 'CPC', region: 'all',     delta: -4  },
    ],
  },

  // ── 2010s ──
  {
    id: 'E060', minYear: 2010, maxYear: 2013,
    title: 'Jack Layton\'s Orange Wave',
    description: 'Under Jack Layton\'s inspirational leadership, the NDP surges nationally and in Quebec, becoming the Official Opposition.',
    effects: [
      { party: 'NDP', region: 'all',     delta: +12 },
      { party: 'NDP', province: 'QC',    delta: +18 },
      { party: 'BQ',  province: 'QC',    delta: -15 },
      { party: 'LPC', region: 'all',     delta: -8  },
    ],
  },
  {
    id: 'E061', minYear: 2012, maxYear: 2015,
    title: 'Senate Expense Scandal',
    description: 'Several Conservative senators claim improper expenses, damaging the Harper government\'s ethics record.',
    effects: [
      { party: 'CPC', region: 'all',     delta: -8  },
      { party: 'LPC', region: 'all',     delta: +4  },
      { party: 'NDP', region: 'all',     delta: +3  },
    ],
  },
  {
    id: 'E062', minYear: 2013, maxYear: 2015,
    title: 'Justin Trudeau Leads the Liberals',
    description: 'The young Justin Trudeau wins the Liberal leadership, revitalizing the party.',
    effects: [
      { party: 'LPC', region: 'all',     delta: +10 },
      { party: 'LPC', province: 'QC',    delta: +8  },
    ],
  },
  {
    id: 'E063', minYear: 2015, maxYear: 2019,
    title: 'Real Change — Trudeau Majority',
    description: 'The Liberals sweep to a strong majority on a platform of sunny ways, electoral reform, and legalizing cannabis.',
    effects: [
      { party: 'LPC', region: 'all',     delta: +12 },
      { party: 'NDP', region: 'all',     delta: -6  },
      { party: 'CPC', region: 'all',     delta: -8  },
    ],
  },
  {
    id: 'E064', minYear: 2017, maxYear: 2020,
    title: 'SNC-Lavalin Affair',
    description: 'Attorney General Jody Wilson-Raybould resigns, accusing the PM\'s office of political interference.',
    effects: [
      { party: 'LPC', region: 'all',     delta: -8  },
      { party: 'LPC', province: 'QC',    delta: -5  },
      { party: 'CPC', region: 'all',     delta: +5  },
    ],
  },
  {
    id: 'E065', minYear: 2018, maxYear: 2021,
    title: 'Cannabis Legalization',
    description: 'Canada becomes the second country in the world to federally legalize cannabis.',
    effects: [
      { party: 'LPC', region: 'all',     delta: +5  },
      { party: 'NDP', region: 'all',     delta: +3  },
    ],
  },

  // ── 2020s ──
  {
    id: 'E070', minYear: 2020, maxYear: 2022,
    title: 'COVID-19 Pandemic',
    description: 'The pandemic reshapes Canadian society. The federal government\'s CERB support wins broad approval.',
    effects: [
      { party: 'LPC', region: 'all',     delta: +10 },
      { party: 'NDP', region: 'all',     delta: +5  },
      { party: 'CPC', region: 'all',     delta: -5  },
    ],
  },
  {
    id: 'E071', minYear: 2021, maxYear: 2024,
    title: 'Inflation and Housing Crisis',
    description: 'Soaring inflation and unaffordable housing fuel public anger, especially among younger Canadians.',
    effects: [
      { party: 'LPC', region: 'all',     delta: -10 },
      { party: 'CPC', region: 'all',     delta: +8  },
      { party: 'NDP', region: 'all',     delta: +5  },
    ],
  },
  {
    id: 'E072', minYear: 2022, maxYear: 2025,
    title: 'Carbon Tax Debate',
    description: 'The federal carbon price becomes a lightning rod, uniting western premiers against the Liberals.',
    effects: [
      { party: 'LPC', province: 'AB',    delta: -10 },
      { party: 'LPC', province: 'SK',    delta: -8  },
      { party: 'LPC', province: 'MB',    delta: -5  },
      { party: 'CPC', region: 'west',    delta: +8  },
      { party: 'CPC', region: 'prairies',delta: +6  },
    ],
  },
  {
    id: 'E073', minYear: 2022, maxYear: 2027,
    title: 'Arctic Sovereignty Challenge',
    description: 'Growing Russian and Chinese activity in the Arctic forces Canada to invest in northern defence.',
    effects: [
      { party: 'LPC', region: 'north',   delta: +5  },
      { party: 'CPC', region: 'north',   delta: +5  },
    ],
  },
  {
    id: 'E074', minYear: 2023, maxYear: 2027,
    title: 'Reconciliation with Indigenous Peoples',
    description: 'Revelations from residential school sites deepen calls for truth and reconciliation.',
    effects: [
      { party: 'NDP', region: 'all',     delta: +6  },
      { party: 'LPC', region: 'all',     delta: +3  },
      { party: 'CPC', region: 'all',     delta: -3  },
    ],
  },
  {
    id: 'E075', minYear: 2025, maxYear: 2030,
    title: 'US-Canada Trade War Threat',
    description: 'American tariff threats force Canada to diversify trade relationships and shore up domestic industry.',
    effects: [
      { party: 'LPC', region: 'all',     delta: +4  },
      { party: 'CPC', region: 'all',     delta: +4  },
      { party: 'NDP', region: 'all',     delta: +3  },
    ],
  },
  {
    id: 'E076', minYear: 2025, maxYear: 2030,
    title: 'Climate Catastrophe Response',
    description: 'Extreme weather events drive urgent climate action to the top of the federal agenda.',
    effects: [
      { party: 'NDP', region: 'all',     delta: +8  },
      { party: 'LPC', region: 'all',     delta: +5  },
      { party: 'CPC', region: 'all',     delta: -6  },
    ],
  },
  {
    id: 'E077', minYear: 2026, maxYear: 2030,
    title: 'Aging Population Crisis',
    description: 'A wave of retiring Boomers strains pensions, healthcare, and the federal budget.',
    effects: [
      { party: 'NDP', region: 'all',     delta: +7  },
      { party: 'LPC', region: 'all',     delta: +3  },
      { party: 'CPC', region: 'all',     delta: +2  },
    ],
  },
];

// Policy cards the player can play once each
const POLICY_CARDS = [
  {
    id: 'P001', party: 'all',
    name: 'National Campaign Blitz',
    description: 'Launch a media campaign across all regions. Gain +3% support nationally.',
    cost: 4,
    effects: [{ party: 'SELF', region: 'all', delta: +3 }],
  },
  {
    id: 'P002', party: 'all',
    name: 'Grassroots Organizing',
    description: 'Focus ground-game efforts on your weakest region. Gain +8% support in chosen region.',
    cost: 3,
    effects: [{ party: 'SELF', region: 'CHOICE', delta: +8 }],
    requiresChoice: 'region',
  },
  {
    id: 'P003', party: 'LPC',
    name: 'National Unity Message',
    description: 'Emphasize Canadian unity. Strong in Quebec and Atlantic provinces.',
    cost: 3,
    effects: [
      { party: 'SELF', province: 'QC', delta: +6 },
      { party: 'SELF', region: 'atlantic', delta: +5 },
    ],
  },
  {
    id: 'P004', party: 'CPC',
    name: 'Western Alienation Appeal',
    description: 'Champion Western Canada\'s interests. Strong support boost in the West.',
    cost: 3,
    effects: [
      { party: 'SELF', region: 'west', delta: +8 },
      { party: 'SELF', region: 'prairies', delta: +6 },
    ],
  },
  {
    id: 'P005', party: 'NDP',
    name: 'Workers\' Coalition',
    description: 'Unite organized labour and working families. Broad moderate boost.',
    cost: 3,
    effects: [
      { party: 'SELF', province: 'ON', delta: +5 },
      { party: 'SELF', province: 'MB', delta: +6 },
      { party: 'SELF', province: 'BC', delta: +5 },
    ],
  },
  {
    id: 'P006', party: 'all',
    name: 'Attack Ad Campaign',
    description: 'Launch attack ads against the leading opposition party. They lose 5% nationally, you gain 3%.',
    cost: 3,
    effects: [
      { party: 'SELF',   region: 'all', delta: +3 },
      { party: 'LEADER', region: 'all', delta: -5 },
    ],
  },
  {
    id: 'P007', party: 'all',
    name: 'Leader\'s Tour',
    description: 'Your leader tours a struggling province intensively. Gain +12% support there.',
    cost: 4,
    effects: [{ party: 'SELF', province: 'CHOICE', delta: +12 }],
    requiresChoice: 'province',
  },
  {
    id: 'P008', party: 'LPC',
    name: 'Infrastructure Investment',
    description: 'Announce major infrastructure spending. Broad appeal in urban centres.',
    cost: 3,
    effects: [
      { party: 'SELF', province: 'ON', delta: +5 },
      { party: 'SELF', province: 'QC', delta: +4 },
      { party: 'SELF', province: 'BC', delta: +4 },
    ],
  },
  {
    id: 'P009', party: 'CPC',
    name: 'Tax Cut Pledge',
    description: 'Promise to cut income taxes. Resonates in Ontario and the West.',
    cost: 3,
    effects: [
      { party: 'SELF', province: 'ON', delta: +6 },
      { party: 'SELF', region: 'west', delta: +5 },
    ],
  },
  {
    id: 'P010', party: 'NDP',
    name: 'Pharmacare Promise',
    description: 'Promise universal drug coverage. Strong appeal across all provinces.',
    cost: 3,
    effects: [
      { party: 'SELF', region: 'all', delta: +5 },
    ],
  },
];
