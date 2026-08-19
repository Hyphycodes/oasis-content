import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const menuItemInput = z.object({
  id: z.string().optional(),
  sectionId: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300),
  price: z.number().min(0).max(10000),
  available: z.boolean(),
  featured: z.boolean(),
  dietaryTags: z.array(z.string().max(30)).max(10),
  sortOrder: z.number().int().min(0).max(1000),
});
const sectionInput = z.object({
  kind: z.literal("section"),
  menuId: z.string().optional(),
  locationId: z.string().optional(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(200).optional(),
  sortOrder: z.number().int().min(0).max(1000),
});
const publishInput = z.object({
  kind: z.literal("publish"),
  menuId: z.string().min(1),
});

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const supabase = await createSupabaseServerClient();
  const section = sectionInput.safeParse(body);
  const publish = publishInput.safeParse(body);
  if (publish.success) {
    if (!supabase) return Response.json({ published: true, mode: "preview" });
    const { error } = await supabase
      .from("menus")
      .update({ is_published: true })
      .eq("id", publish.data.menuId);
    if (error)
      return Response.json(
        { error: "The menu could not be published." },
        { status: 500 },
      );
    return Response.json({ published: true, mode: "connected" });
  }
  if (section.success) {
    if (!supabase)
      return Response.json(
        {
          section: {
            id: `preview-${randomUUID()}`,
            name: section.data.name,
            description: section.data.description ?? "",
            items: [],
          },
          menuId: section.data.menuId || "preview-menu",
          mode: "preview",
        },
        { status: 201 },
      );
    let menuId = section.data.menuId;
    if (!menuId) {
      let locationId = section.data.locationId;
      if (!locationId) {
        const { data: location } = await supabase
          .from("locations")
          .select("id")
          .eq("is_active", true)
          .order("name")
          .limit(1)
          .maybeSingle();
        locationId = location?.id;
      }
      const { data: menu, error } = await supabase
        .from("menus")
        .insert({
          name: "Oasis Menu",
          location_id: locationId || null,
          is_published: false,
        })
        .select("id")
        .single();
      if (error || !menu)
        return Response.json(
          { error: "Add an active location before creating the menu." },
          { status: 409 },
        );
      menuId = menu.id;
    }
    const { data: created, error } = await supabase
      .from("menu_sections")
      .insert({
        menu_id: menuId,
        name: section.data.name,
        description: section.data.description ?? null,
        sort_order: section.data.sortOrder,
      })
      .select("*")
      .single();
    if (error || !created)
      return Response.json(
        { error: "The menu section could not be created." },
        { status: 500 },
      );
    return Response.json(
      {
        section: {
          id: created.id,
          name: created.name,
          description: created.description ?? "",
          items: [],
        },
        menuId,
        mode: "connected",
      },
      { status: 201 },
    );
  }

  const parsed = menuItemInput.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "Check the menu item and try again." },
      { status: 400 },
    );
  if (!supabase)
    return Response.json(
      {
        item: {
          ...parsed.data,
          id: parsed.data.id || `preview-${randomUUID()}`,
        },
        mode: "preview",
      },
      { status: 201 },
    );
  const value = {
    menu_section_id: parsed.data.sectionId,
    name: parsed.data.name,
    description: parsed.data.description,
    price_cents: Math.round(parsed.data.price * 100),
    is_available: parsed.data.available,
    is_featured: parsed.data.featured,
    dietary_tags: parsed.data.dietaryTags,
    sort_order: parsed.data.sortOrder,
  };
  const query = parsed.data.id
    ? supabase.from("menu_items").update(value).eq("id", parsed.data.id)
    : supabase.from("menu_items").insert(value);
  const { data, error } = await query.select("*").single();
  if (error || !data)
    return Response.json(
      { error: "The menu item couldn’t be saved." },
      { status: 500 },
    );
  const { data: userData } = await supabase.auth.getUser();
  await supabase
    .from("audit_log")
    .insert({
      actor_id: userData.user?.id,
      action: parsed.data.id ? "menu_item.updated" : "menu_item.created",
      object_type: "menu_item",
      object_id: data.id,
      changes: { name: data.name, price_cents: data.price_cents },
    });
  return Response.json(
    {
      item: {
        id: data.id,
        sectionId: data.menu_section_id,
        name: data.name,
        description: data.description ?? "",
        price: data.price_cents / 100,
        available: data.is_available,
        featured: data.is_featured,
        dietaryTags: data.dietary_tags ?? [],
        sortOrder: data.sort_order,
      },
      mode: "connected",
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const parsed = z
    .object({ id: z.string().min(1) })
    .safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Choose a menu item to delete." },
      { status: 400 },
    );
  const supabase = await createSupabaseServerClient();
  if (!supabase) return Response.json({ deleted: true, mode: "preview" });
  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", parsed.data.id);
  if (error)
    return Response.json(
      { error: "The menu item could not be deleted." },
      { status: 500 },
    );
  return Response.json({ deleted: true, mode: "connected" });
}
