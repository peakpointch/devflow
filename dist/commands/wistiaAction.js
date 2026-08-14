import { TaskLogger } from "../helpers/taskLogger.js";
async function fetchWistiaMedia(id) {
  const response = await fetch(
    `https://fast.wistia.com/embed/medias/${id}.json`
  );
  const data = await response.json();
  if (data?.error) {
    throw new Error("Invalid wistia media id");
  }
  return data;
}
async function wistiaAction(id) {
  const logger = new TaskLogger("Wistia");
  try {
    const data = await fetchWistiaMedia(id);
    for (const asset of data.media.assets) {
      logger.info(
        `${asset.type} (${asset.width}x${asset.height}): ${asset.url}`
      );
    }
  } catch (err) {
    logger.error("Failed to fetch media:", err.message);
    process.exit(1);
  }
}
export {
  wistiaAction
};
