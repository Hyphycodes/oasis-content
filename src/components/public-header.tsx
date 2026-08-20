import { CalendarDays, Camera, MapPin } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";

export function PublicHeader() {
  return (
    <header className="public-header">
      <Logo href="/events" />
      <nav>
        <Link href="/events">
          <CalendarDays />
          Events
        </Link>
        <Link href="/menu">
          <Camera />
          Menu
        </Link>
        <Link href="/go">
          <MapPin />
          Visit &amp; links
        </Link>
      </nav>
      <Link className="button public-reserve" href="/events">
        What’s on
      </Link>
    </header>
  );
}
