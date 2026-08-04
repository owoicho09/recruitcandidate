import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { getApplicationDetail } from "@/lib/services/applications";
import { listMembers } from "@/lib/services/team";
import { getAssessmentForJob } from "@/lib/services/assessments";
import { getVideoInterviewForJob } from "@/lib/services/video-interviews";
import { Avatar } from "@/components/ui/avatar";
import { StatusChip } from "@/components/ui/status-chip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CandidateActions } from "@/components/dashboard/candidate/candidate-actions";
import { ProfilePanel } from "@/components/dashboard/candidate/profile-panel";
import { CvPanel } from "@/components/dashboard/candidate/cv-panel";
import { ScreeningPanel } from "@/components/dashboard/candidate/screening-panel";
import { AssessmentPanel } from "@/components/dashboard/candidate/assessment-panel";
import { VideoPanel } from "@/components/dashboard/candidate/video-panel";
import { TimelinePanel } from "@/components/dashboard/candidate/timeline-panel";
import { NotesPanel } from "@/components/dashboard/candidate/notes-panel";
import { stageMap, recommendationMap } from "@/lib/status-maps";
import { listEmailLogsForApplication } from "@/lib/services/emails";

export const metadata: Metadata = { title: "Candidate" };

export default async function CandidateDetailPage({ params }: PageProps<"/dashboard/applicants/[id]">) {
  const session = await requireSession();
  const { id } = await params;
  const detail = await getApplicationDetail(session.companyId, id);
  if (!detail) notFound();

  const { application, candidate, job, screening, assessmentAttempt, videoAttempt, videoResponses, events, notes } = detail;
  const [members, assessment, videoInterview, emailLogs] = await Promise.all([
    listMembers(session.companyId),
    getAssessmentForJob(session.companyId, job.id),
    getVideoInterviewForJob(session.companyId, job.id),
    listEmailLogsForApplication(application.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={`${candidate.first_name} ${candidate.last_name}`} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{candidate.first_name} {candidate.last_name}</h1>
              <StatusChip tone={stageMap[application.stage].tone}>{stageMap[application.stage].label}</StatusChip>
              {application.recommendation && <StatusChip tone={recommendationMap[application.recommendation].tone}>{recommendationMap[application.recommendation].label}</StatusChip>}
            </div>
            <p className="text-sm text-foreground-muted">{job.title}</p>
          </div>
        </div>
      </div>

      <CandidateActions application={application} members={members} hasAssessment={Boolean(assessment)} hasVideoInterview={Boolean(videoInterview)} />

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="cv">CV</TabsTrigger>
          <TabsTrigger value="screening">AI Screening</TabsTrigger>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
          <TabsTrigger value="video">Video Interview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile"><ProfilePanel candidate={candidate} application={application} job={job} /></TabsContent>
        <TabsContent value="cv"><CvPanel application={application} /></TabsContent>
        <TabsContent value="screening"><ScreeningPanel screening={screening} /></TabsContent>
        <TabsContent value="assessment"><AssessmentPanel assessment={assessment} attempt={assessmentAttempt} /></TabsContent>
        <TabsContent value="video"><VideoPanel videoInterview={videoInterview} attempt={videoAttempt} responses={videoResponses} /></TabsContent>
        <TabsContent value="timeline"><TimelinePanel events={events} emailLogs={emailLogs} /></TabsContent>
        <TabsContent value="notes"><NotesPanel applicationId={application.id} notes={notes} /></TabsContent>
      </Tabs>
    </div>
  );
}
