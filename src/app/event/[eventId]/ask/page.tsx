import { AskClient } from "@/components/AskClient";

export default async function AskPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <AskClient eventId={eventId} />;
}
