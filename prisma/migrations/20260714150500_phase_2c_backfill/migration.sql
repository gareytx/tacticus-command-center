-- Backfill only source-controlled classifications. Unlisted upstream IDs stay
-- UNKNOWN so a future payload change cannot be mistaken for verified game data.
UPDATE "Character" SET "unitType" = 'MACHINE_OF_WAR', "unitTypeSource" = 'VERIFIED_MAPPING', "unitTypeConfidence" = 'CONFIRMED'
WHERE "externalCharacterId" IN ('astraOrdnanceBattery','adeptExorcist','deathCrawler','orksRukkatrukk','darkaStormSpeeder');

UPDATE "Character" SET "unitType" = 'CHARACTER', "unitTypeSource" = 'VERIFIED_MAPPING', "unitTypeConfidence" = 'HIGH'
WHERE "externalCharacterId" IS NOT NULL AND "externalCharacterId" NOT IN
('astraOrdnanceBattery','adeptExorcist','deathCrawler','orksRukkatrukk','darkaStormSpeeder','thousDaemonPrince','tauBroadside');

UPDATE "InventoryItem" SET
  "resourceType" = CASE "category"
    WHEN 'items' THEN 'EQUIPMENT' WHEN 'upgrades' THEN 'UPGRADE_MATERIAL'
    WHEN 'shards' THEN 'SHARD' WHEN 'mythicShards' THEN 'MYTHIC_SHARD'
    WHEN 'xpBooks' THEN 'XP_BOOK' WHEN 'abilityBadges' THEN 'ABILITY_BADGE'
    WHEN 'components' THEN 'COMPONENT' WHEN 'forgeBadges' THEN 'FORGE_BADGE'
    WHEN 'orbs' THEN 'ORB' WHEN 'requisitionOrders' THEN 'REQUISITION_ORDER'
    WHEN 'resetStones' THEN 'RESET_STONE' ELSE 'UNKNOWN' END,
  "semanticStatus" = CASE WHEN "category" IN ('shards','mythicShards','requisitionOrders','resetStones') THEN 'VERIFIED'
    WHEN "category" IN ('items','upgrades','xpBooks','abilityBadges','components','forgeBadges','orbs') THEN 'PARTIAL'
    ELSE 'UNKNOWN' END,
  "externalResourceId" = "externalInventoryId";
