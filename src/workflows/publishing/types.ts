export type PublishDestination = "website" | "tickets" | "oasis_links" | "google_drive" | "instagram" | "facebook" | "google_business";

export type PublishEventPayload = {
  jobId: string;
  event: {
    id: string;
    slug: string;
    title: string;
    description: string;
    startsAt: string;
    endsAt: string;
    locationName: string;
    imageUrl?: string;
  };
  destinations: PublishDestination[];
};
