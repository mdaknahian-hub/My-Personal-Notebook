"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  MessageSquare,
  Phone,
  Send,
  Smartphone,
  UserCheck,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Avatar, Badge } from "@/components/ui/bits";
import { Field, Textarea } from "@/components/ui/fields";
import { useStore } from "@/components/providers/store";
import { useToast } from "@/components/ui/toast";
import { fmtMoney, prettyPhone, toIntlPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHANNELS = [
  { value: "whatsapp", label: "হোয়াটসঅ্যাপ", icon: <MessageSquare className="size-4" /> },
  { value: "sms", label: "এসএমএস", icon: <Smartphone className="size-4" /> },
  { value: "call", label: "ফোন কল", icon: <Phone className="size-4" /> },
  { value: "in_person", label: "সরাসরি দেখা", icon: <UserCheck className="size-4" /> },
] as const;

type Channel = (typeof CHANNELS)[number]["value"];

export function ReminderSheet({
  open,
  onClose,
  customerId,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string | null;
}) {
  const { customers, user, bn, temp, dueOf } = useStore();
  const toast = useToast();
  const customer = customers.find((c) => c.id === customerId) ?? null;
  const due = customer ? dueOf(customer.id) : 0;

  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [saving, setSaving] = useState(false);

  const message = useMemo(() => {
    if (!customer) return "";
    return user.reminderTemplate
      .replace(/\{name\}/g, customer.name)
      .replace(/\{amount\}/g, due.toFixed(0))
      .replace(/\{shop\}/g, user.shopName)
      .replace(/\{phone\}/g, user.shopPhone ?? user.phone);
  }, [customer, due, user]);

  const [text, setText] = useState(message);

  // কাস্টমার বা বাকির পরিমাণ বদলালে মেসেজ আবার সেট করে দেয়
  useEffect(() => {
    setText(message);
  }, [message]);

  const logReminder = async (status: "sent" | "promised" | "later") => {
    if (!customer) return;
    setSaving(true);
    const result = await temp.addReminder({
      customerId: customer.id,
      channel,
      message: text,
      amount: due,
      status,
    });
    setSaving(false);
    if (result.ok) {
      toast.success(
        status === "promised"
          ? "কাস্টমার কথা দিয়েছেন — লিখে রাখা হলো"
          : status === "later"
            ? "পরে দিবেন — লিখে রাখা হলো"
            : "তাগাদা পাঠানোর হিসাব রাখা হলো",
        customer.name,
      );
      onClose();
    }
  };

  const send = async () => {
    if (!customer) return;
    const phone = toIntlPhone(customer.phone);
    if (channel === "whatsapp") {
      if (!phone) {
        toast.error("কাস্টমারের ফোন নম্বর নেই", "আগে নম্বর যোগ করে নিন");
        return;
      }
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
      await logReminder("sent");
    } else if (channel === "sms") {
      if (!phone) {
        toast.error("কাস্টমারের ফোন নম্বর নেই");
        return;
      }
      window.location.href = `sms:${phone}?&body=${encodeURIComponent(text)}`;
      await logReminder("sent");
    } else if (channel === "call") {
      if (!phone) {
        toast.error("কাস্টমারের ফোন নম্বর নেই");
        return;
      }
      window.location.href = `tel:${phone}`;
      await logReminder("sent");
    } else {
      await logReminder("sent");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="তাগাদা পাঠান"
      description="স্মার্ট রিমাইন্ডার — এক ট্যাপে হোয়াটসঅ্যাপে বাকির কথা মনে করিয়ে দিন"
      size="md"
    >
      {!customer ? (
        <p className="py-6 text-center text-sm text-muted">কাস্টমার নির্বাচন করুন</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
            <Avatar name={customer.name} color={customer.color} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{customer.name}</p>
              <p className="text-xs text-muted">
                {prettyPhone(customer.phone, bn) || "ফোন নম্বর নেই"}
              </p>
            </div>
            <Badge tone={due > 0 ? "rose" : "emerald"}>
              {due > 0 ? fmtMoney(due, { bn }) : "হিসাব পরিষ্কার"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CHANNELS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setChannel(c.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-semibold transition",
                  channel === c.value
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                    : "text-muted hover:border-brand-300",
                )}
              >
                {c.icon}
                {c.label}
              </button>
            ))}
          </div>

          <Field label="মেসেজ" hint="চাইলে নিজের মতো করে বদলে নিতে পারেন">
            <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={send}
              disabled={saving || due <= 0}
              className="btn btn-primary flex-1 py-3"
            >
              <Send className="size-4" />
              {channel === "whatsapp"
                ? "হোয়াটসঅ্যাপে পাঠান"
                : channel === "sms"
                  ? "এসএমএস পাঠান"
                  : channel === "call"
                    ? "এখনই কল করুন"
                    : "সরাসরি দেখা হয়েছে"}
            </button>
            <button
              type="button"
              onClick={() => logReminder("promised")}
              disabled={saving}
              className="btn btn-ghost"
            >
              <CheckCircle2 className="size-4 text-emerald-500" /> কথা দিয়েছেন
            </button>
            <button
              type="button"
              onClick={() => logReminder("later")}
              disabled={saving}
              className="btn btn-ghost"
            >
              পরে দিবেন
            </button>
          </div>

          {due <= 0 ? (
            <p className="rounded-2xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
              এই কাস্টমারের কোনো বাকি নেই — তাগাদা পাঠানোর দরকার নেই। 🎉
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
