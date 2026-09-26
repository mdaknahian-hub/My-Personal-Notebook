import * as repo from "@/lib/repo";
import { authUser, handleError, ok, readJson } from "@/lib/api";
import { reminderSchema } from "@/lib/validation";
import { assertCustomerOwned, logActivity } from "@/lib/services";

export async function GET(request: Request) {
  try {
    const user = await authUser();
    const url = new URL(request.url);
    const customerId = url.searchParams.get("customerId");
    return ok({ reminders: repo.listReminders(user.id, customerId, 100) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await authUser();
    const body = await readJson(request);
    const data = reminderSchema.parse(body);
    const customer = assertCustomerOwned(user.id, data.customerId);

    const reminder = repo.createReminder(user.id, {
      customerId: data.customerId,
      channel: data.channel,
      message: data.message ?? null,
      amount: data.amount,
      status: data.status,
    });

    const channelLabel: Record<string, string> = {
      whatsapp: "হোয়াটসঅ্যাপ",
      sms: "এসএমএস",
      call: "ফোন কল",
      in_person: "সরাসরি দেখা",
    };

    logActivity(user.id, {
      action: "create",
      entity: "reminder",
      entityId: reminder.id,
      title: `${customer.name} কে তাগাদা দেওয়া হয়েছে (${channelLabel[data.channel]})`,
      amount: data.amount,
    });

    return ok({ reminder }, 201);
  } catch (error) {
    return handleError(error);
  }
}
