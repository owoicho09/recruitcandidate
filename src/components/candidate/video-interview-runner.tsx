"use client";

import * as React from "react";
import { CheckCircle2, Video, Mic, RotateCcw, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDuration } from "@/lib/utils/format";
import type { Company, Job, VideoInterview, VideoInterviewAttempt } from "@/types/database";

type Phase = "consent" | "device-check" | "instructions" | "prep" | "recording" | "review" | "submitting" | "done";

export function VideoInterviewRunner({
  token,
  interview,
  attempt: initialAttempt,
  job,
  company,
}: {
  token: string;
  interview: VideoInterview;
  attempt: VideoInterviewAttempt;
  job: Job;
  company: Company;
}) {
  const [phase, setPhase] = React.useState<Phase>(initialAttempt.status === "completed" ? "done" : "consent");
  const [consented, setConsented] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [prepLeft, setPrepLeft] = React.useState(0);
  const [recordSeconds, setRecordSeconds] = React.useState(0);
  const [retriesUsed, setRetriesUsed] = React.useState(0);
  const [lastBlobUrl, setLastBlobUrl] = React.useState<string | null>(null);
  const [deviceError, setDeviceError] = React.useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const lastBlobRef = React.useRef<Blob | null>(null);

  const question = interview.questions[questionIndex];

  React.useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  async function requestDevices() {
    setDeviceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setPhase("device-check");
    } catch {
      setDeviceError("We couldn't access your camera or microphone. Check your browser permissions and try again.");
    }
  }

  function beginQuestion() {
    setRetriesUsed(0);
    setPrepLeft(question.prep_seconds);
    setPhase("prep");
  }

  React.useEffect(() => {
    if (phase !== "prep") return;
    if (prepLeft <= 0) {
      startRecording();
      return;
    }
    const t = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, prepLeft]);

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      lastBlobRef.current = blob;
      setLastBlobUrl(URL.createObjectURL(blob));
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecordSeconds(question.response_seconds);
    setPhase("recording");
  }

  React.useEffect(() => {
    if (phase !== "recording") return;
    if (recordSeconds <= 0) {
      stopRecording();
      return;
    }
    const t = setTimeout(() => setRecordSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, recordSeconds]);

  function stopRecording() {
    recorderRef.current?.stop();
    setPhase("review");
  }

  function retake() {
    if (retriesUsed >= question.max_retries) return;
    setRetriesUsed((r) => r + 1);
    setLastBlobUrl(null);
    lastBlobRef.current = null;
    beginQuestion();
  }

  async function confirmAndContinue() {
    setPhase("submitting");
    const durationUsed = question.response_seconds - recordSeconds;
    const form = new FormData();
    form.set("questionId", question.id);
    form.set("durationSeconds", String(durationUsed || question.response_seconds));
    if (lastBlobRef.current) form.set("video", lastBlobRef.current, `${question.id}.webm`);
    setUploadError(null);
    const res = await fetch(`/api/video-interviews/${token}/respond`, { method: "POST", body: form }).catch(() => null);
    if (!res?.ok) {
      // Keep the recording and go back to review so the candidate can retry the upload instead of silently losing the answer.
      const data = res ? await res.json().catch(() => ({})) : {};
      setUploadError(data.error ?? "Your response didn't upload — check your connection and press continue again.");
      setPhase("review");
      return;
    }

    if (questionIndex < interview.questions.length - 1) {
      setQuestionIndex((i) => i + 1);
      setLastBlobUrl(null);
      lastBlobRef.current = null;
      setPhase("instructions");
    } else {
      const done = await fetch(`/api/video-interviews/${token}/complete`, { method: "POST" }).catch(() => null);
      if (!done?.ok) {
        setUploadError("We couldn't finalize your interview — check your connection and press continue again.");
        setPhase("review");
        return;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setPhase("done");
    }
  }

  if (phase === "done") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 px-4 py-20 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <h1 className="text-xl font-semibold text-foreground">Interview submitted</h1>
        <p className="text-sm text-foreground-muted">Thanks for completing your video interview for {job.title} at {company.name}. We&apos;ve sent a confirmation email.</p>
      </div>
    );
  }

  if (phase === "consent") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">{company.name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">{interview.title}</h1>
          <p className="mt-1 text-sm text-foreground-muted">{job.title}</p>
        </div>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-foreground-muted">{interview.instructions}</p>
            <label className="flex items-start gap-2.5 text-sm text-foreground-muted">
              <Checkbox checked={consented} onCheckedChange={(v) => setConsented(v === true)} className="mt-0.5" />
              I consent to being recorded for the purpose of this interview, and understand my responses will be reviewed by {company.name}&apos;s hiring team.
            </label>
            <Button size="lg" disabled={!consented} onClick={requestDevices}>Continue</Button>
            {deviceError && <p className="text-xs text-danger">{deviceError}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "device-check") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-16">
        <h1 className="text-center text-xl font-semibold text-foreground">Check your camera & microphone</h1>
        <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full rounded-lg bg-foreground/90" />
        <div className="flex items-center justify-center gap-4 text-sm text-foreground-muted">
          <span className="flex items-center gap-1.5"><Video className="size-4 text-success" /> Camera</span>
          <span className="flex items-center gap-1.5"><Mic className="size-4 text-success" /> Microphone</span>
        </div>
        <Button size="lg" onClick={() => setPhase("instructions")}>Looks good, continue</Button>
      </div>
    );
  }

  if (phase === "instructions") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-16 text-center">
        <p className="text-sm font-medium text-foreground-muted">Question {questionIndex + 1} of {interview.questions.length}</p>
        <h1 className="text-xl font-semibold text-foreground">{question.prompt}</h1>
        <p className="text-sm text-foreground-muted">You&apos;ll have {question.prep_seconds}s to prepare, then {question.response_seconds}s to respond.</p>
        <Button size="lg" onClick={beginQuestion}>I&apos;m ready</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-12">
      <p className="text-center text-sm font-medium text-foreground-muted">Question {questionIndex + 1} of {interview.questions.length}</p>
      <p className="text-center text-base font-medium text-foreground">{question.prompt}</p>

      {phase === "prep" && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-5xl font-semibold text-accent">{prepLeft}</p>
          <p className="text-sm text-foreground-muted">Get ready…</p>
        </div>
      )}

      {phase === "recording" && (
        <div className="flex flex-col items-center gap-3">
          <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full rounded-lg bg-foreground/90" />
          <div className="flex items-center gap-2 text-sm font-medium text-danger">
            <span className="size-2 animate-pulse rounded-full bg-danger" /> Recording — {formatDuration(recordSeconds)} left
          </div>
          <Button variant="secondary" onClick={stopRecording}>Finish early</Button>
        </div>
      )}

      {phase === "review" && (
        <div className="flex flex-col items-center gap-4">
          {lastBlobUrl && <video src={lastBlobUrl} controls className="aspect-video w-full rounded-lg bg-foreground/90" />}
          <div className="flex gap-3">
            {retriesUsed < question.max_retries && question.retries_allowed && (
              <Button variant="secondary" onClick={retake}><RotateCcw className="size-4" /> Retake</Button>
            )}
            <Button onClick={confirmAndContinue}><Play className="size-4" /> Use this response</Button>
          </div>
          {uploadError && <p role="alert" className="text-center text-sm text-danger">{uploadError}</p>}
        </div>
      )}

      {phase === "submitting" && <p className="text-center text-sm text-foreground-muted">Uploading your response…</p>}
    </div>
  );
}
