export type AssetAttributes = Record<string, string | true>;

export interface ExtractedAsset {
  tag: string; // Original HTML string
  attrs: AssetAttributes;
  fileName: string;
  filePath: string;
  type: "script" | "stylesheet";
}
