import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../localization/app_locale_service.dart';
import '../widgets/app_video_player.dart';

/// Dedicated full-screen vertical Reels viewer (TikTok style).
/// Swipe up/down to move between reels. Only the active reel auto-plays.
class ReelsViewerScreen extends StatefulWidget {
  final List<Map<String, dynamic>> reels;
  final int initialIndex;

  const ReelsViewerScreen({
    super.key,
    required this.reels,
    this.initialIndex = 0,
  });

  @override
  State<ReelsViewerScreen> createState() => _ReelsViewerScreenState();
}

class _ReelsViewerScreenState extends State<ReelsViewerScreen> {
  late final PageController _pageController;
  late int _currentIndex;
  bool _muted = false;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex.clamp(0, widget.reels.length - 1);
    _pageController = PageController(initialPage: _currentIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _toggleLike(Map<String, dynamic> post) async {
    final currentUser = AuthService().currentUser;
    if (currentUser == null) return;
    final wasLiked = post['isLiked'] == true;
    final prevCount = post['likesCount'] as int? ?? 0;
    setState(() {
      post['isLiked'] = !wasLiked;
      post['likesCount'] = !wasLiked ? prevCount + 1 : (prevCount > 0 ? prevCount - 1 : 0);
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
          post['isLiked'] = wasLiked;
          post['likesCount'] = prevCount;
        });
      }
    }
  }

  Future<void> _toggleFollow(Map<String, dynamic> post) async {
    final currentUser = AuthService().currentUser;
    if (currentUser == null) return;
    final authorId = post['authorId'] as String?;
    if (authorId == null || authorId == currentUser.id) return;
    final wasFollowing = post['isFollowingAuthor'] == true;
    setState(() => post['isFollowingAuthor'] = !wasFollowing);
    try {
      final res = await ApiService().toggleFollowUser(authorId, currentUser.id);
      if (res != null && mounted) {
        post['isFollowingAuthor'] = res['isFollowing'] == true;
        setState(() {});
      }
    } catch (_) {
      if (mounted) setState(() => post['isFollowingAuthor'] = wasFollowing);
    }
  }

  Future<void> _share(Map<String, dynamic> post) async {
    setState(() => post['sharesCount'] = (post['sharesCount'] as int? ?? 0) + 1);
    await ApiService().sharePost(post['id']);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF10B981),
          duration: const Duration(seconds: 2),
          content: Text('Post link shared!'.tr, style: GoogleFonts.plusJakartaSans()),
        ),
      );
    }
  }

  Future<void> _openComments(Map<String, dynamic> post) async {
    final postId = post['id']?.toString() ?? '';
    if (postId.isEmpty) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ReelCommentsSheet(
        postId: postId,
        onCommentAdded: () {
          post['commentsCount'] = (post['commentsCount'] as int? ?? 0) + 1;
          if (mounted) setState(() {});
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.reels.isEmpty) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(child: Text('No reels available', style: TextStyle(color: Colors.white70))),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            scrollDirection: Axis.vertical,
            itemCount: widget.reels.length,
            onPageChanged: (i) => setState(() => _currentIndex = i),
            itemBuilder: (context, index) {
              final post = widget.reels[index];
              final isCurrent = index == _currentIndex;
              return _ReelPage(
                post: post,
                isCurrent: isCurrent,
                muted: _muted,
                onLike: () => _toggleLike(post),
                onFollow: () => _toggleFollow(post),
                onShare: () => _share(post),
                onToggleMute: () => setState(() => _muted = !_muted),
                onComment: () => _openComments(post),
              );
            },
          ),

          // Top bar: back + title
          Positioned(
            top: MediaQuery.of(context).padding.top + 6,
            left: 8,
            right: 12,
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
                  onPressed: () => Navigator.pop(context),
                ),
                Text(
                  'Reels'.tr,
                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_currentIndex + 1}/${widget.reels.length}',
                    style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReelPage extends StatelessWidget {
  final Map<String, dynamic> post;
  final bool isCurrent;
  final bool muted;
  final VoidCallback onLike;
  final VoidCallback onFollow;
  final VoidCallback onShare;
  final VoidCallback onToggleMute;
  final VoidCallback onComment;

  const _ReelPage({
    required this.post,
    required this.isCurrent,
    required this.muted,
    required this.onLike,
    required this.onFollow,
    required this.onShare,
    required this.onToggleMute,
    required this.onComment,
  });

  @override
  Widget build(BuildContext context) {
    final author = post['author'] as Map<String, dynamic>? ?? {};
    final authorName = author['displayName']?.toString() ?? 'Creator';
    final authorUsername = author['username']?.toString() ?? 'user';
    final authorId = post['authorId']?.toString();
    final currentUserId = AuthService().currentUser?.id;
    final isSelf = authorId != null && authorId == currentUserId;
    final isFollowing = post['isFollowingAuthor'] == true;
    final isLiked = post['isLiked'] == true;
    final likesCount = post['likesCount'] as int? ?? 0;
    final commentsCount = post['commentsCount'] as int? ?? 0;
    final sharesCount = post['sharesCount'] as int? ?? 0;
    final caption = post['caption']?.toString() ?? '';
    final mediaUrl = post['mediaUrl']?.toString() ?? '';
    final thumbnailUrl = post['thumbnailUrl']?.toString();

    return GestureDetector(
      onDoubleTap: onLike,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Video (only the active page plays to avoid overlapping audio)
          if (isCurrent && mediaUrl.isNotEmpty)
            AppVideoPlayer(
              key: ValueKey('reel_${post['id']}'),
              videoUrl: mediaUrl,
              thumbnailUrl: thumbnailUrl,
              aspectRatio: 9 / 16,
              autoPlay: true,
              looping: true,
              muted: muted,
            )
          else if (thumbnailUrl != null && thumbnailUrl.isNotEmpty)
            CachedNetworkImage(
              imageUrl: thumbnailUrl,
              fit: BoxFit.cover,
              placeholder: (_, __) => Container(color: const Color(0xFF111827)),
              errorWidget: (_, __, ___) => Container(color: const Color(0xFF111827)),
            )
          else
            Container(color: const Color(0xFF111827)),

          // Bottom gradient for legibility
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: 260,
            child: IgnorePointer(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [Colors.black.withValues(alpha: 0.85), Colors.transparent],
                  ),
                ),
              ),
            ),
          ),

          // Left: author + caption
          Positioned(
            left: 16,
            right: 90,
            bottom: 26,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 18,
                      backgroundColor: LiveColors.accentPurple,
                      backgroundImage: (author['avatarUrl']?.toString().isNotEmpty ?? false)
                          ? NetworkImage(author['avatarUrl'].toString())
                          : null,
                      child: (author['avatarUrl']?.toString().isEmpty ?? true)
                          ? Text(authorName.isNotEmpty ? authorName[0].toUpperCase() : 'U',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))
                          : null,
                    ),
                    const SizedBox(width: 10),
                    Flexible(
                      child: Text(
                        authorName,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ),
                    if (!isSelf) ...[
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: onFollow,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            gradient: isFollowing ? null : LiveColors.primaryGradient,
                            color: isFollowing ? Colors.white24 : null,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            isFollowing ? 'Following'.tr : '+ Follow'.tr,
                            style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  '@$authorUsername',
                  style: GoogleFonts.plusJakartaSans(color: Colors.white70, fontSize: 12),
                ),
                if (caption.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    caption,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 13.5, height: 1.35),
                  ),
                ],
              ],
            ),
          ),

          // Right: action rail
          Positioned(
            right: 12,
            bottom: 30,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _ReelAction(
                  icon: isLiked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                  color: isLiked ? LiveColors.accentPink : Colors.white,
                  label: _formatCount(likesCount),
                  onTap: onLike,
                ),
                const SizedBox(height: 18),
                _ReelAction(
                  icon: Icons.mode_comment_outlined,
                  color: Colors.white,
                  label: _formatCount(commentsCount),
                  onTap: onComment,
                ),
                const SizedBox(height: 18),
                _ReelAction(
                  icon: Icons.share_rounded,
                  color: Colors.white,
                  label: _formatCount(sharesCount),
                  onTap: onShare,
                ),
                const SizedBox(height: 18),
                _ReelAction(
                  icon: muted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                  color: Colors.white,
                  label: '',
                  onTap: onToggleMute,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatCount(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return '$n';
  }
}

class _ReelAction extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final VoidCallback onTap;

  const _ReelAction({required this.icon, required this.color, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(9),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.45),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white24),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          if (label.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              label,
              style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
            ),
          ],
        ],
      ),
    );
  }
}


/// Bottom-sheet comment thread for a Reel. Reuses the social comment API.
class _ReelCommentsSheet extends StatefulWidget {
  final String postId;
  final VoidCallback onCommentAdded;

  const _ReelCommentsSheet({
    required this.postId,
    required this.onCommentAdded,
  });

  @override
  State<_ReelCommentsSheet> createState() => _ReelCommentsSheetState();
}

class _ReelCommentsSheetState extends State<_ReelCommentsSheet> {
  final TextEditingController _controller = TextEditingController();
  bool _isLoading = true;
  bool _isSending = false;
  List<Map<String, dynamic>> _comments = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final rows = await ApiService().getPostComments(widget.postId);
    if (!mounted) return;
    setState(() {
      _comments = rows;
      _isLoading = false;
    });
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    final user = AuthService().currentUser;
    if (text.isEmpty || user == null || _isSending) return;
    setState(() => _isSending = true);
    try {
      final created = await ApiService().addPostComment(
        widget.postId,
        authorId: user.id,
        content: text,
      );
      if (!mounted) return;
      _controller.clear();
      setState(() {
        if (created != null) {
          _comments.add({
            ...created,
            'author': created['author'] ??
                {
                  'id': user.id,
                  'displayName': user.displayName,
                  'username': user.username,
                  'avatarUrl': user.avatarUrl,
                },
          });
        }
        _isSending = false;
      });
      widget.onCommentAdded();
    } catch (_) {
      if (!mounted) return;
      setState(() => _isSending = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Colors.redAccent,
          content: Text('Could not post your comment. Please try again.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        height: MediaQuery.of(context).size.height * 0.62,
        decoration: const BoxDecoration(
          color: LiveColors.backgroundSurface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  const Icon(Icons.mode_comment_outlined, color: Colors.white70, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'Comments',
                    style: GoogleFonts.plusJakartaSans(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            const Divider(color: Colors.white12, height: 20),
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: LiveColors.accentPink),
                    )
                  : _comments.isEmpty
                      ? const Center(
                          child: Text(
                            'Be the first to comment.',
                            style: TextStyle(color: Colors.white54, fontSize: 13),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _comments.length,
                          itemBuilder: (context, index) {
                            final c = _comments[index];
                            final author = c['author'] as Map<String, dynamic>?;
                            final name = author?['displayName']?.toString() ??
                                author?['username']?.toString() ??
                                'User';
                            final avatar = author?['avatarUrl']?.toString();
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  CircleAvatar(
                                    radius: 16,
                                    backgroundColor: LiveColors.accentPurple,
                                    backgroundImage: (avatar != null && avatar.isNotEmpty)
                                        ? NetworkImage(avatar)
                                        : null,
                                    child: (avatar == null || avatar.isEmpty)
                                        ? Text(
                                            name.isNotEmpty ? name[0].toUpperCase() : 'U',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          )
                                        : null,
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          name,
                                          style: const TextStyle(
                                            color: Colors.white70,
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          c['content']?.toString() ?? '',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 13,
                                            height: 1.3,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _send(),
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Add a comment...',
                          hintStyle: const TextStyle(color: Colors.white38),
                          filled: true,
                          fillColor: LiveColors.backgroundInput,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(20),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      onPressed: _isSending ? null : _send,
                      icon: _isSending
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.send_rounded, color: LiveColors.accentPink),
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
