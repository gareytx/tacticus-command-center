import { Plus } from "lucide-react";
import { rosterRepository } from "@/data/repository";
import { ButtonLink, PageHeader } from "@/components/ui";
import { RosterBrowser } from "@/components/roster-browser";
export default async function RosterPage() {
  const characters = await rosterRepository.characters();
  return (
    <>
      <PageHeader
        eyebrow="Unit registry"
        title="Character roster"
        description="Search, filter, compare, and maintain every character record in your collection."
        action={
          <ButtonLink href="/roster/new">
            <Plus size={16} />
            Add character
          </ButtonLink>
        }
      />
      <RosterBrowser
        characters={characters.map((c) => ({
          ...c,
          updatedAt: c.updatedAt.toISOString(),
        }))}
      />
    </>
  );
}
