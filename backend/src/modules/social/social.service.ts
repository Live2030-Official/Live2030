import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SignalingGateway } from '../signaling/signaling.gateway';
import { CreatePostDto, QueryPostsDto, AddCommentDto } from './dto/social.dto';

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SignalingGateway))
    private readonly signalingGateway?: SignalingGateway,
  ) {}

  /** Persist a notification and push it to the recipient's realtime channel. */
  private async notify(userId: string, type: string, title: string, body?: string, data?: any) {
    if (!userId) return;
    try {
      const notification = await this.prisma.notification.create({
        data: { userId, type, title, body: body || null, data: data ?? undefined },
      });
      this.signalingGateway?.server?.to(`user_${userId}`).emit('notification:new', notification);
    } catch {}
  }

  /**
   * Create a new social post (Photo or Video)
   */
  async createPost(dto: CreatePostDto) {
    const author = await this.prisma.user.findUnique({
      where: { id: dto.authorId },
    });
    if (!author) {
      throw new NotFoundException('Author user not found');
    }

    const post = await this.prisma.post.create({
      data: {
        authorId: dto.authorId,
        type: dto.type,
        caption: dto.caption?.trim() || null,
        mediaUrl: dto.mediaUrl,
        thumbnailUrl: dto.thumbnailUrl || null,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            verifiedLabel: true,
            level: true,
            role: true,
          },
        },
      },
    });

    return {
      ...post,
      isLiked: false,
      isFollowingAuthor: false,
    };
  }

  /**
   * Get social feed with filters (PHOTO vs VIDEO) and pagination
   */
  async getPosts(query: QueryPostsDto) {
    const { type, page = 1, limit = 20, currentUserId } = query;
    const skip = (Math.max(1, page) - 1) * limit;

    const whereClause: any = { visibility: 'ACTIVE' };
    if (type && ['PHOTO', 'VIDEO', 'REELS'].includes(type.toUpperCase())) {
      whereClause.type = type.toUpperCase();
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
              verifiedLabel: true,
              level: true,
              role: true,
            },
          },
          likes: currentUserId
            ? {
                where: { userId: currentUserId },
                select: { id: true },
              }
            : false,
        },
      }),
      this.prisma.post.count({ where: whereClause }),
    ]);

    // Check following status for all authors if currentUserId provided
    let followedAuthorIds = new Set<string>();
    if (currentUserId && posts.length > 0) {
      const authorIds = Array.from(new Set(posts.map((p) => p.authorId)));
      const follows = await this.prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: authorIds },
        },
        select: { followingId: true },
      });
      followedAuthorIds = new Set(follows.map((f) => f.followingId));
    }

    const formattedPosts = posts.map((post: any) => {
      const isLiked = currentUserId ? post.likes && post.likes.length > 0 : false;
      const isFollowingAuthor = currentUserId ? followedAuthorIds.has(post.authorId) : false;
      const { likes, ...rest } = post;

      return {
        ...rest,
        isLiked,
        isFollowingAuthor,
      };
    });

    return {
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Toggle Like / Unlike on a Post
   */
  async toggleLike(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existingLike = await this.prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await this.prisma.$transaction([
        this.prisma.postLike.delete({
          where: { id: existingLike.id },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);

      const updatedPost = await this.prisma.post.findUnique({
        where: { id: postId },
        select: { likesCount: true },
      });

      return {
        isLiked: false,
        likesCount: Math.max(0, updatedPost?.likesCount ?? 0),
      };
    } else {
      // Like
      await this.prisma.$transaction([
        this.prisma.postLike.create({
          data: {
            postId,
            userId,
          },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);

      const updatedPost = await this.prisma.post.findUnique({
        where: { id: postId },
        select: { likesCount: true },
      });

      if (post.authorId && post.authorId !== userId) {
        const liker = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { displayName: true, username: true },
        });
        await this.notify(
          post.authorId,
          'LIKE',
          'New like on your post',
          `${liker?.displayName || liker?.username || 'Someone'} liked your post.`,
          { postId },
        );
      }

      return {
        isLiked: true,
        likesCount: updatedPost?.likesCount ?? 1,
      };
    }
  }

  /**
   * Fetch hierarchical comment tree for a post
   */
  async getComments(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    // Hidden / removed content must not remain publicly reachable (incl. via comments).
    if ((post as any).visibility && (post as any).visibility !== 'ACTIVE') {
      throw new NotFoundException('Post not found');
    }

    // Fetch top-level comments (parentId: null) with nested replies
    const comments = await this.prisma.postComment.findMany({
      where: {
        postId,
        parentId: null,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            verifiedLabel: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isVerified: true,
                verifiedLabel: true,
              },
            },
          },
        },
      },
    });

    return comments;
  }

  /**
   * Add a top-level comment or nested reply
   */
  async addComment(postId: string, dto: AddCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (dto.parentId) {
      const parentComment = await this.prisma.postComment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parentComment) {
        throw new NotFoundException('Parent comment for reply not found');
      }
    }

    const [comment] = await this.prisma.$transaction([
      this.prisma.postComment.create({
        data: {
          postId,
          authorId: dto.authorId,
          content: dto.content.trim(),
          parentId: dto.parentId || null,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
              verifiedLabel: true,
            },
          },
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);

    if (post.authorId && post.authorId !== dto.authorId) {
      const commenter = await this.prisma.user.findUnique({
        where: { id: dto.authorId },
        select: { displayName: true, username: true },
      });
      await this.notify(
        post.authorId,
        'COMMENT',
        'New comment on your post',
        `${commenter?.displayName || commenter?.username || 'Someone'}: ${dto.content.trim().slice(0, 80)}`,
        { postId, commentId: comment.id },
      );
    }

    return comment;
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Count replies that will also be deleted
    const repliesCount = await this.prisma.postComment.count({
      where: { parentId: commentId },
    });
    const totalDeleted = 1 + repliesCount;

    await this.prisma.$transaction([
      this.prisma.postComment.delete({
        where: { id: commentId },
      }),
      this.prisma.post.update({
        where: { id: comment.postId },
        data: { commentsCount: { decrement: totalDeleted } },
      }),
    ]);

    return { success: true, message: 'Comment deleted successfully' };
  }

  /**
   * Share post counter increment
   */
  async sharePost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { sharesCount: { increment: 1 } },
      select: { sharesCount: true },
    });

    return { success: true, sharesCount: updated.sharesCount };
  }

  /**
   * Delete post (author only)
   */
  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.prisma.post.delete({
      where: { id: postId },
    });

    return { success: true, message: 'Post deleted successfully' };
  }

  /**
   * Fetch all posts created by a specific user (for "My Content" grid)
   */
  async getUserPosts(userId: string, currentUserId?: string) {
    const isOwner = currentUserId === userId;
    const posts = await this.prisma.post.findMany({
      where: {
        authorId: userId,
        ...(isOwner ? {} : { visibility: 'ACTIVE' }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            verifiedLabel: true,
            level: true,
            role: true,
          },
        },
        likes: currentUserId
          ? {
              where: { userId: currentUserId },
              select: { id: true },
            }
          : false,
      },
    });

    const isFollowing =
      currentUserId && currentUserId !== userId
        ? (await this.prisma.follow.count({
            where: { followerId: currentUserId, followingId: userId },
          })) > 0
        : false;

    return {
      posts: posts.map((p: any) => ({
        ...p,
        isLiked: currentUserId ? p.likes && p.likes.length > 0 : false,
        isFollowingAuthor: isFollowing,
      })),
      totalPosts: posts.length,
    };
  }

  /**
   * Toggle Follow / Unfollow between two users
   */
  async toggleFollow(targetUserId: string, followerId: string) {
    if (targetUserId === followerId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      // Unfollow
      await this.prisma.follow.delete({
        where: { id: existingFollow.id },
      });
      const followersCount = await this.prisma.follow.count({
        where: { followingId: targetUserId },
      });
      return {
        isFollowing: false,
        followersCount,
      };
    } else {
      // Check if target user has disabled following (VIP privacy toggle)
      const targetSettings = (targetUser as any).vipSettings || {};
      if (targetSettings.disableFollowing) {
        throw new ForbiddenException('This user has disabled following on their profile.');
      }

      // Follow
      await this.prisma.follow.create({
        data: {
          followerId,
          followingId: targetUserId,
        },
      });
      const followersCount = await this.prisma.follow.count({
        where: { followingId: targetUserId },
      });

      const follower = await this.prisma.user.findUnique({
        where: { id: followerId },
        select: { displayName: true, username: true },
      });
      await this.notify(
        targetUserId,
        'FOLLOW',
        'New follower',
        `${follower?.displayName || follower?.username || 'Someone'} started following you.`,
        { followerId },
      );

      return {
        isFollowing: true,
        followersCount,
      };
    }
  }

  /**
   * Get list of followers for a user
   */
  async getFollowers(userId: string, currentUserId?: string) {
    const followers = await this.prisma.follow.findMany({
      where: { followingId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            verifiedLabel: true,
            level: true,
            role: true,
          },
        },
      },
    });

    let currentFollowingIds = new Set<string>();
    if (currentUserId && followers.length > 0) {
      const followerIds = followers.map((f) => f.follower.id);
      const myFollows = await this.prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: followerIds },
        },
        select: { followingId: true },
      });
      currentFollowingIds = new Set(myFollows.map((mf) => mf.followingId));
    }

    return followers.map((f) => ({
      ...f.follower,
      isFollowing: currentUserId ? currentFollowingIds.has(f.follower.id) : false,
      followedAt: f.createdAt,
    }));
  }

  /**
   * Get list of users that a user is following
   */
  async getFollowing(userId: string, currentUserId?: string) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            verifiedLabel: true,
            level: true,
            role: true,
          },
        },
      },
    });

    let currentFollowingIds = new Set<string>();
    if (currentUserId && following.length > 0) {
      const followingIds = following.map((f) => f.following.id);
      const myFollows = await this.prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: followingIds },
        },
        select: { followingId: true },
      });
      currentFollowingIds = new Set(myFollows.map((mf) => mf.followingId));
    }

    return following.map((f) => ({
      ...f.following,
      isFollowing: currentUserId ? currentFollowingIds.has(f.following.id) : false,
      followedAt: f.createdAt,
    }));
  }

  /**
   * Get user social counts: followers, following, and total posts
   */
  async getUserSocialStats(userId: string, currentUserId?: string) {
    const [followersCount, followingCount, postsCount, isFollowing] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
      this.prisma.post.count({ where: { authorId: userId } }),
      currentUserId && currentUserId !== userId
        ? (await this.prisma.follow.count({
            where: { followerId: currentUserId, followingId: userId },
          })) > 0
        : false,
    ]);

    return {
      followersCount,
      followingCount,
      postsCount,
      isFollowing,
    };
  }

  /**
   * Send 1-on-1 Direct Message with stranger rejection VIP check
   */
  async sendDirectMessage(senderId: string, receiverId: string, content: string, imageUrl?: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('You cannot message yourself');
    }

    const cleanContent = (content || '').trim();
    if (!cleanContent && !imageUrl) {
      throw new BadRequestException('Message content or image is required');
    }

    const [sender, receiver] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: senderId },
        select: { id: true, displayName: true, username: true, avatarUrl: true, vipLevel: true, customId: true, isVerified: true, verifiedLabel: true },
      }),
      this.prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true, displayName: true, username: true, avatarUrl: true, vipSettings: true, isVerified: true, verifiedLabel: true },
      }),
    ]);

    if (!sender) {
      throw new NotFoundException('Sender user not found');
    }
    if (!receiver) {
      throw new NotFoundException('Receiver user not found');
    }

    // Block enforcement (either direction blocks messaging)
    const blockCount = await this.prisma.userBlock.count({
      where: {
        OR: [
          { blockerId: senderId, blockedId: receiverId },
          { blockerId: receiverId, blockedId: senderId },
        ],
      },
    });
    if (blockCount > 0) {
      throw new ForbiddenException('Messaging is unavailable with this user.');
    }

    // VIP Privacy Check: Reject messages from strangers
    const receiverSettings = (receiver.vipSettings as any) || {};
    if (receiverSettings.rejectStrangerMessages) {
      // Stranger check: Does the receiver follow the sender?
      const isFollower = await this.prisma.follow.findFirst({
        where: {
          followerId: receiverId,
          followingId: senderId,
        },
      });

      if (!isFollower) {
        throw new ForbiddenException(
          'This user only accepts direct messages from people they follow (Stranger Messages Rejected).',
        );
      }
    }

    // Persist DirectMessage in DB
    const message = await (this.prisma as any).directMessage.create({
      data: {
        senderId,
        receiverId,
        content: cleanContent,
        imageUrl: imageUrl || null,
        isRead: false,
      },
    });

    const payload = {
      id: message.id,
      senderId,
      receiverId,
      content: message.content,
      imageUrl: message.imageUrl,
      isRead: false,
      createdAt: message.createdAt.toISOString(),
      sender: {
        id: sender.id,
        displayName: sender.displayName,
        username: sender.username,
        avatarUrl: sender.avatarUrl,
        vipLevel: sender.vipLevel || 0,
        customId: sender.customId,
      },
    };

    // Emit real-time notification to receiver & sender sockets.
    // Uses the `chat:direct` event name shared with the mobile client.
    try {
      this.signalingGateway?.server?.to(`user_${receiverId}`).emit('chat:direct', payload);
      this.signalingGateway?.server?.to(`user_${senderId}`).emit('chat:direct', payload);
    } catch {}

    return payload;
  }

  /**
   * Fetch active chat conversations for user
   */
  async getConversations(userId: string) {
    const rawMessages = await (this.prisma as any).directMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        sender: {
          select: { id: true, displayName: true, username: true, avatarUrl: true, vipLevel: true, customId: true, isVerified: true, verifiedLabel: true },
        },
        receiver: {
          select: { id: true, displayName: true, username: true, avatarUrl: true, vipLevel: true, customId: true, isVerified: true, verifiedLabel: true },
        },
      },
    });

    const conversationsMap = new Map<string, any>();

    for (const msg of rawMessages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!conversationsMap.has(partnerId)) {
        const partner = msg.senderId === userId ? msg.receiver : msg.sender;
        conversationsMap.set(partnerId, {
          partnerId,
          partnerName: partner?.displayName || partner?.username || 'User',
          partnerUsername: partner?.username,
          partnerAvatar: partner?.avatarUrl,
          partnerVipLevel: partner?.vipLevel || 0,
          partnerCustomId: partner?.customId || null,
          lastMessage: msg.content || (msg.imageUrl ? '📷 [Photo]' : ''),
          lastMessageAt: msg.createdAt,
          unreadCount: (msg.receiverId === userId && !msg.isRead) ? 1 : 0,
          user: {
            id: partnerId,
            displayName: partner?.displayName || partner?.username || 'User',
            username: partner?.username,
            avatarUrl: partner?.avatarUrl,
            vipLevel: partner?.vipLevel || 0,
            customId: partner?.customId || null,
          },
        });
      } else if (msg.receiverId === userId && !msg.isRead) {
        const existing = conversationsMap.get(partnerId);
        existing.unreadCount += 1;
      }
    }

    return Array.from(conversationsMap.values());
  }

  /**
   * Fetch direct message history between two users
   */
  async getDirectMessages(userId: string, targetUserId: string, limit: number = 50) {
    const messages = await (this.prisma as any).directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: Math.min(100, Math.max(10, limit)),
    });

    // Mark messages as read
    try {
      await (this.prisma as any).directMessage.updateMany({
        where: {
          senderId: targetUserId,
          receiverId: userId,
          isRead: false,
        },
        data: { isRead: true },
      });
    } catch {}

    return messages;
  }

  /**
   * Get community members / registered users to start a chat with anyone
   */
  async getCommunityMembers(query?: string, currentUserId?: string) {
    const where: any = {
      isBanned: false,
    };
    if (currentUserId) {
      where.id = { not: currentUserId };
    }
    if (query && query.trim().length > 0) {
      where.OR = [
        { displayName: { contains: query.trim(), mode: 'insensitive' } },
        { username: { contains: query.trim(), mode: 'insensitive' } },
        { customId: { contains: query.trim(), mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      take: 30,
      orderBy: [
        { vipLevel: 'desc' },
        { level: 'desc' },
      ],
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        isVerified: true,
        verifiedLabel: true,
        level: true,
        vipLevel: true,
        customId: true,
        country: true,
        bio: true,
      },
    });

    return users;
  }
}
