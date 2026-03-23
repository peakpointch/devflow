export type AssetAttributes = Record<string, string | true>;

export interface ExtractedAsset {
  tag: string; // Original HTML string
  attrs: AssetAttributes;
  filename: string; // Basename of the src/href
  type: "script" | "stylesheet";
}
