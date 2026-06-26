import path from "path";
import fs from "fs";
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { baileysServiceManager } from "./services/baileysManager";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// CORS — in production allow only the app's own origin
const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(
  cors({
    credentials: true,
    origin: allowedOrigin ? allowedOrigin : true,
  }),
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

// API routes
app.use("/api", router);

// Serve built React frontend (production only)
const staticDir = path.resolve(process.cwd(), "artifacts/wa-broadcast/dist/public");
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  // SPA fallback — any non-API route serves index.html
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

// Warm up Baileys for the default (unauthenticated) session on startup
void baileysServiceManager.get("default").initialize();

export default app;
