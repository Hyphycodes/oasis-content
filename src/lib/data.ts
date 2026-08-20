import {
  contentItems,
  customers,
  events,
  guests,
  locations,
} from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CustomerActivity,
  CustomerDetail,
  DestinationStatus,
  DoorSnapshot,
  Guest,
  OasisEvent,
  Promoter,
} from "@/lib/types";

type EventRow = Record<string, unknown> & {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string;
  event_locations?: unknown;
  ticket_types?: unknown;
};

function mapEventRow(row: EventRow): OasisEvent {
  const eventLocations = Array.isArray(row.event_locations)
    ? row.event_locations
    : [];
  const eventLocation = eventLocations[0] as
    | {
        locations?:
          | { name?: string; address?: string }
          | { name?: string; address?: string }[];
      }
    | undefined;
  const locationValue = eventLocation?.locations;
  const location = Array.isArray(locationValue)
    ? locationValue[0]
    : locationValue;
  const ticketTypes = Array.isArray(row.ticket_types) ? row.ticket_types : [];
  const visibleTicketTypes = ticketTypes
    .filter((value) => !(value as { is_hidden?: boolean }).is_hidden)
    .sort(
      (a, b) =>
        Number((a as { sort_order?: number }).sort_order ?? 0) -
        Number((b as { sort_order?: number }).sort_order ?? 0),
    );
  const ticketType = visibleTicketTypes[0] as
    { price_cents?: number; capacity?: number } | undefined;
  const startsAt = new Date(row.starts_at);
  const endsAt = new Date(row.ends_at);
  const status = String(row.status ?? "draft");
  const ticketStatus = String(row.ticket_status ?? "draft");
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    eyebrow: String(row.eyebrow ?? "Oasis presents"),
    description: String(row.description ?? ""),
    shortDescription: String(row.short_description ?? row.description ?? ""),
    date: startsAt.toISOString().slice(0, 10),
    doorsAt: row.doors_at
      ? new Date(String(row.doors_at)).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "Doors open soon",
    startsAt: startsAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Chicago",
    }),
    endsAt: endsAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Chicago",
    }),
    locationId: String(row.primary_location_id ?? ""),
    locationName: location?.name ?? "Oasis",
    address: location?.address ?? "",
    price: ticketType?.price_cents ? ticketType.price_cents / 100 : 0,
    capacity: Number(row.capacity ?? ticketType?.capacity ?? 0),
    sold: Number(row.tickets_sold ?? 0),
    checkedIn: Number(row.checked_in_count ?? 0),
    revenue: Number(row.gross_revenue_cents ?? 0) / 100,
    imageUrl: String(row.hero_image_url ?? "/event-placeholder.svg"),
    imageAlt: String(row.hero_image_alt ?? `${row.title} event artwork`),
    status:
      status === "published"
        ? "Live"
        : status === "ready"
          ? "Ready"
          : status === "cancelled"
            ? "Needs Attention"
            : "Draft",
    ticketStatus:
      ticketStatus === "on_sale"
        ? "On Sale"
        : ticketStatus === "sold_out"
          ? "Sold Out"
          : ticketType?.price_cents === 0 && status === "published"
            ? "Free RSVP"
            : "Draft",
    destinations: [],
    ageRestriction: row.age_restriction
      ? String(row.age_restriction)
      : undefined,
    ticketTypes: visibleTicketTypes.map((value, index) => {
      const ticket = value as {
        id?: string;
        name?: string;
        description?: string;
        price_cents?: number;
        capacity?: number;
        sold_count?: number;
        min_per_order?: number;
        max_per_order?: number;
      };
      return {
        id: ticket.id ?? `ticket-${index}`,
        name: ticket.name ?? "General admission",
        description: ticket.description ?? undefined,
        price: Number(ticket.price_cents ?? 0) / 100,
        capacity: Number(ticket.capacity ?? 0),
        sold: Number(ticket.sold_count ?? 0),
        minPerOrder: Number(ticket.min_per_order ?? 1),
        maxPerOrder: Number(ticket.max_per_order ?? 8),
      };
    }),
  };
}

export async function getEvents(): Promise<OasisEvent[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return events;

  const { data, error } = await supabase
    .from("events")
    .select(
      "*, event_locations(locations(name,address)), ticket_types(id,name,description,price_cents,capacity,sold_count,min_per_order,max_per_order,is_hidden,sort_order)",
    )
    .is("archived_at", null)
    .order("starts_at", { ascending: true });

  if (error) throw new Error("Oasis could not load events from Supabase.");
  return data.map((row) => mapEventRow(row as EventRow));
}

export async function getPublishedEvents(): Promise<OasisEvent[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return events.filter((event) => event.status === "Live");
  const { data, error } = await supabase
    .from("events")
    .select(
      "*, event_locations(locations(name,address)), ticket_types(id,name,description,price_cents,capacity,sold_count,min_per_order,max_per_order,is_hidden,sort_order)",
    )
    .eq("status", "published")
    .is("archived_at", null)
    .order("starts_at", { ascending: true });
  if (error) throw new Error("Oasis could not load published events.");
  return data.map((row) => mapEventRow(row as EventRow));
}

export async function getDoorSnapshot(): Promise<DoorSnapshot> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    const event = events[0]!;
    return {
      preview: true,
      eventId: event.id,
      title: event.title,
      doorsAt: event.doorsAt,
      sold: event.sold,
      guestAllocation: 18,
      checkedIn: event.checkedIn,
      capacity: event.capacity,
    };
  }
  const now = Date.now();
  const { data: event } = await supabase
    .from("events")
    .select("id,title,doors_at,capacity")
    .gte("starts_at", new Date(now - 12 * 60 * 60 * 1000).toISOString())
    .lte("starts_at", new Date(now + 36 * 60 * 60 * 1000).toISOString())
    .neq("status", "cancelled")
    .order("starts_at")
    .limit(1)
    .maybeSingle();
  if (!event)
    return {
      preview: false,
      title: "No active event",
      doorsAt: "Choose an active event",
      sold: 0,
      guestAllocation: 0,
      checkedIn: 0,
      capacity: 0,
    };
  const [{ data: ticketRows }, { data: guestRows }] = await Promise.all([
    supabase.from("tickets").select("status").eq("event_id", event.id),
    supabase
      .from("guests")
      .select("party_size,checked_in_count")
      .eq("event_id", event.id),
  ]);
  const tickets = ticketRows ?? [];
  const guests = guestRows ?? [];
  const guestAllocation = guests.reduce(
    (sum, guest) => sum + guest.party_size,
    0,
  );
  const checkedIn =
    tickets.filter((ticket) => ticket.status === "checked_in").length +
    guests.reduce((sum, guest) => sum + guest.checked_in_count, 0);
  return {
    preview: false,
    eventId: event.id,
    title: event.title,
    doorsAt: event.doors_at
      ? new Date(event.doors_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "Not set",
    sold: tickets.filter(
      (ticket) => !["void", "refunded"].includes(ticket.status),
    ).length,
    guestAllocation,
    checkedIn,
    capacity: event.capacity,
  };
}

export async function getEventById(id: string): Promise<OasisEvent | null> {
  const demo = events.find((event) => event.id === id || event.slug === id);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return demo ?? null;
  const query = supabase
    .from("events")
    .select(
      "*, event_locations(locations(name,address)), ticket_types(id,name,description,price_cents,capacity,sold_count,min_per_order,max_per_order,is_hidden,sort_order)",
    );
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    );
  const { data } = isUuid
    ? await query.eq("id", id).maybeSingle()
    : await query.eq("slug", id).maybeSingle();
  if (!data) return null;
  const mapped = mapEventRow(data as EventRow);
  const { data: publishingJob } = await supabase
    .from("publishing_jobs")
    .select(
      "id,publishing_destinations(destination,status,last_error_message,external_url)",
    )
    .eq("event_id", mapped.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const destinationNames = {
    website: "Website",
    tickets: "Tickets",
    oasis_links: "Oasis Links",
    google_drive: "Google Drive",
    instagram: "Instagram",
    facebook: "Facebook",
    google_business: "Google",
  } as const;
  const rows = Array.isArray(publishingJob?.publishing_destinations)
    ? publishingJob.publishing_destinations
    : [];
  const destinations: DestinationStatus[] = rows.flatMap((destination) => {
    const name =
      destinationNames[
        destination.destination as keyof typeof destinationNames
      ];
    if (!name) return [];
    const status: DestinationStatus["status"] =
      destination.status === "failed"
        ? "Needs Attention"
        : destination.status === "succeeded"
          ? destination.destination === "tickets"
            ? "On Sale"
            : destination.destination === "google_drive"
              ? "Saved"
              : "Live"
          : destination.status === "queued" ||
              destination.status === "processing"
            ? "Scheduled"
            : "Ready";
    return [
      {
        name,
        status,
        detail:
          destination.last_error_message ??
          (destination.status === "processing"
            ? "Publishing now"
            : destination.external_url
              ? "Published successfully"
              : undefined),
      },
    ];
  });
  return { ...mapped, destinations };
}

export async function getLocations() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return locations;
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error("Oasis could not load locations from Supabase.");
  return (data ?? []).map((location) => ({
    id: location.id,
    name: location.name,
    shortName: location.name.replace(/^Oasis\s+/i, ""),
    address: location.address,
    phone: location.phone ?? "",
    timezone: location.timezone,
    hours:
      typeof location.operating_hours === "string"
        ? location.operating_hours
        : "Hours managed in Settings",
  }));
}

export async function getContentItems() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return contentItems;
  const { data, error } = await supabase
    .from("content_items")
    .select("id,title,status,event_id,created_at,events(hero_image_url)")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error)
    throw new Error("Oasis could not load scheduled content from Supabase.");
  return (data ?? []).map((item) => {
    const eventValue = item.events as
      { hero_image_url?: string } | { hero_image_url?: string }[] | null;
    const relatedEvent = Array.isArray(eventValue) ? eventValue[0] : eventValue;
    return {
      id: item.id,
      title: item.title,
      channel: "Campaign",
      scheduledFor: item.status === "scheduled" ? "Scheduled" : "Not scheduled",
      status:
        item.status === "published"
          ? ("Live" as const)
          : item.status === "scheduled"
            ? ("Scheduled" as const)
            : item.status === "ready"
              ? ("Ready" as const)
              : ("Draft" as const),
      eventId: item.event_id ?? undefined,
      imageUrl: relatedEvent?.hero_image_url ?? "/event-placeholder.svg",
    };
  });
}

export async function getCustomers() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return customers;
  const { data } = await supabase
    .from("customers")
    .select(
      "id,first_name,last_name,email,phone,visit_count,total_spend_cents,last_seen_at,source,tags",
    )
    .is("archived_at", null)
    .order("last_seen_at", { ascending: false });
  if (!data) throw new Error("Oasis could not load customers from Supabase.");
  return data.map((row) => ({
    id: row.id,
    name:
      [row.first_name, row.last_name].filter(Boolean).join(" ") ||
      row.email ||
      row.phone ||
      "Guest",
    email: row.email ?? "",
    phone: row.phone ?? "",
    visits: row.visit_count,
    spend: row.total_spend_cents / 100,
    lastSeen: row.last_seen_at
      ? new Date(row.last_seen_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "New",
    source: row.source ?? "Direct",
    tags: row.tags ?? [],
  }));
}

export async function getCustomerById(id: string) {
  const demo = customers.find((customer) => customer.id === id);
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    if (!demo) return null;
    const firstEvent = events[0]!;
    const secondEvent = events[1]!;
    return {
      ...demo,
      firstName: demo.name.split(" ")[0] ?? demo.name,
      lastName: demo.name.split(" ").slice(1).join(" "),
      emailConsent: true,
      smsConsent: false,
      notes: "",
      createdAt: "2026-03-08T18:00:00.000Z",
      ticketsPurchased: Math.max(demo.visits, 2),
      rsvpCount: 1,
      showRate: 86,
      activity: [
        {
          id: "preview-checkin",
          type: "check_in",
          title: "Checked in",
          detail: `${firstEvent.title} · ${firstEvent.locationName}`,
          occurredAt: "2026-08-15T21:12:00-05:00",
          eventTitle: firstEvent.title,
          source: "door",
        },
        {
          id: "preview-purchase",
          type: "purchase",
          title: "Purchased tickets",
          detail: `${secondEvent.title} · Direct`,
          occurredAt: "2026-08-10T16:10:00-05:00",
          value: 36,
          eventTitle: secondEvent.title,
          source: "direct",
        },
      ],
      eventHistory: [
        {
          id: firstEvent.id,
          title: firstEvent.title,
          amount: firstEvent.price,
          status: "Attended",
        },
        {
          id: secondEvent.id,
          title: secondEvent.title,
          amount: secondEvent.price,
          status: "Purchased",
        },
      ],
    } satisfies CustomerDetail;
  }
  const { data: customer } = await supabase
    .from("customers")
    .select(
      "id,first_name,last_name,email,phone,visit_count,total_spend_cents,last_seen_at,source,tags,notes,marketing_email_consent,marketing_sms_consent,created_at",
    )
    .eq("id", id)
    .single();
  if (!customer) return null;
  const [{ data: activityRows }, { data: orderRows }] = await Promise.all([
    supabase
      .from("customer_events")
      .select("id,event_type,source,value_cents,occurred_at,events(title)")
      .eq("customer_id", id)
      .order("occurred_at", { ascending: false })
      .limit(50),
    supabase
      .from("orders")
      .select(
        "id,status,total_cents,created_at,events(title),order_items(quantity)",
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const activityLabels: Record<string, string> = {
    view: "Viewed event",
    rsvp: "RSVP or waitlist",
    purchase: "Purchased tickets",
    check_in: "Checked in",
    refund: "Refunded",
    email_open: "Opened email",
    link_click: "Used a tracked link",
  };
  const activity: CustomerActivity[] = (activityRows ?? []).map((row) => {
    const eventValue = row.events as
      { title?: string } | { title?: string }[] | null;
    const event = Array.isArray(eventValue) ? eventValue[0] : eventValue;
    const source = row.source ?? undefined;
    return {
      id: row.id,
      type: row.event_type as CustomerActivity["type"],
      title: activityLabels[row.event_type] ?? "Customer activity",
      detail: [event?.title, source].filter(Boolean).join(" · ") || "Oasis",
      occurredAt: row.occurred_at,
      value:
        row.value_cents === null || row.value_cents === undefined
          ? undefined
          : row.value_cents / 100,
      eventTitle: event?.title,
      source,
    };
  });
  const fulfilledOrders = (orderRows ?? []).filter(
    (order) => !["pending", "failed", "expired"].includes(order.status),
  );
  const ticketsPurchased = fulfilledOrders.reduce((total, order) => {
    const items = Array.isArray(order.order_items) ? order.order_items : [];
    return total + items.reduce((sum, item) => sum + item.quantity, 0);
  }, 0);
  const orderHistory = fulfilledOrders.map((order) => {
    const eventValue = order.events as
      { title?: string } | { title?: string }[] | null;
    const event = Array.isArray(eventValue) ? eventValue[0] : eventValue;
    const attended = activity.some(
      (item) => item.type === "check_in" && item.eventTitle === event?.title,
    );
    return {
      id: order.id,
      title: event?.title ?? "Oasis event",
      amount: order.total_cents / 100,
      status: attended
        ? "Attended"
        : String(order.status).includes("refund")
          ? "Refunded"
          : "Purchased",
    };
  });
  const rsvpHistory = activity
    .filter(
      (item) =>
        item.type === "rsvp" &&
        item.eventTitle &&
        !orderHistory.some((history) => history.title === item.eventTitle),
    )
    .map((item) => ({
      id: item.id,
      title: item.eventTitle ?? "Oasis event",
      amount: 0,
      status: "RSVP",
    }));
  return {
    id: customer.id,
    name:
      [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
      customer.email ||
      "Guest",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    visits: customer.visit_count,
    spend: customer.total_spend_cents / 100,
    lastSeen: customer.last_seen_at
      ? new Date(customer.last_seen_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "New",
    source: customer.source ?? "Direct",
    tags: customer.tags ?? [],
    firstName: customer.first_name ?? "",
    lastName: customer.last_name ?? "",
    emailConsent: customer.marketing_email_consent,
    smsConsent: customer.marketing_sms_consent,
    notes: customer.notes ?? "",
    createdAt: customer.created_at,
    ticketsPurchased,
    rsvpCount: activity.filter((item) => item.type === "rsvp").length,
    showRate: ticketsPurchased
      ? Math.min(
          100,
          Math.round((customer.visit_count / ticketsPurchased) * 100),
        )
      : 0,
    activity,
    eventHistory: [...orderHistory, ...rsvpHistory],
  } satisfies CustomerDetail;
}

export async function getGuests() {
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return guests.map((guest) => ({ ...guest, eventId: events[0].id }));
  const { data, error } = await supabase
    .from("guests")
    .select(
      "id,event_id,name,party_size,guest_type,notes,checked_in_count,checked_in_at,guest_groups(promoters(name))",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Oasis could not load guests from Supabase.");
  if (!data?.length) return [];
  return data.map((guest) => {
    const groupValue = guest.guest_groups as
      | { promoters?: { name?: string } | { name?: string }[] }
      | { promoters?: { name?: string } | { name?: string }[] }[]
      | null;
    const group = Array.isArray(groupValue) ? groupValue[0] : groupValue;
    const promoterValue = group?.promoters;
    const promoter = Array.isArray(promoterValue)
      ? promoterValue[0]
      : promoterValue;
    const type = guestTypeLabel(guest.guest_type);
    return {
      id: guest.id,
      eventId: guest.event_id,
      name: guest.name,
      partySize: guest.party_size,
      checkedInCount: guest.checked_in_count,
      type,
      status:
        guest.checked_in_count >= guest.party_size || guest.checked_in_at
          ? ("Checked In" as const)
          : ("Expected" as const),
      note: guest.notes ?? undefined,
      promoter: promoter?.name,
    };
  });
}

function guestTypeLabel(value: string): Guest["type"] {
  const labels: Record<string, Guest["type"]> = {
    guest: "Guest",
    owner_guest: "Owner Guest",
    comp: "Comp",
    influencer: "Influencer",
    promoter: "Promoter",
    artist: "Artist",
    staff: "Staff",
    partner: "Partner",
    vip: "VIP",
    other: "Other",
  };
  return labels[value] ?? "Other";
}

export async function getPromoters(): Promise<Promoter[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return [
      {
        id: "promoter-rico",
        name: "Rico Salazar",
        handle: "@ricoafterdark",
        clicks: 318,
        orders: 42,
        revenue: 1284,
        eventId: events[0]?.id,
        code: "rico-after-dark",
        link: events[0]
          ? `/e/${events[0].slug}?ref=rico-after-dark`
          : undefined,
      },
      {
        id: "promoter-sofia",
        name: "Preview Promoter Two",
        handle: "@preview_promoter_two",
        clicks: 204,
        orders: 28,
        revenue: 812,
      },
      {
        id: "promoter-primos",
        name: "Los Primos Media",
        handle: "@losprimosmedia",
        clicks: 146,
        orders: 17,
        revenue: 492,
      },
    ];
  }
  const { data, error } = await supabase
    .from("promoters")
    .select(
      "id,name,email,phone,social_handle,notes,promoter_links(id,event_id,code,destination_url,click_count,conversion_count,revenue_cents,created_at)",
    )
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error("Oasis could not load promoters from Supabase.");
  return (data ?? []).map((promoter) => {
    const links = Array.isArray(promoter.promoter_links)
      ? promoter.promoter_links
      : [];
    const latest = [...links].sort((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at)),
    )[0];
    return {
      id: promoter.id,
      name: promoter.name,
      handle: promoter.social_handle ?? undefined,
      email: promoter.email ?? undefined,
      phone: promoter.phone ?? undefined,
      notes: promoter.notes ?? undefined,
      clicks: links.reduce((sum, link) => sum + link.click_count, 0),
      orders: links.reduce((sum, link) => sum + link.conversion_count, 0),
      revenue: links.reduce((sum, link) => sum + link.revenue_cents, 0) / 100,
      link: latest?.destination_url,
      eventId: latest?.event_id ?? undefined,
      code: latest?.code,
    };
  });
}

export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return { name: "Preview Manager", role: "Development preview" };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { name: "Oasis Team", role: "Staff" };
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userData.user.id)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("roles(key,name)")
      .eq("user_id", userData.user.id),
  ]);
  const roleRows = (memberships ?? []).flatMap((membership) =>
    Array.isArray(membership.roles)
      ? membership.roles
      : membership.roles
        ? [membership.roles]
        : [],
  );
  const role =
    roleRows.find((item) => item.key === "owner") ??
    roleRows.find((item) => item.key === "manager") ??
    roleRows.find((item) => item.key === "staff") ??
    roleRows[0];
  return {
    name: profile?.full_name ?? userData.user.email ?? "Oasis Team",
    role: role?.name ?? "Staff",
  };
}

export async function getTeamMembers() {
  const admin = createSupabaseAdminClient();
  if (!admin)
    return [
      {
        id: "preview-manager",
        name: "Preview Manager",
        email: "manager@example.com",
        role: "manager" as const,
        status: "Active",
      },
      {
        id: "preview-staff",
        name: "Preview Staff",
        email: "staff@example.com",
        role: "staff" as const,
        status: "Active",
      },
      {
        id: "preview-door",
        name: "Preview Door Device",
        email: "door@example.com",
        role: "door" as const,
        status: "Active",
      },
    ];
  const [{ data: profiles, error }, authUsers] = await Promise.all([
    admin
      .from("profiles")
      .select("id,full_name,is_active,user_roles(roles(key))")
      .order("full_name"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (error) throw new Error("Oasis could not load team access.");
  const emailById = new Map(
    authUsers.data.users.map((user) => [
      user.id,
      user.email ?? "Invitation pending",
    ]),
  );
  return (profiles ?? []).map((profile) => {
    const memberships = Array.isArray(profile.user_roles)
      ? profile.user_roles
      : [];
    const roles = memberships.flatMap((membership) =>
      Array.isArray(membership.roles)
        ? membership.roles
        : membership.roles
          ? [membership.roles]
          : [],
    );
    const role =
      roles.find((item) => item.key === "owner")?.key ??
      roles.find((item) => item.key === "manager")?.key ??
      roles.find((item) => item.key === "staff")?.key ??
      "door";
    return {
      id: profile.id,
      name: profile.full_name,
      email: emailById.get(profile.id) ?? "Invitation pending",
      role: role as "owner" | "manager" | "staff" | "door",
      status: profile.is_active ? "Active" : "Paused",
    };
  });
}

export async function getOrders() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,order_number,total_cents,status,created_at,customers(first_name,last_name,email),events(title),order_items(quantity,ticket_types(name))",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error)
    throw new Error("Oasis could not load ticket orders from Supabase.");
  return (data ?? []).map((order) => {
    const customerValue = order.customers as
      | { first_name?: string; last_name?: string; email?: string }
      | { first_name?: string; last_name?: string; email?: string }[]
      | null;
    const customer = Array.isArray(customerValue)
      ? customerValue[0]
      : customerValue;
    const eventValue = order.events as
      { title?: string } | { title?: string }[] | null;
    const relatedEvent = Array.isArray(eventValue) ? eventValue[0] : eventValue;
    const items = Array.isArray(order.order_items) ? order.order_items : [];
    const itemCopy = items
      .map((item) => {
        const typeValue = item.ticket_types as
          { name?: string } | { name?: string }[] | null;
        const type = Array.isArray(typeValue) ? typeValue[0] : typeValue;
        return `${item.quantity} × ${type?.name ?? "Admission"}`;
      })
      .join(", ");
    const name =
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      customer?.email ||
      "Guest";
    const status =
      order.status === "paid"
        ? "Paid"
        : order.status === "refunded"
          ? "Refunded"
          : order.status === "partially_refunded"
            ? "Partially refunded"
            : order.status === "pending"
              ? "Pending"
              : "Cancelled";
    return {
      id: order.id,
      number: order.order_number,
      customer: name,
      email: customer?.email ?? "",
      event: relatedEvent?.title ?? "Oasis event",
      items: itemCopy || "Admission",
      total: order.total_cents / 100,
      time: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Chicago",
      }).format(new Date(order.created_at)),
      status,
    };
  });
}

export async function getAnalyticsSnapshot() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const [
    { data: economics, error },
    { data: activity },
    { data: promoterLinks },
  ] = await Promise.all([
    supabase
      .from("event_economics")
      .select("*")
      .order("starts_at", { ascending: false }),
    supabase
      .from("analytics_events")
      .select("event_name,source,properties")
      .gte("occurred_at", new Date(Date.now() - 31 * 86_400_000).toISOString()),
    supabase
      .from("promoter_links")
      .select("conversion_count,revenue_cents,promoters(name)")
      .order("revenue_cents", { ascending: false })
      .limit(10),
  ]);
  if (error) throw new Error("Oasis could not load event economics.");
  const eventRows = economics ?? [];
  const funnel = {
    views: eventRows.reduce(
      (sum, event) => sum + Number(event.event_views ?? 0),
      0,
    ),
    checkoutStarts: eventRows.reduce(
      (sum, event) => sum + Number(event.checkout_starts ?? 0),
      0,
    ),
    purchases: eventRows.reduce(
      (sum, event) => sum + Number(event.paid_orders ?? 0),
      0,
    ),
  };
  const sourceMap = new Map<
    string,
    { visits: number; orders: number; tickets: number; revenue: number }
  >();
  for (const item of activity ?? []) {
    const name = item.source || "direct";
    const current = sourceMap.get(name) ?? {
      visits: 0,
      orders: 0,
      tickets: 0,
      revenue: 0,
    };
    if (["page_view", "event_view", "link_click"].includes(item.event_name))
      current.visits += 1;
    if (item.event_name === "purchase") {
      current.orders += 1;
      current.tickets += Number(item.properties?.ticketCount ?? 0);
      current.revenue += Number(item.properties?.revenueCents ?? 0) / 100;
    }
    sourceMap.set(name, current);
  }
  const promoters = (promoterLinks ?? []).map((link) => {
    const value = link.promoters as
      { name?: string } | { name?: string }[] | null;
    const promoter = Array.isArray(value) ? value[0] : value;
    return {
      name: promoter?.name ?? "Promoter",
      tickets: link.conversion_count,
      revenue: link.revenue_cents / 100,
    };
  });
  return {
    eventRows,
    funnel,
    sources: [...sourceMap.entries()].map(([name, values]) => ({
      name,
      ...values,
    })),
    promoters,
  };
}

export async function getMediaAssets() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("media_assets")
    .select(
      "id,public_url,file_name,mime_type,width,height,drive_file_id,tags,created_at,events(title)",
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Oasis could not load the media library.");
  return (data ?? []).map((asset) => {
    const eventValue = asset.events as
      { title?: string } | { title?: string }[] | null;
    const relatedEvent = Array.isArray(eventValue) ? eventValue[0] : eventValue;
    const ratio =
      asset.width && asset.height && asset.width > asset.height
        ? "landscape"
        : asset.width && asset.height && asset.height > asset.width * 1.15
          ? "portrait"
          : "square";
    return {
      id: asset.id,
      url: asset.public_url ?? "/event-placeholder.svg",
      name: asset.file_name,
      type: asset.mime_type.startsWith("video/")
        ? "Video"
        : asset.tags?.includes("event-creative")
          ? "Flyer"
          : "Recent",
      event: relatedEvent?.title ?? "Oasis media",
      archived: Boolean(asset.drive_file_id),
      ratio,
    };
  });
}

export async function getMenuStructure(publicOnly = false) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  let query = supabase
    .from("menus")
    .select(
      "id,name,location_id,is_published,locations(name),menu_sections(id,name,description,sort_order,menu_items(id,name,description,price_cents,is_available,is_featured,dietary_tags,sort_order))",
    )
    .order("created_at")
    .limit(1);
  if (publicOnly) query = query.eq("is_published", true);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error("Oasis could not load the menu.");
  if (!data)
    return {
      menuId: "",
      locationId: "",
      locationName: "Oasis",
      published: false,
      sections: [],
    };
  const locationValue = data.locations as
    { name?: string } | { name?: string }[] | null;
  const location = Array.isArray(locationValue)
    ? locationValue[0]
    : locationValue;
  const sectionRows = Array.isArray(data.menu_sections)
    ? data.menu_sections
    : [];
  const sections = sectionRows
    .toSorted((a, b) => a.sort_order - b.sort_order)
    .map((section) => ({
      id: section.id,
      name: section.name,
      description: section.description ?? "",
      items: (Array.isArray(section.menu_items) ? section.menu_items : [])
        .toSorted((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          id: item.id,
          sectionId: section.id,
          name: item.name,
          description: item.description ?? "",
          price: item.price_cents / 100,
          available: item.is_available,
          featured: item.is_featured,
          dietaryTags: item.dietary_tags ?? [],
          sortOrder: item.sort_order,
        })),
    }));
  return {
    menuId: data.id,
    locationId: data.location_id ?? "",
    locationName: location?.name ?? "Oasis",
    published: data.is_published,
    sections,
  };
}

export async function getSiteCopy() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("site_content")
    .select("key,title,body,metadata,is_published")
    .in("key", [
      "homepage_hero",
      "homepage_events",
      "promotional_banner",
      "private_events",
      "visitor_details",
      "draft:homepage_hero",
      "draft:homepage_events",
      "draft:promotional_banner",
      "draft:private_events",
      "draft:visitor_details",
    ])
    .is("location_id", null);
  if (error) throw new Error("Oasis could not load website content.");
  const byKey = new Map((data ?? []).map((item) => [item.key, item]));
  const content = (key: string) => byKey.get(`draft:${key}`) ?? byKey.get(key);
  const hero = content("homepage_hero");
  const heroMetadata = hero?.metadata as
    | { heroImage?: string; primaryCta?: string; secondaryCta?: string }
    | null
    | undefined;
  const visitor = content("visitor_details");
  const visitorMetadata = visitor?.metadata as
    { hours?: string; reservationUrl?: string } | null | undefined;
  return {
    hero: hero?.title ?? "",
    subtitle: hero?.body ?? "",
    heroImage: heroMetadata?.heroImage ?? "",
    primaryCta: heroMetadata?.primaryCta ?? "",
    secondaryCta: heroMetadata?.secondaryCta ?? "",
    eventsHeading: content("homepage_events")?.title ?? "",
    banner: content("promotional_banner")?.title ?? "",
    privateEvents: content("private_events")?.body ?? "",
    phone: visitor?.title ?? "",
    address: visitor?.body ?? "",
    hours: visitorMetadata?.hours ?? "",
    reservationUrl: visitorMetadata?.reservationUrl ?? "",
  };
}
