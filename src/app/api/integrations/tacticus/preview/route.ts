import { safeIntegrationRoute } from "../_shared";
import { previewTacticusRosterSync } from "@/services/tacticus-roster-sync.service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return safeIntegrationRoute(request, previewTacticusRosterSync);
}
