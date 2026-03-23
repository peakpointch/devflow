import { fileExists } from "./config";
import fs from "fs";
import path from "path";
import { prefixX } from "./cli";

const template = `{
  "webflowSubdomain": "YOUR_WEBFLOW_SUBDOMAIN",
  "port": 3020,
  "source": "./src/app.ts",
  "dist": "./dist",
  "scriptList": ["app.js"],
  "scriptAttribute": "replace-it"
}
`;

export default function initConfig(filePath: string): void {
  if (fileExists(filePath)) {
    console.log(prefixX, `looks like a ${filePath} config file already exists`);
    return;
  }

  fs.writeFileSync(path.resolve(filePath), template);
  console.log(prefixX, `${filePath} created successfully ✅`);
}
