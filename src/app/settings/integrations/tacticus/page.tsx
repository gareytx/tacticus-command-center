import { TacticusIntegrationPanel } from "@/components/tacticus-integration-panel";
import { PageHeader } from "@/components/ui";

export default function TacticusIntegrationPage() {
  return (
    <>
      <PageHeader
        eyebrow="Official integration / Phase 2A"
        title="Tacticus Player API"
        description="Verify the official read-only Player API contract, protect the credential locally, and run a manual proof-of-concept sync without changing roster data."
      />
      <TacticusIntegrationPanel />
    </>
  );
}
