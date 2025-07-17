import express from "express";
import Redis from "ioredis";
import { Server } from "socket.io";
import { exec } from "child_process";
import dotenv from "dotenv";
import { generateSlug } from "random-word-slugs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import sqlite3 from "sqlite3";

const db = new sqlite3.Database("db.sqlite");

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const subscriber = new Redis("redis://localhost:6379");

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

app.post("/transcode", (req, res) => {
  const { s3Url } = req.body;
  if (!s3Url) {
    return res.status(400).json({ error: "s3Url is required" });
  }
  const projectId = generateSlug();
  const hls_url = `https://hsl-transcoder.s3.ap-south-1.amazonaws.com/__outputs/${projectId}/index.m3u8`;

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
  exec(
    `docker run -d --network=host -e S3__URL=${s3Url} -e PROJECT_ID=${projectId} -e accessKeyId=${process.env.accessKeyId} -e secretAccessKey=${process.env.secretAccessKey} transcoder`
  );
  io.emit("message", `transcode ${s3Url} ${projectId}`);
}

app.listen(9000, () => {
  console.log("API Server is running on 9000");
});
