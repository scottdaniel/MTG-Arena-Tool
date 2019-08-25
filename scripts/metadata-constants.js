const electron = require("electron");

exports.LANGUAGES = ["EN"];

/*
  "Kaladesh": {
    collation: 62242,
    scryfall: "kld",
    code: "KLD",
    arenacode: "KLD",
    tile: 63859
  },
  "Aether Revolt": {
    collation: 62979,
    scryfall: "aer",
    code: "AER",
    arenacode: "AER",
    tile: 64647
  },
  "Welcome Deck 2017": {
    collation: false,
    scryfall: "w17",
    code: "W17",
    arenacode: "W17",
    tile: 67106
  },
  "Amonkhet": {
    collation: 100003,
    scryfall: "akh",
    code: "AKH",
    arenacode: "AKH",
    tile: 64827
  },
  "Hour of Devastation": {
    collation: 100004,
    scryfall: "hou",
    code: "HOU",
    arenacode: "HOU",
    tile: 65759
  },
  "Oath of the Gatewatch": {
    collation: false,
    scryfall: "ogw",
    code: "OGW",
    arenacode: "OGW",
    tile: 67106
  },
*/
exports.SETS_DATA = {
  Ixalan: {
    collation: 100005,
    scryfall: "xln",
    code: "XLN",
    arenacode: "XLN",
    tile: 66433,
    release: "2017-09-29"
  },
  "Rivals of Ixalan": {
    collation: 100006,
    scryfall: "rix",
    code: "RIX",
    arenacode: "RIX",
    tile: 66937,
    release: "2018-01-19"
  },
  Dominaria: {
    collation: 100007,
    scryfall: "dom",
    code: "DOM",
    arenacode: "DAR",
    tile: 67106,
    release: "2018-04-27"
  },
  "Core Set 2019": {
    collation: 100008,
    scryfall: "m19",
    code: "M19",
    arenacode: "M19",
    tile: 68116,
    release: "2018-07-13"
  },
  Arena: {
    collation: false,
    scryfall: "ana",
    code: "ANA",
    arenacode: "ANA",
    tile: 67106,
    release: "2018-07-14"
  },
  "Guilds of Ravnica": {
    collation: 100009,
    scryfall: "grn",
    code: "GRN",
    arenacode: "GRN",
    tile: 68674,
    release: "2018-10-05"
  },
  "Mythic Edition": {
    collation: -1,
    scryfall: "med",
    code: "MED",
    arenacode: "MED",
    tile: 68674,
    release: "2018-10-06"
  },
  "M19 Gift Pack": {
    collation: false,
    scryfall: "g18",
    code: "G18",
    arenacode: "G18",
    tile: 68116,
    release: "2018-07-13"
  },
  "Ravnica Allegiance": {
    collation: 100010,
    scryfall: "rna",
    code: "RNA",
    arenacode: "RNA",
    tile: 69294,
    release: "2019-01-25"
  },
  "War of the Spark": {
    collation: 100013,
    scryfall: "war",
    code: "WAR",
    arenacode: "WAR",
    tile: 69656,
    release: "2019-05-03"
  },
  "Core Set 2020": {
    collation: 100014,
    scryfall: "m20",
    code: "M20",
    arenacode: "M20",
    tile: 69912,
    release: "2019-07-12"
  },
  Mirage: {
    collation: -1,
    scryfall: "mir",
    code: "MI",
    arenacode: "MI",
    tile: 67003,
    release: "1996-10-08"
  },
  "Battle for Zendikar": {
    collation: -1,
    scryfall: "bfz",
    code: "BFZ",
    arenacode: "BFZ",
    tile: 67003,
    release: "2015-10-02"
  },
  "Return to Ravnica": {
    collation: -1,
    scryfall: "rtr",
    code: "RTR",
    arenacode: "RTR",
    tile: 67003,
    release: "2012-10-05"
  },
  "Rise of Eldrazi": {
    collation: -1,
    scryfall: "roe",
    code: "ROE",
    arenacode: "ROE",
    tile: 67003,
    release: "2010-04-23"
  },
  Amonkhet: {
    collation: -1,
    scryfall: "akh",
    code: "AKH",
    arenacode: "AKH",
    tile: 64827,
    release: "2017-04-28"
  },
  "": {
    collation: -1,
    scryfall: "",
    code: "",
    arenacode: "",
    tile: 67003,
    release: "2000-00-00"
  }
};

exports.COLORS = ["{?}", "{W}", "{U}", "{B}", "{R}", "{G}", "{C}", "", "{X}"];

exports.RARITY = ["token", "land", "common", "uncommon", "rare", "mythic"];

exports.SET_NAMES = {
  W17: "Welcome Deck 2017",
  KLD: "Kaladesh",
  AER: "Aether Revolt",
  AKH: "Amonkhet",
  HOU: "Hour of Devastation",
  XLN: "Ixalan",
  RIX: "Rivals of Ixalan",
  DAR: "Dominaria",
  OGW: "Oath of the Gatewatch",
  M19: "Core Set 2019",
  ANA: "Arena",
  GRN: "Guilds of Ravnica",
  G18: "M19 Gift Pack",
  RNA: "Ravnica Allegiance",
  WAR: "War of the Spark",
  M20: "Core Set 2020",
  MI: "Mirage",
  ROE: "Rise of Eldrazi",
  RTR: "Return to Ravnica",
  BFZ: "Battle for Zendikar"
};

exports.NO_DUPES_ART_SETS = [
  "pm20",
  "g18",
  "pgrn",
  "pdom",
  "prix",
  "f05",
  "roe",
  "rtr",
  "bfz",
  "unh",
  "c16",
  "mir"
];

exports.ALLOWED_SCRYFALL = [
  "m20",
  "war",
  "rna",
  "grn",
  "med",
  "m19",
  "ana",
  "dom",
  "rix",
  "xln",
  "tm20",
  "twar",
  "trna",
  "tgrn",
  "tm19",
  "tdom",
  "trix",
  "txln",
  "pm20",
  "g18",
  "pgrn",
  "pdom",
  "prix",
  "f05",
  "roe",
  "rtr",
  "bfz",
  "mir",
  "akh",
  "unh",
  "c16"
];

exports.RANKS_SHEETS = [
  {
    setCode: "war",
    sheet: "1pk3a1YKGas-NI4ze_8hbwOtVRdYAbzCDIBS9MKjcQ7M",
    page: "Table%20Source"
  },
  {
    setCode: "rna",
    sheet: "1DfcITmtWaBHtiDYLYWHzizw-AOrB3GUQaapc_BqfeH4",
    page: "Table%20Source"
  },
  {
    setCode: "grn",
    sheet: "1FPN3hgl6x_ePq-8On7Ebr8L6WHSU2IznoWSBoGaC_RQ",
    page: "Table%20Source"
  },
  {
    setCode: "m19",
    sheet: "1aZlqE-8mGdfQ50NXUaP-9dRk3w_hp9XmcBqZ_4x3_jk",
    page: "TableSource"
  },
  {
    setCode: "dom",
    sheet: "1cc-AOmpQZ7vKqxDTSSvhmRBVOCy_569kT0S-j-Rpbj8",
    page: "Table%20Source"
  },
  {
    setCode: "rix",
    sheet: "1CNg-FDp-pOtQ14Qj-rIBO-yfyr5YcPA6n6ztrEe4ATg",
    page: "TableSource"
  },
  {
    setCode: "xln",
    sheet: "1KDtLJd6Nkrv_DDpFs84soBZcWPG1tg79TnVEh-enPz8",
    page: "TableSource"
  },
  {
    setCode: "m20",
    sheet: "1BAPtQv4U9KUAtVzkccJlPS8cb0s_uOcGEDORip5uaQg",
    page: "Table%20Source"
  }
];

exports.APPDATA = (electron.app || electron.remote.app).getPath("userData");
