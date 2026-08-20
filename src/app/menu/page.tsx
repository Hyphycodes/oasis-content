import { Leaf, MapPin } from "lucide-react";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { PublicHeader } from "@/components/public-header";
import { getMenuStructure } from "@/lib/data";

export const metadata = { title: "Menu at Oasis" };
export const dynamic = "force-dynamic";

export default async function PublicMenuPage() {
  const structure = await getMenuStructure(true);
  const menu =
    structure?.sections.map((section) => ({
      name: section.name,
      items: section.items
        .filter((item) => item.available)
        .map((item) => ({
          name: item.name,
          description: item.description,
          price: item.price,
          tags: item.dietaryTags,
        })),
    })) ?? [];
  const locationName = structure?.locationName || "Oasis";

  return (
    <main className="public-site public-menu">
      <PublicHeader />
      <section className="menu-public-hero">
        <Image
          src="https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=1800&q=88"
          alt="A colorful table of Mexican food at Oasis"
          fill
          sizes="100vw"
          priority
        />
        <div>
          <span className="kicker">{locationName}</span>
          <h1>Made for the table.</h1>
          <p>
            Mexican comfort food, bright cocktails, and a little something for
            everyone.
          </p>
        </div>
      </section>
      {menu.length ? (
        <nav className="menu-public-nav">
          {menu.map((section) => (
            <a
              href={`#${section.name.replaceAll(" ", "-")}`}
              key={section.name}
            >
              {section.name}
            </a>
          ))}
        </nav>
      ) : null}
      {menu.length ? (
        <section className="menu-public-sections">
          {menu.map((section) => (
            <article id={section.name.replaceAll(" ", "-")} key={section.name}>
              <span className="kicker">Oasis kitchen</span>
              <h2>{section.name}</h2>
              <div>
                {section.items.map((item) => (
                  <div key={item.name}>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                      <em>
                        {item.tags.map((tag: string) => (
                          <b key={tag}>
                            <Leaf />
                            {tag}
                          </b>
                        ))}
                      </em>
                    </span>
                    <i>${item.price}</i>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="public-events-empty">
          <h3>No published menu is available yet.</h3>
          <p>
            Oasis staff can publish the current menu from Oasis Admin when it
            is ready for guests.
          </p>
        </section>
      )}
      <section className="menu-public-note">
        <MapPin />
        <span>
          <strong>Menus may vary by location.</strong>
          <small>
            Ask your server about seasonal dishes, availability, and dietary
            needs.
          </small>
        </span>
      </section>
      <footer className="public-footer">
        <Logo href="/events" />
        <p>Official menu from Oasis Mexican Kitchen &amp; Bar.</p>
      </footer>
    </main>
  );
}
