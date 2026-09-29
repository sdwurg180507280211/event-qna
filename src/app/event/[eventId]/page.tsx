import { EventClient } from "@/components/EventClient";

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <EventClient eventId={eventId} />;
}
