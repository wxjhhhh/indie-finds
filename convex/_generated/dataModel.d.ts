import type { GenericId } from "convex/values";

export type TableNames = "finds";
export type Id<TableName extends TableNames> = GenericId<TableName>;

export type FindDoc = {
  _id: Id<"finds">;
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
};

export type Doc<T extends TableNames> = T extends "finds" ? FindDoc : never;

export type DataModel = {
  finds: {
    document: FindDoc;
    fieldPaths: string;
    indexes: {
      by_type: ["type", "_creationTime"];
      by_sourceId: ["source", "sourceId", "_creationTime"];
    };
    searchIndexes: Record<string, never>;
    vectorIndexes: Record<string, never>;
  };
};
