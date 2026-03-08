/**
 * Example project data — a realistic sample budget for reference.
 * Loaded as a read-only example on the dashboard.
 */
const EXAMPLE_DATA = {
  meta: {
    heroSubtitle: "SAMPLE ARTIST",
    heroTitle: "SUMMER SHOWCASE 2026",
    metaType: "Live Event",
    metaDates: "JUN 12-14, 2026",
    metaLocation: "Atlanta, GA",
    metaDuration: "3 DAYS",
    metaCrew: "12 MEMBERS",
    metaStatus: "PRE-PRODUCTION"
  },
  settings: {
    income: "75000",
    contingencyPct: "10",
    mgmtPct: "15",
    agentPct: "10",
    bizPct: "5",
    lawyerPct: "2",
    pdDefaultRate: "50",
    hotelTax: "16",
    hotelDefaultRooms: "8"
  },
  payrollBlocks: [
    { id: "pay_0", name: "SHOW DAYS" },
    { id: "pay_1", name: "REHEARSAL" }
  ],
  payBlockCounter: 2,
  activeTabs: ["overview", "notescomms", "payroll", "perdiems", "hotel", "airfares", "crew"],
  tables: {
    "pay_0_body": [
      ["Artist", "Artist", "1", "5000"],
      ["DJ", "DJ Mike", "2", "1500"],
      ["Keys / MD", "Sarah Keys", "2", "1200"],
      ["Drums", "Marcus Bell", "2", "1000"],
      ["Bass", "Lisa Chen", "2", "1000"],
      ["Guitar", "Dante Williams", "2", "1000"],
      ["Vocals / BG", "Kaya Johnson", "2", "800"],
      ["Tour Manager", "Trey Adams", "3", "750"]
    ],
    "pay_1_body": [
      ["DJ", "DJ Mike", "1", "750"],
      ["Keys / MD", "Sarah Keys", "1", "600"],
      ["Drums", "Marcus Bell", "1", "500"],
      ["Bass", "Lisa Chen", "1", "500"],
      ["Guitar", "Dante Williams", "1", "500"],
      ["Vocals / BG", "Kaya Johnson", "1", "400"]
    ],
    "pdBody": [
      ["Artist", "", "3", "75"],
      ["DJ", "DJ Mike", "3", "50"],
      ["Keys / MD", "Sarah Keys", "3", "50"],
      ["Drums", "Marcus Bell", "3", "50"],
      ["Bass", "Lisa Chen", "3", "50"],
      ["Guitar", "Dante Williams", "3", "50"],
      ["Vocals / BG", "Kaya Johnson", "3", "50"],
      ["Tour Manager", "Trey Adams", "3", "50"],
      ["Sound Engineer", "James Wright", "3", "50"],
      ["Lighting Director", "Nina Patel", "3", "50"],
      ["Stage Manager", "Carlos Rivera", "3", "50"],
      ["Wardrobe / Glam", "Aisha Brooks", "3", "50"]
    ],
    "hotelBody": [
      ["06/12", "Atlanta, GA", "Artist", "06/15/1990", "", "Hilton Atlanta Downtown", "1", "3", "259"],
      ["06/11", "Atlanta, GA", "DJ Mike", "03/22/1988", "", "Hilton Atlanta Downtown", "1", "4", "189"],
      ["06/11", "Atlanta, GA", "Sarah Keys", "11/08/1992", "", "Hilton Atlanta Downtown", "1", "4", "189"],
      ["06/11", "Atlanta, GA", "Marcus Bell", "07/30/1991", "", "Hilton Atlanta Downtown", "1", "4", "189"],
      ["06/11", "Atlanta, GA", "Lisa Chen", "04/12/1993", "", "Hilton Atlanta Downtown", "1", "4", "189"],
      ["06/11", "Atlanta, GA", "Dante Williams", "09/25/1990", "", "Hilton Atlanta Downtown", "1", "4", "189"],
      ["06/11", "Atlanta, GA", "Kaya Johnson", "01/18/1995", "", "Hilton Atlanta Downtown", "1", "4", "189"],
      ["06/11", "Atlanta, GA", "Trey Adams", "12/04/1987", "", "Hilton Atlanta Downtown", "1", "4", "189"]
    ],
    "flightBody": [
      ["06/11", "LAX → ATL", "DJ Mike", "03/22/1988", "", "Economy", "385", "1", "0"],
      ["06/15", "ATL → LAX", "DJ Mike", "03/22/1988", "", "Economy", "340", "1", "0"],
      ["06/11", "JFK → ATL", "Sarah Keys", "11/08/1992", "", "Economy", "290", "1", "0"],
      ["06/15", "ATL → JFK", "Sarah Keys", "11/08/1992", "", "Economy", "310", "1", "0"],
      ["06/11", "ORD → ATL", "Marcus Bell", "07/30/1991", "", "Economy", "265", "1", "0"],
      ["06/15", "ATL → ORD", "Marcus Bell", "07/30/1991", "", "Economy", "280", "1", "0"],
      ["06/11", "SFO → ATL", "Lisa Chen", "04/12/1993", "", "Economy", "410", "1", "0"],
      ["06/15", "ATL → SFO", "Lisa Chen", "04/12/1993", "", "Economy", "395", "1", "0"]
    ],
    "crewBody": [
      ["Artist", "Artist", "", "", "Confirmed"],
      ["DJ", "DJ Mike", "310-555-0101", "djmike@email.com", "Confirmed"],
      ["Keys / MD", "Sarah Keys", "212-555-0102", "sarah@email.com", "Confirmed"],
      ["Drums", "Marcus Bell", "312-555-0103", "marcus@email.com", "Confirmed"],
      ["Bass", "Lisa Chen", "415-555-0104", "lisa@email.com", "Confirmed"],
      ["Guitar", "Dante Williams", "310-555-0105", "dante@email.com", "Confirmed"],
      ["Vocals / BG", "Kaya Johnson", "404-555-0106", "kaya@email.com", "Confirmed"],
      ["Tour Manager", "Trey Adams", "615-555-0107", "trey@nappyboylive.com", "Confirmed"],
      ["Sound Engineer", "James Wright", "615-555-0108", "james@email.com", "Pending"],
      ["Lighting Director", "Nina Patel", "323-555-0109", "nina@email.com", "Confirmed"],
      ["Stage Manager", "Carlos Rivera", "404-555-0110", "carlos@email.com", "Pending"],
      ["Wardrobe / Glam", "Aisha Brooks", "404-555-0111", "aisha@email.com", "Confirmed"]
    ]
  },
  customSections: [],
  guests: [],
  schedule: null,
  notes: "VENUE: State Farm Arena - Atlanta, GA\nLOAD IN: June 12, 8:00 AM\nSOUNDCHECK: June 12, 2:00 PM - 4:00 PM\nDOORS: 7:00 PM  |  SHOWTIME: 9:00 PM\n\nCATERING: Backstage rider submitted to venue 4/15. Confirm dressing room specs by 5/1.\n\nMERCH: 500 tees, 200 hoodies ordered. Confirm merch table location with venue.\n\nPARKING: 2 bus passes + 12 car passes requested. Awaiting confirmation.\n\nSPECIAL NOTES:\n- Artist requires private dressing room with full-length mirror\n- Band requires separate green room\n- Wireless IEM system (12 packs) — confirm with production\n- LED wall specs sent to LD — awaiting programming schedule",
  contacts: [
    ["Promoter", "David Thompson", "404-555-0142", "dthompson@liveshows.com"],
    ["Venue Rep", "Angela Morris", "404-555-0198", "amorris@statefarm-arena.com"],
    ["Production Mgr", "Ray Castillo", "310-555-0177", "ray@prodco.com"],
    ["Travel Agent", "Kim Nguyen", "212-555-0163", "kim@traveldesk.com"]
  ],
  links: [
    { date: "03/15/26", label: "Tech Package - State Farm Arena", type: "Tech Package", url: "https://example.com/tech-package.pdf" },
    { date: "03/20/26", label: "Hospitality Rider", type: "Google Doc", url: "https://docs.google.com/example-rider" },
    { date: "04/01/26", label: "Venue Contract (Signed)", type: "Contract", url: "https://example.com/contract-signed.pdf" },
    { date: "04/10/26", label: "Production Advance Sheet", type: "Google Doc", url: "https://docs.google.com/example-advance" }
  ],
  emailLog: [
    {
      date: "03/10/26",
      from: "David Thompson <dthompson@liveshows.com>",
      to: "Trey Adams <trey@nappyboylive.com>",
      subject: "RE: Summer Showcase 2026 - Confirmed",
      body: "Hey Trey,\n\nGreat news — the date is locked in for June 13th at State Farm Arena. We're looking at an 8,500 cap for this one.\n\nI'll send over the full contract by end of week. Let me know your hospitality rider and tech requirements ASAP so we can get those to the venue.\n\nLooking forward to a great show.\n\nBest,\nDavid"
    },
    {
      date: "04/02/26",
      from: "Ray Castillo <ray@prodco.com>",
      to: "Trey Adams <trey@nappyboylive.com>",
      subject: "Production Advance - Summer Showcase",
      body: "Trey,\n\nAttached is the production advance sheet. Key items we need to confirm:\n\n1. LED wall size — we're planning 40x20, confirm with your LD\n2. FOH console preference — we have an Avantis on hold\n3. Monitor world — 12 wireless IEM packs confirmed\n4. Backline — drum kit + bass rig provided, everything else flies in\n\nLet's schedule a call this week to walk through the advance.\n\nRay"
    }
  ]
};
