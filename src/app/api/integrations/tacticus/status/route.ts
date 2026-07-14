import { safeIntegrationRoute } from "../_shared";
import { getTacticusConnectionStatus } from "@/services/tacticus-connection.service";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return safeIntegrationRoute(request, getTacticusConnectionStatus);
}
