import express from "express";
import Redis from "ioredis";
import { Server } from "socket.io";
import { execFile } from "child_process";
import dotenv from "dotenv";
import { generateSlug } from "random-word-slugs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import sqlite3 from "sqlite3";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET = process.env.S3_BUCKET || "hsl-transcoder";
const TRANSCODER_IMAGE = process.env.TRANSCODER_IMAGE || "transcoder";

const db = new sqlite3.Database("db.sqlite");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const subscriber = new Redis(REDIS_URL);

app.use(cors({ origin: "*" }));

app.use(express.json());
const io = new Server({ cors: "*" });

io.listen(9001, () => {
  console.log("Socket Server is running on 9001");
});

io.on("connection", (socket) => {
  socket.on("subscribe", (channel) => {
    socket.join(channel);
    socket.emit("message", `joined ${channel}`);
  });
});

function initRedisSubscribe() {
  subscriber.psubscribe("logs:*");
  subscriber.on("pmessage", (pattern, channel, message) => {
    io.to(channel).emit("message", message);
  });
}
function initSqlite() {
  db.run(
    "CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, hls_url TEXT, s3_url TEXT)"
  );
}

initRedisSubscribe();
initSqlite();

app.use(express.static(path.join(__dirname, "../../frontend/dist")));

app.get("/projects", (req, res) => {
  db.all("SELECT * FROM projects", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

function isValidSourceUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return false;
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === "https:" || parsed.protocol === "s3:";
}

app.post("/transcode", (req, res) => {
  const { s3Url } = req.body;
  if (!isValidSourceUrl(s3Url)) {
    return res
      .status(400)
      .json({ error: "s3Url must be an https:// or s3:// URL" });
  }
  const projectId = generateSlug();
  const hls_url = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/__outputs/${projectId}/index.m3u8`;

  db.run("INSERT INTO projects (id, hls_url, s3_url) VALUES (?, ?, ?)", [
    projectId,
    hls_url,
    s3Url,
  ]);
  spinup_docker(s3Url, projectId);
  res.send({ projectId, hls_url });
});

app.get("*catchall", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend", "dist", "index.html"));
});

function spinup_docker(s3Url, projectId) {
  const envPairs = [
    `S3__URL=${s3Url}`,
    `PROJECT_ID=${projectId}`,
    `REDIS_URL=${REDIS_URL}`,
    `AWS_REGION=${AWS_REGION}`,
    `S3_BUCKET=${S3_BUCKET}`,
    `AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID || ""}`,
    `AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY || ""}`,
  ];
  const network = process.env.TRANSCODER_NETWORK
    ? `--network=${process.env.TRANSCODER_NETWORK}`
    : "--network=host";
  const args = ["run", "-d", network];
  for (const kv of envPairs) {
    args.push("-e", kv);
  }
  args.push(TRANSCODER_IMAGE);
  execFile("docker", args, (err) => {
    if (err) {
      console.error(`docker run failed for ${projectId}:`, err.message);
    }
  });
  io.emit("message", `transcode ${s3Url} ${projectId}`);
}

app.listen(9000, () => {
  console.log("API Server is running on 9000");
});
