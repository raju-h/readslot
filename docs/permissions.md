# Browser Permission Explanations

- `storage`: save lightweight settings locally.
- `identity`: connect Google through Chrome OAuth.
- `activeTab`: access only the page the user explicitly saves.
- `scripting`: inject local metadata extraction and save feedback after a user action.
- `contextMenus`: save links or selected text and open ReadSlot surfaces.
- `alarms`: trigger session review, weekly planning reminders, and periodic event reconciliation.
- `notifications`: show user-configured session and planning prompts.
- `https://www.googleapis.com/*`: call Google Calendar directly from the extension.
- `https://oauth2.googleapis.com/*`: revoke the user's Google authorization when they explicitly
  choose **Disconnect and revoke access**.

ReadSlot does not request `tabs`, browsing history, or `<all_urls>`.
