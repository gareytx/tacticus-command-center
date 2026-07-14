import { safeIntegrationRoute } from "../_shared";
import { applyTacticusRosterSync } from "@/services/tacticus-roster-sync.service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  return safeIntegrationRoute(request, () => applyTacticusRosterSync(body));
}
