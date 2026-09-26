import * as repo from "@/lib/repo";
import { authUser, handleError, ok } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const user = await authUser();
    const url = new URL(request.url);
    const take = Number(url.searchParams.get("take") ?? 30);
    const activities = repo.listActivities(user.id, Math.min(Math.max(take, 1), 200));
    return ok({ activities });
  } catch (error) {
    return handleError(error);
  }
}
