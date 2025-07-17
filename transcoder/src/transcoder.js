import { exec } from "child_process";
import { promisify } from "util";
import { publishLog } from "./logger.js";

const execAsync = promisify(exec);

export async function transcode(S3__URL, PROJECT_ID) {
  // const cmd = `mkdir -p output/${PROJECT_ID} && ffmpeg -i "${S3__URL}" -codec:a aac -vn -hls_time 10 -hls_playlist_type vod -hls_segment_filename "output/${PROJECT_ID}/segment_%03d.aac" -start_number 0 output/${PROJECT_ID}/index.m3u8`;
  const cmd = `mkdir -p output/${PROJECT_ID} && ffmpeg -i "${S3__URL}" -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "output/${PROJECT_ID}/segment_%03d.ts" -start_number 0 output/${PROJECT_ID}/index.m3u8`;

  const start = Date.now();
  publishLog(PROJECT_ID, "Transcoding started");
  publishLog(PROJECT_ID, `Input: ${S3__URL}`);
  try {
    const { stderr } = await execAsync(cmd);

    const warnings = stderr
      .split("\n")
      .filter((line) => /warning|error/i.test(line));

    if (warnings.length > 0) {
      publishLog(PROJECT_ID, `FFmpeg Warnings/Errors:\n${warnings.join("\n")}`);
    } else {
      publishLog(PROJECT_ID, "No FFmpeg warnings detected.");
    }
    publishLog(
      PROJECT_ID,
      `Transcoding completed in ${(Date.now() - start) / 1000}s`
    );
  } catch (err) {
    publishLog(PROJECT_ID, `Transcoding error: ${err}`);
  }
}
