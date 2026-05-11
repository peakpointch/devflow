import { type WistiaMediaResponse } from "./types";

async function fetchWistiaMedia(id: string): Promise<WistiaMediaResponse> {
  const response = await fetch(
    `https://fast.wistia.com/embed/medias/${id}.json`,
  );
  return (await response.json()) as WistiaMediaResponse;
}

export async function wistiaAction(id: string): Promise<void> {
  const data = await fetchWistiaMedia(id);

  for (const asset of data.media.assets) {
    console.log(`${asset.type} (${asset.width}x${asset.height}): ${asset.url}`);
  }
}
