import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const user = await db
      .select()
      .from(employees)
      .where(eq(employees.email, "shreyansh@trulyautomate.com"))
      .get();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await bcrypt.compare("Admin@123", user.passwordHash);

    return NextResponse.json({
      found: true,
      email: user.email,
      name: user.name,
      role: user.role,
      phLen: user.passwordHash.length,
      phPrefix: user.passwordHash.substring(0, 10),
      passwordValid: valid,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
