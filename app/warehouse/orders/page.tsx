// app/warehouse/orders/page.tsx
import OrdersClient from "./orders-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return <OrdersClient />;
}
