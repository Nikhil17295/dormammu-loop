import express, { Request, Response } from "express";
import cors from "cors";

export const app = express();

// Parse JSON request bodies
app.use(express.json());

// Enable CORS for frontend (defaults to Vite dev URL: http://localhost:5173)
const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});
