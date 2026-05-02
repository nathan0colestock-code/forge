import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

let _client: S3Client | null = null;
function client(): S3Client {
  if (_client) return _client;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 env vars are missing');
  }
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

export async function presignUpload(key: string, contentType: string, expiresInSec = 60 * 5): Promise<string> {
  if (!bucket) throw new Error('CLOUDFLARE_R2_BUCKET_NAME is not set');
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(client(), cmd, { expiresIn: expiresInSec });
}

export async function presignDownload(key: string, expiresInSec = 60 * 5): Promise<string> {
  if (!bucket) throw new Error('CLOUDFLARE_R2_BUCKET_NAME is not set');
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client(), cmd, { expiresIn: expiresInSec });
}

export async function deleteObject(key: string): Promise<void> {
  if (!bucket) throw new Error('CLOUDFLARE_R2_BUCKET_NAME is not set');
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
