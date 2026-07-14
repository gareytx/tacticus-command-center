export type InventoryForAnalysis = {
  resourceType: string;
  quantity: number;
  semanticStatus: string;
};

export function analyzeBottlenecks(items: InventoryForAnalysis[]) {
  const groups = new Map<string, InventoryForAnalysis[]>();
  for (const item of items)
    groups.set(item.resourceType, [
      ...(groups.get(item.resourceType) ?? []),
      item,
    ]);
  return [...groups]
    .map(([resourceType, records]) => ({
      resourceType,
      records: records.length,
      total: records.reduce((sum, item) => sum + item.quantity, 0),
      zero: records.filter((item) => item.quantity === 0).length,
      low: records.filter((item) => item.quantity > 0 && item.quantity <= 3)
        .length,
      confidence: records.every((item) => item.semanticStatus === "VERIFIED")
        ? "PARTIAL"
        : "INSUFFICIENT_DATA",
      explanation:
        "Inventory pressure only: upgrade demand and recipe costs are not available, so this is not asserted as a true bottleneck.",
    }))
    .sort((a, b) => b.zero - a.zero || a.total - b.total);
}
