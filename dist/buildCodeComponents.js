import * as esbuild from "esbuild";
import postcss from "esbuild-postcss";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import picomatch from "picomatch";
import { getDevServerUrl } from "./helpers/devUrl.js";
import { routes } from "./helpers/routes.js";
const sourceNamespace = "peakflow-browser-source";
const sourceExtensions = [".tsx", ".ts", ".jsx", ".js", ".mjs"];
const entrySourceFile = "peakflow-code-components.tsx";
function normalizeFilePath(filePath) {
  const normalizedPath = path.normalize(path.resolve(filePath));
  return process.platform === "win32" ? normalizedPath.toLowerCase() : normalizedPath;
}
function getInputFiles(metafile, projectDirectory) {
  const inputFiles = Object.keys(metafile.inputs).filter((inputPath) => inputPath !== entrySourceFile).map(
    (inputPath) => inputPath.startsWith(`${sourceNamespace}:`) ? inputPath.slice(sourceNamespace.length + 1) : inputPath
  ).map(
    (inputPath) => path.isAbsolute(inputPath) ? inputPath : path.resolve(projectDirectory, inputPath)
  ).filter(
    (inputPath) => !path.normalize(inputPath).split(path.sep).includes("node_modules")
  ).map((inputPath) => path.normalize(path.resolve(inputPath)));
  return new Set(inputFiles);
}
function isCodeComponentBuildInput(buildResult, filePath) {
  const absolutePath = path.resolve(filePath);
  if ([...buildResult.inputFiles].some(
    (inputPath) => normalizeFilePath(inputPath) === normalizeFilePath(absolutePath)
  )) {
    return true;
  }
  const relativePath = path.relative(buildResult.projectDirectory, absolutePath).split(path.sep).join("/");
  return picomatch.isMatch(relativePath, buildResult.componentPatterns);
}
function getModuleId(libraryName) {
  return `_${libraryName.replace(/[^a-zA-Z0-9_$]/g, "")}`;
}
function getComponentEntries(projectDirectory, patterns) {
  const paths = [
    ...new Set(
      patterns.flatMap(
        (pattern) => fs.globSync(pattern, {
          cwd: projectDirectory,
          exclude: ["dist/**", "node_modules/**"]
        })
      )
    )
  ].sort();
  const entries = paths.map((entryPath) => ({
    id: path.basename(entryPath).replace(/\.webflow\.[^.]+$/, ""),
    path: path.resolve(projectDirectory, entryPath)
  }));
  const duplicateIds = entries.map(({ id }) => id).filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new Error(
      `Duplicate Code Component IDs: ${[...new Set(duplicateIds)].join(", ")}`
    );
  }
  return entries;
}
function resolveLocalImport(projectDirectory, importPath, importer) {
  const unresolvedPath = importPath.startsWith("@/") ? path.join(projectDirectory, "src", importPath.slice(2)) : path.resolve(path.dirname(importer), importPath);
  const candidates = [
    unresolvedPath,
    ...sourceExtensions.map((extension) => `${unresolvedPath}${extension}`),
    ...sourceExtensions.map(
      (extension) => path.join(unresolvedPath, `index${extension}`)
    )
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}
function isProjectSource(projectDirectory, filePath) {
  const relativePath = path.relative(projectDirectory, filePath);
  return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath) && !relativePath.startsWith(`node_modules${path.sep}`) && sourceExtensions.includes(path.extname(filePath));
}
function createBrowserSourcePlugin(projectDirectory) {
  return {
    name: "peakflow-browser-source",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.namespace === "file" && path.isAbsolute(args.path) && isProjectSource(projectDirectory, args.path)) {
          return { path: args.path, namespace: sourceNamespace };
        }
        if (args.namespace !== sourceNamespace || !args.path.startsWith(".") && !args.path.startsWith("@/")) {
          return;
        }
        const resolvedPath = resolveLocalImport(
          projectDirectory,
          args.path,
          args.importer
        );
        if (!resolvedPath) return;
        return isProjectSource(projectDirectory, resolvedPath) ? { path: resolvedPath, namespace: sourceNamespace } : { path: resolvedPath };
      });
      build.onLoad(
        { filter: /.*/, namespace: sourceNamespace },
        async (args) => ({
          contents: await fsPromises.readFile(args.path, "utf8"),
          loader: path.extname(args.path) === ".mjs" ? "js" : path.extname(args.path).slice(1),
          resolveDir: path.dirname(args.path)
        })
      );
    }
  };
}
function getClientDirectory(config, projectDirectory) {
  const clientDirectory = path.resolve(
    projectDirectory,
    config.build.outdir,
    "Client"
  );
  const relativePath = path.relative(projectDirectory, clientDirectory);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(
      `Code Component output must be inside the project directory: ${clientDirectory}`
    );
  }
  return clientDirectory;
}
function getPublicPath(config, projectDirectory, clientDirectory, options) {
  const relativePath = path.relative(projectDirectory, clientDirectory).split(path.sep).join("/");
  return getDevServerUrl(config, `${routes.app}/${relativePath}/`, options);
}
function createEntrySource(moduleId, components) {
  const componentImports = components.map(
    ({ path: componentPath }, index) => `import component${index} from ${JSON.stringify(componentPath)};`
  ).join("\n");
  const componentModules = components.map(
    ({ id }, index) => `${JSON.stringify(`./${id}`)}: { default: component${index} },`
  ).join("\n");
  return `
    import { ClientRenderer } from "@webflow/react";
    ${componentImports}

    const modules = {
      "./@webflow_renderer": {
        default: {
          env: "Client",
          Renderer: ClientRenderer,
        },
      },
      ${componentModules}
    };

    globalThis[${JSON.stringify(moduleId)}] = {
      async init() {},
      async get(request) {
        const module = modules[request];
        if (!module) throw new Error(\`Unknown exposed module: \${request}\`);
        return () => module;
      },
    };
  `;
}
function createWebflowManifest(components, publicPath, cssFilename) {
  return {
    type: "FEDERATION",
    version: 2,
    entry: "mf-manifest.json",
    renderer: "@webflow_renderer",
    components: Object.fromEntries(
      components.map(({ id }) => [
        id,
        { css: cssFilename ? [`${publicPath}${cssFilename}`] : [] }
      ])
    )
  };
}
function createFederationManifest(moduleId, components, publicPath, cssFilename) {
  const emptyAssets = () => ({
    js: { sync: [], async: [] },
    css: { sync: [], async: [] }
  });
  return {
    id: moduleId,
    name: moduleId,
    metaData: {
      name: moduleId,
      type: "app",
      buildInfo: {
        buildVersion: "0.0.0-peakflow-dev",
        buildName: "peakflow-dev"
      },
      remoteEntry: {
        name: "remoteEntry.js",
        path: "",
        type: "global"
      },
      types: { path: "", name: "", zip: "", api: "" },
      globalName: moduleId,
      pluginVersion: "0.20.0",
      publicPath
    },
    shared: [],
    remotes: [],
    exposes: [
      {
        id: `${moduleId}:@webflow_renderer`,
        name: "@webflow_renderer",
        path: "./@webflow_renderer",
        assets: emptyAssets()
      },
      ...components.map(({ id }) => ({
        id: `${moduleId}:${id}`,
        name: id,
        path: `./${id}`,
        assets: {
          js: { sync: [], async: [] },
          css: {
            sync: cssFilename ? [cssFilename] : [],
            async: []
          }
        }
      }))
    ]
  };
}
async function createCodeComponentBuilder(config, options) {
  const projectDirectory = process.cwd();
  const webflowConfigPath = path.join(projectDirectory, "webflow.json");
  if (!fs.existsSync(webflowConfigPath)) return void 0;
  const webflowConfig = JSON.parse(
    await fsPromises.readFile(webflowConfigPath, "utf8")
  );
  const library = webflowConfig.library;
  if (!library) return void 0;
  if (typeof library.name !== "string" || library.name.length === 0) {
    throw new Error("webflow.json is missing library.name");
  }
  if (!Array.isArray(library.components) || library.components.length === 0 || !library.components.every((pattern) => typeof pattern === "string")) {
    throw new Error("webflow.json is missing library.components");
  }
  const postcssConfigPath = path.join(projectDirectory, "postcss.config.cjs");
  if (!fs.existsSync(postcssConfigPath)) {
    throw new Error(
      `Code Component projects require a postcss.config.cjs file: ${postcssConfigPath}`
    );
  }
  const moduleId = getModuleId(library.name);
  const clientDirectory = getClientDirectory(config, projectDirectory);
  const publicPath = getPublicPath(
    config,
    projectDirectory,
    clientDirectory,
    options
  );
  const componentPatterns = library.components;
  await fsPromises.mkdir(clientDirectory, { recursive: true });
  let buildContext;
  let componentEntrySignature;
  return {
    async build() {
      const performanceStart = performance.now();
      const currentComponents = getComponentEntries(
        projectDirectory,
        componentPatterns
      );
      if (currentComponents.length === 0) {
        throw new Error("No Code Component entries matched library.components");
      }
      const currentEntrySignature = JSON.stringify(currentComponents);
      if (!buildContext || currentEntrySignature !== componentEntrySignature) {
        const nextBuildContext = await esbuild.context({
          absWorkingDir: projectDirectory,
          bundle: true,
          conditions: ["style"],
          define: {
            "process.env.NODE_ENV": JSON.stringify("development")
          },
          format: "iife",
          jsx: "automatic",
          minify: false,
          metafile: true,
          outfile: path.join(clientDirectory, "remoteEntry.js"),
          platform: "browser",
          plugins: [createBrowserSourcePlugin(projectDirectory), postcss()],
          stdin: {
            contents: createEntrySource(moduleId, currentComponents),
            loader: "tsx",
            resolveDir: projectDirectory,
            sourcefile: entrySourceFile
          },
          target: "es2020",
          tsconfig: path.join(projectDirectory, "tsconfig.json"),
          write: true
        });
        const previousBuildContext = buildContext;
        buildContext = nextBuildContext;
        componentEntrySignature = currentEntrySignature;
        await previousBuildContext?.dispose();
      }
      const buildResult = await buildContext.rebuild();
      const metafile = buildResult.metafile;
      if (!metafile) {
        throw new Error("Code Component build did not produce a metafile");
      }
      const cssOutput = Object.keys(metafile.outputs).find(
        (file) => file.endsWith(".css")
      );
      const cssFilename = cssOutput ? path.basename(cssOutput) : void 0;
      await Promise.all([
        fsPromises.writeFile(
          path.join(clientDirectory, "wf-manifest.json"),
          JSON.stringify(
            createWebflowManifest(currentComponents, publicPath, cssFilename)
          )
        ),
        fsPromises.writeFile(
          path.join(clientDirectory, "mf-manifest.json"),
          JSON.stringify(
            createFederationManifest(
              moduleId,
              currentComponents,
              publicPath,
              cssFilename
            ),
            null,
            2
          )
        )
      ]);
      return {
        clientDirectory,
        componentIds: new Set(currentComponents.map(({ id }) => id)),
        componentPatterns,
        duration: performance.now() - performanceStart,
        inputFiles: getInputFiles(metafile, projectDirectory),
        moduleId,
        projectDirectory
      };
    },
    async dispose() {
      await buildContext?.dispose();
      buildContext = void 0;
    }
  };
}
export {
  createCodeComponentBuilder,
  getPublicPath,
  isCodeComponentBuildInput
};
