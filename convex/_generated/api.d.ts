import type { FunctionReference } from "convex/server";

export declare const api: {
  finds: {
    listByType: FunctionReference<
      "query",
      "public",
      { type: "game" | "shader" },
      Array<{
        _id: string;
        _creationTime: number;
        type: "game" | "shader";
        title: string;
        summary: string;
        url: string;
        imageUrl?: string;
        source: string;
        sourceId: string;
        publishedAt: string;
        tags: string[];
      }>
    >;
    upsertFind: FunctionReference<
      "mutation",
      "public",
      {
        type: "game" | "shader";
        title: string;
        summary: string;
        url: string;
        imageUrl?: string;
        source: string;
        sourceId: string;
        publishedAt: string;
        tags: string[];
      },
      string
    >;
    seedFromJson: FunctionReference<
      "mutation",
      "public",
      {
        items: Array<{
          type: "game" | "shader";
          title: string;
          summary: string;
          url: string;
          imageUrl?: string;
          source: string;
          sourceId: string;
          publishedAt: string;
          tags: string[];
        }>;
      },
      { upserted: number }
    >;
    syncFromNotion: FunctionReference<
      "action",
      "public",
      Record<string, never>,
      { upserted: number }
    >;
  };
};

export declare const internal: Record<string, never>;
