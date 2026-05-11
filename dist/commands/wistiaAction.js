async function fetchWistiaMedia(id) {
  const response = await fetch(
    `https://fast.wistia.com/embed/medias/${id}.json`
  );
  return await response.json();
}
async function wistiaAction(id) {
  const data = await fetchWistiaMedia(id);
  for (const asset of data.media.assets) {
    console.log(`${asset.type} (${asset.width}x${asset.height}): ${asset.url}`);
  }
}
export {
  wistiaAction
};
