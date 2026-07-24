const nodeEnvironments = [
  "development",
  "production",
  "test"
];
function isNodeEnv(env) {
  return nodeEnvironments.includes(env);
}
function parseNodeEnv(env) {
  if (isNodeEnv(env)) {
    return env;
  } else {
    return "production";
  }
}
function isPlainObject(val) {
  return typeof val === "object" && val !== null && Object.getPrototypeOf(val) === Object.prototype;
}
function errorToString(error) {
  if (error === null || error === void 0 || typeof error === "string" && !error) {
    return "Unknown error";
  } else if (typeof error === "object") {
    if ("message" in error) return `${error.message}`;
    if ("code" in error) return `${error.code}`;
    if ("status" in error && "statusText" in error)
      return `${error.status} ${error.statusText}`;
    return JSON.stringify(error);
  } else {
    return `${error}`;
  }
}
function capitalize(str) {
  return str.replace(/\b\w/g, (character) => character.toUpperCase());
}
export {
  capitalize,
  errorToString,
  isNodeEnv,
  isPlainObject,
  nodeEnvironments,
  parseNodeEnv
};
