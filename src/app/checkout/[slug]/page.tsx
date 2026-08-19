import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TrackView } from "@/components/analytics/track-view";
import { CheckoutPanel } from "@/components/tickets/checkout-panel";
import { getEventById } from "@/lib/data";
import { formatEventDate } from "@/lib/demo-data";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventById(slug);
  if (!event) notFound();
  return (
    <main className="checkout-page">
      <TrackView eventName="checkout_start" eventId={event.id} />
      <section className="checkout-summary">
        <Link href={`/e/${event.slug}`}>
          <ArrowLeft />
          Back to event
        </Link>
        <div className="checkout-summary-image">
          <Image
            src={event.imageUrl}
            alt={event.imageAlt}
            fill
            sizes="(max-width: 800px) 100vw, 45vw"
            priority
          />
        </div>
        <div>
          <span className="eyebrow">{event.eyebrow}</span>
          <h1>{event.title}</h1>
          <p>
            <CalendarDays />
            {formatEventDate(event.date)} · {event.startsAt}
          </p>
          <p>
            <MapPin />
            {event.locationName}
          </p>
        </div>
      </section>
      <section className="checkout-panel-wrap">
        <Suspense>
          <CheckoutPanel event={event} />
        </Suspense>
      </section>
    </main>
  );
}
