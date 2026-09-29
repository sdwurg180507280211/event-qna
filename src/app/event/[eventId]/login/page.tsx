import { redirect } from "next/navigation";

/** Keep previously shared login links working after splitting ask/display pages. */
export default async function EventLoginPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/event/${encodeURIComponent(eventId)}/ask`);
}
