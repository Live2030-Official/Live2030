import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

const uploadDir = join(process.cwd(), 'uploads', 'avatars');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@ApiTags('Uploads')
@Controller('api/upload')
export class UploadController {
  @Post('avatar')
  @UseGuards(UserAuthGuard)
  @ApiOperation({ summary: 'Upload profile image via multipart/form-data' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname) || '.jpg';
          cb(null, `avatar-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/i)) {
          return cb(
            new BadRequestException('Only image files (jpg, jpeg, png, webp, gif) are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file uploaded');
    }
    const relativeUrl = `/uploads/avatars/${file.filename}`;
    return {
      success: true,
      url: relativeUrl,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('post-media')
  @UseGuards(UserAuthGuard)
  @ApiOperation({ summary: 'Upload social post photo or video via multipart/form-data' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const postsUploadDir = join(process.cwd(), 'uploads', 'posts');
          if (!existsSync(postsUploadDir)) {
            mkdirSync(postsUploadDir, { recursive: true });
          }
          cb(null, postsUploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname) || '.jpg';
          cb(null, `post-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for high-res videos and photos
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif|mp4|quicktime|mov|webm|m4v|x-matroska|3gpp)$/i)) {
          return cb(
            new BadRequestException('Only photo (jpg, png, webp, gif) or video (mp4, mov, webm, m4v) files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadPostMedia(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No photo or video file uploaded');
    }
    const isVideo = file.mimetype.startsWith('video/') || file.originalname.match(/\.(mp4|mov|webm|m4v|mkv)$/i) !== null;
    const relativeUrl = `/uploads/posts/${file.filename}`;
    let thumbnailUrl: string | null = null;

    if (isVideo) {
      try {
        const { execSync } = require('child_process');
        const postsUploadDir = join(process.cwd(), 'uploads', 'posts');
        const thumbFilename = `${file.filename.replace(/\.[^.]+$/, '')}-thumb.jpg`;
        const thumbPath = join(postsUploadDir, thumbFilename);
        execSync(`ffmpeg -y -i "${file.path}" -ss 00:00:01 -vframes 1 -q:v 2 "${thumbPath}"`, {
          timeout: 15000,
          stdio: 'pipe',
        });
        if (existsSync(thumbPath)) {
          thumbnailUrl = `/uploads/posts/${thumbFilename}`;
        }
      } catch {
        // Graceful fallback if video cannot be thumbnailed
      }
    }

    return {
      success: true,
      url: relativeUrl,
      thumbnailUrl,
      filename: file.filename,
      mediaType: isVideo ? 'VIDEO' : 'PHOTO',
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('level-asset')
  @RequirePermissions('levels.manage')
  @ApiOperation({ summary: 'Upload level profile frame (PNG/WebP) or Lottie animation (.json) via multipart/form-data' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const levelsUploadDir = join(process.cwd(), 'uploads', 'levels');
          if (!existsSync(levelsUploadDir)) {
            mkdirSync(levelsUploadDir, { recursive: true });
          }
          cb(null, levelsUploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname) || (file.mimetype.includes('json') ? '.json' : '.png');
          cb(null, `level-asset-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
      fileFilter: (req, file, cb) => {
        // SVG is intentionally rejected: it can carry embedded scripts (XSS).
        if (file.mimetype.match(/svg/i) || file.originalname.match(/\.svg$/i)) {
          return cb(new BadRequestException('SVG files are not allowed for security reasons.'), false);
        }
        const isAllowed =
          file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/i) ||
          file.mimetype.includes('json') ||
          file.originalname.match(/\.(png|webp|jpg|jpeg|json)$/i);
        if (!isAllowed) {
          return cb(
            new BadRequestException('Only frame images (png, webp, jpg) or Lottie animation (.json) files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadLevelAsset(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const relativeUrl = `/uploads/levels/${file.filename}`;
    const isLottie = file.originalname.endsWith('.json') || file.mimetype.includes('json');
    return {
      success: true,
      url: relativeUrl,
      filename: file.filename,
      assetType: isLottie ? 'LOTTIE' : 'FRAME',
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}


