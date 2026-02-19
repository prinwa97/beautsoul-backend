import FieldOfficerWorkingClient from "./working-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { foUserId: string } }) {
  const foUserId = params.foUserId;
  return <FieldOfficerWorkingClient foUserId={foUserId} />;
}
