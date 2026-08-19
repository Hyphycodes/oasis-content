export type Role = "door" | "staff" | "manager" | "owner";

export type PublishStatus =
  "Draft" | "Ready" | "Scheduled" | "Live" | "Needs Attention";

export type DestinationStatus = {
  name:
    | "Website"
    | "Tickets"
    | "Oasis Links"
    | "Google Drive"
    | "Instagram"
    | "Facebook"
    | "Google";
  status:
    | "Live"
    | "On Sale"
    | "Saved"
    | "Scheduled"
    | "Ready"
    | "Needs Attention"
    | "Off";
  detail?: string;
};

export type OasisEvent = {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  shortDescription: string;
  date: string;
  doorsAt: string;
  startsAt: string;
  endsAt: string;
  locationId: string;
  locationName: string;
  address: string;
  price: number;
  capacity: number;
  sold: number;
  checkedIn: number;
  revenue: number;
  imageUrl: string;
  imageAlt: string;
  status: PublishStatus;
  ticketStatus: "On Sale" | "Free RSVP" | "Sold Out" | "Draft";
  destinations: DestinationStatus[];
  template?: string;
  ageRestriction?: string;
  ticketTypes?: TicketTypeOption[];
};

export type TicketTypeOption = {
  id: string;
  name: string;
  description?: string;
  price: number;
  capacity: number;
  sold: number;
  minPerOrder: number;
  maxPerOrder: number;
};

export type ContentItem = {
  id: string;
  title: string;
  channel: string;
  scheduledFor: string;
  status: PublishStatus;
  eventId?: string;
  imageUrl: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  visits: number;
  spend: number;
  lastSeen: string;
  source: string;
  tags: string[];
};

export type CustomerActivity = {
  id: string;
  type:
    | "view"
    | "rsvp"
    | "purchase"
    | "check_in"
    | "refund"
    | "email_open"
    | "link_click";
  title: string;
  detail: string;
  occurredAt: string;
  value?: number;
  eventTitle?: string;
  source?: string;
};

export type CustomerEventHistory = {
  id: string;
  title: string;
  amount: number;
  status: string;
};

export type CustomerDetail = Customer & {
  firstName: string;
  lastName: string;
  emailConsent: boolean;
  smsConsent: boolean;
  notes: string;
  createdAt: string;
  ticketsPurchased: number;
  rsvpCount: number;
  showRate: number;
  activity: CustomerActivity[];
  eventHistory: CustomerEventHistory[];
};

export type Guest = {
  id: string;
  name: string;
  partySize: number;
  checkedInCount?: number;
  type:
    | "Guest"
    | "Owner Guest"
    | "Comp"
    | "Influencer"
    | "Promoter"
    | "Artist"
    | "Staff"
    | "Partner"
    | "VIP"
    | "Other";
  status: "Expected" | "Checked In";
  note?: string;
  promoter?: string;
};

export type Promoter = {
  id: string;
  name: string;
  handle?: string;
  email?: string;
  phone?: string;
  notes?: string;
  clicks: number;
  orders: number;
  revenue: number;
  link?: string;
  eventId?: string;
  code?: string;
};

export type DoorSnapshot = {
  preview: boolean;
  eventId?: string;
  title: string;
  doorsAt: string;
  sold: number;
  guestAllocation: number;
  checkedIn: number;
  capacity: number;
};
