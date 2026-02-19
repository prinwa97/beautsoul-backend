import RetailerDetailClient from "./retailer-detail-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SMRetailerDetailPage({
  params,
}: {
  params: Promise<{ retailerId: string }>;
}) {
  const { retailerId } = await params;
  return <RetailerDetailClient retailerId={retailerId} />;
}