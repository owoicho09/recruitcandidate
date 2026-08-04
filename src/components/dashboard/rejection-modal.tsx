"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Application, FeedbackMode } from "@/types/database";

export function RejectionModal({ application, open, onOpenChange }: { application: Application; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const toast = useToast();
  const [feedbackMode, setFeedbackMode] = React.useState<FeedbackMode>("concise");
  const [internalReason, setInternalReason] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [aiDraft, setAiDraft] = React.useState("");
  const [sendEmailToggle, setSendEmailToggle] = React.useState(true);
  const [loadingDraft, setLoadingDraft] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const generateDraft = React.useCallback(async (mode: FeedbackMode) => {
    setLoadingDraft(true);
    const res = await fetch("/api/rejections/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId: application.id, feedbackMode: mode }) });
    const data = await res.json().catch(() => ({}));
    setLoadingDraft(false);
    if (res.ok) {
      setDraft(data.draft);
      setAiDraft(data.draft);
    }
  }, [application.id]);

  React.useEffect(() => {
    // Fetch a fresh AI draft each time the modal opens (not on every feedbackMode change —
    // handleModeChange below re-fetches explicitly when the mode selector changes).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) generateDraft(feedbackMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleModeChange(mode: FeedbackMode) {
    setFeedbackMode(mode);
    if (mode !== "none") await generateDraft(mode);
    else setDraft("");
  }

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/rejections/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: application.id,
        stage: application.stage,
        internalReason,
        aiDraft,
        finalMessage: sendEmailToggle ? draft : "",
        feedbackMode,
        sendEmailToggle,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("Candidate rejected", sendEmailToggle ? "Email sent" : "No email was sent");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error("Couldn't complete rejection");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reject candidate</DialogTitle>
          <DialogDescription>This will move the candidate to Rejected. Review the message before sending.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Internal rejection reason" htmlFor="internalReason" hint="Not shared with the candidate">
            <Textarea id="internalReason" rows={2} value={internalReason} onChange={(e) => setInternalReason(e.target.value)} />
          </Field>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Send rejection email</label>
            <Switch checked={sendEmailToggle} onCheckedChange={setSendEmailToggle} />
          </div>

          {sendEmailToggle && (
            <>
              <Field label="Feedback mode" htmlFor="feedbackMode">
                <Select value={feedbackMode} onValueChange={(v) => handleModeChange(v as FeedbackMode)}>
                  <SelectTrigger id="feedbackMode"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">Concise</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="none">No detailed feedback</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Email preview"
                htmlFor="draft"
                hint={
                  <span className="flex items-center gap-1"><Sparkles className="size-3 text-accent" /> AI-drafted — edit freely before sending</span>
                }
              >
                <Textarea id="draft" rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} disabled={loadingDraft} />
              </Field>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="danger" loading={submitting} onClick={submit}>Confirm rejection</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
