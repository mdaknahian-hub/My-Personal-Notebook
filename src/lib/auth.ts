import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import * as repo from "@/lib/repo";

export { hashPassword, verifyPassword } from "@/lib/password";

export const SESSION_COOKIE = "dokan_session";
const ALG = "HS256";

function secretKey() {
  const secret =
    process.env.AUTH_SECRET || "dokan-hishab-dev-secret-change-me-0123456789";
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  name: string;
  phone: string;
};

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: [ALG],
    });
    if (!payload.userId) return null;
    return {
      userId: String(payload.userId),
      name: String(payload.name ?? ""),
      phone: String(payload.phone ?? ""),
    };
  } catch {
    return null;
  }
}

/** সেশন কুকি সেট করে */
export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** লগইন করা মালিকের সম্পূর্ণ প্রোফাইল */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return repo.findUserById(session.userId);
}

/** পেজের জন্য — লগইন না থাকলে লগইন পেজে পাঠায় */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** API রুটের জন্য — ৪০১ রেসপন্স দেয় */
export async function requireApiUser() {
  const user = await getCurrentUser();
  return user;
}
