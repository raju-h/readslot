import type { Result } from "../domain/result";
import type { ExtensionMessage } from "./messages";

export const sendMessage = async <T>(message: ExtensionMessage): Promise<Result<T>> =>
  chrome.runtime.sendMessage<ExtensionMessage, Result<T>>(message);

export const extensionUrl = (
  path: "queue.html" | "planner.html" | "session.html" | "options.html"
): string => chrome.runtime.getURL(path);
