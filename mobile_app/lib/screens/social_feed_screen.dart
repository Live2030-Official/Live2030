import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../theme/app_theme.dart';
import '../widgets/app_video_player.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import 'create_post_screen.dart';
import 'user_content_screen.dart';
import '../localization/app_locale_service.dart';
import '../localization/translated_text.dart';
import '../widgets/user_avatar_with_frame.dart';
import 'direct_chat_screen.dart';

class SocialFeedScreen extends StatefulWidget {
  const SocialFeedScreen({super.key});

  @override
  State<SocialFeedScreen> createState() => _SocialFeedScreenState();
}

class _SocialFeedScreenState extends State<SocialFeedScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  List<Map<String, dynamic>> _photoPosts = [];
  List<Map<String, dynamic>> _videoPosts = [];
  List<Map<String, dynamic>> _conversations = [];
  List<Map<String, dynamic>> _communityMembers = [];
  bool _isLoadingPhotos = true;
  bool _isLoadingVideos = true;
  bool _isLoadingChats = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    _loadFeeds();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadFeeds() async {
    final currentUserId = AuthService().currentUser?.id;

    ApiService().getSocialPosts(type: 'PHOTO', currentUserId: currentUserId).then((res) {
      if (mounted) {
        setState(() {
          _photoPosts = List<Map<String, dynamic>>.from(res['posts'] ?? []);
          _isLoadingPhotos = false;
        });
      }
    });

    ApiService().getSocialPosts(type: 'VIDEO', currentUserId: currentUserId).then((res) {
      if (mounted) {
        setState(() {
          _videoPosts = List<Map<String, dynamic>>.from(res['posts'] ?? []);
          _isLoadingVideos = false;
        });
      }
    });

    if (currentUserId != null) {
      ApiService().getConversations(currentUserId).then((convs) {
        if (mounted) {
          setState(() {
            _conversations = convs;
            _isLoadingChats = false;
          });
        }
      });
    } else {
      if (mounted) {
        setState(() => _isLoadingChats = false);
      }
    }

    ApiService().getCommunityMembers().then((members) {
      if (mounted) {
        setState(() {
          _communityMembers = members.where((m) => m['id'] != currentUserId).toList();
        });
      }
    });
  }

  void _openCreatePost() async {
    final activeTabType = _tabController.index == 0 ? 'PHOTO' : 'VIDEO';
    final created = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => CreatePostScreen(initialType: activeTabType)),
    );
    if (created == true) {
      _loadFeeds();
    }
  }

  void _togglePostLike(Map<String, dynamic> post) async {
    final currentUser = AuthService().currentUser;
    if (currentUser == null) return;

    final isLiked = post['isLiked'] == true;
    final currentLikes = post['likesCount'] as int? ?? 0;

    // Optimistic UI update
    setState(() {
      post['isLiked'] = !isLiked;
      post['likesCount'] = !isLiked ? currentLikes + 1 : (currentLikes > 0 ? currentLikes - 1 : 0);
    });

    try {
      final res = await ApiService().togglePostLike(post['id'], currentUser.id);
      if (res != null && mounted) {
        setState(() {
          post['isLiked'] = res['isLiked'] == true;
          post['likesCount'] = res['likesCount'] ?? post['likesCount'];
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          post['isLiked'] = isLiked;
          post['likesCount'] = currentLikes;
        });
      }
    }
  }

  void _toggleFollowAuthor(Map<String, dynamic> post) async {
    final currentUser = AuthService().currentUser;
    if (currentUser == null) return;

    final authorId = post['authorId'] as String;
    if (authorId == currentUser.id) return;

    final currentFollow = post['isFollowingAuthor'] == true;

    // Optimistic UI update for all posts by this author
    setState(() {
      for (final p in _photoPosts) {
        if (p['authorId'] == authorId) p['isFollowingAuthor'] = !currentFollow;
      }
      for (final p in _videoPosts) {
        if (p['authorId'] == authorId) p['isFollowingAuthor'] = !currentFollow;
      }
    });

    try {
      final res = await ApiService().toggleFollowUser(authorId, currentUser.id);
      if (res != null && mounted) {
        final newStatus = res['isFollowing'] == true;
        setState(() {
          for (final p in _photoPosts) {
            if (p['authorId'] == authorId) p['isFollowingAuthor'] = newStatus;
          }
          for (final p in _videoPosts) {
            if (p['authorId'] == authorId) p['isFollowingAuthor'] = newStatus;
          }
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          for (final p in _photoPosts) {
            if (p['authorId'] == authorId) p['isFollowingAuthor'] = currentFollow;
          }
          for (final p in _videoPosts) {
            if (p['authorId'] == authorId) p['isFollowingAuthor'] = currentFollow;
          }
        });
      }
    }
  }

  void _sharePost(Map<String, dynamic> post) async {
    final currentShares = post['sharesCount'] as int? ?? 0;
    setState(() {
      post['sharesCount'] = currentShares + 1;
    });

    await ApiService().sharePost(post['id']);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF10B981),
          duration: const Duration(seconds: 2),
          content: Row(
            children: [
              const Icon(Icons.share, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Text('Post link shared!'.tr, style: GoogleFonts.plusJakartaSans()),
            ],
          ),
        ),
      );
    }
  }

  void _showCommentsModal(Map<String, dynamic> post) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _CommentsBottomSheet(
        post: post,
        onCommentsCountUpdated: (newCount) {
          setState(() {
            post['commentsCount'] = newCount;
          });
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LiveColors.background,
      appBar: AppBar(
        backgroundColor: LiveColors.background,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LiveColors.callButtonGradient,
              ),
              child: const Icon(Icons.dynamic_feed_rounded, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            Text(
              'Social Feed'.tr,
              style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 20, color: Colors.white),
            ),
          ],
        ),
        actions: [
          // Create Post Button with stylish gradient pill
          GestureDetector(
            onTap: _openCreatePost,
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                gradient: LiveColors.primaryGradient,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: LiveColors.accentPink.withValues(alpha: 0.35),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.add_rounded, color: Colors.white, size: 16),
                  const SizedBox(width: 4),
                  Text('Post'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                ],
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
            tooltip: 'Refresh Feed'.tr,
            onPressed: () {
              setState(() {
                _isLoadingPhotos = true;
                _isLoadingVideos = true;
              });
              _loadFeeds();
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // Stylish Segmented Capsule Switcher (No basic TabBar, No harsh lines)
          Container(
            height: 46,
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: LiveColors.backgroundElevated,
              borderRadius: BorderRadius.circular(23),
              border: Border.all(color: LiveColors.borderSubtle),
            ),
            child: Row(
              children: [
                // Tab 0: Photos / Moments
                Expanded(
                  child: GestureDetector(
                    onTap: () => _tabController.animateTo(0),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        gradient: _tabController.index == 0 ? LiveColors.primaryGradient : null,
                        boxShadow: _tabController.index == 0
                            ? [
                                BoxShadow(
                                  color: LiveColors.accentPink.withValues(alpha: 0.35),
                                  blurRadius: 10,
                                  offset: const Offset(0, 2),
                                ),
                              ]
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.photo_library_rounded,
                            size: 15,
                            color: _tabController.index == 0 ? Colors.white : LiveColors.textSecondary,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              '${'Moments'.tr} (${_photoPosts.length})',
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.plusJakartaSans(
                                color: _tabController.index == 0 ? Colors.white : LiveColors.textSecondary,
                                fontWeight: _tabController.index == 0 ? FontWeight.bold : FontWeight.w500,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Tab 1: Video Clips
                Expanded(
                  child: GestureDetector(
                    onTap: () => _tabController.animateTo(1),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        gradient: _tabController.index == 1 ? LiveColors.primaryGradient : null,
                        boxShadow: _tabController.index == 1
                            ? [
                                BoxShadow(
                                  color: LiveColors.accentPurple.withValues(alpha: 0.35),
                                  blurRadius: 10,
                                  offset: const Offset(0, 2),
                                ),
                              ]
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.play_circle_fill_rounded,
                            size: 15,
                            color: _tabController.index == 1 ? Colors.white : LiveColors.textSecondary,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              '${'Clips'.tr} (${_videoPosts.length})',
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.plusJakartaSans(
                                color: _tabController.index == 1 ? Colors.white : LiveColors.textSecondary,
                                fontWeight: _tabController.index == 1 ? FontWeight.bold : FontWeight.w500,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Tab 2: Direct Chats
                Expanded(
                  child: GestureDetector(
                    onTap: () => _tabController.animateTo(2),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        gradient: _tabController.index == 2 ? LiveColors.primaryGradient : null,
                        boxShadow: _tabController.index == 2
                            ? [
                                BoxShadow(
                                  color: LiveColors.accentPink.withValues(alpha: 0.35),
                                  blurRadius: 10,
                                  offset: const Offset(0, 2),
                                ),
                              ]
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.chat_bubble_rounded,
                            size: 15,
                            color: _tabController.index == 2 ? Colors.white : LiveColors.textSecondary,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              '${'Chats'.tr} (${_conversations.length})',
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.plusJakartaSans(
                                color: _tabController.index == 2 ? Colors.white : LiveColors.textSecondary,
                                fontWeight: _tabController.index == 2 ? FontWeight.bold : FontWeight.w500,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Feed Content View
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Tab 1: Photos Feed
                _buildPhotosFeed(),

                // Tab 2: Videos Feed
                _buildVideosFeed(),

                // Tab 3: Direct Messaging Chats
                _buildChatsFeed(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotosFeed() {
    if (_isLoadingPhotos) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFFEC4899)));
    }

    if (_photoPosts.isEmpty) {
      return _buildEmptyFeed('No Photos Yet', 'Be the first to share a moment with the community!', 'PHOTO');
    }

    return RefreshIndicator(
      color: const Color(0xFFEC4899),
      onRefresh: () async => _loadFeeds(),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: _photoPosts.length,
        itemBuilder: (context, idx) {
          final post = _photoPosts[idx];
          return _PhotoPostCard(
            post: post,
            onLike: () => _togglePostLike(post),
            onFollow: () => _toggleFollowAuthor(post),
            onComment: () => _showCommentsModal(post),
            onShare: () => _sharePost(post),
          );
        },
      ),
    );
  }

  Widget _buildVideosFeed() {
    if (_isLoadingVideos) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFFEC4899)));
    }

    if (_videoPosts.isEmpty) {
      return _buildEmptyFeed('No Videos Yet', 'Upload your first short video reel now!', 'VIDEO');
    }

    return RefreshIndicator(
      color: const Color(0xFFEC4899),
      onRefresh: () async => _loadFeeds(),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: _videoPosts.length,
        itemBuilder: (context, idx) {
          final post = _videoPosts[idx];
          return _VideoPostCard(
            post: post,
            onLike: () => _togglePostLike(post),
            onFollow: () => _toggleFollowAuthor(post),
            onComment: () => _showCommentsModal(post),
            onShare: () => _sharePost(post),
          );
        },
      ),
    );
  }

  Widget _buildChatsFeed() {
    if (_isLoadingChats) {
      return const Center(child: CircularProgressIndicator(color: LiveColors.accentPink));
    }

    return RefreshIndicator(
      color: LiveColors.accentPink,
      onRefresh: () async => _loadFeeds(),
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // Top Action Card: Start New Conversation
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  LiveColors.accentPurple.withValues(alpha: 0.25),
                  LiveColors.accentPink.withValues(alpha: 0.25),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: LiveColors.accentPink.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: const BoxDecoration(
                    gradient: LiveColors.primaryGradient,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.person_add_alt_1_rounded, color: Colors.white, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Direct Messaging'.tr,
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Chat 1-on-1 with anyone in the community'.tr,
                        style: GoogleFonts.plusJakartaSans(
                          color: LiveColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: _openNewChatSheet,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: LiveColors.accentPink,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    elevation: 0,
                  ),
                  child: Text('New Chat'.tr, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          // Community Quick Chat Avatars Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Active Community Members'.tr,
                style: GoogleFonts.plusJakartaSans(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
              GestureDetector(
                onTap: _openNewChatSheet,
                child: Text(
                  'View All'.tr,
                  style: GoogleFonts.plusJakartaSans(
                    color: LiveColors.accentPink,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Horizontal member avatars row
          SizedBox(
            height: 82,
            child: _communityMembers.isEmpty
                ? Center(
                    child: Text(
                      'No other members active right now'.tr,
                      style: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 12),
                    ),
                  )
                : ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _communityMembers.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (context, idx) {
                      final m = _communityMembers[idx];
                      final mName = m['displayName'] ?? m['username'] ?? 'User';
                      final mVip = m['vipLevel'] as int? ?? 0;
                      return GestureDetector(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => DirectChatScreen(targetUser: m),
                            ),
                          ).then((_) => _loadFeeds());
                        },
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            UserAvatarWithFrame(
                              avatarUrl: m['avatarUrl'],
                              vipLevel: mVip,
                              size: 48,
                              showBadge: true,
                            ),
                            const SizedBox(height: 4),
                            SizedBox(
                              width: 56,
                              child: Text(
                                mName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.center,
                                style: GoogleFonts.plusJakartaSans(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),

          const SizedBox(height: 18),

          // Conversations List Header
          Text(
            'Recent Conversations'.tr,
            style: GoogleFonts.plusJakartaSans(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 10),

          if (_conversations.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 36),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.mark_chat_unread_outlined, size: 48, color: LiveColors.textSecondary.withValues(alpha: 0.5)),
                    const SizedBox(height: 12),
                    Text(
                      'No active conversations'.tr,
                      style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Tap "New Chat" above to start messaging someone!'.tr,
                      style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 12),
                    ),
                  ],
                ),
              ),
            )
          else
            ..._conversations.map((conv) {
              final Map<String, dynamic> user;
              if (conv['user'] is Map) {
                user = Map<String, dynamic>.from(conv['user'] as Map);
              } else {
                user = {
                  'id': conv['partnerId'] ?? conv['id'],
                  'displayName': conv['partnerName'] ?? conv['displayName'] ?? conv['username'] ?? 'User',
                  'username': conv['partnerUsername'] ?? conv['username'],
                  'avatarUrl': conv['partnerAvatar'] ?? conv['avatarUrl'],
                  'vipLevel': conv['partnerVipLevel'] ?? conv['vipLevel'] ?? 0,
                  'customId': conv['partnerCustomId'] ?? conv['customId'],
                };
              }

              final String lastContent;
              if (conv['lastMessage'] is Map) {
                final lastMsg = conv['lastMessage'] as Map;
                lastContent = lastMsg['content']?.toString() ??
                    (lastMsg['imageUrl'] != null ? '📷 [Photo]' : '');
              } else if (conv['lastMessage'] != null) {
                lastContent = conv['lastMessage'].toString();
              } else {
                lastContent = '';
              }

              final uName = user['displayName']?.toString() ?? user['username']?.toString() ?? 'User';
              final uVip = (user['vipLevel'] is int)
                  ? user['vipLevel'] as int
                  : int.tryParse(user['vipLevel']?.toString() ?? '0') ?? 0;
              final customId = user['customId']?.toString();
              final unread = (conv['unreadCount'] is int)
                  ? conv['unreadCount'] as int
                  : int.tryParse(conv['unreadCount']?.toString() ?? '0') ?? 0;

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: LiveColors.backgroundSurface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: LiveColors.borderSubtle),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  leading: UserAvatarWithFrame(
                    avatarUrl: user['avatarUrl'],
                    vipLevel: uVip,
                    size: 46,
                    showBadge: true,
                  ),
                  title: Row(
                    children: [
                      Flexible(
                        child: Text(
                          uName,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.plusJakartaSans(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      if (uVip >= 1) ...[
                        const SizedBox(width: 5),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)]),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: Text('VIP $uVip', style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold)),
                        ),
                      ],
                      if (customId != null && customId.isNotEmpty) ...[
                        const SizedBox(width: 5),
                        Text(
                          customId,
                          style: GoogleFonts.firaCode(color: LiveColors.accentPink, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ],
                  ),
                  subtitle: Text(
                    lastContent.isEmpty ? 'Started a chat'.tr : lastContent,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.plusJakartaSans(
                      color: unread > 0 ? Colors.white : LiveColors.textSecondary,
                      fontSize: 12,
                      fontWeight: unread > 0 ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                  trailing: unread > 0
                      ? Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                            color: LiveColors.accentPink,
                            shape: BoxShape.circle,
                          ),
                          child: Text(
                            '$unread',
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        )
                      : const Icon(Icons.arrow_forward_ios_rounded, color: LiveColors.textSecondary, size: 14),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => DirectChatScreen(targetUser: user),
                      ),
                    ).then((_) => _loadFeeds());
                  },
                ),
              );
            }),
        ],
      ),
    );
  }

  void _openNewChatSheet() {
    final searchController = TextEditingController();
    List<Map<String, dynamic>> filtered = List.from(_communityMembers);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return Container(
              height: MediaQuery.of(context).size.height * 0.75,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Column(
                children: [
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.white24,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Text(
                        'Start a Conversation'.tr,
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
                        icon: const Icon(Icons.close, color: Colors.white70),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: LiveColors.backgroundInput,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: LiveColors.borderSubtle),
                    ),
                    child: TextField(
                      controller: searchController,
                      style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Search community users...'.tr,
                        hintStyle: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 13),
                        icon: const Icon(Icons.search, color: LiveColors.textSecondary, size: 20),
                        border: InputBorder.none,
                      ),
                      onChanged: (q) {
                        setSheetState(() {
                          if (q.trim().isEmpty) {
                            filtered = List.from(_communityMembers);
                          } else {
                            final lower = q.toLowerCase();
                            filtered = _communityMembers.where((m) {
                              final name = (m['displayName'] ?? '').toString().toLowerCase();
                              final user = (m['username'] ?? '').toString().toLowerCase();
                              return name.contains(lower) || user.contains(lower);
                            }).toList();
                          }
                        });
                      },
                    ),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: filtered.isEmpty
                        ? Center(
                            child: Text(
                              'No members found'.tr,
                              style: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 13),
                            ),
                          )
                        : ListView.separated(
                            itemCount: filtered.length,
                            separatorBuilder: (_, __) => const Divider(color: LiveColors.borderSubtle, height: 1),
                            itemBuilder: (context, idx) {
                              final m = filtered[idx];
                              final mName = m['displayName'] ?? m['username'] ?? 'User';
                              final mVip = m['vipLevel'] as int? ?? 0;
                              final mCustomId = m['customId']?.toString();

                              return ListTile(
                                contentPadding: const EdgeInsets.symmetric(vertical: 4),
                                leading: UserAvatarWithFrame(
                                  avatarUrl: m['avatarUrl'],
                                  vipLevel: mVip,
                                  size: 42,
                                  showBadge: true,
                                ),
                                title: Row(
                                  children: [
                                    Flexible(
                                      child: Text(
                                        mName,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.plusJakartaSans(
                                          color: Colors.white,
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    if (mVip >= 1) ...[
                                      const SizedBox(width: 5),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                        decoration: BoxDecoration(
                                          gradient: const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)]),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          'VIP $mVip',
                                          style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                subtitle: Text(
                                  mCustomId != null && mCustomId.isNotEmpty ? 'ID: $mCustomId' : '@${m['username'] ?? 'user'}',
                                  style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 12),
                                ),
                                trailing: ElevatedButton(
                                  onPressed: () {
                                    Navigator.pop(ctx);
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => DirectChatScreen(targetUser: m),
                                      ),
                                    ).then((_) => _loadFeeds());
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: LiveColors.accentPink,
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    elevation: 0,
                                  ),
                                  child: Text('Chat'.tr, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.bold)),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildEmptyFeed(String title, String subtitle, String type) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: LiveColors.backgroundSurface,
                shape: BoxShape.circle,
                border: Border.all(color: LiveColors.borderSubtle),
              ),
              child: Icon(
                type == 'VIDEO' ? Icons.video_collection_outlined : Icons.add_photo_alternate_outlined,
                color: LiveColors.accentPink,
                size: 44,
              ),
            ),
            const SizedBox(height: 16),
            Text(title, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 6),
            Text(subtitle, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 13), textAlign: TextAlign.center),
            const SizedBox(height: 20),
            GestureDetector(
              onTap: _openCreatePost,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                decoration: BoxDecoration(
                  gradient: LiveColors.primaryGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: LiveColors.accentPink.withValues(alpha: 0.35),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.add_rounded, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Upload ${type == 'VIDEO' ? 'Clip' : 'Moment'}',
                      style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// ==========================================
/// PHOTO POST CARD (INSTAGRAM-STYLE)
/// ==========================================
class _PhotoPostCard extends StatefulWidget {
  final Map<String, dynamic> post;
  final VoidCallback onLike;
  final VoidCallback onFollow;
  final VoidCallback onComment;
  final VoidCallback onShare;

  const _PhotoPostCard({
    required this.post,
    required this.onLike,
    required this.onFollow,
    required this.onComment,
    required this.onShare,
  });

  @override
  State<_PhotoPostCard> createState() => _PhotoPostCardState();
}

class _PhotoPostCardState extends State<_PhotoPostCard> with SingleTickerProviderStateMixin {
  bool _showHeartOverlay = false;
  late AnimationController _heartAnimController;

  @override
  void initState() {
    super.initState();
    _heartAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
  }

  @override
  void dispose() {
    _heartAnimController.dispose();
    super.dispose();
  }

  void _triggerDoubleTapLike() {
    if (widget.post['isLiked'] != true) {
      widget.onLike();
    }
    setState(() => _showHeartOverlay = true);
    _heartAnimController.forward(from: 0).then((_) {
      if (mounted) setState(() => _showHeartOverlay = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final author = widget.post['author'] as Map<String, dynamic>? ?? {};
    final currentUserId = AuthService().currentUser?.id;
    final isSelf = currentUserId == widget.post['authorId'];
    final isFollowing = widget.post['isFollowingAuthor'] == true;
    final isLiked = widget.post['isLiked'] == true;
    final likesCount = widget.post['likesCount'] as int? ?? 0;
    final commentsCount = widget.post['commentsCount'] as int? ?? 0;
    final sharesCount = widget.post['sharesCount'] as int? ?? 0;
    final avatar = author['avatarUrl'] as String?;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: LiveColors.backgroundSurface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: LiveColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Author details & Follow button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => UserContentScreen(
                          userId: widget.post['authorId'],
                          displayName: author['displayName'],
                        ),
                      ),
                    );
                  },
                  child: UserAvatarWithFrame(
                    avatarUrl: avatar,
                    level: (author['level'] as num?)?.toInt() ?? 1,
                    size: 38,
                    showBadge: false,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => UserContentScreen(
                            userId: widget.post['authorId'],
                            displayName: author['displayName'],
                          ),
                        ),
                      );
                    },
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                author['displayName'] ?? 'Creator',
                                style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          '@${author['username'] ?? 'user'}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11),
                          ),
                      ],
                    ),
                  ),
                ),
                if (!isSelf)
                  GestureDetector(
                    onTap: widget.onFollow,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        gradient: isFollowing ? null : LiveColors.primaryGradient,
                        color: isFollowing ? LiveColors.backgroundInput : null,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isFollowing ? LiveColors.border : Colors.transparent,
                        ),
                      ),
                      child: Text(
                        isFollowing ? 'Following'.tr : '+ Follow'.tr,
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Photo Media (with double-tap to like)
          GestureDetector(
            onDoubleTap: _triggerDoubleTapLike,
            child: Stack(
              alignment: Alignment.center,
              children: [
                ClipRRect(
                  child: AspectRatio(
                    aspectRatio: 1.0,
                    child: CachedNetworkImage(
                      imageUrl: widget.post['mediaUrl'] ?? '',
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(
                        color: LiveColors.backgroundInput,
                        child: const Center(
                          child: CircularProgressIndicator(color: LiveColors.accentPink, strokeWidth: 2),
                        ),
                      ),
                      errorWidget: (context, url, error) => Container(
                        color: LiveColors.backgroundInput,
                        child: const Center(
                          child: Icon(Icons.broken_image, color: Colors.white38, size: 48),
                        ),
                      ),
                    ),
                  ),
                ),

                // Animated Heart Overlay on Double Tap
                if (_showHeartOverlay)
                  ScaleTransition(
                    scale: Tween<double>(begin: 0.5, end: 1.3).animate(
                      CurvedAnimation(parent: _heartAnimController, curve: Curves.elasticOut),
                    ),
                    child: const Icon(
                      Icons.favorite,
                      color: LiveColors.accentPink,
                      size: 90,
                    ),
                  ),
              ],
            ),
          ),

          // Action Buttons Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                GestureDetector(
                  onTap: widget.onLike,
                  child: Row(
                    children: [
                      Icon(
                        isLiked ? Icons.favorite : Icons.favorite_border,
                        color: isLiked ? LiveColors.accentPink : LiveColors.textSecondary,
                        size: 24,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        '$likesCount',
                        style: GoogleFonts.plusJakartaSans(
                          color: isLiked ? LiveColors.accentPink : LiveColors.textSecondary,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 18),
                GestureDetector(
                  onTap: widget.onComment,
                  child: Row(
                    children: [
                      const Icon(Icons.chat_bubble_outline, color: LiveColors.textSecondary, size: 22),
                      const SizedBox(width: 5),
                      Text(
                        '$commentsCount',
                        style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 18),
                GestureDetector(
                  onTap: widget.onShare,
                  child: Row(
                    children: [
                      const Icon(Icons.share_outlined, color: LiveColors.textSecondary, size: 22),
                      const SizedBox(width: 5),
                      Text(
                        '$sharesCount',
                        style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Text(
                  widget.post['createdAt'] != null
                      ? _formatTimeAgo(widget.post['createdAt'])
                      : '',
                  style: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 11),
                ),
              ],
            ),
          ),

          // Caption & Comments Link
          if (widget.post['caption'] != null && (widget.post['caption'] as String).isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 14, right: 14, bottom: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    author['displayName'] ?? 'user',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 2),
                  TranslatedText(
                    text: widget.post['caption'] as String,
                    style: GoogleFonts.plusJakartaSans(fontSize: 13, color: Colors.white70),
                  ),
                ],
              ),
            ),

          if (commentsCount > 0)
            Padding(
              padding: const EdgeInsets.only(left: 14, right: 14, bottom: 10),
              child: GestureDetector(
                onTap: widget.onComment,
                child: Text(
                  '${AppLocaleService().t('social_view_all_comments')} ($commentsCount)',
                  style: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 12),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// ==========================================
/// VIDEO POST CARD (REELS/TIKTOK STYLE)
/// ==========================================
class _VideoPostCard extends StatefulWidget {
  final Map<String, dynamic> post;
  final VoidCallback onLike;
  final VoidCallback onFollow;
  final VoidCallback onComment;
  final VoidCallback onShare;

  const _VideoPostCard({
    required this.post,
    required this.onLike,
    required this.onFollow,
    required this.onComment,
    required this.onShare,
  });

  @override
  State<_VideoPostCard> createState() => _VideoPostCardState();
}

class _VideoPostCardState extends State<_VideoPostCard> {
  @override
  Widget build(BuildContext context) {
    final author = widget.post['author'] as Map<String, dynamic>? ?? {};
    final currentUserId = AuthService().currentUser?.id;
    final isSelf = currentUserId == widget.post['authorId'];
    final isFollowing = widget.post['isFollowingAuthor'] == true;
    final isLiked = widget.post['isLiked'] == true;
    final likesCount = widget.post['likesCount'] as int? ?? 0;
    final commentsCount = widget.post['commentsCount'] as int? ?? 0;
    final sharesCount = widget.post['sharesCount'] as int? ?? 0;
    final avatar = author['avatarUrl'] as String?;
    final thumbnailUrl = widget.post['thumbnailUrl'] as String?;
    final mediaUrl = widget.post['mediaUrl'] as String? ?? '';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: LiveColors.backgroundSurface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: LiveColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              children: [
                UserAvatarWithFrame(
                  avatarUrl: avatar,
                  level: (author['level'] as num?)?.toInt() ?? 1,
                  size: 38,
                  showBadge: false,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              author['displayName'] ?? 'Creator',
                              style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),

                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              gradient: LiveColors.callButtonGradient,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              '🎬 Reel',
                              style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      if (author['customId'] != null && (author['customId'] as String).isNotEmpty)
                        Text(
                          '👑 ID: ${author['customId']}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.plusJakartaSans(color: const Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.bold),
                        )
                      else
                        Text(
                          '@${author['username'] ?? 'user'}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11),
                        ),
                    ],
                  ),
                ),
                if (!isSelf)
                  GestureDetector(
                    onTap: widget.onFollow,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        gradient: isFollowing ? null : LiveColors.primaryGradient,
                        color: isFollowing ? LiveColors.backgroundInput : null,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isFollowing ? LiveColors.border : Colors.transparent,
                        ),
                      ),
                      child: Text(
                        isFollowing ? 'Following'.tr : '+ Follow'.tr,
                        style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // In-App Video Player (Plays inside app with Play/Pause, Seekbar, Mute/Unmute)
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(
              height: 420,
              width: double.infinity,
              child: AppVideoPlayer(
                videoUrl: mediaUrl,
                thumbnailUrl: thumbnailUrl,
                looping: true,
                autoPlay: false,
              ),
            ),
          ),

          // Action Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                GestureDetector(
                  onTap: widget.onLike,
                  child: Row(
                    children: [
                      Icon(
                        isLiked ? Icons.favorite : Icons.favorite_border,
                        color: isLiked ? LiveColors.accentPink : LiveColors.textSecondary,
                        size: 24,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        '$likesCount',
                        style: GoogleFonts.plusJakartaSans(
                          color: isLiked ? LiveColors.accentPink : LiveColors.textSecondary,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 18),
                GestureDetector(
                  onTap: widget.onComment,
                  child: Row(
                    children: [
                      const Icon(Icons.chat_bubble_outline, color: LiveColors.textSecondary, size: 22),
                      const SizedBox(width: 5),
                      Text(
                        '$commentsCount',
                        style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 18),
                GestureDetector(
                  onTap: widget.onShare,
                  child: Row(
                    children: [
                      const Icon(Icons.share_outlined, color: LiveColors.textSecondary, size: 22),
                      const SizedBox(width: 5),
                      Text(
                        '$sharesCount',
                        style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Text(
                  widget.post['createdAt'] != null
                      ? _formatTimeAgo(widget.post['createdAt'])
                      : '',
                  style: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 11),
                ),
              ],
            ),
          ),

          if (widget.post['caption'] != null && (widget.post['caption'] as String).isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 14, right: 14, bottom: 8),
              child: TranslatedText(
                text: widget.post['caption'] as String,
                style: GoogleFonts.plusJakartaSans(color: Colors.white70, fontSize: 13),
              ),
            ),
        ],
      ),
    );
  }
}

/// ==========================================
/// NESTED COMMENT TREE BOTTOM SHEET
/// ==========================================
class _CommentsBottomSheet extends StatefulWidget {
  final Map<String, dynamic> post;
  final ValueChanged<int> onCommentsCountUpdated;

  const _CommentsBottomSheet({
    required this.post,
    required this.onCommentsCountUpdated,
  });

  @override
  State<_CommentsBottomSheet> createState() => _CommentsBottomSheetState();
}

class _CommentsBottomSheetState extends State<_CommentsBottomSheet> {
  final TextEditingController _textController = TextEditingController();
  List<Map<String, dynamic>> _comments = [];
  bool _isLoading = true;
  String? _replyingToParentId;
  String? _replyingToAuthorName;

  @override
  void initState() {
    super.initState();
    _loadComments();
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _loadComments() async {
    final list = await ApiService().getPostComments(widget.post['id']);
    if (mounted) {
      setState(() {
        _comments = list;
        _isLoading = false;
      });
    }
  }

  int _countAllComments() {
    int total = _comments.length;
    for (final c in _comments) {
      final replies = c['replies'] as List<dynamic>? ?? [];
      total += replies.length;
    }
    return total;
  }

  Future<void> _submitComment() async {
    final currentUser = AuthService().currentUser;
    if (currentUser == null) return;

    final content = _textController.text.trim();
    if (content.isEmpty) return;

    _textController.clear();
    final parentId = _replyingToParentId;

    setState(() {
      _replyingToParentId = null;
      _replyingToAuthorName = null;
    });

    try {
      final res = await ApiService().addPostComment(
        widget.post['id'],
        authorId: currentUser.id,
        content: content,
        parentId: parentId,
      );

      if (res != null && mounted) {
        await _loadComments();
        widget.onCommentsCountUpdated(_countAllComments());
      }
    } catch (_) {}
  }

  Future<void> _deleteComment(String commentId) async {
    final currentUser = AuthService().currentUser;
    if (currentUser == null) return;

    final deleted = await ApiService().deletePostComment(commentId, currentUser.id);
    if (deleted && mounted) {
      await _loadComments();
      widget.onCommentsCountUpdated(_countAllComments());
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        height: MediaQuery.of(context).size.height * 0.75,
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Column(
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 8, bottom: 4),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: LiveColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${AppLocaleService().t('social_comments')} (${_countAllComments()})',
                    style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: LiveColors.textSecondary, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(color: LiveColors.border, height: 1),

            // Comments List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: LiveColors.accentPink))
                  : _comments.isEmpty
                      ? Center(
                          child: Text(
                            AppLocaleService().t('social_no_comments'),
                            style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 13),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          itemCount: _comments.length,
                          itemBuilder: (context, idx) {
                            final comment = _comments[idx];
                            final replies = (comment['replies'] as List<dynamic>?) ?? [];

                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Parent Comment
                                _buildCommentTile(comment, isReply: false),

                                // Indented Replies (Comment Tree)
                                if (replies.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(left: 38),
                                    child: Column(
                                      children: replies.map((r) {
                                        return _buildCommentTile(Map<String, dynamic>.from(r), isReply: true);
                                      }).toList(),
                                    ),
                                  ),
                              ],
                            );
                          },
                        ),
            ),

            // Replying banner
            if (_replyingToParentId != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                color: LiveColors.backgroundInput,
                child: Row(
                  children: [
                    Text(
                      '${'Replying to'.tr} ${_replyingToAuthorName ?? 'comment'.tr}',
                      style: GoogleFonts.plusJakartaSans(color: LiveColors.accentPink, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                    const Spacer(),
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          _replyingToParentId = null;
                          _replyingToAuthorName = null;
                        });
                      },
                      child: const Icon(Icons.close, color: LiveColors.textSecondary, size: 16),
                    ),
                  ],
                ),
              ),

            // Input Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: const BoxDecoration(
                color: LiveColors.backgroundSurface,
                border: Border(top: BorderSide(color: LiveColors.border)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: LiveColors.backgroundInput,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: LiveColors.border),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: TextField(
                        controller: _textController,
                        style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 13),
                        decoration: InputDecoration(
                          hintText: _replyingToParentId != null
                              ? 'Write a reply...'.tr
                              : 'Add a comment...'.tr,
                          hintStyle: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 13),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: _submitComment,
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LiveColors.callButtonGradient,
                      ),
                      child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCommentTile(Map<String, dynamic> c, {required bool isReply}) {
    final author = c['author'] as Map<String, dynamic>? ?? {};
    final currentUserId = AuthService().currentUser?.id;
    final isSelf = currentUserId == c['authorId'];
    final avatar = author['avatarUrl'] as String?;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          UserAvatarWithFrame(
            avatarUrl: avatar,
            size: isReply ? 26 : 34,
            showBadge: false,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        author['displayName'] ?? 'User',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),

                    const Spacer(),
                    Text(
                      c['createdAt'] != null ? _formatTimeAgo(c['createdAt']) : '',
                      style: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 10),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                TranslatedText(
                  text: c['content'] ?? '',
                  style: GoogleFonts.plusJakartaSans(color: Colors.white70, fontSize: 12),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    if (!isReply)
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _replyingToParentId = c['id'];
                            _replyingToAuthorName = author['displayName'] ?? 'user';
                          });
                        },
                        child: Text(
                          'Reply'.tr,
                          style: GoogleFonts.plusJakartaSans(color: LiveColors.accentPink, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    if (isSelf) ...[
                      const SizedBox(width: 14),
                      GestureDetector(
                        onTap: () => _deleteComment(c['id']),
                        child: Text(
                          'Delete'.tr,
                          style: GoogleFonts.plusJakartaSans(color: Colors.redAccent, fontSize: 11),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

String _formatTimeAgo(String dateStr) {
  try {
    final date = DateTime.parse(dateStr).toLocal();
    final diff = DateTime.now().difference(date);
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${date.day}/${date.month}';
  } catch (_) {
    return '';
  }
}
