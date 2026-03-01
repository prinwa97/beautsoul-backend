import FieldOfficerWorkingClient from "./working-client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page(props: any) {
  // ✅ supports both: params object OR params Promise
  const rawParams =
    props?.params && typeof props.params?.then === "function"
      ? await props.params
      : props?.params;

  const foUserId: string | undefined = rawParams?.foUserId;
  if (!foUserId) {
    return <div className="p-4 text-sm">FO_USER_ID_REQUIRED</div>;
  }

  // ✅ Find a distributor for this FO (via any mapped retailer)
  const map = await prisma.fieldOfficerRetailerMap.findFirst({
    where: { foUserId },
    select: {
      retailer: {
        select: {
          distributorId: true,
          distributor: { select: { name: true } },
        },
      },
    },
  });

  const distributorId = map?.retailer?.distributorId;
  const distributorName = map?.retailer?.distributor?.name;

  if (!distributorId) {
    return (
      <div className="p-4 text-sm">
        No distributor mapping found for this Field Officer.
      </div>
    );
  }

  return (
    <FieldOfficerWorkingClient
      foUserId={foUserId}
      distributorId={distributorId}
      distributorName={distributorName}
    />
  );
}