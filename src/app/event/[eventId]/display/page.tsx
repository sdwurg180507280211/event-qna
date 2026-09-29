import { DisplayClient } from "@/components/DisplayClient";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <DisplayClient eventId={eventId} />;
}
