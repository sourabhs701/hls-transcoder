import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import fs from "fs";
import mime from "mime-types";
import { fileURLToPath } from "url";
import { publishLog } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET = process.env.S3_BUCKET || "hsl-transcoder";

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.accessKeyId,
    secretAccessKey:
      process.env.AWS_SECRET_ACCESS_KEY || process.env.secretAccessKey,
  },
});

export async function uploadToS3(PROJECT_ID) {
  try {
    const outDirPath = path.join(__dirname, `../output/${PROJECT_ID}`);
    const distFolderContents = fs.readdirSync(outDirPath, {
      recursive: true,
    });
    for (const file of distFolderContents) {
      const filePath = path.join(outDirPath, file);
      if (!fs.lstatSync(filePath).isFile()) continue;

      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: `__outputs/${PROJECT_ID}/${file}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath),
      });

      await s3Client.send(command);
      console.log("Uploaded:", file);
      publishLog(PROJECT_ID, `Uploaded: ${file}`);
    }

    publishLog(PROJECT_ID, `Uploaded: ${distFolderContents.length} files`);

    publishLog(
      PROJECT_ID,
      `hls:https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/__outputs/${PROJECT_ID}/index.m3u8`
    );
  } catch (err) {
    console.log(err);
    publishLog(PROJECT_ID, err);
  }
}
