import ProcessDispatchClient from "./ProcessDispatchClient";

export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <ProcessDispatchClient orderId={orderId} />;
}
