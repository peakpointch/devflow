export type AssetAttributes = Record<string, string | boolean>;

export interface ExtractedAsset {
  tag: string; // Original HTML string
  attrs: AssetAttributes;
  filePath: string;
  type: "script" | "stylesheet";
}
