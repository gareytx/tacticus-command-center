import { rosterRepository } from "@/data/repository";
export async function GET() {
  const data = await rosterRepository.export();
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="tacticus-roster-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
