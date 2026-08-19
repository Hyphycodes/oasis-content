import { PageHeader } from "@/components/ui";
import { ContentStudio } from "@/components/content/content-studio";
import { getContentItems, getEvents } from "@/lib/data";

export default async function ContentPage() {
  const [events, content] = await Promise.all([getEvents(), getContentItems()]);
  return (
    <>
      <PageHeader
        eyebrow="One idea, every channel"
        title="Content & campaigns"
        description="Upload once, shape each channel, and schedule the whole story from one place."
      />
      <ContentStudio eventOptions={events} contentOptions={content} />
    </>
  );
}
