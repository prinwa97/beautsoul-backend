import FieldOfficerWorkingClient from "./working-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ foUserId: string }>;
}) {
  const { foUserId } = await params;

  return <FieldOfficerWorkingClient foUserId={foUserId} />;
}