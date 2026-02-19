import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function CreateOrdersCreateRedirect(props: any) {
  const retailerId = props?.searchParams?.retailerId ? String(props.searchParams.retailerId) : "";

  if (retailerId) {
    redirect(`/field-officer/orders/create?retailerId=${encodeURIComponent(retailerId)}`);
  }

  redirect("/field-officer/orders");
}