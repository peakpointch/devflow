import fs from "fs";
import path from "path";
import { z } from "zod";

export const checkFileExists = (configFilePath: string): boolean => {
  return fs.existsSync(path.resolve(configFilePath));
};

const configZod = z
  .object(
    {
      webflowSubdomain: z.string({
        invalid_type_error: "❌ webflowSubdomain: Invalid webflow subdomain",
        required_error: "❌ webflowSubdomain: Webflow subdomain is required",
      }),
      port: z
        .number({
          invalid_type_error: "❌ port: Invalid port",
        })
        .default(3015),
      source: z
        .string({
          invalid_type_error: "❌ source: Invalid source, example ./src",
        })
        .default("./src"),
      scriptList: z
        .array(z.string())
        .min(1, "minimum one dist file must be added"),
      dist: z
        .string({
          invalid_type_error: "❌ dist: Invalid dist path, example ./dist",
        })
        .default("./dist"),
      scriptAttribute: z
        .string({
          invalid_type_error:
            "❌ scriptAttribute: invalid script attribute, example replace-script",
        })
        .default(""),
    },
    {
      required_error: "❌ Invalid configuration",
    },
  )
  .required({
    webflowSubdomain: true,
  });

export default function parseConfig(configPath: string) {
  if (!checkFileExists(configPath)) {
    console.warn("⚠️ unable to locate config file:", configPath);
    process.exit(1);
  }

  const configData = JSON.parse(
    fs.readFileSync(path.resolve(configPath), "utf-8"),
  );

  const config = configZod.safeParse(configData);

  if (!config.success) {
    const errors = config.error.format();

    console.log("xAtom config is invalid ❗");
    console.log("");

    Object.keys(errors).forEach((key) => {
      const val = errors[key];
      if (Array.isArray(val)) {
        val.forEach((e) => console.log(e));
      }
      if (typeof val === "object" && val?._errors) {
        val._errors.forEach((e) => console.log(e));
      }
    });

    process.exit(1);
  }

  return config.data;
}
