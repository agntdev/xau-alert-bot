import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Bot } from "grammy";
import {
  getSubscription,
  addAlert,
  getUserByChatId,
} from "./storage.js";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function jsonResponse(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}

interface TradingViewPayload {
  text?: string;
  message?: string;
  symbol?: string;
  time?: string;
  [key: string]: unknown;
}

function formatAlertMessage(
  prefix: string,
  payload: TradingViewPayload,
): string {
  const message = payload.text ?? payload.message ?? JSON.stringify(payload);
  const symbol = payload.symbol ? ` (${payload.symbol})` : "";
  const time = payload.time ? `\nTime: ${payload.time}` : "";
  const prefixStr = prefix ? `[${prefix}] ` : "";
  return `${prefixStr}TradingView Alert${symbol}\n\n${message}${time}`;
}

export function createWebhookServer(
  bot: Bot<any>,
  port: number = 3000,
): ReturnType<typeof createServer> {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

      if (req.method === "GET" && url.pathname === "/health") {
        jsonResponse(res, 200, { status: "ok" });
        return;
      }

      if (req.method !== "POST" || !url.pathname.startsWith("/webhook/")) {
        jsonResponse(res, 404, { error: "Not found" });
        return;
      }

      const token = url.pathname.split("/webhook/")[1];
      if (!token) {
        jsonResponse(res, 400, { error: "Missing webhook token" });
        return;
      }

      const subscription = await getSubscription(token);
      if (!subscription) {
        jsonResponse(res, 403, { error: "Invalid webhook token" });
        return;
      }

      const body = await readBody(req);
      let payload: TradingViewPayload;
      try {
        payload = JSON.parse(body);
      } catch {
        jsonResponse(res, 400, { error: "Invalid JSON payload" });
        return;
      }

      const user = await getUserByChatId(subscription.telegram_chat_id);
      const prefix = user?.prefix ?? "";
      const message = formatAlertMessage(prefix, payload);

      try {
        await bot.api.sendMessage(subscription.telegram_chat_id, message);

        await addAlert(subscription.telegram_chat_id, {
          timestamp: Date.now(),
          symbol: payload.symbol ?? "unknown",
          message: payload.text ?? payload.message ?? JSON.stringify(payload),
          custom_fields: payload,
        });

        jsonResponse(res, 200, { success: true });
      } catch (error) {
        const err = error as { code?: string; message?: string };
        if (err.code === "403" || err.message?.includes("bot was blocked")) {
          jsonResponse(res, 503, { error: "Bot blocked by user" });
        } else {
          console.error("[webhook] Failed to send alert:", error);
          jsonResponse(res, 500, { error: "Failed to send alert" });
        }
      }
    } catch (error) {
      console.error("[webhook] Internal error:", error);
      jsonResponse(res, 500, { error: "Internal server error" });
    }
  });

  server.listen(port, () => {
    console.log(`[webhook] Server listening on port ${port}`);
  });

  return server;
}
