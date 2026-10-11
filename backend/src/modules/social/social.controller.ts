import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SocialService } from './social.service';
import {
  CreatePostDto,
  QueryPostsDto,
  ToggleLikeDto,
  AddCommentDto,
  ToggleFollowDto,
} from './dto/social.dto';

@ApiTags('Social')
@Controller('api/social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('posts')
  @ApiOperation({ summary: 'Get social feed with photo/video filters and pagination' })
  async getPosts(@Query() query: QueryPostsDto) {
    return this.socialService.getPosts(query);
  }

  @Post('posts')
  @ApiOperation({ summary: 'Create a new social photo or video post' })
  async createPost(@Body() dto: CreatePostDto) {
    return this.socialService.createPost(dto);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Delete a post by ID (author only)' })
  async deletePost(@Param('id') id: string, @Query('userId') userId: string) {
    return this.socialService.deletePost(id, userId);
  }

  @Post('posts/:id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle like/unlike on a post' })
  async toggleLike(@Param('id') id: string, @Body() dto: ToggleLikeDto) {
    return this.socialService.toggleLike(id, dto.userId);
  }

  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'Get comment tree with nested replies for a post' })
  async getComments(@Param('id') id: string) {
    return this.socialService.getComments(id);
  }

  @Post('posts/:id/comments')
  @ApiOperation({ summary: 'Add a comment or nested reply to a post' })
  async addComment(@Param('id') id: string, @Body() dto: AddCommentDto) {
    return this.socialService.addComment(id, dto);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @Query('userId') userId: string,
  ) {
    return this.socialService.deleteComment(commentId, userId);
  }

  @Post('posts/:id/share')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increment post share count' })
  async sharePost(@Param('id') id: string) {
    return this.socialService.sharePost(id);
  }

  @Get('users/:userId/posts')
  @ApiOperation({ summary: 'Get posts created by a specific user (My Content)' })
  async getUserPosts(
    @Param('userId') userId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.socialService.getUserPosts(userId, currentUserId);
  }

  @Post('users/:userId/follow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle follow / unfollow target user' })
  async toggleFollow(
    @Param('userId') userId: string,
    @Body() dto: ToggleFollowDto,
  ) {
    return this.socialService.toggleFollow(userId, dto.followerId);
  }

  @Get('users/:userId/followers')
  @ApiOperation({ summary: 'Get followers list for a user' })
  async getFollowers(
    @Param('userId') userId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.socialService.getFollowers(userId, currentUserId);
  }

  @Get('users/:userId/following')
  @ApiOperation({ summary: 'Get following list for a user' })
  async getFollowing(
    @Param('userId') userId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.socialService.getFollowing(userId, currentUserId);
  }

  @Get('users/:userId/social-stats')
  @ApiOperation({ summary: 'Get social statistics for a user profile' })
  async getUserSocialStats(
    @Param('userId') userId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.socialService.getUserSocialStats(userId, currentUserId);
  }

  @Get('chats/conversations')
  @ApiOperation({ summary: 'Get active direct chat conversations for a user' })
  async getConversations(@Query('userId') userId: string) {
    return this.socialService.getConversations(userId);
  }

  @Get('chats/:targetUserId')
  @ApiOperation({ summary: 'Get direct message thread between two users' })
  async getDirectMessages(
    @Param('targetUserId') targetUserId: string,
    @Query('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.getDirectMessages(userId, targetUserId, limit ? Number(limit) : 50);
  }

  @Post('chats/send')
  @ApiOperation({ summary: 'Send a 1-on-1 direct message (with stranger rejection check)' })
  async sendDirectMessage(
    @Body()
    body: {
      senderId: string;
      receiverId: string;
      content: string;
      imageUrl?: string;
    },
  ) {
    return this.socialService.sendDirectMessage(
      body.senderId,
      body.receiverId,
      body.content,
      body.imageUrl,
    );
  }

  @Get('community/members')
  @ApiOperation({ summary: 'Get registered members to start a chat with anyone' })
  async getCommunityMembers(
    @Query('query') query?: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.socialService.getCommunityMembers(query, currentUserId);
  }
}
