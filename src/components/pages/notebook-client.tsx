"use client";

import { useMemo, useState } from "react";
import { NotebookPen, Pin, PinOff, Plus, Search, Trash2, Pencil } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui/bits";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/fields";
import { NoteForm } from "@/components/forms/note-form";
import { useStore } from "@/components/providers/store";
import { useToast } from "@/components/ui/toast";
import { fmtRelative, toBnDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NoteLite } from "@/lib/types";

const COLOR_CLASS: Record<string, string> = {
  amber: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25",
  emerald: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25",
  sky: "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/25",
  rose: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25",
  violet: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/25",
};

export function NotebookClient() {
  const { notes, bn, temp } = useStore();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NoteLite | null>(null);
  const [deleting, setDeleting] = useState<NoteLite | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) =>
      q ? `${n.title} ${n.body} ${n.tags ?? ""}`.toLowerCase().includes(q) : true,
    );
  }, [notes, query]);

  const pinned = filtered.filter((n) => n.pinned);
  const rest = filtered.filter((n) => !n.pinned);

  const togglePin = async (note: NoteLite) => {
    await temp.updateNote(note.id, { pinned: !note.pinned });
    toast.success(note.pinned ? "পিন সরানো হয়েছে" : "উপরে পিন করা হয়েছে");
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    const result = await temp.removeNote(deleting.id);
    setBusy(false);
    setDeleting(null);
    if (result.ok) toast.success("নোট মুছে ফেলা হয়েছে");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Card className="space-y-3">
        <div className="flex gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="নোট খুঁজুন..."
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="btn btn-primary shrink-0 px-3.5"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">নতুন নোট</span>
          </button>
        </div>
        <p className="text-xs text-muted">
          মোট {toBnDigits(notes.length)} টি নোট • {toBnDigits(pinned.length)} টি পিন করা। দোকানের
          কাজ, লিস্ট বা মনে রাখার কথা এখানে লিখে রাখুন।
        </p>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<NotebookPen className="size-6" />}
          title={notes.length === 0 ? "নোটবুক খালি" : "কিছু পাওয়া যায়নি"}
          description={
            notes.length === 0
              ? "নতুন মালের লিস্ট, তাগাদার নাম বা যেকোনো কথা লিখে রাখুন — পরে খুঁজে পাবেন।"
              : "অন্য শব্দ দিয়ে খুঁজে দেখুন।"
          }
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" /> প্রথম নোট লিখুন
            </button>
          }
        />
      ) : (
        <div className="space-y-5">
          {pinned.length > 0 ? (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted">
                <Pin className="size-3.5" /> পিন করা নোট
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pinned.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    bn={bn}
                    onEdit={() => {
                      setEditing(note);
                      setFormOpen(true);
                    }}
                    onDelete={() => setDeleting(note)}
                    onPin={() => togglePin(note)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {rest.length > 0 ? (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted">
                <Search className="size-3.5" /> সব নোট
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    bn={bn}
                    onEdit={() => {
                      setEditing(note);
                      setFormOpen(true);
                    }}
                    onDelete={() => setDeleting(note)}
                    onPin={() => togglePin(note)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? "নোট সম্পাদনা" : "নতুন নোট"}
        size="md"
      >
        <NoteForm
          editing={editing}
          onDone={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="নোটটি মুছে ফেলবেন?"
        message={deleting?.title}
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function NoteCard({
  note,
  bn,
  onEdit,
  onDelete,
  onPin,
}: {
  note: NoteLite;
  bn: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl border p-4 transition hover:shadow-[var(--shadow-lift)]",
        COLOR_CLASS[note.color] ?? COLOR_CLASS.amber,
        note._pending && "opacity-60",
      )}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <h3 className="font-bold leading-snug">{note.title}</h3>
        <button
          type="button"
          onClick={onPin}
          className="shrink-0 rounded-lg p-1 text-muted transition hover:bg-white/60 dark:hover:bg-white/10"
          aria-label={note.pinned ? "পিন সরান" : "পিন করুন"}
        >
          {note.pinned ? <Pin className="size-4" /> : <PinOff className="size-4" />}
        </button>
      </div>
      <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed">{note.body}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {note.tags
            ? note.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
                .map((tag) => (
                  <Badge key={tag} tone="slate">
                    {tag}
                  </Badge>
                ))
            : null}
        </div>
        <p className="shrink-0 text-[10px] text-muted">{fmtRelative(note.updatedAt, bn)}</p>
      </div>
      <div className="mt-2 flex gap-1.5 border-t pt-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-semibold text-muted transition hover:bg-white/60 dark:hover:bg-white/10"
        >
          <Pencil className="size-3.5" /> সম্পাদনা
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100/60 dark:text-rose-400 dark:hover:bg-rose-500/10"
        >
          <Trash2 className="size-3.5" /> মুছুন
        </button>
      </div>
    </div>
  );
}
