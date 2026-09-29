import { LoginClient } from "@/components/LoginClient";

export default async function EventLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const ticket = typeof query.ticket === "string" ? query.ticket : undefined;

  return <LoginClient eventId={eventId} ticket={ticket} />;
}
