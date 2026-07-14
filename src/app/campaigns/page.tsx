import { connection } from "next/server";
import { PageHeader, Panel, Stat } from "@/components/ui";
import { CampaignBrowser } from "@/components/campaign-browser";
import { getCampaigns } from "@/services/campaign-event.service";
export default async function CampaignsPage() {
  await connection();
  const campaigns = await getCampaigns();
  return (
    <>
      <PageHeader
        eyebrow="Phase 2D"
        title="Campaign intelligence"
        description="API-backed attempt records and local strategy plans. Attempts are not treated as completion or stars."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Panel>
          <Stat label="Campaign records" value={campaigns.length} accent />
        </Panel>
        <Panel>
          <Stat
            label="Campaign events"
            value={campaigns.filter((c) => c.normalizedType === "EVENT").length}
          />
        </Panel>
        <Panel>
          <Stat
            label="Needs semantic review"
            value={
              campaigns.filter((c) => c.semanticStatus === "UNKNOWN").length
            }
          />
        </Panel>
      </div>
      <CampaignBrowser campaigns={campaigns} />
    </>
  );
}
