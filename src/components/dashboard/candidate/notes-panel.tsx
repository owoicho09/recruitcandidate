"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/utils/format";
import type { Note } from "@/types/database";

export function NotesPanel({ applicationId, notes }: { applicationId: string; notes: Note[] }) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function submit() {
    if (!body.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/applications/${applicationId}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
    setSubmitting(false);
    if (res.ok) {
      setBody("");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <Textarea rows={3} placeholder="Add an internal note…" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="mt-2 flex justify-end">
          <Button size="sm" loading={submitting} onClick={submit}>Add note</Button>
        </div>
      </Card>

      {notes.length === 0 ? (
        <EmptyState title="No notes yet" description="Internal notes on this candidate will appear here." className="border-none py-8" />
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <Card key={note.id} className="p-4">
              <div className="flex items-center gap-2">
                <Avatar name={note.author_name} size="sm" />
                <div>
                  <p className="text-sm font-medium text-foreground">{note.author_name}</p>
                  <p className="text-xs text-foreground-muted">{formatDateTime(note.created_at)}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-foreground-muted">{note.body}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
