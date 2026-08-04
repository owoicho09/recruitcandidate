import { Mail, Phone, MapPin, Link2, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";
import type { Application, Candidate, Job } from "@/types/database";

export function ProfilePanel({ candidate, application, job }: { candidate: Candidate; application: Application; job: Job }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <p className="text-sm font-semibold text-foreground">Contact information</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow icon={Mail} label={candidate.email} />
          {candidate.phone && <InfoRow icon={Phone} label={candidate.phone} />}
          {candidate.location && <InfoRow icon={MapPin} label={candidate.location} />}
          <InfoRow icon={Calendar} label={`Applied to ${job.title} · ${formatDate(application.applied_at)}`} />
          {candidate.linkedin_url && <InfoRow icon={Link2} label="LinkedIn" href={candidate.linkedin_url} />}
          {candidate.portfolio_url && <InfoRow icon={Link2} label="Portfolio" href={candidate.portfolio_url} />}
        </div>
      </Card>

      {application.cover_note && (
        <Card className="p-5">
          <p className="text-sm font-semibold text-foreground">Cover note</p>
          <p className="mt-2 text-sm text-foreground-muted">{application.cover_note}</p>
        </Card>
      )}

      {Object.keys(application.application_answers).length > 0 && (
        <Card className="p-5">
          <p className="text-sm font-semibold text-foreground">Application answers</p>
          <div className="mt-2 flex flex-col gap-3">
            {job.application_questions.map((q) => (
              <div key={q.id}>
                <p className="text-xs font-medium text-foreground-muted">{q.label}</p>
                <p className="text-sm text-foreground">{application.application_answers[q.id] ?? "—"}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, href }: { icon: typeof Mail; label: string; href?: string }) {
  const content = (
    <span className="flex items-center gap-2 text-sm text-foreground-muted">
      <Icon className="size-4 text-foreground-muted" /> {label}
    </span>
  );
  if (href) return <a href={href} target="_blank" rel="noreferrer" className="hover:text-accent">{content}</a>;
  return content;
}
