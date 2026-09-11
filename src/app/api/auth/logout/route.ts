import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  await clearSessionCookie();
  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  return NextResponse.redirect(new URL("/login", baseUrl));
}
