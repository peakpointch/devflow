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
function firstValidKeyValue(obj, keys) {
  for (const key of keys) {
    if (key && key in obj) {
      const value = obj[key];
      if (value) return value;
    }
  }
  return void 0;
}
function getErrorCode(error) {
  const code = firstValidKeyValue(error ?? {}, ["code", "error"]);
  return `${code}`.toLowerCase() || void 0;
}
function getErrorMessage(error) {
  const message = firstValidKeyValue(error ?? {}, [
    "message",
    "error_description",
    "statusText"
  ]);
  return `${message}` || void 0;
}
function errorToString(error) {
  if (error === null || error === void 0 || typeof error === "string" && !error) {
    return "Unknown error";
  } else if (typeof error === "object") {
    const code = getErrorCode(error);
    const message = getErrorMessage(error);
    return [code, message].filter(Boolean).join(": ");
  } else {
    return `${error}`;
  }
}
function capitalize(str) {
  return str.replace(/\b\w/g, (character) => character.toUpperCase());
}
function pluralize(str, count) {
  return count === 1 ? str : `${str}s`;
}
export {
  capitalize,
  errorToString,
  getErrorCode,
  getErrorMessage,
  isNodeEnv,
  isPlainObject,
  nodeEnvironments,
  parseNodeEnv,
  pluralize
};
