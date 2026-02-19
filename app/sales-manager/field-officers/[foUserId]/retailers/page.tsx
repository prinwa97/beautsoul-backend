import RetailerWorkTabsClient from "./tabs-client";

export default async function Page({ params }: { params: Promise<{ foUserId: string }> }) {
  const { foUserId } = await params;
  return <RetailerWorkTabsClient foUserId={foUserId} />;
}
