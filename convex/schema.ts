import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  finds: defineTable({
    type: v.union(v.literal("game"), v.literal("shader")),
    title: v.string(),
    summary: v.string(),
    url: v.string(),
    imageUrl: v.optional(v.string()),
    source: v.string(),
    sourceId: v.string(),
    publishedAt: v.string(),
    tags: v.array(v.string()),
  })
    .index("by_type", ["type"])
    .index("by_sourceId", ["source", "sourceId"]),
});
