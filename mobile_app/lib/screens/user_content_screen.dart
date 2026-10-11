import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../theme/app_theme.dart';
import '../widgets/app_video_player.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import 'create_post_screen.dart';
import '../localization/app_locale_service.dart';
import '../localization/translated_text.dart';

class UserContentScreen extends StatefulWidget {
  final String userId;
  final String? displayName;

  const UserContentScreen({
    super.key,
    required this.userId,
    this.displayName,
  });

  @override
  State<UserContentScreen> createState() => _UserContentScreenState();
}

class _UserContentScreenState extends State<UserContentScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _allPosts = [];
  String _activeFilter = 'ALL'; // 'ALL', 'PHOTO', 'VIDEO'

  @override
  void initState() {
    super.initState();
    _recordProfileVisit();
    _loadUserPosts();
  }

  void _recordProfileVisit() {
    final currentUserId = AuthService().currentUser?.id;
    if (currentUserId != null && currentUserId != widget.userId) {
      ApiService().recordProfileVisitor(
        profileId: widget.userId,
        visitorId: currentUserId,
      );
    }
  }

  Future<void> _loadUserPosts() async {
    setState(() => _isLoading = true);
    final currentUserId = AuthService().currentUser?.id;
    final res = await ApiService().getUserPosts(widget.userId, currentUserId: currentUserId);
    if (mounted) {
      setState(() {
        _allPosts = List<Map<String, dynamic>>.from(res['posts'] ?? []);
        _isLoading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filteredPosts {
    if (_activeFilter == 'PHOTO') {
      return _allPosts.where((p) => p['type'] == 'PHOTO').toList();
    } else if (_activeFilter == 'VIDEO') {
      return _allPosts.where((p) => p['type'] == 'VIDEO').toList();
    }
    return _allPosts;
  }

  void _openPostDetail(Map<String, dynamic> post) {
    final currentUserId = AuthService().currentUser?.id;
    final isSelf = currentUserId == post['authorId'];
    final isVideo = post['type'] == 'VIDEO';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDetailState) {
          final isLiked = post['isLiked'] == true;
          final likesCount = post['likesCount'] as int? ?? 0;
          final commentsCount = post['commentsCount'] as int? ?? 0;

          return SafeArea(
            child: Container(
              height: MediaQuery.of(ctx).size.height * 0.85,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            isVideo ? Icons.videocam : Icons.photo,
                            color: isVideo ? const Color(0xFFEC4899) : const Color(0xFF6366F1),
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            isVideo ? 'Video Post'.tr : 'Photo Post'.tr,
                            style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          if (isSelf)
                            IconButton(
                              icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 22),
                              tooltip: 'Delete Post'.tr,
                              onPressed: () async {
                                final confirm = await showDialog<bool>(
                                  context: ctx,
                                  builder: (dCtx) => AlertDialog(
                                    backgroundColor: LiveColors.backgroundSurface,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(20),
                                      side: const BorderSide(color: LiveColors.border),
                                    ),
                                    title: Text('Delete Post?'.tr, style: TextStyle(color: Colors.white)),
                                    content: Text('Are you sure you want to remove this post from your profile and feed?'.tr,
                                      style: TextStyle(color: Colors.white70),
                                    ),
                                    actions: [
                                      TextButton(
                                        onPressed: () => Navigator.pop(dCtx, false),
                                        child: Text('Cancel'.tr, style: TextStyle(color: Colors.white60)),
                                      ),
                                      ElevatedButton(
                                        style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
                                        onPressed: () => Navigator.pop(dCtx, true),
                                        child: Text('Delete'.tr, style: TextStyle(color: Colors.white)),
                                      ),
                                    ],
                                  ),
                                );

                                if (confirm == true && currentUserId != null) {
                                  if (ctx.mounted) Navigator.pop(ctx);
                                  final deleted = await ApiService().deletePost(post['id'], currentUserId);
                                  if (deleted && mounted) {
                                    _loadUserPosts();
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Post deleted successfully'.tr)),
                                    );
                                  }
                                }
                              },
                            ),
                          IconButton(
                            icon: const Icon(Icons.close, color: Colors.white70),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  // Media Display
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        color: Colors.black,
                        width: double.infinity,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            if (!isVideo)
                              CachedNetworkImage(
                                imageUrl: post['mediaUrl'] ?? '',
                                fit: BoxFit.contain,
                                placeholder: (context, url) => const Center(
                                  child: CircularProgressIndicator(color: Color(0xFF10B981)),
                                ),
                                errorWidget: (context, url, error) => const Center(
                                  child: Icon(Icons.broken_image, color: Colors.white38, size: 48),
                                ),
                              )
                            else
                              AppVideoPlayer(
                                videoUrl: post['mediaUrl'] ?? '',
                                thumbnailUrl: post['thumbnailUrl'],
                                looping: true,
                                autoPlay: true,
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Actions Row
                  Row(
                    children: [
                      GestureDetector(
                        onTap: () async {
                          if (currentUserId == null) return;
                          final newLiked = !isLiked;
                          final newCount = newLiked ? likesCount + 1 : likesCount - 1;
                          setDetailState(() {
                            post['isLiked'] = newLiked;
                            post['likesCount'] = newCount;
                          });
                          setState(() {});
                          await ApiService().togglePostLike(post['id'], currentUserId);
                        },
                        child: Row(
                          children: [
                            Icon(
                              isLiked ? Icons.favorite : Icons.favorite_border,
                              color: isLiked ? const Color(0xFFEC4899) : Colors.white70,
                              size: 24,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '$likesCount',
                              style: TextStyle(
                                color: isLiked ? const Color(0xFFEC4899) : Colors.white70,
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 20),
                      Row(
                        children: [
                          const Icon(Icons.chat_bubble_outline, color: Colors.white70, size: 22),
                          const SizedBox(width: 6),
                          Text(
                            '$commentsCount',
                            style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ],
                      ),
                      const Spacer(),
                      Text(
                        post['createdAt'] != null
                            ? DateTime.tryParse(post['createdAt'])?.toLocal().toString().split('.')[0] ?? ''
                            : '',
                        style: const TextStyle(color: Colors.white38, fontSize: 11),
                      ),
                    ],
                  ),

                  if (post['caption'] != null && (post['caption'] as String).isNotEmpty) ...[
                    const SizedBox(height: 10),
                    TranslatedText(
                      text: post['caption'] as String,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                    ),
                  ],

                  const SizedBox(height: 8),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.displayName != null ? "${widget.displayName}'s Content" : "My Content & Posts";
    final isSelf = widget.userId == AuthService().currentUser?.id;

    return Scaffold(
      backgroundColor: LiveColors.backgroundPrimary,
      appBar: AppBar(
        backgroundColor: LiveColors.backgroundPrimary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          title,
          style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 17, color: Colors.white),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          if (isSelf)
            IconButton(
              icon: const Icon(Icons.add_photo_alternate_outlined, color: LiveColors.primaryAccent),
              tooltip: 'New Post'.tr,
              onPressed: () async {
                final created = await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CreatePostScreen()),
                );
                if (created == true) {
                  _loadUserPosts();
                }
              },
            ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            tooltip: 'Refresh'.tr,
            onPressed: _loadUserPosts,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips with horizontal scroll protection
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: [
                  _buildFilterChip('ALL', '${'All Posts'.tr} (${_allPosts.length})'),
                  const SizedBox(width: 8),
                  _buildFilterChip('PHOTO', 'Photos 📸'.tr),
                  const SizedBox(width: 8),
                  _buildFilterChip('VIDEO', 'Videos 🎬'.tr),
                ],
              ),
            ),
          ),

          // Grid View
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)))
                : _filteredPosts.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.grid_view_rounded,
                                color: Colors.white24,
                                size: 54,
                              ),
                              const SizedBox(height: 12),
                              Text('No Content Yet'.tr,
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                isSelf
                                    ? 'Upload your first photo or video post to show it here in your personal portfolio!'.tr
                                    : 'This creator has not uploaded any posts yet.'.tr,
                                style: const TextStyle(color: Colors.white54, fontSize: 12),
                                textAlign: TextAlign.center,
                              ),
                              if (isSelf) ...[
                                const SizedBox(height: 18),
                                Container(
                                  decoration: BoxDecoration(
                                    gradient: LiveColors.primaryGradient,
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.transparent,
                                      shadowColor: Colors.transparent,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                                    ),
                                    icon: const Icon(Icons.add, color: Colors.white, size: 20),
                                    label: Text('Create First Post'.tr,
                                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                    ),
                                    onPressed: () async {
                                      final created = await Navigator.push(
                                        context,
                                        MaterialPageRoute(builder: (_) => const CreatePostScreen()),
                                      );
                                      if (created == true) {
                                        _loadUserPosts();
                                      }
                                    },
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(8),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          crossAxisSpacing: 6,
                          mainAxisSpacing: 6,
                          childAspectRatio: 1.0,
                        ),
                        itemCount: _filteredPosts.length,
                        itemBuilder: (context, idx) {
                          final post = _filteredPosts[idx];
                          final isVideo = post['type'] == 'VIDEO';
                          final likes = post['likesCount'] ?? 0;

                          return GestureDetector(
                            onTap: () => _openPostDetail(post),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Stack(
                                fit: StackFit.expand,
                                children: [
                                  if (!isVideo)
                                    CachedNetworkImage(
                                      imageUrl: post['mediaUrl'] ?? '',
                                      fit: BoxFit.cover,
                                      placeholder: (context, url) => Container(
                                        color: const Color(0xFF1F2937),
                                        child: const Center(
                                          child: SizedBox(
                                            width: 20,
                                            height: 20,
                                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white30),
                                          ),
                                        ),
                                      ),
                                      errorWidget: (context, url, error) => Container(
                                        color: const Color(0xFF1F2937),
                                        child: const Icon(Icons.broken_image, color: Colors.white30),
                                      ),
                                    )
                                  else if (post['thumbnailUrl'] != null && (post['thumbnailUrl'] as String).isNotEmpty)
                                    CachedNetworkImage(
                                      imageUrl: post['thumbnailUrl'],
                                      fit: BoxFit.cover,
                                      placeholder: (context, url) => Container(color: const Color(0xFF1F2937)),
                                      errorWidget: (context, url, error) => Container(
                                        color: const Color(0xFF1F2937),
                                        child: const Icon(Icons.videocam, color: Colors.white30),
                                      ),
                                    )
                                  else
                                    Container(
                                      decoration: const BoxDecoration(
                                        gradient: LinearGradient(
                                          colors: [Color(0xFF1E1B4B), Color(0xFF0F172A)],
                                          begin: Alignment.topLeft,
                                          end: Alignment.bottomRight,
                                        ),
                                      ),
                                      child: const Center(
                                        child: Icon(Icons.play_circle_outline, color: Color(0xFFEC4899), size: 36),
                                      ),
                                    ),
                                  // Overlay for likes count & video badge
                                  Positioned(
                                    top: 6,
                                    right: 6,
                                    child: Container(
                                      padding: const EdgeInsets.all(4),
                                      decoration: BoxDecoration(
                                        color: Colors.black54,
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Icon(
                                        isVideo ? Icons.videocam : Icons.photo,
                                        color: Colors.white,
                                        size: 14,
                                      ),
                                    ),
                                  ),
                                  Positioned(
                                    bottom: 4,
                                    left: 6,
                                    child: Row(
                                      children: [
                                        const Icon(Icons.favorite, color: Colors.white70, size: 12),
                                        const SizedBox(width: 3),
                                        Text(
                                          '$likes',
                                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String filter, String label) {
    final isSelected = _activeFilter == filter;
    return GestureDetector(
      onTap: () => setState(() => _activeFilter = filter),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
        decoration: BoxDecoration(
          gradient: isSelected ? LiveColors.primaryGradient : null,
          color: isSelected ? null : LiveColors.backgroundSurface,
          borderRadius: BorderRadius.circular(20),
          border: isSelected ? null : Border.all(color: LiveColors.border),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
