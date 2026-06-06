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
import { createSessionToken } from "@/lib/auth/session";

export async function loginAction(formData: FormData): Promise<void> {
  if (!authEnabled()) redirect("/");

  const password = String(formData.get("password") ?? "");
  if (password !== getPassword()) {
    redirect("/login?error=1");
  }

  const token = await createSessionToken(getSecret(), SESSION_MAX_AGE_S);
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
