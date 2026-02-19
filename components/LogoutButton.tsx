"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="text-sm px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition"
    >
      Logout
    </button>
  );
}
