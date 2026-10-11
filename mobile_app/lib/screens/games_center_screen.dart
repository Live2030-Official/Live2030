import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../localization/app_locale_service.dart';
import '../widgets/room_games_modal.dart';
import '../widgets/topup_choice_dialog.dart';

/// Standalone Games Center. Games are loaded live from the backend catalog, so
/// admin enable/disable and VIP/level gates always apply. Works independently of
/// any live stream or audio room.
class GamesCenterScreen extends StatefulWidget {
  const GamesCenterScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const GamesCenterScreen()),
    );
  }

  @override
  State<GamesCenterScreen> createState() => _GamesCenterScreenState();
}

class _GamesCenterScreenState extends State<GamesCenterScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _games = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = AuthService().currentUser;
    List<Map<String, dynamic>> games = [];
    try {
      games = await ApiService().getGamesCatalog(userId: user?.id);
    } catch (_) {
      games = [];
    }
    if (!mounted) return;
    setState(() {
      _games = games;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: Text(
          'Games Center 🎮'.tr,
          style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(
              child: InkWell(
                onTap: () => TopUpChoiceDialog.show(context),
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.monetization_on, color: Color(0xFFFBBF24), size: 14),
                      const SizedBox(width: 5),
                      Text(
                        '${AuthService().currentUser?.coins ?? 0}',
                        style: const TextStyle(color: Color(0xFFFBBF24), fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                      const SizedBox(width: 3),
                      const Icon(Icons.add_circle, color: Color(0xFFF59E0B), size: 14),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFF59E0B)))
          : _games.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.videogame_asset_off, color: Colors.white38, size: 54),
                      const SizedBox(height: 12),
                      Text(
                        'No games are available right now.'.tr,
                        style: const TextStyle(color: Colors.white54),
                      ),
                      const SizedBox(height: 12),
                      TextButton(
                        onPressed: () {
                          setState(() => _loading = true);
                          _load();
                        },
                        child: Text('Refresh'.tr, style: const TextStyle(color: Color(0xFFFBBF24))),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  color: const Color(0xFFF59E0B),
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text(
                        'Play anytime — no room needed. Win up to 50x!'.tr,
                        style: const TextStyle(color: Colors.white54, fontSize: 12.5),
                      ),
                      const SizedBox(height: 14),
                      ..._games.map((game) => _buildGameCard(game)),
                    ],
                  ),
                ),
    );
  }

  Widget _buildGameCard(Map<String, dynamic> game) {
    final locked = game['locked'] == true;
    final color = _parseColor(game['themeColor'] as String?);
    final icon = (game['icon'] ?? '🎮').toString();
    final name = (game['name'] ?? game['id']).toString();
    final desc = (game['description'] ?? '').toString();
    final maxMult = (game['maxMultiplier'] as num?)?.toInt() ?? 0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: InkWell(
        onTap: locked ? null : () => _openGame(game),
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: locked ? const Color(0xFFFBBF24).withValues(alpha: 0.35) : color.withValues(alpha: 0.4)),
          ),
          child: Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: color.withValues(alpha: 0.4)),
                ),
                alignment: Alignment.center,
                child: Text(icon, style: const TextStyle(fontSize: 30)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                        ),
                        if (locked) ...[
                          const SizedBox(width: 6),
                          const Icon(Icons.lock, color: Color(0xFFFBBF24), size: 15),
                        ],
                      ],
                    ),
                    if (desc.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        desc,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white54, fontSize: 11.5),
                      ),
                    ],
                    const SizedBox(height: 6),
                    if (locked)
                      Text(
                        (game['lockReason'] ?? 'Locked').toString(),
                        style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.bold),
                      )
                    else
                      Text(
                        'Up to ${maxMult}x • ${(game['minBet'] ?? 10)}–${(game['maxBet'] ?? 10000)} 🪙',
                        style: const TextStyle(color: Color(0xFF6EE7B7), fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                locked ? Icons.lock_outline : Icons.play_circle_fill,
                color: locked ? const Color(0xFFFBBF24) : color,
                size: 34,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openGame(Map<String, dynamic> game) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: const Color(0xFF0F172A),
          appBar: AppBar(
            backgroundColor: const Color(0xFF0F172A),
            elevation: 0,
            foregroundColor: Colors.white,
            title: Text(
              '${game['icon'] ?? '🎮'} ${game['name'] ?? ''}',
              style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
          body: RoomGamesPanel(initialGameId: game['id'] as String?, roundedTop: false),
        ),
      ),
    ).then((_) {
      // Refresh balances/catalog when returning
      if (mounted) setState(() {});
    });
  }

  Color _parseColor(String? hex) {
    if (hex == null || hex.isEmpty) return const Color(0xFF8B5CF6);
    try {
      final cleaned = hex.replaceFirst('#', '');
      return Color(int.parse('FF$cleaned', radix: 16));
    } catch (_) {
      return const Color(0xFF8B5CF6);
    }
  }
}
