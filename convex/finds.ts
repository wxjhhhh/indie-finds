import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

const findDoc = {
  type: v.union(v.literal("game"), v.literal("shader")),
  title: v.string(),
  summary: v.string(),
  url: v.string(),
  imageUrl: v.optional(v.string()),
  source: v.string(),
  sourceId: v.string(),
  publishedAt: v.string(),
  tags: v.array(v.string()),
};

export const listByType = query({
  args: { type: v.union(v.literal("game"), v.literal("shader")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("finds")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .order("desc")
      .collect();
  },
});

export const upsertFind = mutation({
  args: findDoc,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("finds")
      .withIndex("by_sourceId", (q) =>
        q.eq("source", args.source).eq("sourceId", args.sourceId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("finds", args);
  },
});

export const seedFromJson = mutation({
  args: { items: v.array(v.object(findDoc)) },
  handler: async (ctx, args) => {
    let upserted = 0;
    for (const item of args.items) {
      const existing = await ctx.db
        .query("finds")
        .withIndex("by_sourceId", (q) =>
          q.eq("source", item.source).eq("sourceId", item.sourceId),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, item);
      } else {
        await ctx.db.insert("finds", item);
      }
      upserted += 1;
    }
    return { upserted };
  },
});

const NOTION_PAGES = [
  { id: "3c511293decf81d3bb91daed77bb0c56", type: "game" as const },
  { id: "3c511293decf81c2a80ec0fb4d90b6de", type: "shader" as const },
];

type NotionBlock = {
  id: string;
  type: string;
  [key: string]: unknown;
};

function richTextToPlain(rich: unknown): string {
  if (!Array.isArray(rich)) return "";
  return rich
    .map((r) => {
      const item = r as { plain_text?: string };
      return item.plain_text ?? "";
    })
    .join("");
}

function extractFromBlock(block: NotionBlock): {
  text: string;
  url?: string;
  imageUrl?: string;
} {
  const t = block.type;
  const payload = block[t] as
    | {
        rich_text?: unknown;
        url?: string;
        caption?: unknown;
        file?: { url?: string };
        external?: { url?: string };
      }
    | undefined;
  if (!payload) return { text: "" };
  const text = richTextToPlain(payload.rich_text ?? payload.caption);
  if (t === "image") {
    return {
      text,
      imageUrl: payload.file?.url ?? payload.external?.url,
    };
  }
  if (t === "bookmark" || t === "embed" || t === "link_preview") {
    return { text, url: payload.url };
  }
  return { text, url: payload.url };
}

async function notionFetch(path: string, key: string) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      "Notion-Version": "2022-06-28",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion ${path} ${res.status}: ${body}`);
  }
  return res.json();
}

async function listChildren(pageId: string, key: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;
  do {
    const q = cursor ? `?start_cursor=${cursor}` : "";
    const data = (await notionFetch(`/blocks/${pageId}/children${q}`, key)) as {
      results: NotionBlock[];
      has_more: boolean;
      next_cursor: string | null;
    };
    blocks.push(...data.results);
    cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

export const syncFromNotion = action({
  args: {},
  handler: async (ctx) => {
    const key = process.env.NOTION_API_KEY;
    if (!key) {
      throw new Error("NOTION_API_KEY is not set");
    }

    let upserted = 0;

    for (const page of NOTION_PAGES) {
      const pageJson = (await notionFetch(`/pages/${page.id}`, key)) as {
        properties?: Record<
          string,
          { type?: string; title?: { plain_text?: string }[] }
        >;
        url?: string;
      };

      const titleProp = Object.values(pageJson.properties ?? {}).find(
        (p) => p.type === "title",
      );
      const pageTitle =
        titleProp?.title?.map((t) => t.plain_text ?? "").join("") ||
        `Notion ${page.type}`;

      const blocks = await listChildren(page.id, key);
      let currentTitle = pageTitle;
      let currentSummary = "";
      let currentUrl = pageJson.url ?? `https://www.notion.so/${page.id}`;
      let currentImage: string | undefined;
      let itemIndex = 0;

      const flush = async () => {
        if (!currentTitle && !currentSummary) return;
        const sourceId = `${page.id}:${itemIndex}`;
        itemIndex += 1;
        await ctx.runMutation(api.finds.upsertFind, {
          type: page.type,
          title: currentTitle || pageTitle,
          summary: currentSummary,
          url: currentUrl,
          imageUrl: currentImage,
          source: "notion",
          sourceId,
          publishedAt: new Date().toISOString(),
          tags: [page.type],
        });
        upserted += 1;
        currentSummary = "";
        currentImage = undefined;
      };

      for (const block of blocks) {
        const extracted = extractFromBlock(block);
        if (
          block.type === "heading_1" ||
          block.type === "heading_2" ||
          block.type === "heading_3"
        ) {
          if (itemIndex > 0 || currentSummary || currentImage) {
            await flush();
          }
          currentTitle = extracted.text || pageTitle;
          currentUrl = pageJson.url ?? `https://www.notion.so/${page.id}`;
          continue;
        }
        if (extracted.imageUrl) currentImage = extracted.imageUrl;
        if (extracted.url) currentUrl = extracted.url;
        if (extracted.text) {
          currentSummary = currentSummary
            ? `${currentSummary}\n${extracted.text}`
            : extracted.text;
        }
      }
      await flush();
    }

    return { upserted };
  },
});
