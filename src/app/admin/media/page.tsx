import { PageHeader } from "@/components/ui";
import { MediaLibrary } from "@/components/media/media-library";
import { getMediaAssets } from "@/lib/data";

export const metadata = { title: "Media" };

export default async function MediaPage() {
  const assets = await getMediaAssets();
  return (
    <>
      <PageHeader eyebrow="Creative, organized" title="Media library" description="Live assets for Oasis, with original files archived to Drive automatically." />
      <MediaLibrary initialAssets={assets ?? undefined} />
    </>
  );
}
