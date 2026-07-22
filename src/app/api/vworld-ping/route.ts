import { NextResponse } from "next/server";
import { getVWorldDomain, getVWorldKey } from "@/lib/vworld";

export async function GET() {
  const key = getVWorldKey();
  const domain = getVWorldDomain();
  if (!key) {
    return NextResponse.json({
      ok: false,
      error: "VWORLD_API_KEY 없음",
    });
  }

  const attempts: Array<{ host: string; ok: boolean; detail: string }> = [];
  for (const host of ["http://api.vworld.kr", "https://api.vworld.kr"]) {
    const url = new URL("/req/search", `${host}/`);
    url.searchParams.set("service", "search");
    url.searchParams.set("request", "search");
    url.searchParams.set("version", "2.0");
    url.searchParams.set("crs", "EPSG:4326");
    url.searchParams.set("size", "1");
    url.searchParams.set("page", "1");
    url.searchParams.set("query", "서울 강남구");
    url.searchParams.set("type", "place");
    url.searchParams.set("format", "json");
    url.searchParams.set("errorformat", "json");
    url.searchParams.set("key", key);
    if (domain) url.searchParams.set("domain", domain);

    try {
      const response = await fetch(url.toString(), {
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      const text = await response.text();
      attempts.push({
        host,
        ok: response.ok && text.includes('"status"'),
        detail: `${response.status} ${text.slice(0, 180).replace(/\s+/g, " ")}`,
      });
    } catch (error) {
      attempts.push({
        host,
        ok: false,
        detail: error instanceof Error ? error.message : "fetch failed",
      });
    }
  }

  return NextResponse.json({
    ok: attempts.some((a) => a.ok),
    domain,
    keyPreview: `${key.slice(0, 4)}…${key.slice(-4)}`,
    attempts,
  });
}
