import 'package:flutter/material.dart';
import 'api_service.dart';

/// Single source of truth for the in-room gift tray.
///
/// The backend (`GET /api/gifts`) is authoritative: the admin dashboard can
/// change prices, add gifts or deactivate them. The local list below is only a
/// fallback for offline / first-frame rendering and its IDs MUST match the
/// backend seed IDs, otherwise `POST /api/gifts/send` answers 404.
class GiftCatalog {
  static const List<Map<String, dynamic>> fallback = [
    // Standard gifts - every user
    {'id': 'g1', 'name': 'Rose 🌹', 'coins': 10, 'minVip': 0},
    {'id': 'g2', 'name': 'Diamond Ring 💍', 'coins': 100, 'minVip': 0},
    {'id': 'g3', 'name': 'Sports Car 🏎️', 'coins': 1000, 'minVip': 0},
    {'id': 'g4', 'name': 'Luxury Yacht 🛥️', 'coins': 5000, 'minVip': 0},
    {'id': 'g5', 'name': 'Golden Dragon 🐉', 'coins': 10000, 'minVip': 0},
    {'id': 'g6', 'name': 'Space Rocket 🚀', 'coins': 50000, 'minVip': 0},
    // VIP exclusive gifts - IDs mirror the backend seed
    {'id': 'g_vip1_yacht', 'name': 'VIP 1 Royal Yacht 🛥️', 'coins': 500, 'minVip': 1},
    {'id': 'g_vip2_lambo', 'name': 'VIP 2 Cyber Lambo 🏎️', 'coins': 1000, 'minVip': 2},
    {'id': 'g_vip3_jet', 'name': 'VIP 3 Private Jet ✈️', 'coins': 2000, 'minVip': 3},
    {'id': 'g_vip4_castle', 'name': 'VIP 4 Crystal Castle 🏰', 'coins': 3500, 'minVip': 4},
    {'id': 'g_vip5_phoenix', 'name': 'VIP 5 Mythic Phoenix 🔥', 'coins': 5000, 'minVip': 5},
    {'id': 'g_vip6_dragon', 'name': 'VIP 6 Celestial Dragon 🐉', 'coins': 7500, 'minVip': 6},
    {'id': 'g_vip7_galaxy', 'name': 'VIP 7 Cosmic Galaxy 🌌', 'coins': 10000, 'minVip': 7},
    {'id': 'g_vip8_sovereign', 'name': 'VIP 8 God of Wealth 👑', 'coins': 15000, 'minVip': 8},
  ];

  static const Map<String, IconData> _icons = {
    'g1': Icons.local_florist,
    'g2': Icons.diamond,
    'g3': Icons.directions_car,
    'g4': Icons.directions_boat,
    'g5': Icons.whatshot,
    'g6': Icons.rocket_launch,
    'g_vip1_yacht': Icons.sailing,
    'g_vip2_lambo': Icons.electric_bolt,
    'g_vip3_jet': Icons.flight,
    'g_vip4_castle': Icons.castle,
    'g_vip5_phoenix': Icons.local_fire_department,
    'g_vip6_dragon': Icons.auto_awesome,
    'g_vip7_galaxy': Icons.brightness_high,
    'g_vip8_sovereign': Icons.workspace_premium,
  };

  static const List<Color> _colors = [
    Colors.redAccent,
    Colors.cyanAccent,
    Colors.amberAccent,
    Colors.tealAccent,
    Colors.orangeAccent,
    Colors.purpleAccent,
    Color(0xFF06B6D4),
    Color(0xFF8B5CF6),
    Color(0xFFEC4899),
    Color(0xFFF59E0B),
    Color(0xFFEF4444),
    Color(0xFFF97316),
    Color(0xFFA855F7),
    Color(0xFFFFD700),
  ];

  /// The bundled catalog decorated with the icon/colour used by the gift tray.
  static List<Map<String, dynamic>> get fallbackDecorated => fallback
      .asMap()
      .entries
      .map((entry) => <String, dynamic>{
            ...entry.value,
            'icon': _icons[entry.value['id']] ?? Icons.card_giftcard,
            'color': _colors[entry.key % _colors.length],
          })
      .toList();

  /// Loads the live catalog and decorates it with the icon/colour used by the
  /// existing gift tray UI. Falls back to the built-in list when offline.
  static Future<List<Map<String, dynamic>>> load() async {
    try {
      final rows = await ApiService().getGifts();
      if (rows.isNotEmpty) {
        return rows.asMap().entries.map((entry) {
          final index = entry.key;
          final gift = entry.value;
          final id = (gift['id'] ?? '').toString();
          final coins = gift['costCoins'] ?? gift['coins'] ?? 10;
          final minVip = gift['minVipLevel'] ?? gift['minVip'] ?? 0;
          return <String, dynamic>{
            'id': id,
            'name': (gift['name'] ?? 'Gift').toString(),
            'coins': coins is num ? coins.toInt() : int.tryParse('$coins') ?? 10,
            'minVip': minVip is num ? minVip.toInt() : int.tryParse('$minVip') ?? 0,
            'icon': _icons[id] ?? Icons.card_giftcard,
            'color': _colors[index % _colors.length],
          };
        }).toList();
      }
    } catch (_) {
      // Offline / API hiccup: use the bundled catalog.
    }
    return fallbackDecorated;
  }
}
