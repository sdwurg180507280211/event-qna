import { redirect } from "next/navigation";

/** Keep previously shared login links and QR codes working without a login step. */
export default async function EventLoginPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/event/${encodeURIComponent(eventId)}`);
}
