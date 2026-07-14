import { z } from "zod";
import { safeIntegrationRoute, invalidBody } from "../_shared";
import { testTacticusConnection } from "@/services/tacticus-connection.service";
export const runtime = "nodejs";
const bodySchema = z.object({ apiKey: z.string() });
export async function POST(request: Request) {
  return safeIntegrationRoute(request, async () => {
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return invalidBody();
    return testTacticusConnection(body.data.apiKey);
  });
}
