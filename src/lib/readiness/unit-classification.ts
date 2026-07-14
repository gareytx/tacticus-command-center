export type UnitClassification = {
  unitType: "CHARACTER" | "MACHINE_OF_WAR" | "UNKNOWN";
  source: "VERIFIED_MAPPING" | "MANUAL" | "UNKNOWN";
  confidence: "CONFIRMED" | "HIGH" | "UNKNOWN";
};

const MACHINES = new Set([
  "astraOrdnanceBattery",
  "adeptExorcist",
  "deathCrawler",
  "orksRukkatrukk",
  "darkaStormSpeeder",
]);

const CHARACTERS = new Set([
  "ultraTigurius",
  "ultraInceptorSgt",
  "ultraEliminatorSgt",
  "adeptRetributor",
  "ultraApothecary",
  "necroWarden",
  "deathBlightlord",
  "necroDestroyer",
  "eldarRanger",
  "eldarFarseer",
  "necroSpyder",
  "tauCrisis",
  "blackTerminator",
  "blackHaarken",
  "eldarMauganRa",
  "orksKillaKan",
  "eldarAutarch",
  "orksBigMek",
  "tyranDeathleaper",
  "darkaAzrael",
  "thousTzaangor",
  "blackPossession",
  "necroPlasmancer",
  "orksRuntherd",
  "bloodIntercessor",
  "astraPrimarisPsy",
  "worldTerminator",
  "genesBiophagus",
  "admecManipulus",
  "bloodDante",
  "thousTerminator",
  "tyranTyrantGuard",
  "orksWarboss",
  "custoBladeChampion",
  "emperExultant",
  "darkaHellblaster",
  "astraBullgryn",
  "tyranParasite",
  "bloodTerminator",
  "astraYarrick",
  "bloodDeathCompany",
  "votanMemnyr",
  "blackAbaddon",
  "worldExecutions",
  "astraOrdnance",
  "adeptCanoness",
  "templSwordBrother",
  "worldJakhal",
  "necroOverlord",
  "emperKakophonist",
  "spaceHound",
  "custoVexilusPraetor",
]);

export function classifyUnit(externalId: string | null): UnitClassification {
  if (externalId && MACHINES.has(externalId))
    return {
      unitType: "MACHINE_OF_WAR",
      source: "VERIFIED_MAPPING",
      confidence: "CONFIRMED",
    };
  if (externalId && CHARACTERS.has(externalId))
    return {
      unitType: "CHARACTER",
      source: "VERIFIED_MAPPING",
      confidence: "HIGH",
    };
  return { unitType: "UNKNOWN", source: "UNKNOWN", confidence: "UNKNOWN" };
}
