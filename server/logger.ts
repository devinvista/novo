import morgan from "morgan";
import { type Request, type Response } from "express";

const isProd = process.env.NODE_ENV === "production";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("pt-BR", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export const httpLogger = morgan(
  isProd
    ? (tokens, req: Request, res: Response) => {
        return JSON.stringify({
          time: new Date().toISOString(),
          method: tokens.method(req, res),
          url: tokens.url(req, res),
          status: tokens.status(req, res),
          ms: tokens["response-time"](req, res),
          ip: req.ip,
        });
      }
    : (tokens, req: Request, res: Response) => {
        const path = tokens.url(req, res) ?? "";
        if (!path.startsWith("/api")) return null as any;
        return [
          tokens.method(req, res),
          path,
          tokens.status(req, res),
          `${tokens["response-time"](req, res)}ms`,
        ].join(" ");
      },
  {
    skip: (req) => {
      const url = req.url ?? "";
      if (!isProd && !url.startsWith("/api")) return true;
      return url === "/health";
    },
  }
);
