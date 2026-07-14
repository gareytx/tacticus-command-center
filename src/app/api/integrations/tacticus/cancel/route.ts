import { safeIntegrationRoute } from "../_shared";
import { cancelPendingTacticusConnection } from "@/services/tacticus-connection.service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return safeIntegrationRoute(request, cancelPendingTacticusConnection);
}
