export const COUNTRY_LABELS: Record<string, { ja: string; en: string }> = {
  FRA: { ja: "フランス", en: "France" },
  BEL: { ja: "ベルギー", en: "Belgium" },
  USA: { ja: "アメリカ", en: "USA" },
  NOR: { ja: "ノルウェー", en: "Norway" },
  CAN: { ja: "カナダ", en: "Canada" },
  RSA: { ja: "南アフリカ", en: "South Africa" },
  BIH: { ja: "ボスニア", en: "Bosnia and Herzegovina" },
  IRQ: { ja: "イラク", en: "Iraq" },
  HAI: { ja: "ハイチ", en: "Haiti" },
  ESP: { ja: "スペイン", en: "Spain" },
  MEX: { ja: "メキシコ", en: "Mexico" },
  SEN: { ja: "セネガル", en: "Senegal" },
  JPN: { ja: "日本", en: "Japan" },
  ECU: { ja: "エクアドル", en: "Ecuador" },
  KSA: { ja: "サウジアラビア", en: "Saudi Arabia" },
  PAR: { ja: "パラグアイ", en: "Paraguay" },
  SCO: { ja: "スコットランド", en: "Scotland" },
  ALG: { ja: "アルジェリア", en: "Algeria" },
  CPV: { ja: "カーボベルデ", en: "Cape Verde" },
  ENG: { ja: "イングランド", en: "England" },
  POR: { ja: "ポルトガル", en: "Portugal" },
  IRN: { ja: "イラン", en: "Iran" },
  MAR: { ja: "モロッコ", en: "Morocco" },
  AUS: { ja: "オーストラリア", en: "Australia" },
  EGY: { ja: "エジプト", en: "Egypt" },
  UZB: { ja: "ウズベキスタン", en: "Uzbekistan" },
  TUN: { ja: "チュニジア", en: "Tunisia" },
  COD: { ja: "コンゴ民主共和国", en: "DR Congo" },
  TUR: { ja: "トルコ", en: "Turkiye" },
  ARG: { ja: "アルゼンチン", en: "Argentina" },
  NED: { ja: "オランダ", en: "Netherlands" },
  CRO: { ja: "クロアチア", en: "Croatia" },
  KOR: { ja: "韓国", en: "Korea Republic" },
  QAT: { ja: "カタール", en: "Qatar" },
  CIV: { ja: "コートジボワール", en: "Cote d'Ivoire" },
  PAN: { ja: "パナマ", en: "Panama" },
  JOR: { ja: "ヨルダン", en: "Jordan" },
  CUW: { ja: "キュラソー", en: "Curacao" },
  BRA: { ja: "ブラジル", en: "Brazil" },
  GER: { ja: "ドイツ", en: "Germany" },
  URU: { ja: "ウルグアイ", en: "Uruguay" },
  COL: { ja: "コロンビア", en: "Colombia" },
  AUT: { ja: "オーストリア", en: "Austria" },
  SUI: { ja: "スイス", en: "Switzerland" },
  SWE: { ja: "スウェーデン", en: "Sweden" },
  CZE: { ja: "チェコ", en: "Czechia" },
  GHA: { ja: "ガーナ", en: "Ghana" },
  NZL: { ja: "ニュージーランド", en: "New Zealand" },
};

export function getCountryLabel(code: string, locale: "ja" | "en" = "ja") {
  return COUNTRY_LABELS[code]?.[locale] ?? code;
}

function normalizeCountryName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/['’.]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

const ENGLISH_NAME_ALIASES: Record<string, string> = {
  usa: "USA",
  united states: "USA",
  united states of america: "USA",
  bosnia and herzegovina: "BIH",
  dr congo: "COD",
  democratic republic of congo: "COD",
  democratic republic of the congo: "COD",
  congo kinshasa: "COD",
  cote divoire: "CIV",
  ivory coast: "CIV",
  turkey: "TUR",
  turkiye: "TUR",
  korea republic: "KOR",
  south korea: "KOR",
  curaçao: "CUW",
  curacao: "CUW",
  cape verde: "CPV",
  cabo verde: "CPV",
  czech republic: "CZE",
  czechia: "CZE",
};

const ENGLISH_NAME_TO_COUNTRY_CODE = new Map<string, string>(
  Object.entries(COUNTRY_LABELS).flatMap(([code, labels]) => [
    [normalizeCountryName(labels.en), code] as const,
  ]),
);

for (const [alias, code] of Object.entries(ENGLISH_NAME_ALIASES)) {
  ENGLISH_NAME_TO_COUNTRY_CODE.set(normalizeCountryName(alias), code);
}

export function findCountryCodeByEnglishName(name: string) {
  return ENGLISH_NAME_TO_COUNTRY_CODE.get(normalizeCountryName(name)) ?? null;
}
