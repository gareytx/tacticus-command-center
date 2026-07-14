import { safeIntegrationRoute } from "../_shared";
import { syncTacticusConnection } from "@/services/tacticus-sync.service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return safeIntegrationRoute(request, syncTacticusConnection);
}
