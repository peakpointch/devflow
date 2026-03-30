import fs from "fs";
import path from "path";
import { z } from "zod";

export const fileExists = (configFilePath: string): boolean => {
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
      livereload: z
        .boolean({
          invalid_type_error: "❌ port: Invalid port",
        })
        .default(true),
      source: z
        .union([
          z.string({
            invalid_type_error:
              "❌ source: must be a string or an array of strings",
          }),
          z.array(
            z.string({
              invalid_type_error: "❌ source: array elements must be strings",
            }),
          ),
        ])
        .default(["./src"])
        .transform((val) => (typeof val === "string" ? [val] : val)),
      dist: z
        .string({
          invalid_type_error: "❌ dist: Invalid dist path, example ./dist",
        })
        .default("./dist"),
      watchList: z
        .union([
          z.string({
            invalid_type_error:
              "❌ watch: must be a string or an array of strings",
          }),
          z.array(
            z.string({
              invalid_type_error: "❌ watch: array elements must be strings",
            }),
          ),
        ])
        .default(["./src"])
        .transform((val) => (typeof val === "string" ? [val] : val)),
    },
    {
      required_error: "❌ Invalid configuration",
    },
  )
  .required({
    webflowSubdomain: true,
  });

export type DevflowConfig = z.infer<typeof configZod>;

export function parseConfig(configPath: string): DevflowConfig {
  if (!fileExists(configPath)) {
    console.warn("⚠️ unable to locate config file:", configPath);
    process.exit(1);
  }

  const configData = JSON.parse(
    fs.readFileSync(path.resolve(configPath), "utf-8"),
  );

  const config = configZod.safeParse(configData);

  if (!config.success) {
    const errors = config.error.format();

    console.log("Devflow config is invalid ❗");
    console.log("");

    Object.keys(errors).forEach((key) => {
      const val = errors[key];
      if (Array.isArray(val)) {
        val.forEach((e) => console.log(e));
      }
      if (typeof val === "object" && val?._errors) {
        val._errors.forEach((e: any) => console.log(e));
      }
    });

    process.exit(1);
  }

  return config.data;
}

export default parseConfig;
