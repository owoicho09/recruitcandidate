import * as React from "react";
import {
  Inbox,
  AlertTriangle,
  Lock,
  Gauge,
  CreditCard,
  SearchX,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

interface StateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface StatePanelProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: StateAction;
  className?: string;
}

function StatePanel({ icon: Icon, title, description, action, className }: StatePanelProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 px-6 text-center", className)}>
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-muted">
          <Icon className="size-5 text-foreground-muted" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="text-sm text-foreground-muted max-w-sm">{description}</p>}
      </div>
      {action &&
        (action.href ? (
          <Button size="sm" variant="secondary" className="mt-1" href={action.href}>
            {action.label}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" className="mt-1" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}

export function EmptyState(props: Omit<StatePanelProps, "icon"> & { icon?: LucideIcon }) {
  return <StatePanel icon={props.icon ?? Inbox} {...props} />;
}

export function NoResultsState(props: Partial<Omit<StatePanelProps, "icon">>) {
  return (
    <StatePanel
      icon={SearchX}
      title="No results"
      description="Try adjusting your search or filters."
      {...props}
    />
  );
}

export function ErrorState(props: Omit<StatePanelProps, "icon">) {
  return <StatePanel icon={AlertTriangle} className="border-danger/30" {...props} />;
}

export function PermissionDeniedState(props: Omit<StatePanelProps, "icon" | "title">) {
  return <StatePanel icon={Lock} title="You don't have access to this" {...props} />;
}

export function UnpublishedState(props: Omit<StatePanelProps, "icon" | "title">) {
  return <StatePanel icon={Lock} title="This page isn't published yet" {...props} />;
}

export function LimitReachedState(props: Omit<StatePanelProps, "icon" | "title">) {
  return <StatePanel icon={Gauge} title="Plan limit reached" className="border-warning/30" {...props} />;
}

export function SubscriptionInactiveState(props: Omit<StatePanelProps, "icon" | "title">) {
  return <StatePanel icon={CreditCard} title="Subscription inactive" className="border-warning/30" {...props} />;
}

export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}>
      <LoaderCircle className="size-5 animate-spin text-accent" />
      <p className="text-sm text-foreground-muted">{label}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-muted", className)} />;
}
