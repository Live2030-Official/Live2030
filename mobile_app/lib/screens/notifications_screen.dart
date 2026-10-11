import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../localization/app_locale_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    final data = await ApiService().getNotifications(limit: 60);
    final list = (data['notifications'] as List?) ?? [];
    if (mounted) {
      setState(() {
        _items = List<Map<String, dynamic>>.from(list);
        _isLoading = false;
      });
    }
  }

  Future<void> _markAllRead() async {
    await ApiService().markAllNotificationsRead();
    if (!mounted) return;
    setState(() {
      _items = _items.map((n) => {...n, 'isRead': true}).toList();
    });
  }

  Future<void> _onTap(Map<String, dynamic> n) async {
    if (n['isRead'] != true) {
      await ApiService().markNotificationRead(n['id'].toString());
      if (mounted) setState(() => n['isRead'] = true);
    }
  }

  IconData _iconFor(String? type) {
    switch ((type ?? '').toUpperCase()) {
      case 'WARNING':
        return Icons.warning_amber_rounded;
      case 'LIKE':
        return Icons.favorite_rounded;
      case 'COMMENT':
        return Icons.mode_comment_rounded;
      case 'FOLLOW':
        return Icons.person_add_alt_1_rounded;
      case 'GIFT':
        return Icons.card_giftcard_rounded;
      case 'LEVEL_UP':
        return Icons.workspace_premium_rounded;
      default:
        return Icons.notifications_rounded;
    }
  }

  Color _colorFor(String? type) {
    switch ((type ?? '').toUpperCase()) {
      case 'WARNING':
        return const Color(0xFFF97316);
      case 'LIKE':
        return LiveColors.accentPink;
      case 'GIFT':
        return LiveColors.gold;
      case 'FOLLOW':
        return LiveColors.accentBlue;
      case 'LEVEL_UP':
        return LiveColors.accentPurple;
      default:
        return LiveColors.accentPurple;
    }
  }

  String _timeAgo(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return '';
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now'.tr;
    if (diff.inMinutes < 60) return '${diff.inMinutes}m'.tr;
    if (diff.inHours < 24) return '${diff.inHours}h'.tr;
    if (diff.inDays < 7) return '${diff.inDays}d'.tr;
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final unread = _items.where((n) => n['isRead'] != true).length;
    return Scaffold(
      backgroundColor: LiveColors.background,
      appBar: AppBar(
        backgroundColor: LiveColors.backgroundElevated,
        elevation: 0,
        title: Text('Notifications'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 17)),
        actions: [
          if (unread > 0)
            TextButton(
              onPressed: _markAllRead,
              child: Text('Mark all read'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.accentPink, fontSize: 12, fontWeight: FontWeight.bold)),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: LiveColors.accentPink,
        backgroundColor: LiveColors.backgroundSurface,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: LiveColors.accentPink))
            : _items.isEmpty
                ? ListView(
                    children: [
                      SizedBox(height: MediaQuery.of(context).size.height * 0.3),
                      const Icon(Icons.notifications_off_rounded, color: LiveColors.textMuted, size: 56),
                      const SizedBox(height: 12),
                      Center(child: Text('No notifications yet'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 14))),
                    ],
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(14),
                    itemCount: _items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (ctx, i) {
                      final n = _items[i];
                      final read = n['isRead'] == true;
                      return InkWell(
                        onTap: () => _onTap(n),
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: read ? LiveColors.backgroundSurface : LiveColors.backgroundElevated,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: read ? LiveColors.borderSubtle : LiveColors.borderGlow.withValues(alpha: 0.6)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(9),
                                decoration: BoxDecoration(
                                  color: _colorFor(n['type']?.toString()).withValues(alpha: 0.18),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(_iconFor(n['type']?.toString()), color: _colorFor(n['type']?.toString()), size: 20),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            n['title']?.toString() ?? '',
                                            style: GoogleFonts.plusJakartaSans(
                                              color: Colors.white,
                                              fontWeight: read ? FontWeight.w600 : FontWeight.w800,
                                              fontSize: 14,
                                            ),
                                          ),
                                        ),
                                        if (!read)
                                          Container(width: 8, height: 8, decoration: const BoxDecoration(color: LiveColors.accentPink, shape: BoxShape.circle)),
                                      ],
                                    ),
                                    if ((n['body']?.toString() ?? '').isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Text(n['body'].toString(), style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 12.5, height: 1.4)),
                                    ],
                                    const SizedBox(height: 6),
                                    Text(_timeAgo(n['createdAt']?.toString()), style: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 11)),
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
    );
  }
}
