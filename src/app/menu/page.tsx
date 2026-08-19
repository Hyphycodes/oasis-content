import { Leaf, MapPin, Sparkles } from "lucide-react";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { PublicHeader } from "@/components/public-header";
import { getMenuStructure } from "@/lib/data";

const previewMenu = [
  {
    name: "Para Compartir",
    items: [
      {
        name: "Oasis Queso Fundido",
        description: "Roasted poblano, chorizo, Oaxaca cheese, warm tortillas",
        price: 15,
        tags: ["GF available"],
        image:
          "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=1000&q=84",
      },
      {
        name: "Tableside Guacamole",
        description: "Avocado, lime, serrano, cilantro, warm tostadas",
        price: 13,
        tags: ["Vegan", "GF"],
      },
      {
        name: "Charred Elote",
        description: "Chile-lime crema, cotija, smoked chile",
        price: 9,
        tags: ["Vegetarian", "GF"],
      },
    ],
  },
  {
    name: "Tacos & Platos",
    items: [
      {
        name: "Birria Tacos",
        description:
          "Slow-braised beef, Oaxaca cheese, onion, cilantro, consommé",
        price: 18,
        tags: [],
        image:
          "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1000&q=84",
      },
      {
        name: "Crispy Cauliflower Tacos",
        description: "Adobo, avocado crema, cabbage, pickled onion",
        price: 15,
        tags: ["Vegetarian"],
      },
      {
        name: "Pollo Asado",
        description: "Achiote chicken, roasted salsa, rice, charro beans",
        price: 19,
        tags: ["GF"],
      },
    ],
  },
  {
    name: "Cocktails",
    items: [
      {
        name: "Oasis Margarita",
        description: "Blanco tequila, orange, lime, agave, sea salt",
        price: 13,
        tags: [],
      },
      {
        name: "Flor de Jamaica",
        description: "Mezcal, hibiscus, citrus, chile",
        price: 15,
        tags: [],
      },
      {
        name: "Cucumber Paloma",
        description: "Tequila, grapefruit, cucumber, soda",
        price: 14,
        tags: [],
      },
    ],
  },
];

export const metadata = { title: "Menu at Oasis" };
export const dynamic = "force-dynamic";

export default async function PublicMenuPage() {
  const structure = await getMenuStructure(true);
  const menu = structure
    ? structure.sections.map((section) => ({
        name: section.name,
        items: section.items
          .filter((item) => item.available)
          .map((item) => ({
            name: item.name,
            description: item.description,
            price: item.price,
            tags: item.dietaryTags,
            image: undefined as string | undefined,
          })),
      }))
    : previewMenu;
  const locationName = structure?.locationName ?? "Oasis Downtown";
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
                  <div
                    className={item.image ? "featured-menu-item" : ""}
                    key={item.name}
                  >
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={240}
                        height={180}
                      />
                    )}
                    <span>
                      <strong>
                        {item.name}
                        {item.image && <Sparkles />}
                      </strong>
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
          <h3>The next menu is being prepared.</h3>
          <p>
            Check back soon or contact Oasis for today’s food and drink
            offerings.
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
        <Logo href="/" />
        <p>Mexican kitchen, bar, and culture in Fort Worth.</p>
      </footer>
    </main>
  );
}
