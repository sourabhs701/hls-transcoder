# HLS Transcoder

Distributed video transcoding pipeline that converts uploaded videos into HLS (HTTP Live Streaming) format using FFmpeg in Docker containers, with real-time progress via WebSocket.

## Architecture

```
Browser → API Server → Redis Queue → Transcoder Worker → AWS S3
              ↕ WebSocket (real-time logs)
```

**Components:**

- `api-server/` — Node.js/Express REST API; tracks jobs in SQLite; streams logs live via Socket.IO + Redis pub/sub
- `transcoder/` — Node.js worker that pulls jobs from Redis, runs FFmpeg (libx264/AAC), and uploads `.m3u8` + `.ts` segments to S3
- `frontend/` — React (Vite) UI for uploading videos and watching transcoding progress
- `redis` — Job queue and pub/sub channel for real-time log streaming

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Node.js, Express.js |
| Transcoding | FFmpeg (libx264 + AAC → HLS) |
| Job Queue | Redis |
| Storage | AWS S3 |
| Real-time logs | Socket.IO |
| Frontend | React, Vite |
| Deployment | Docker, docker-compose |

## Quick Start

### Prerequisites

- Docker and docker-compose installed
- AWS account with an S3 bucket and IAM credentials

### Run

1. Configure environment files:

   ```bash
   # api-server/.env — set Redis connection + SQLite path
   # transcoder/.env — set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, REDIS_URL
   ```

2. Start all services:

   ```bash
   docker-compose up --build
   ```

3. Open `http://localhost:5173`, upload a video, and watch it transcode to HLS in real time.

| Service | Port |
|---|---|
| API / REST | 9001 |
| Socket.IO (logs) | 9000 |
| Redis | 6379 |
| Frontend (dev) | 5173 |

The transcoder uploads the `.m3u8` playlist and `.ts` segment files to S3 under `__outputs/{projectId}/`.

## System Design

![HLS Transcoder System Design](hls-transcoder-system-design.png)

## Project Structure

```
hls-transcoder/
├── api-server/       # Express API + Socket.IO log server
├── transcoder/       # FFmpeg worker + S3 uploader
├── frontend/         # React/Vite UI
└── docker-compose.yml
```

## Author

Built by [Sourabh Soni](https://srb.codes?utm_source=github&utm_medium=readme&utm_campaign=hls-transcoder) — Full-Stack & Gen AI Engineer.

## License

MIT
