import { capture, handleMessage, syncCalendarSessions } from "./application";

const MENU = {
  open: "lydra-open",
  saveLink: "lydra-save-link",
  saveSelection: "lydra-save-selection",
  plan: "lydra-plan"
} as const;

const openPage = (page: "queue.html" | "planner.html" | "session.html" | "options.html") =>
  chrome.tabs.create({ url: chrome.runtime.getURL(page) });

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU.open, title: "Open Lydra", contexts: ["action"] });
    chrome.contextMenus.create({ id: MENU.plan, title: "Plan reading time", contexts: ["action"] });
    chrome.contextMenus.create({
      id: MENU.saveLink,
      title: "Save link to Lydra",
      contexts: ["link"]
    });
    chrome.contextMenus.create({
      id: MENU.saveSelection,
      title: "Save selection to Lydra",
      contexts: ["selection"]
    });
  });
  void chrome.alarms.create("lydra-sync", { periodInMinutes: 30 });
});

chrome.action.onClicked.addListener((tab) => {
  void (async () => {
    const result = await capture.fromTab(tab);
    if (tab.id) await capture.toast(tab.id, result);
  })();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  void (async () => {
    if (info.menuItemId === MENU.open) return openPage("queue.html");
    if (info.menuItemId === MENU.plan) return openPage("planner.html");
    if (info.menuItemId === MENU.saveLink && info.linkUrl) {
      const result = await capture.fromUrl(info.linkUrl);
      if (tab?.id) await capture.toast(tab.id, result);
    }
    if (info.menuItemId === MENU.saveSelection && tab?.url) {
      const result = await capture.fromUrl(tab.url, tab.title, info.selectionText);
      if (tab.id) await capture.toast(tab.id, result);
    }
  })();
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-dashboard") void openPage("queue.html");
  if (command === "capture-page") {
    void (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const result = await capture.fromTab(tab);
      if (tab.id) await capture.toast(tab.id, result);
    })();
  }
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "lydra.open"
  ) {
    void openPage("queue.html");
    sendResponse(true);
    return false;
  }
  void handleMessage(message).then(sendResponse);
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "lydra-sync") {
    void syncCalendarSessions();
    return;
  }
  if (alarm.name === "lydra-weekly-plan") {
    void chrome.notifications.create("lydra-weekly-plan", {
      type: "basic",
      iconUrl: "icons/icon-128.png",
      title: "Plan a lighter reading week",
      message: "Review your queue and choose reading blocks. Nothing is booked automatically."
    });
    return;
  }
  if (!alarm.name.startsWith("session:")) return;
  const sessionId = alarm.name.slice("session:".length);
  void chrome.notifications.create(`review:${sessionId}`, {
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title: "How did your reading block go?",
    message: "Review what you finished and return the rest to your queue."
  });
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith("review:")) void openPage("session.html");
  if (notificationId === "lydra-weekly-plan") void openPage("planner.html");
});
