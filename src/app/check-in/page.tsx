import { DoorScanner } from "@/components/door/door-scanner";
import { getDoorSnapshot } from "@/lib/data";

export const metadata = {
  title: "Door Mode",
  robots: { index: false, follow: false },
};

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { ticket } = await searchParams;
  const snapshot = await getDoorSnapshot();
  return <DoorScanner initialTicket={ticket} snapshot={snapshot} />;
}
