import { CalendarDays, Camera, MapPin } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";

export function PublicHeader() {
  return (
    <header className="public-header">
      <Logo href="/" />
      <nav>
        <Link href="/events">
          <CalendarDays />
          Events
        </Link>
        <Link href="/menu">
          <Camera />
          Menu
        </Link>
        <a href="#visit">
          <MapPin />
          Visit
        </a>
      </nav>
      <Link className="button public-reserve" href="/events">
        What’s on
      </Link>
    </header>
  );
}
