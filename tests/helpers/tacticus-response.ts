export function validTacticusResponse(overrides: Record<string, unknown> = {}) {
  return {
    player: {
      details: { name: "Sanitized Commander", powerLevel: 42 },
      units: [
        {
          id: "ultraEliminatorSgt",
          name: "Certus",
          faction: "Ultramarines",
          grandAlliance: "Imperial",
          progressionIndex: 5,
          xp: 4552,
          xpLevel: 6,
          rank: 10,
          abilities: [{ id: "MortisRound", level: 35 }],
          upgrades: [0, 4],
          items: [
            {
              slotId: "Slot1",
              level: 2,
              id: "I_Crit_R002",
              name: "Sanctified Bolt Pistol",
              rarity: "Rare",
            },
          ],
          shards: 100,
          mythicShards: 0,
        },
      ],
      inventory: {
        items: [
          {
            id: "I_Crit_U008",
            name: "Aspect Shuriken Pistol",
            level: 1,
            amount: 6,
          },
        ],
        upgrades: [
          { id: "upgDmgC008", name: "Otherworldly Energy", amount: 2 },
        ],
        shards: [
          { id: "ultraEliminatorSgt", name: "Certus Shards", amount: 162 },
        ],
        mythicShards: [],
        xpBooks: [{ id: "xpRare", rarity: "Rare", amount: 3 }],
        abilityBadges: {
          Imperial: [
            { name: "Epic Imperial Badges", rarity: "Epic", amount: 10 },
          ],
        },
        components: [
          { name: "Xenos Components", grandAlliance: "Xenos", amount: 60 },
        ],
        forgeBadges: [
          { name: "Uncommon Forge Badges", rarity: "Uncommon", amount: 10 },
        ],
        orbs: { Imperial: [{ rarity: "Rare", amount: 2 }] },
        requisitionOrders: null,
        resetStones: 1,
      },
      progress: { campaigns: [], legendaryEvents: [] },
    },
    metaData: {
      configHash: "6070bc3fe1238ab5b2269efd75639b55",
      apiKeyExpiresOn: null,
      lastUpdatedOn: 1_752_490_000,
      scopes: ["Player"],
    },
    ...overrides,
  };
}
