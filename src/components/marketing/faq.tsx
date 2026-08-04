"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

export interface FaqItem {
  q: string;
  a: string;
}

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <Accordion.Root type="single" collapsible className="mx-auto flex w-full max-w-2xl flex-col divide-y divide-border rounded-xl border border-border bg-surface">
      {items.map((item, i) => (
        <Accordion.Item key={item.q} value={`item-${i}`}>
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-foreground focus:outline-none">
              {item.q}
              <ChevronDown className="size-4 shrink-0 text-foreground-muted transition-transform group-data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden px-5 pb-4 text-sm text-foreground-muted data-[state=open]:animate-[fade-in_150ms_ease-out]">
            {item.a}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
