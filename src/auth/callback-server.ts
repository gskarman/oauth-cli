import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { logger } from "../utils/logger.js";

export interface CallbackResult {
  code: string;
  state: string;
}

const SUCCESS_HTML = `<!DOCTYPE html>
<html><head><title>OAuth - Success</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f0fdf4}
.card{text-align:center;padding:2rem;border-radius:12px;background:white;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
h1{color:#16a34a;margin-bottom:0.5rem}p{color:#666}</style></head>
<body><div class="card"><h1>Authenticated!</h1><p>You can close this window and return to the terminal.</p></div></body></html>`;

const ERROR_HTML = (msg: string) => `<!DOCTYPE html>
<html><head><title>OAuth - Error</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fef2f2}
.card{text-align:center;padding:2rem;border-radius:12px;background:white;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
h1{color:#dc2626;margin-bottom:0.5rem}p{color:#666}</style></head>
<body><div class="card"><h1>Authentication Error</h1><p>${msg}</p></div></body></html>`;

export class LocalCallbackServer {
  private server: Server | null = null;
  private port = 0;
  private redirectPath: string;

  constructor(redirectPath: string = "/callback") {
    this.redirectPath = redirectPath;
  }

  getPort(): number {
    return this.port;
  }

  getRedirectUri(): string {
    return `http://127.0.0.1:${this.port}${this.redirectPath}`;
  }

  start(
    preferredPort?: number,
    timeoutMs: number = 120_000,
  ): Promise<CallbackResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stop();
        reject(new Error("OAuth callback timed out"));
      }, timeoutMs);

      this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url || "/", `http://127.0.0.1:${this.port}`);

        if (url.pathname !== this.redirectPath) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not found");
          return;
        }

        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(ERROR_HTML(errorDescription || error));
          clearTimeout(timeout);
          this.stop();
          reject(new Error(`OAuth error: ${error} - ${errorDescription || ""}`));
          return;
        }

        if (!code || !state) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(ERROR_HTML("Missing code or state parameter"));
          clearTimeout(timeout);
          this.stop();
          reject(new Error("Missing code or state parameter in callback"));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(SUCCESS_HTML);
        clearTimeout(timeout);
        this.stop();
        resolve({ code, state });
      });

      this.server.listen(preferredPort || 0, "127.0.0.1", () => {
        const addr = this.server!.address();
        if (addr && typeof addr === "object") {
          this.port = addr.port;
        }
        logger.debug(`Callback server listening on port ${this.port}`);
      });

      this.server.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
