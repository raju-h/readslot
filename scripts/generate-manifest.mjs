import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const isRelease = process.argv.includes("--release");
const clientId = process.env.LYDRA_GOOGLE_OAUTH_CLIENT_ID?.trim();
const clientIdPattern = /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/u;

if (clientId && !clientIdPattern.test(clientId)) {
  throw new Error("LYDRA_GOOGLE_OAUTH_CLIENT_ID is not a valid Google OAuth client ID.");
}

const manifest = {
  manifest_version: 3,
  name: "Lydra",
  short_name: "Lydra",
  version: pkg.version,
  description:
    "Save useful content, find realistic time, and confirm reading blocks in Google Calendar.",
  minimum_chrome_version: "120",
  action: {
    default_title: "Save this page to Lydra",
    default_icon: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png"
    }
  },
  icons: {
    16: "icons/icon-16.png",
    32: "icons/icon-32.png",
    48: "icons/icon-48.png",
    128: "icons/icon-128.png"
  },
  background: {
    service_worker: "background.js",
    type: "module"
  },
  options_ui: {
    page: "options.html",
    open_in_tab: true
  },
  permissions: [
    "storage",
    "identity",
    "activeTab",
    "contextMenus",
    "scripting",
    "alarms",
    "notifications"
  ],
  host_permissions: ["https://www.googleapis.com/*"],
  commands: {
    "capture-page": {
      suggested_key: { default: "Alt+Shift+S", mac: "MacCtrl+Shift+S" },
      description: "Save the current page to Lydra"
    },
    "open-dashboard": {
      suggested_key: { default: "Alt+Shift+L", mac: "MacCtrl+Shift+L" },
      description: "Open the Lydra queue"
    }
  },
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self';"
  }
};

if (clientId) {
  manifest.oauth2 = {
    client_id: clientId,
    scopes: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.events.freebusy",
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly"
    ]
  };
} else if (isRelease) {
  throw new Error("LYDRA_GOOGLE_OAUTH_CLIENT_ID is required for release builds.");
}

const dist = resolve(root, "dist");
await mkdir(resolve(dist, "icons"), { recursive: true });
await writeFile(resolve(dist, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

for (const size of [16, 32, 48, 128]) {
  await cp(resolve(root, `public/icons/icon-${size}.png`), resolve(dist, `icons/icon-${size}.png`));
}
