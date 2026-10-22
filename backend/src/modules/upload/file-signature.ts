import { BadRequestException } from '@nestjs/common';
import { closeSync, openSync, readSync, renameSync, unlinkSync, existsSync } from 'fs';
import { basename, extname, join, dirname } from 'path';

type FileKind = 'image' | 'video' | 'lottie';

interface DetectedType {
  mime: string;
  ext: string;
  kind: FileKind;
}

/**
 * Reads the first bytes of the uploaded file and identifies its real type.
 * Client-provided `mimetype` / filename extensions are never trusted on their
 * own: an attacker could upload `.html` (stored XSS) or a script disguised as
 * an image.
 */
export function detectFileType(buffer: Buffer): DetectedType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: '.jpg', kind: 'image' };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: '.png', kind: 'image' };
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'GIF8') {
    return { mime: 'image/gif', ext: '.gif', kind: 'image' };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: '.webp', kind: 'image' };
  }
  // ISO Base Media (mp4 / mov / m4v / 3gp) - "ftyp" box at offset 4
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    return { mime: 'video/mp4', ext: '.mp4', kind: 'video' };
  }
  // Matroska / WebM
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { mime: 'video/webm', ext: '.webm', kind: 'video' };
  }
  // Lottie / JSON: first non-whitespace byte is { or [
  const textStart = buffer.subarray(0, 64).toString('utf8').trimStart()[0];
  if (textStart === '{' || textStart === '[') {
    return { mime: 'application/json', ext: '.json', kind: 'lottie' };
  }
  return null;
}

function readHeader(path: string, bytes = 64): Buffer {
  const fd = openSync(path, 'r');
  try {
    const buf = Buffer.alloc(bytes);
    const read = readSync(fd, buf, 0, bytes, 0);
    return buf.subarray(0, read);
  } finally {
    closeSync(fd);
  }
}

/**
 * Validates the uploaded file against its real signature, rejects disallowed
 * types, and renames the file so its extension always matches its content.
 * Deletes the file and throws when validation fails.
 */
export function verifyUploadedFile(
  file: { path: string; originalname: string; size: number },
  allowed: FileKind[],
): { path: string; filename: string; mime: string; ext: string; kind: FileKind } {
  if (!file?.path || !existsSync(file.path)) {
    throw new BadRequestException('Uploaded file could not be read.');
  }

  const detected = detectFileType(readHeader(file.path));
  if (!detected || !allowed.includes(detected.kind)) {
    try {
      unlinkSync(file.path);
    } catch {}
    throw new BadRequestException(
      `Invalid file content. Allowed types: ${allowed.join(', ')}.`,
    );
  }

  if (detected.kind === 'lottie') {
    try {
      JSON.parse(readHeader(file.path, 5 * 1024 * 1024).toString('utf8'));
    } catch {
      try {
        unlinkSync(file.path);
      } catch {}
      throw new BadRequestException('Invalid Lottie / JSON file.');
    }
  }

  let finalPath = file.path;
  let filename = basename(file.path);
  const currentExt = extname(filename).toLowerCase();
  if (currentExt !== detected.ext) {
    const target = join(dirname(file.path), `${basename(filename, currentExt)}${detected.ext}`);
    try {
      renameSync(file.path, target);
      finalPath = target;
      filename = basename(target);
    } catch {
      try {
        unlinkSync(file.path);
      } catch {}
      throw new BadRequestException('Could not store the uploaded file.');
    }
  }

  return {
    path: finalPath,
    filename,
    mime: detected.mime,
    ext: detected.ext,
    kind: detected.kind,
  };
}
