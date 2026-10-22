import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../widgets/user_avatar_with_frame.dart';

/// Manage the signed-in user's block list. Backed by
/// `GET /api/users/blocked` and `POST /api/users/unblock/:id`.
class BlockedUsersScreen extends StatefulWidget {
  const BlockedUsersScreen({super.key});

  @override
  State<BlockedUsersScreen> createState() => _BlockedUsersScreenState();
}

class _BlockedUsersScreenState extends State<BlockedUsersScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _blocked = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    final rows = await ApiService().getBlockedUsers();
    if (!mounted) return;
    setState(() {
      _blocked = rows;
      _isLoading = false;
    });
  }

  Future<void> _unblock(Map<String, dynamic> user) async {
    final id = user['id']?.toString() ?? '';
    if (id.isEmpty) return;
    final ok = await ApiService().unblockUser(id);
    if (!mounted) return;
    if (ok) {
      setState(() => _blocked.removeWhere((u) => u['id']?.toString() == id));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: LiveColors.backgroundElevated,
          content: Text('Unblocked ${user['displayName'] ?? user['username'] ?? 'user'}.'),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Colors.redAccent,
          content: Text('Could not unblock this user. Please try again.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LiveColors.background,
      appBar: AppBar(
        backgroundColor: LiveColors.background,
        elevation: 0,
        title: const Text('Blocked Users'),
      ),
      body: RefreshIndicator(
        color: LiveColors.accentPink,
        onRefresh: _load,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: LiveColors.accentPink))
            : _blocked.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(height: MediaQuery.of(context).size.height * 0.2),
                      const Icon(Icons.block_rounded, color: Colors.white24, size: 56),
                      const SizedBox(height: 12),
                      const Center(
                        child: Text(
                          'You have not blocked anyone.',
                          style: TextStyle(color: Colors.white54, fontSize: 13),
                        ),
                      ),
                    ],
                  )
                : ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    itemCount: _blocked.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final user = _blocked[index];
                      return Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: LiveColors.backgroundSurface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white10),
                        ),
                        child: Row(
                          children: [
                            UserAvatarWithFrame(
                              avatarUrl: user['avatarUrl']?.toString(),
                              vipLevel: (user['vipLevel'] as num?)?.toInt() ?? 0,
                              size: 42,
                              showBadge: true,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    user['displayName']?.toString() ??
                                        user['username']?.toString() ??
                                        'User',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '@${user['username'] ?? 'user'}',
                                    style: const TextStyle(color: Colors.white54, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                            TextButton(
                              onPressed: () => _unblock(user),
                              style: TextButton.styleFrom(
                                foregroundColor: LiveColors.accentPink,
                              ),
                              child: const Text('Unblock'),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
