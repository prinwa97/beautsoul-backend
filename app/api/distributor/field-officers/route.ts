import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me?.distributorId) {
    return NextResponse.json({ error: "DistributorId missing (login/session issue)." }, { status: 401 });
  }

  const body = await req.json();
  const { name, phone, city, state, password } = body;

  if (!name || !phone || !password) {
    return NextResponse.json({ error: "name, phone, password required" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  const fo = await prisma.user.create({
    data: {
      distributorId: me.distributorId,
      name,
      phone,
      city,
      state,
      role: "FIELD_OFFICER",
      code: "AUTO", // baad me auto generate
      passwordHash,
    },
    select: { id: true, code: true, name: true, phone: true },
  });

  return NextResponse.json({ fieldOfficer: fo });
}
