import { TaskLogger } from "../helpers/taskLogger.js";
import { type WistiaMediaResponse } from "../types/wistia.js";

async function fetchWistiaMedia(id: string): Promise<WistiaMediaResponse> {
  const response = await fetch(
    `https://fast.wistia.com/embed/medias/${id}.json`,
  );
  const data = (await response.json()) as WistiaMediaResponse;
  if (data?.error) {
    throw new Error("Invalid wistia media id");
  }
  return data;
}

export async function wistiaAction(id: string): Promise<void> {
  const logger = new TaskLogger("Wistia");
  try {
    const data = await fetchWistiaMedia(id);

    for (const asset of data.media.assets) {
      logger.info(
        `${asset.type} (${asset.width}x${asset.height}): ${asset.url}`,
      );
    }
  } catch (err) {
    logger.error("Failed to fetch media:", (err as Error).message);
    process.exit(1);
  }
}
