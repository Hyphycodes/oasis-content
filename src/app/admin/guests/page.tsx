import { QrCode } from "lucide-react";
import Link from "next/link";
import { GuestManager } from "@/components/guests/guest-manager";
import { PageHeader } from "@/components/ui";
import { getEvents, getGuests, getPromoters } from "@/lib/data";

export default async function GuestsPage() {
  const [guestList, eventList, promoterList] = await Promise.all([
    getGuests(),
    getEvents(),
    getPromoters(),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Everyone in one place"
        title="Guests & promoters"
        description="Paid tickets, comps, artists, owner guests, and promoters—one list for the door."
        actions={
          <Link className="button button-secondary" href="/check-in">
            <QrCode />
            Open door mode
          </Link>
        }
      />
      <GuestManager
        initialGuests={guestList}
        initialPromoters={promoterList}
        eventOptions={eventList
          .filter((event) => event.status !== "Draft")
          .map((event) => ({ id: event.id, title: event.title }))}
      />
    </>
  );
}
