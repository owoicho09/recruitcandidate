"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Monitor, Smartphone, Upload } from "lucide-react";
import { careerPageSchema, type CareerPageInput } from "@/lib/validation/career-page";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { CareerPageContent } from "@/components/candidate/career-page-content";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import type { Company, Job } from "@/types/database";

export function CareerPageEditor({ company, jobs }: { company: Company; jobs: Job[] }) {
  const toast = useToast();
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [published, setPublished] = React.useState(company.career_page_status === "published");
  const [logoDataUrl, setLogoDataUrl] = React.useState<string | null>(company.logo_url);

  const { register, control, handleSubmit, watch, formState: { isSubmitting } } = useForm<CareerPageInput>({
    resolver: zodResolver(careerPageSchema),
    defaultValues: {
      description: company.description ?? "",
      brandColor: company.brand_color,
      headerStyle: company.header_style,
      city: company.city ?? "",
      country: company.country ?? "",
      website: company.website ?? "",
      linkedin: company.social_links.linkedin ?? "",
      twitter: company.social_links.twitter ?? "",
      facebook: company.social_links.facebook ?? "",
      contactEmail: company.contact_email ?? "",
      recruitmentMessage: company.recruitment_message ?? "",
      showCompanyDetails: company.show_company_details,
      logoUrl: company.logo_url,
    },
  });

  const values = watch();

  const previewCompany: Company = {
    ...company,
    description: values.description || "",
    brand_color: values.brandColor,
    header_style: values.headerStyle,
    city: values.city || "",
    country: values.country || "",
    website: values.website || null,
    social_links: { linkedin: values.linkedin || undefined, twitter: values.twitter || undefined, facebook: values.facebook || undefined },
    recruitment_message: values.recruitmentMessage || null,
    show_company_details: values.showCompanyDetails,
    logo_url: logoDataUrl,
  };

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(data: CareerPageInput) {
    const res = await fetch("/api/companies/career-page", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, logoUrl: logoDataUrl }),
    });
    if (res.ok) toast.success("Career page updated");
    else toast.error("Couldn't save changes");
  }

  async function togglePublish() {
    const next = !published;
    const res = await fetch("/api/companies/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publish: next }) });
    if (res.ok) {
      setPublished(next);
      toast.success(next ? "Career page published" : "Career page unpublished");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_480px]">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Career page status</p>
            <p className="text-xs text-foreground-muted">recruitcandidates.com/{company.slug}/careers</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusChip tone={published ? "success" : "neutral"}>{published ? "Published" : "Unpublished"}</StatusChip>
            <Button type="button" variant={published ? "secondary" : "primary"} size="sm" onClick={togglePublish}>
              {published ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-foreground">Branding</p>
            <div>
              <label className="text-sm font-medium text-foreground">Logo</label>
              <div className="mt-1.5 flex items-center gap-3">
                {logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoDataUrl} alt="Logo" className="size-12 rounded-lg border border-border object-contain p-1" />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-lg bg-surface-muted text-lg font-bold text-foreground-muted">{company.name.charAt(0)}</div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted">
                  <Upload className="size-4" /> Upload
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
              </div>
            </div>
            <Field label="Company description" htmlFor="description">
              <Textarea id="description" rows={3} {...register("description")} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Brand accent color" htmlFor="brandColor">
                <input id="brandColor" type="color" className="h-10 w-16 rounded-lg border border-border-strong bg-surface p-1" {...register("brandColor")} />
              </Field>
              <Field label="Header style" htmlFor="headerStyle">
                <Controller name="headerStyle" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="headerStyle"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gradient">Gradient</SelectItem>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-foreground">Location & links</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="City" htmlFor="city"><Input id="city" {...register("city")} /></Field>
              <Field label="Country" htmlFor="country"><Input id="country" {...register("country")} /></Field>
            </div>
            <Field label="Website" htmlFor="website"><Input id="website" {...register("website")} /></Field>
            <Field label="Contact email" htmlFor="contactEmail"><Input id="contactEmail" {...register("contactEmail")} /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="LinkedIn" htmlFor="linkedin"><Input id="linkedin" {...register("linkedin")} /></Field>
              <Field label="Twitter / X" htmlFor="twitter"><Input id="twitter" {...register("twitter")} /></Field>
              <Field label="Facebook" htmlFor="facebook"><Input id="facebook" {...register("facebook")} /></Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-foreground">Messaging & visibility</p>
            <Field label="Recruitment message" htmlFor="recruitmentMessage" hint="Shown as a banner beneath your header">
              <Textarea id="recruitmentMessage" rows={2} {...register("recruitmentMessage")} />
            </Field>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Show company details</p>
                <p className="text-xs text-foreground-muted">Description, location, and social links on your career page</p>
              </div>
              <Controller name="showCompanyDetails" control={control} render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" loading={isSubmitting} className="self-start">Save changes</Button>
      </form>

      <div className="xl:sticky xl:top-20 xl:self-start">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-xs font-semibold text-foreground-muted">Preview</p>
            <div className="flex items-center gap-1 rounded-md bg-surface-muted p-0.5">
              <button type="button" onClick={() => setDevice("desktop")} className={cn("rounded p-1.5", device === "desktop" && "bg-surface shadow-sm")}><Monitor className="size-3.5" /></button>
              <button type="button" onClick={() => setDevice("mobile")} className={cn("rounded p-1.5", device === "mobile" && "bg-surface shadow-sm")}><Smartphone className="size-3.5" /></button>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto bg-background">
            <div className={cn("mx-auto origin-top scale-[0.85]", device === "mobile" && "max-w-[380px]")}>
              <CareerPageContent company={previewCompany} jobs={jobs} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
