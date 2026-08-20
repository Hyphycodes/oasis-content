import { redirect } from "next/navigation";

export const metadata = {
  title: "Oasis Admin",
  description:
    "The operating workspace for Oasis events, tickets, guests, content, and publishing.",
};

export default function Home() {
  redirect("/admin");
}
