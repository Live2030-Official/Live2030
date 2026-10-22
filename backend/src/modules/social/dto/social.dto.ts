import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum MediaType {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
}

export class CreatePostDto {
  @ApiProperty({ description: 'User ID of the author (ignored - server uses the JWT identity)' })
  @IsString()
  @IsOptional()
  authorId?: string;

  @ApiProperty({ enum: MediaType, default: MediaType.PHOTO })
  @IsEnum(MediaType)
  type: MediaType;

  @ApiPropertyOptional({ description: 'Post caption or text' })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiProperty({ description: 'Public URL of the photo or video' })
  @IsString()
  @IsNotEmpty()
  mediaUrl: string;

  @ApiPropertyOptional({ description: 'Video poster or thumbnail preview URL' })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
}

export class QueryPostsDto {
  @ApiPropertyOptional({ enum: MediaType })
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Current viewing user ID to check like and follow status' })
  @IsOptional()
  @IsString()
  currentUserId?: string;
}

export class ToggleLikeDto {
  @ApiProperty({ description: 'User ID performing the like (ignored - server uses the JWT identity)' })
  @IsString()
  @IsOptional()
  userId?: string;
}

export class AddCommentDto {
  @ApiProperty({ description: 'User ID of commenter (ignored - server uses the JWT identity)' })
  @IsString()
  @IsOptional()
  authorId?: string;

  @ApiProperty({ description: 'Comment text content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for nested replies' })
  @IsString()
  @IsOptional()
  parentId?: string;
}

export class ToggleFollowDto {
  @ApiProperty({ description: 'User ID of the follower (ignored - server uses the JWT identity)' })
  @IsString()
  @IsOptional()
  followerId?: string;
}
