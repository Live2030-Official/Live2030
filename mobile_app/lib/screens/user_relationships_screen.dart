import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../localization/app_locale_service.dart';

class UserRelationshipsScreen extends StatefulWidget {
  final String userId;
  final String displayName;
  final int initialTabIndex; // 0 for Followers, 1 for Following

  const UserRelationshipsScreen({
    super.key,
    required this.userId,
    required this.displayName,
    this.initialTabIndex = 0,
  });

  @override
  State<UserRelationshipsScreen> createState() => _UserRelationshipsScreenState();
}

class _UserRelationshipsScreenState extends State<UserRelationshipsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Map<String, dynamic>> _followers = [];
  List<Map<String, dynamic>> _following = [];
  bool _isLoadingFollowers = true;
  bool _isLoadingFollowing = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTabIndex,
    );
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final currentUserId = AuthService().currentUser?.id;

    ApiService().getUserFollowers(widget.userId, currentUserId: currentUserId).then((data) {
      if (mounted) {
        setState(() {
          _followers = data;
          _isLoadingFollowers = false;
        });
      }
    });

    ApiService().getUserFollowing(widget.userId, currentUserId: currentUserId).then((data) {
      if (mounted) {
        setState(() {
          _following = data;
          _isLoadingFollowing = false;
        });
      }
    });
  }

  Future<void> _toggleFollowUser(Map<String, dynamic> userMap, bool isFollowersList) async {
    final currentUser = AuthService().currentUser;
    if (currentUser == null) return;

    final targetId = userMap['id'] as String;
    final currentStatus = userMap['isFollowing'] == true;

    // Optimistic UI update
    setState(() {
      userMap['isFollowing'] = !currentStatus;
    });

    try {
      final res = await ApiService().toggleFollowUser(targetId, currentUser.id);
      if (res != null && mounted) {
        setState(() {
          userMap['isFollowing'] = res['isFollowing'] == true;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          userMap['isFollowing'] = currentStatus;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
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
          widget.displayName,
          style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 17, color: Colors.white),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: LiveColors.primaryAccent,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: LiveColors.textSecondary,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: [
            Tab(text: '${'Followers'.tr} (${_followers.length})'),
            Tab(text: '${'Following'.tr} (${_following.length})'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Followers
          _buildUserList(_followers, _isLoadingFollowers, isFollowersList: true),

          // Tab 2: Following
          _buildUserList(_following, _isLoadingFollowing, isFollowersList: false),
        ],
      ),
    );
  }

  Widget _buildUserList(List<Map<String, dynamic>> users, bool isLoading, {required bool isFollowersList}) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)));
    }

    if (users.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isFollowersList ? Icons.people_outline : Icons.person_add_outlined,
                color: Colors.white24,
                size: 48,
              ),
              const SizedBox(height: 12),
              Text(
                isFollowersList ? 'No Followers Yet'.tr : 'Not Following Anyone'.tr,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
              ),
              const SizedBox(height: 4),
              Text(
                isFollowersList
                  ? 'When users follow you, they will appear here.'.tr
                  : 'Follow other creators and hosts in the Social feed to see them here.'.tr,
                style: const TextStyle(color: Colors.white54, fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    final currentUserId = AuthService().currentUser?.id;

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: users.length,
      itemBuilder: (context, idx) {
        final u = users[idx];
        final isSelf = u['id'] == currentUserId;
        final isFollowing = u['isFollowing'] == true;
        final avatar = u['avatarUrl'] as String?;

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: LiveColors.backgroundSurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: LiveColors.border),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: LiveColors.backgroundElevated,
                backgroundImage: (avatar != null && avatar.isNotEmpty)
                    ? CachedNetworkImageProvider(avatar)
                    : null,
                child: (avatar == null || avatar.isEmpty)
                    ? const Icon(Icons.person, color: Colors.white70)
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            u['displayName'] ?? 'User',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: LiveColors.accentPurple.withValues(alpha: 0.25),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: LiveColors.accentPurple.withValues(alpha: 0.4)),
                          ),
                          child: Text(
                            'Lv.${u['level'] ?? 1}',
                            style: const TextStyle(color: Color(0xFFC084FC), fontSize: 9, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '@${u['username'] ?? 'user'}',
                      style: const TextStyle(color: LiveColors.textSecondary, fontSize: 11),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              if (!isSelf)
                GestureDetector(
                  onTap: () => _toggleFollowUser(u, isFollowersList),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      gradient: isFollowing ? null : LiveColors.primaryGradient,
                      color: isFollowing ? LiveColors.backgroundElevated : null,
                      borderRadius: BorderRadius.circular(16),
                      border: isFollowing ? Border.all(color: LiveColors.border) : null,
                    ),
                    child: Text(
                      isFollowing ? 'Following'.tr : '+ Follow'.tr,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
