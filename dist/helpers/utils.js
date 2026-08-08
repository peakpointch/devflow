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
function getValues(obj, keys) {
  let res = [];
  for (const key of keys) {
    if (key && key in obj) {
      res.push(obj[key]);
    }
  }
  return res;
}
function firstValidKey(obj, keys) {
  for (const key of keys) {
    if (key && key in obj) {
      return key;
    }
  }
  return null;
}
function errorToString(error) {
  if (error === null || error === void 0 || typeof error === "string" && !error) {
    return "Unknown error";
  } else if (typeof error === "object") {
    const key = firstValidKey(error, ["code", "error"]);
    const value = firstValidKey(error, [
      "message",
      "error_description",
      "statusText"
    ]);
    return getValues(error, [key, value]).join(": ");
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
