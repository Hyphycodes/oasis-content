import { PageHeader } from "@/components/ui";
import { MenuEditor } from "@/components/menu/menu-editor";
import { getMenuStructure, getSiteCopy } from "@/lib/data";

export default async function MenuAdminPage() {
  const [menu, siteCopy] = await Promise.all([
    getMenuStructure(),
    getSiteCopy(),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="No developer required"
        title="Menu & website"
        description="Change a price, hide a sold-out dish, or refresh the homepage in seconds."
      />
      <MenuEditor
        initialMenuId={menu?.menuId}
        initialLocationName={menu?.locationName}
        initialSections={menu?.sections}
        initialSiteCopy={siteCopy ?? undefined}
      />
    </>
  );
}
