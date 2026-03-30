(() => {
  // node_modules/peakflow/dist/webflow/webflow.js
  var siteId = document.documentElement.dataset.wfSite || "";
  var pageId = document.documentElement.dataset.wfPage || "";
  var wfclass = {
    invisible: "w-condition-invisible",
    input: "w-input",
    select: "w-select",
    wradio: "w-radio",
    radio: "w-radio-input",
    wcheckbox: "w-checkbox",
    checkbox: "w-checkbox-input",
    checked: "w--redirected-checked",
    focus: "w--redirected-focus",
    focusVisible: "w--redirected-focus-visible",
    cmsWrapper: "w-dyn-list",
    cmsList: "w-dyn-items",
    cmsItem: "w-dyn-item",
    cmsEmpty: "w-dyn-empty",
    cmsBindEmpty: "w-dyn-bind-empty",
    paginationPrev: "w-pagination-previous",
    paginationNext: "w-pagination-next",
    paginationCount: "w-page-count"
  };
  var inputSelectorList = [
    `.${wfclass.input}`,
    `.${wfclass.select}`,
    `.${wfclass.wradio} input[type="radio"]`,
    `.${wfclass.wcheckbox} input[type="checkbox"]:not(.${wfclass.checkbox})`
  ];
  var wfselect = {
    invisible: `.${wfclass.invisible}`,
    input: `.${wfclass.input}`,
    select: `.${wfclass.select}`,
    wradio: `.${wfclass.wradio}`,
    radio: `.${wfclass.radio}`,
    wcheckbox: `.${wfclass.wcheckbox}`,
    checkbox: `.${wfclass.checkbox}`,
    checked: `.${wfclass.checked}`,
    focused: `:focus-visible, [data-wf-focus-visible]`,
    focus: `.${wfclass.focus}`,
    focusVisible: `.${wfclass.focusVisible}`,
    cmsWrapper: `.${wfclass.cmsWrapper}`,
    cmsList: `.${wfclass.cmsList}`,
    cmsItem: `.${wfclass.cmsItem}`,
    cmsEmpty: `.${wfclass.cmsEmpty}`,
    cmsBindEmpty: `.${wfclass.cmsBindEmpty}`,
    paginationPrev: `.${wfclass.paginationPrev}`,
    paginationNext: `.${wfclass.paginationNext}`,
    paginationCount: `.${wfclass.paginationCount}`,
    formInput: inputSelectorList.join(", "),
    radioInput: `.${wfclass.wradio} input[type="radio"]`,
    checkboxInput: `.${wfclass.wcheckbox} input[type="checkbox"]:not(.${wfclass.checkbox})`,
    inputSelectorList
  };
  var Webflow = class {
    constructor() {
      this.siteId = siteId;
      this.pageId = pageId;
      this.class = wfclass;
      this.select = wfselect;
    }
    /**
     * Determines whether a given element is visible accordion to Webflow's
     * conditional visibility rules.
     */
    isVisible(el) {
      return !(el.classList.contains(wfclass.invisible) || el.classList.contains(wfclass.cmsBindEmpty) || el.closest(wfselect.invisible) || el.closest(wfselect.cmsBindEmpty));
    }
    /**
     * Returns true if an attribute is present and not explicitly "false".
     * Works like a boolean HTML attribute.
     */
    hasAttr(element, attribute) {
      return element.hasAttribute(attribute) && element.getAttribute(attribute) !== "false";
    }
    /**
     * Returns true if an attribute is present and explicitly "true".
     */
    hasTrueAttr(element, attribute) {
      return element.hasAttribute(attribute) && element.getAttribute(attribute) === "true";
    }
    /**
     * Current Webflow environment
     */
    get env() {
      const host = window.location.hostname;
      if (host === "localhost") {
        return "development";
      } else if (host.includes(".design.webflow.com")) {
        return "designer";
      } else if (host.includes(".webflow.io")) {
        return "staging";
      } else {
        return "production";
      }
    }
    /**
     * The designer iframe document if env is "designer", standard `document` otherwise
     */
    get doc() {
      if (this.env === "designer") {
        const iframe = document.querySelector("#site-iframe-next");
        return iframe ? iframe.contentDocument || iframe.contentWindow.document : null;
      } else {
        return document;
      }
    }
  };
  var wf = new Webflow();

  // node_modules/peakflow/dist/selector/attributes.js
  var Dataset = class _Dataset {
    // ============================
    // ====== Initialization ======
    // ============================
    constructor(attributes) {
      this.attr = Attr.define(attributes);
      this.definition = attributes;
    }
    static define(attributes) {
      const definition = Object.entries(attributes).reduce((acc, [key, val]) => {
        acc[key] = {
          accessor: key,
          ..._Dataset.defineAttribute(val)
        };
        return acc;
      }, {});
      return new _Dataset(definition);
    }
    static defineAttribute(attr) {
      let result;
      if (typeof attr === "string") {
        result = {
          name: attr,
          type: _Dataset.String(attr).type
        };
      } else {
        result = {
          name: attr.name,
          type: attr.type || _Dataset.String(attr.name).type,
          default: attr.default
        };
      }
      return result;
    }
    // ===========================
    // ====== Parsing Logic ======
    // ===========================
    static parse(element, attributes) {
      const attrArray = Object.entries(attributes);
      return attrArray.reduce((acc, [key, attr]) => {
        return {
          ...acc,
          [key]: attr.type(element.getAttribute(attr.name), attr) ?? attr.default
        };
      }, {});
    }
    parse(element) {
      return _Dataset.parse(element, this.definition);
    }
    static getAttribute(element, attr) {
      const def = this.defineAttribute(attr);
      return def.type(element.getAttribute(def.name), def) ?? def.default;
    }
    // =============================
    // ====== Attribute Types ======
    // =============================
    static String(name, defaultValue) {
      return {
        name,
        default: defaultValue,
        type: (val, attr) => val ?? attr.default ?? ""
      };
    }
    static Boolean(name, defaultValue) {
      return {
        name,
        default: defaultValue,
        type: (val, attr) => {
          if (val === null)
            return attr.default;
          if (val !== "true" && val !== "false") {
            throw new Error(`Attribute "${attr.name}" is not boolean`);
          }
          return val === "true";
        }
      };
    }
    static Number(name, defaultValue) {
      return {
        name,
        default: defaultValue,
        type: (val, attr) => {
          const n = parseFloat(val);
          return !isNaN(n) ? n : attr.default;
        }
      };
    }
    static NumberOrAuto(name, defaultValue) {
      return {
        name,
        default: defaultValue,
        type: (val, attr) => {
          const n = parseFloat(val);
          return val === "auto" ? "auto" : !isNaN(n) ? n : attr.default;
        }
      };
    }
  };
  var Attr = class {
    static define(attributes) {
      const attr = Object.entries(attributes).reduce((acc, [key, attr2]) => {
        return {
          ...acc,
          [key]: typeof attr2 === "string" ? attr2 : attr2.name
        };
      }, {});
      return attr;
    }
  };

  // src/helpers/dataset.ts
  var dataset = Dataset.define({
    hmr: Dataset.Boolean("data-devflow-hmr"),
    local: Dataset.String("data-devflow-local"),
    href: Dataset.String("href")
  });

  // src/helpers/routes.ts
  var routes = {
    /**
     * Livereload WebSocket endpoint
     */
    livereload: "/__livereload",
    /**
     * Hosts project files
     */
    app: "/__app",
    /**
     * Hosts devflow files
     */
    devflow: "/__devflow"
  };

  // src/helpers/livereload.ts
  var Livereload = class _Livereload {
    constructor() {
    }
    static getInstance() {
      if (!_Livereload.instance) {
        _Livereload.instance = new _Livereload();
      }
      return _Livereload.instance;
    }
    log(...message) {
      console.log(`[Devflow]:`, ...message);
    }
    reload() {
      window.location.reload();
    }
    reloadCss(host) {
      if (!wf.doc) return;
      const links = wf.doc.querySelectorAll(
        `link[rel="stylesheet"][${dataset.attr.hmr}="true"]`
      );
      links.forEach((link) => {
        const { local } = dataset.parse(link);
        const url = new URL(`${host}/${local}`);
        url.searchParams.set("devflow-t", Date.now().toString());
        link.href = url.toString();
      });
      this.log(
        `CSS Hot-Reloaded: ${links.length} ${links.length === 1 ? "file" : "files"}.`
      );
    }
    start() {
      const wsUrl = `ws://localhost:${this.options.port}${routes.livereload}`;
      const host = `http://localhost:${this.options.port}${routes.app}`;
      this.stop();
      this.socket = new WebSocket(wsUrl);
      this.socket.onmessage = (event) => {
        if (event.data === "reload" && wf.env !== "designer") {
          this.reload();
        } else if (event.data === "reload-css") {
          this.reloadCss(host);
        } else {
          this.log("Livereload: unknown event", event);
        }
      };
      this.socket.onerror = () => {
        this.log(`Waiting for local server on port ${this.options.port}...`);
      };
      this.socket.onclose = () => {
        if (this.options.enabled) {
          setTimeout(() => this.start(), 3e3);
        }
      };
    }
    stop() {
      this.options.enabled = false;
      if (this.socket) this.socket.close();
    }
  };

  // src/extension/client.ts
  function initialize() {
    if (typeof window === "undefined") return;
    if (wf.env === "designer") {
      chrome.storage.local.get(["port"], (result) => {
        setupAndStart(result.port || 3e3);
      });
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "CONNECT_LIVERELOAD") {
          console.log(`[Devflow] Connecting to new port: ${message.port}`);
          setupAndStart(message.port);
        }
      });
    } else if (wf.env === "development") {
      setupAndStart(parseInt(window.location.port) || 3e3);
    }
  }
  function setupAndStart(port) {
    const lr = Livereload.getInstance();
    lr.options = { port, enabled: true };
    lr.start();
    window.livereload = lr;
  }
  initialize();
})();
