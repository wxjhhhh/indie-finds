import { readFileSync, existsSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

type Raw = {
  id?: string;
  handle?: string;
  display_name?: string;
  text?: string;
  date?: string;
  url?: string;
  media?: string;
  note?: string;
  class?: string;
};

const CLASS_MAP: Record<string, "game" | "shader" | null> = {
  "3D_game": "game",
  shader_visual: "shader",
  skip_tool_or_noise: null,
};

function mapItem(raw: Raw) {
  const mapped = CLASS_MAP[raw.class ?? ""];
  if (!mapped) return null;
  const title = (raw.display_name || raw.handle || "").trim();
  if (!title || !raw.url || !raw.id) return null;
  return {
    type: mapped,
    title,
    summary: (raw.note || raw.text || "").trim(),
    url: raw.url,
    imageUrl: undefined as string | undefined,
    source: "x",
    sourceId: raw.id,
    publishedAt: raw.date || new Date().toISOString(),
    tags: raw.class ? [raw.class] : [],
  };
}

async function main() {
  const jsonPath = "/workspace/x-bookmarks-full.json";
  if (!existsSync(jsonPath)) {
    console.log("skip seed: /workspace/x-bookmarks-full.json not found");
    return;
  }
  const url = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL or CONVEX_URL is required");
  }
  const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as Raw[];
  const items = raw.map(mapItem).filter((x): x is NonNullable<typeof x> => x !== null);
  const skipped = raw.length - items.length;
  const client = new ConvexHttpClient(url);
  const batchSize = 50;
  let upserted = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const res = await client.mutation(api.finds.seedFromJson, { items: chunk });
    upserted += res.upserted;
  }
  console.log("seeded " + upserted + " finds, skipped " + skipped);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
