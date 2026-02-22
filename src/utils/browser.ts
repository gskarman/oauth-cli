import open from "open";
import { logger } from "./logger.js";

export async function openBrowser(url: string): Promise<boolean> {
  try {
    await open(url);
    return true;
  } catch (err) {
    logger.warn("Failed to open browser:", err);
    return false;
  }
}
