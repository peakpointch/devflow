"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileExists = void 0;
exports.parseConfig = parseConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const fileExists = (configFilePath) => {
    return fs_1.default.existsSync(path_1.default.resolve(configFilePath));
};
exports.fileExists = fileExists;
const configZod = zod_1.z
    .object({
    webflowSubdomain: zod_1.z.string({
        invalid_type_error: "❌ webflowSubdomain: Invalid webflow subdomain",
        required_error: "❌ webflowSubdomain: Webflow subdomain is required",
    }),
    port: zod_1.z
        .number({
        invalid_type_error: "❌ port: Invalid port",
    })
        .default(3015),
    livereload: zod_1.z
        .boolean({
        invalid_type_error: "❌ port: Invalid port",
    })
        .default(true),
    source: zod_1.z
        .union([
        zod_1.z.string({
            invalid_type_error: "❌ source: must be a string or an array of strings",
        }),
        zod_1.z.array(zod_1.z.string({
            invalid_type_error: "❌ source: array elements must be strings",
        })),
    ])
        .default(["./src"])
        .transform((val) => (typeof val === "string" ? [val] : val)),
    dist: zod_1.z
        .string({
        invalid_type_error: "❌ dist: Invalid dist path, example ./dist",
    })
        .default("./dist"),
    scriptAttribute: zod_1.z
        .union([
        zod_1.z.string({
            invalid_type_error: "❌ scriptAttribute: must be a string or an array of strings",
        }),
        zod_1.z.array(zod_1.z.string({
            invalid_type_error: "❌ scriptAttribute: array elements must be strings",
        })),
    ])
        .default([])
        .transform((val) => (typeof val === "string" ? [val] : val)),
    watchList: zod_1.z
        .union([
        zod_1.z.string({
            invalid_type_error: "❌ watch: must be a string or an array of strings",
        }),
        zod_1.z.array(zod_1.z.string({
            invalid_type_error: "❌ watch: array elements must be strings",
        })),
    ])
        .default(["./src"])
        .transform((val) => (typeof val === "string" ? [val] : val)),
}, {
    required_error: "❌ Invalid configuration",
})
    .required({
    webflowSubdomain: true,
});
function parseConfig(configPath) {
    if (!(0, exports.fileExists)(configPath)) {
        console.warn("⚠️ unable to locate config file:", configPath);
        process.exit(1);
    }
    const configData = JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(configPath), "utf-8"));
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
            if (typeof val === "object" && (val === null || val === void 0 ? void 0 : val._errors)) {
                val._errors.forEach((e) => console.log(e));
            }
        });
        process.exit(1);
    }
    return config.data;
}
exports.default = parseConfig;
