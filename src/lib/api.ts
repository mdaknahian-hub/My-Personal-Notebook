import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@/lib/models";

export type ApiUser = User;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data as object, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(error: unknown) {
  if (error instanceof ApiError) return fail(error.message, error.status);
  if (error instanceof ZodError) {
    return fail(error.issues[0]?.message ?? "তথ্য সঠিক নয়", 422);
  }
  console.error("[api-error]", error);
  const message =
    error instanceof Error ? error.message : "সার্ভারে সমস্যা হয়েছে";
  return fail(message, 500);
}

/** লগইন চেক করে ইউজার ফেরত দেয়, নাহলে ത്രো করে */
export async function authUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError("লগইন করা প্রয়োজন", 401);
  }
  return user;
}

export function parseBody<S extends z.ZodTypeAny>(
  schema: S,
  body: unknown,
): z.output<S> {
  return schema.parse(body);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
