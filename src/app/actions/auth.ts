"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_S,
  authEnabled,
  getPassword,
  getSecret,
} from "@/lib/auth/config";
import { createSessionToken, timingSafeEqual } from "@/lib/auth/session";

export async function loginAction(formData: FormData): Promise<void> {
  if (!authEnabled()) redirect("/");

  // Fail closed if the operator enabled auth without a signing secret.
  const secret = getSecret();
  if (!secret) redirect("/login?error=config");

  const password = String(formData.get("password") ?? "");
  const stored = getPassword() ?? "";
  if (!timingSafeEqual(password, stored)) {
    redirect("/login?error=1");
  }

  const token = await createSessionToken(secret, SESSION_MAX_AGE_S);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
