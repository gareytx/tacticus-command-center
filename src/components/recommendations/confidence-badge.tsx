import { Badge } from "@/components/ui";
export function ConfidenceBadge({ confidence }: { confidence: string }) {
  return <Badge value={confidence} />;
}
