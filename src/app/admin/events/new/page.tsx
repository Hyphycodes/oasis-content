import { EventWizard } from "@/components/events/event-wizard";
import { getLocations } from "@/lib/data";

export const metadata = { title: "Create Event" };

export default async function NewEventPage() {
  const locations = await getLocations();
  return <EventWizard locationOptions={locations} />;
}
