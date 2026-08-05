import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

const routes = ["", "/features", "/pricing", "/how-it-works", "/demo", "/contact", "/support", "/login", "/signup"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((path) => ({
    url: `${env.NEXT_PUBLIC_APP_URL}${path}`,
    lastModified: new Date(),
  }));
}
