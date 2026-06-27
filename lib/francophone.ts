export const FRANCOPHONE_COUNTRIES = [
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "BE", name: "Belgique", flag: "🇧🇪" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "CH", name: "Suisse", flag: "🇨🇭" },
  { code: "MC", name: "Monaco", flag: "🇲🇨" },
] as const;

export type FrancophoneCountryCode = (typeof FRANCOPHONE_COUNTRIES)[number]["code"];
export type FrancophoneTerritory = {
  code: string;
  name: string;
  x: number;
  y: number;
  aliases?: string[];
};

const countryByCode = new Map(FRANCOPHONE_COUNTRIES.map((country) => [country.code, country]));
const countryAliases = new Map<string, FrancophoneCountryCode>([
  ["fr", "FR"],
  ["france", "FR"],
  ["be", "BE"],
  ["belgique", "BE"],
  ["belgium", "BE"],
  ["lu", "LU"],
  ["luxembourg", "LU"],
  ["ch", "CH"],
  ["suisse", "CH"],
  ["switzerland", "CH"],
  ["mc", "MC"],
  ["monaco", "MC"],
]);

export const FRANCOPHONE_MAP_ASSETS: Partial<Record<FrancophoneCountryCode, string>> = {
  BE: "/assets/maps/be-regions.svg",
  LU: "/assets/maps/lu-cantons.svg",
  CH: "/assets/maps/ch-cantons.svg",
  MC: "/assets/maps/mc-outline.svg",
};

export const FRANCOPHONE_TERRITORIES: Record<FrancophoneCountryCode, FrancophoneTerritory[]> = {
  FR: [
    { code: "auvergne-rhone-alpes", name: "Auvergne-Rhône-Alpes", x: 66, y: 63, aliases: ["Auvergne Rhone Alpes"] },
    { code: "bourgogne-franche-comte", name: "Bourgogne-Franche-Comté", x: 64, y: 42, aliases: ["Bourgogne Franche Comte"] },
    { code: "bretagne", name: "Bretagne", x: 20, y: 42 },
    { code: "centre-val-de-loire", name: "Centre-Val de Loire", x: 43, y: 47 },
    { code: "corse", name: "Corse", x: 81, y: 82 },
    { code: "grand-est", name: "Grand Est", x: 72, y: 27 },
    { code: "hauts-de-france", name: "Hauts-de-France", x: 52, y: 18 },
    { code: "ile-de-france", name: "Île-de-France", x: 48, y: 34, aliases: ["Ile-de-France", "Ile de France"] },
    { code: "normandie", name: "Normandie", x: 34, y: 29 },
    { code: "nouvelle-aquitaine", name: "Nouvelle-Aquitaine", x: 39, y: 68 },
    { code: "occitanie", name: "Occitanie", x: 56, y: 78 },
    { code: "pays-de-la-loire", name: "Pays de la Loire", x: 31, y: 49 },
    { code: "provence-alpes-cote-d-azur", name: "Provence-Alpes-Côte d’Azur", x: 73, y: 75, aliases: ["PACA", "Provence Alpes Cote d Azur"] },
  ],
  BE: [
    { code: "BEBRU", name: "Bruxelles-Capitale", x: 48, y: 35, aliases: ["Bruxelles", "Brussels"] },
    { code: "BEVLG", name: "Flandre", x: 58, y: 22, aliases: ["Flanders", "Vlaanderen"] },
    { code: "BEWAL", name: "Wallonie", x: 68, y: 62, aliases: ["Wallonia"] },
  ],
  LU: [
    { code: "LUCL", name: "Clervaux", x: 46, y: 15 },
    { code: "LUWI", name: "Wiltz", x: 34, y: 28 },
    { code: "LUVD", name: "Vianden", x: 55, y: 33 },
    { code: "LUDI", name: "Diekirch", x: 55, y: 45 },
    { code: "LURD", name: "Redange", x: 31, y: 49 },
    { code: "LUME", name: "Mersch", x: 47, y: 58 },
    { code: "LUEC", name: "Echternach", x: 69, y: 56 },
    { code: "LUCA", name: "Capellen", x: 34, y: 74 },
    { code: "LULU", name: "Luxembourg", x: 52, y: 78 },
    { code: "LUES", name: "Esch-sur-Alzette", x: 39, y: 88 },
    { code: "LURM", name: "Remich", x: 66, y: 86 },
    { code: "LUGR", name: "Grevenmacher", x: 73, y: 72 },
  ],
  CH: [
    { code: "CHGE", name: "Genève", x: 14, y: 77, aliases: ["Geneve"] },
    { code: "CHVD", name: "Vaud", x: 25, y: 67 },
    { code: "CHVS", name: "Valais", x: 43, y: 78 },
    { code: "CHFR", name: "Fribourg", x: 32, y: 54 },
    { code: "CHNE", name: "Neuchâtel", x: 24, y: 43, aliases: ["Neuchatel"] },
    { code: "CHJU", name: "Jura", x: 24, y: 25 },
    { code: "CHBE", name: "Berne", x: 43, y: 47, aliases: ["Bern"] },
    { code: "CHSO", name: "Soleure", x: 46, y: 28, aliases: ["Solothurn"] },
    { code: "CHBS", name: "Bâle-Ville", x: 42, y: 12, aliases: ["Basel-Stadt", "Bale-Ville"] },
    { code: "CHBL", name: "Bâle-Campagne", x: 48, y: 16, aliases: ["Basel-Landschaft", "Bale-Campagne"] },
    { code: "CHAG", name: "Argovie", x: 58, y: 23, aliases: ["Aargau"] },
    { code: "CHZH", name: "Zurich", x: 68, y: 24, aliases: ["Zürich"] },
    { code: "CHLU", name: "Lucerne", x: 58, y: 42, aliases: ["Luzern"] },
    { code: "CHZG", name: "Zoug", x: 66, y: 39, aliases: ["Zug"] },
    { code: "CHSZ", name: "Schwytz", x: 69, y: 48, aliases: ["Schwyz"] },
    { code: "CHOW", name: "Obwald", x: 55, y: 52 },
    { code: "CHNW", name: "Nidwald", x: 62, y: 53 },
    { code: "CHUR", name: "Uri", x: 68, y: 60 },
    { code: "CHGL", name: "Glaris", x: 77, y: 49, aliases: ["Glarus"] },
    { code: "CHSH", name: "Schaffhouse", x: 72, y: 9, aliases: ["Schaffhausen"] },
    { code: "CHTG", name: "Thurgovie", x: 80, y: 20, aliases: ["Thurgau"] },
    { code: "CHSG", name: "Saint-Gall", x: 85, y: 35, aliases: ["St. Gallen", "Saint Gall"] },
    { code: "CHAR", name: "Appenzell Rhodes-Extérieures", x: 88, y: 28, aliases: ["Appenzell Ausserrhoden"] },
    { code: "CHAI", name: "Appenzell Rhodes-Intérieures", x: 89, y: 33, aliases: ["Appenzell Innerrhoden"] },
    { code: "CHGR", name: "Grisons", x: 84, y: 63, aliases: ["Graubünden", "Graubunden"] },
    { code: "CHTI", name: "Tessin", x: 69, y: 83, aliases: ["Ticino"] },
  ],
  MC: [
    { code: "MC", name: "Monaco", x: 49, y: 52 },
  ],
};

function normalizedKey(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function normalizeCountryCode(value: unknown): FrancophoneCountryCode {
  const raw = String(value ?? "").trim().toUpperCase();
  if (countryByCode.has(raw as FrancophoneCountryCode)) {
    return raw as FrancophoneCountryCode;
  }

  return countryAliases.get(normalizedKey(value)) || "FR";
}

export function eventCountryCode(row: Record<string, unknown> | null | undefined) {
  if (!row) return "FR" as FrancophoneCountryCode;
  return normalizeCountryCode(row.country_code ?? row.country ?? row.pays ?? row.country_name);
}

export function countryName(code: unknown) {
  return countryByCode.get(normalizeCountryCode(code))?.name || "France";
}

export function countryFlag(code: unknown) {
  return countryByCode.get(normalizeCountryCode(code))?.flag || "🇫🇷";
}

export function countryLabel(code: unknown) {
  const normalized = normalizeCountryCode(code);
  return `${countryFlag(normalized)} ${countryName(normalized)}`;
}

export function countryTerritories(code: unknown) {
  return FRANCOPHONE_TERRITORIES[normalizeCountryCode(code)] || FRANCOPHONE_TERRITORIES.FR;
}

export function countryMapAsset(code: unknown) {
  return FRANCOPHONE_MAP_ASSETS[normalizeCountryCode(code)] || "";
}

export function normalizeTerritoryName(countryCode: unknown, value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const normalizedRaw = normalizedKey(raw);
  const territory = countryTerritories(countryCode).find((item) => {
    const aliases = [item.code, item.name, ...(item.aliases || [])];
    return aliases.some((alias) => normalizedKey(alias) === normalizedRaw);
  });

  return territory?.name || raw;
}
