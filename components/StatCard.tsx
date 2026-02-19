import Link from "next/link";

export default function StatCard({ title, value, subtitle, href }: any) {
  return (
    <Link href={href} className="block rounded-2xl bg-white p-4 border hover:shadow">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </Link>
  );
}
