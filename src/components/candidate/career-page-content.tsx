"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin, Search, Globe, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { StatusChip } from "@/components/ui/status-chip";
import { NoResultsState } from "@/components/ui/states";
import type { Company, Job } from "@/types/database";

const employmentLabel: Record<Job["employment_type"], string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  temporary: "Temporary",
};

const workArrangementLabel: Record<Job["work_arrangement"], string> = {
  onsite: "Onsite",
  hybrid: "Hybrid",
  remote: "Remote",
};

export function CareerPageContent({ company, jobs }: { company: Company; jobs: Job[] }) {
  const [search, setSearch] = React.useState("");
  const [department, setDepartment] = React.useState("all");
  const [location, setLocation] = React.useState("all");
  const [employmentType, setEmploymentType] = React.useState("all");

  const departments = Array.from(new Set(jobs.map((j) => j.department)));
  const locations = Array.from(new Set(jobs.map((j) => j.location)));

  const filtered = jobs.filter((j) => {
    if (search && !j.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (department !== "all" && j.department !== department) return false;
    if (location !== "all" && j.location !== location) return false;
    if (employmentType !== "all" && j.employment_type !== employmentType) return false;
    return true;
  });

  return (
    <div className="flex flex-col">
      <div
        className="flex flex-col items-center gap-4 px-6 py-16 text-center"
        style={
          company.header_style === "gradient"
            ? { background: `linear-gradient(135deg, ${company.brand_color}, ${company.brand_color}cc)` }
            : { background: company.brand_color }
        }
      >
        {company.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logo_url} alt={company.name} className="size-16 rounded-xl bg-white object-contain p-2" />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-xl bg-white/20 text-2xl font-bold text-white backdrop-blur">
            {company.name.charAt(0)}
          </div>
        )}
        <h1 className="text-3xl font-semibold text-white">{company.name}</h1>
        {company.show_company_details && (
          <p className="max-w-xl text-sm text-white/85">{company.description}</p>
        )}
        {company.show_company_details && (
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/80">
            {(company.city || company.country) && (
              <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {[company.city, company.country].filter(Boolean).join(", ")}</span>
            )}
            {company.website && (
              <a href={company.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                <Globe className="size-3.5" /> Website
              </a>
            )}
            {company.social_links.linkedin && <a href={company.social_links.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline"><Link2 className="size-3.5" /> LinkedIn</a>}
            {company.social_links.twitter && <a href={company.social_links.twitter} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline"><Link2 className="size-3.5" /> X</a>}
            {company.social_links.facebook && <a href={company.social_links.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline"><Link2 className="size-3.5" /> Facebook</a>}
          </div>
        )}
      </div>

      {company.recruitment_message && (
        <div className="border-b border-border bg-surface-muted px-6 py-4 text-center text-sm text-foreground-muted">
          {company.recruitment_message}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground-muted" />
            <Input placeholder="Search roles" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="sm:w-44"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="sm:w-44"><SelectValue placeholder="Location" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={employmentType} onValueChange={setEmploymentType}>
            <SelectTrigger className="sm:w-44"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(employmentLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-3">
          {filtered.length === 0 && <NoResultsState description="No open roles match your filters right now." />}
          {filtered.map((job) => (
            <Link
              key={job.id}
              href={`/${company.slug}/careers/${job.slug}`}
              className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-base font-semibold text-foreground">{job.title}</p>
                <p className="mt-0.5 text-sm text-foreground-muted">{job.department} · {job.location} · {workArrangementLabel[job.work_arrangement]}</p>
              </div>
              <StatusChip tone="accent">{employmentLabel[job.employment_type]}</StatusChip>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
