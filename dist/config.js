var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var config_exports = {};
__export(config_exports, {
  default: () => config_default,
  fileExists: () => fileExists,
  parseConfig: () => parseConfig
});
module.exports = __toCommonJS(config_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_zod = require("zod");
const fileExists = (configFilePath) => {
  return import_fs.default.existsSync(import_path.default.resolve(configFilePath));
};
const configZod = import_zod.z.object(
  {
    webflowSubdomain: import_zod.z.string({
      invalid_type_error: "\u274C webflowSubdomain: Invalid webflow subdomain",
      required_error: "\u274C webflowSubdomain: Webflow subdomain is required"
    }),
    port: import_zod.z.number({
      invalid_type_error: "\u274C port: Invalid port"
    }).default(3015),
    livereload: import_zod.z.boolean({
      invalid_type_error: "\u274C port: Invalid port"
    }).default(true),
    source: import_zod.z.union([
      import_zod.z.string({
        invalid_type_error: "\u274C source: must be a string or an array of strings"
      }),
      import_zod.z.array(
        import_zod.z.string({
          invalid_type_error: "\u274C source: array elements must be strings"
        })
      )
    ]).default(["./src"]).transform((val) => typeof val === "string" ? [val] : val),
    dist: import_zod.z.string({
      invalid_type_error: "\u274C dist: Invalid dist path, example ./dist"
    }).default("./dist"),
    watchList: import_zod.z.union([
      import_zod.z.string({
        invalid_type_error: "\u274C watch: must be a string or an array of strings"
      }),
      import_zod.z.array(
        import_zod.z.string({
          invalid_type_error: "\u274C watch: array elements must be strings"
        })
      )
    ]).default(["./src"]).transform((val) => typeof val === "string" ? [val] : val)
  },
  {
    required_error: "\u274C Invalid configuration"
  }
).required({
  webflowSubdomain: true
});
function parseConfig(configPath) {
  if (!fileExists(configPath)) {
    console.warn("\u26A0\uFE0F unable to locate config file:", configPath);
    process.exit(1);
  }
  const configData = JSON.parse(
    import_fs.default.readFileSync(import_path.default.resolve(configPath), "utf-8")
  );
  const config = configZod.safeParse(configData);
  if (!config.success) {
    const errors = config.error.format();
    console.log("Devflow config is invalid \u2757");
    console.log("");
    Object.keys(errors).forEach((key) => {
      const val = errors[key];
      if (Array.isArray(val)) {
        val.forEach((e) => console.log(e));
      }
      if (typeof val === "object" && (val == null ? void 0 : val._errors)) {
        val._errors.forEach((e) => console.log(e));
      }
    });
    process.exit(1);
  }
  return config.data;
}
var config_default = parseConfig;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  fileExists,
  parseConfig
});
