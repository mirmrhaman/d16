import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { httpError } from './security.js';

export function validateImageUpload(payload) {
  const encoded = payload?.data_base64;
  if (typeof encoded !== 'string' || encoded.length > 7 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw httpError(400, 'Upload a valid base64 image no larger than 5 MB.');
  }
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > 5 * 1024 * 1024 || bytes.toString('base64') !== encoded) throw httpError(400, 'Image must be between 1 byte and 5 MB.');
  let extension;
  let contentType;
  if (bytes.length > 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    extension = 'png'; contentType = 'image/png';
  } else if (bytes.length > 12 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9) {
    extension = 'jpg'; contentType = 'image/jpeg';
  } else if (bytes.length > 20 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    extension = 'webp'; contentType = 'image/webp';
  } else { throw httpError(400, 'Only PNG, JPEG and WebP images are supported.'); }
  if (payload.content_type && payload.content_type !== contentType) throw httpError(400, 'Image content does not match its declared type.');
  return { bytes, extension, contentType };
}

export function createUploadService({ auditUpload, directory = process.env.D16_UPLOAD_DIR, publicBase = process.env.D16_PUBLIC_UPLOAD_BASE_URL } = {}) {
  return async function upload(payload, actor) {
    if (!directory || !path.isAbsolute(directory) || !publicBase) throw httpError(503, 'Configure D16_UPLOAD_DIR and D16_PUBLIC_UPLOAD_BASE_URL for persistent image uploads.');
    if (!publicBase.startsWith('/uploads') && !/^https:\/\/[^/]+\//.test(publicBase)) throw httpError(503, 'Upload base URL must use HTTPS or the local /uploads path.');
    const { bytes, extension, contentType } = validateImageUpload(payload);
    const id = randomUUID();
    const name = `${id}.${extension}`;
    const target = path.join(directory, name);
    await mkdir(directory, { recursive: true, mode: 0o750 });
    await writeFile(target, bytes, { flag: 'wx', mode: 0o640 });
    try {
      if (!auditUpload) throw httpError(503, 'Upload audit storage is not configured.');
      await auditUpload(id, actor);
    } catch (error) {
      await unlink(target);
      throw error;
    }
    return { id, file_url: `${publicBase.replace(/\/$/, '')}/${name}`, content_type: contentType, size_bytes: bytes.length };
  };
}
