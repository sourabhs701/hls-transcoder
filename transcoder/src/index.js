import { uploadToS3 } from "./s3.js";
import { transcode } from "./transcoder.js";

const PROJECT_ID = process.env.PROJECT_ID;
const S3__URL = process.env.S3__URL;

async function main() {
  await transcode(S3__URL, PROJECT_ID);
  await uploadToS3(PROJECT_ID);
  process.exit(0);
}

main();
