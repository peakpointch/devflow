import fs from "fs";
import path from "path";
function getWebflowConfig() {
  const configPath = path.resolve(process.cwd(), "webflow.json");
  const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  return rawConfig;
}
export {
  getWebflowConfig
};
