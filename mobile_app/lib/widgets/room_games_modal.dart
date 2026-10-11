import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../localization/app_locale_service.dart';
import 'topup_choice_dialog.dart';

/// Dynamic mini-games bottom sheet. The catalog (games, enable/disable, VIP/level
/// gates, bet limits) is loaded live from the backend so the Admin Panel fully
/// controls what appears and who can play — without an app release.
class RoomGamesModal {
  static Future<void> show(BuildContext context, {required String roomId}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => RoomGamesPanel(roomId: roomId, roundedTop: true),
    );
  }
}

/// Reusable games panel. Used both inside the room bottom sheet and the
/// standalone Games Center screen. Pass a null [roomId] for independent play.
class RoomGamesPanel extends StatefulWidget {
  final String? roomId;
  final String? initialGameId;
  final bool roundedTop;

  const RoomGamesPanel({
    super.key,
    this.roomId,
    this.initialGameId,
    this.roundedTop = true,
  });

  @override
  State<RoomGamesPanel> createState() => _RoomGamesPanelState();
}

class _RoomGamesPanelState extends State<RoomGamesPanel> with TickerProviderStateMixin {
  bool _loading = true;
  List<Map<String, dynamic>> _games = [];
  String _activeGameId = 'SLOTS_777';

  int _betAmount = 50;
  bool _isSpinning = false;
  bool _isAnonymous = false;
  String? _lastResultMsg;
  Color _resultColor = Colors.white;

  // Slots state
  List<String> _reels = ['7️⃣', '💎', '👑'];
  Timer? _slotsTimer;

  // Wheel state
  AnimationController? _wheelAnimCtrl;

  // Dice state
  List<int> _dice = [3, 4, 5];
  String _diceChoice = 'BIG'; // 'BIG', 'SMALL', 'TRIPLE'

  // Yummy state
  List<String> _yummyReels = ['🍔', '🍕', '🍣'];
  Timer? _yummyTimer;
  String _yummyChoice = 'BURGER';

  final List<int> _allBetOptions = [10, 50, 100, 500, 1000, 5000];

  @override
  void initState() {
    super.initState();
    _wheelAnimCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );
    _loadCatalog();
  }

  @override
  void dispose() {
    _slotsTimer?.cancel();
    _yummyTimer?.cancel();
    _wheelAnimCtrl?.dispose();
    super.dispose();
  }

  // ==================== CATALOG ====================
  Future<void> _loadCatalog() async {
    final user = AuthService().currentUser;
    List<Map<String, dynamic>> games = [];
    try {
      games = await ApiService().getGamesCatalog(userId: user?.id);
    } catch (_) {
      games = [];
    }
    if (games.isEmpty) {
      games = _fallbackCatalog();
    }
    if (!mounted) return;
    setState(() {
      _games = games;
      final preferred = widget.initialGameId;
      if (preferred != null && games.any((g) => g['id'] == preferred)) {
        _activeGameId = preferred;
      } else {
        _activeGameId = games.first['id'] as String;
      }
      _applyBetDefaults();
      _applyYummyDefault();
      _loading = false;
    });
  }

  /// Offline resilience: mirrors the backend defaults so the modal still works
  /// when the network is unavailable.
  List<Map<String, dynamic>> _fallbackCatalog() => [
        {'id': 'SLOTS_777', 'name': 'Lucky 777 Slots', 'icon': '🎰', 'category': 'CASINO', 'themeColor': '#F59E0B', 'minBet': 10, 'maxBet': 10000, 'maxMultiplier': 50, 'minVipLevel': 0, 'minUserLevel': 1, 'locked': false, 'lockReason': null},
        {'id': 'ROULETTE', 'name': 'Casino Lucky Wheel', 'icon': '🎡', 'category': 'CASINO', 'themeColor': '#8B5CF6', 'minBet': 10, 'maxBet': 10000, 'maxMultiplier': 50, 'minVipLevel': 0, 'minUserLevel': 1, 'locked': false, 'lockReason': null},
        {'id': 'DICE', 'name': 'Lucky Sic Bo Dice', 'icon': '🎲', 'category': 'CASINO', 'themeColor': '#EF4444', 'minBet': 10, 'maxBet': 10000, 'maxMultiplier': 30, 'minVipLevel': 0, 'minUserLevel': 1, 'locked': false, 'lockReason': null},
        {
          'id': 'YUMMY',
          'name': 'Yummy Foodie Draw',
          'icon': '🍔',
          'category': 'FOOD',
          'themeColor': '#10B981',
          'minBet': 10,
          'maxBet': 10000,
          'maxMultiplier': 40,
          'minVipLevel': 0,
          'minUserLevel': 1,
          'locked': false,
          'lockReason': null,
          'dishes': [
            {'key': 'BURGER', 'emoji': '🍔', 'label': 'Burger'},
            {'key': 'PIZZA', 'emoji': '🍕', 'label': 'Pizza'},
            {'key': 'SUSHI', 'emoji': '🍣', 'label': 'Sushi'},
            {'key': 'DONUT', 'emoji': '🍩', 'label': 'Donut'},
            {'key': 'TACO', 'emoji': '🌮', 'label': 'Taco'},
            {'key': 'RAMEN', 'emoji': '🍜', 'label': 'Ramen'},
          ],
        },
      ];

  Map<String, dynamic>? get _activeGame {
    if (_games.isEmpty) return null;
    for (final g in _games) {
      if (g['id'] == _activeGameId) return g;
    }
    return _games.first;
  }

  bool get _activeLocked => (_activeGame?['locked'] ?? false) == true;
  int get _minBet => (_activeGame?['minBet'] as num?)?.toInt() ?? 10;
  int get _maxBet => (_activeGame?['maxBet'] as num?)?.toInt() ?? 10000;

  List<int> get _betOptions {
    final opts = _allBetOptions.where((b) => b >= _minBet && b <= _maxBet).toList();
    if (opts.isEmpty) return [_minBet];
    return opts;
  }

  void _applyBetDefaults() {
    final opts = _betOptions;
    if (!opts.contains(_betAmount)) {
      _betAmount = opts.first;
    }
  }

  void _applyYummyDefault() {
    final dishes = _dishes;
    if (dishes.isNotEmpty) {
      _yummyChoice = (dishes.first['key'] ?? 'BURGER').toString();
    }
  }

  List<Map<String, dynamic>> get _dishes {
    final raw = _activeGame?['dishes'];
    if (raw is List && raw.isNotEmpty) {
      return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [
      {'key': 'BURGER', 'emoji': '🍔', 'label': 'Burger'},
      {'key': 'PIZZA', 'emoji': '🍕', 'label': 'Pizza'},
      {'key': 'SUSHI', 'emoji': '🍣', 'label': 'Sushi'},
      {'key': 'DONUT', 'emoji': '🍩', 'label': 'Donut'},
      {'key': 'TACO', 'emoji': '🌮', 'label': 'Taco'},
      {'key': 'RAMEN', 'emoji': '🍜', 'label': 'Ramen'},
    ];
  }

  void _selectGame(Map<String, dynamic> game) {
    if (_isSpinning) return;
    setState(() {
      _activeGameId = game['id'] as String;
      _lastResultMsg = null;
      _applyBetDefaults();
      _applyYummyDefault();
    });
  }

  // ==================== PLAY ====================
  void _handlePlay() {
    if (_isSpinning || _activeLocked) return;
    switch (_activeGameId) {
      case 'SLOTS_777':
        _playSlots();
        break;
      case 'ROULETTE':
        _playWheel();
        break;
      case 'DICE':
        _playDice();
        break;
      case 'YUMMY':
        _playYummy();
        break;
      default:
        break;
    }
  }

  Future<void> _playSlots() async {
    final user = AuthService().currentUser;
    if (user == null) return;
    if (user.coins < _betAmount) {
      _showInsufficientCoins();
      return;
    }

    setState(() {
      _isSpinning = true;
      _lastResultMsg = null;
    });

    final symbols = ['7️⃣', '💎', '👑', '🍒', '🔔', '🍇'];
    final rng = Random();
    int spinTicks = 0;
    _slotsTimer?.cancel();
    _slotsTimer = Timer.periodic(const Duration(milliseconds: 100), (t) {
      spinTicks++;
      if (mounted) {
        setState(() {
          _reels = [
            symbols[rng.nextInt(symbols.length)],
            symbols[rng.nextInt(symbols.length)],
            symbols[rng.nextInt(symbols.length)],
          ];
        });
      }
      if (spinTicks > 20) t.cancel();
    });

    try {
      final res = await ApiService().playGame(
        userId: user.id,
        gameId: 'SLOTS_777',
        betAmount: _betAmount,
        roomId: widget.roomId,
        isAnonymous: _isAnonymous,
      );
      _slotsTimer?.cancel();
      if (res != null && mounted) {
        final outcome = res['outcomeDetails'] as Map<String, dynamic>? ?? {};
        final serverReels = (outcome['reels'] as List?)?.map((e) => e.toString()).toList() ?? _reels;
        final winnings = res['winningsCoins'] as int? ?? 0;
        final mult = res['multiplier'] as int? ?? 0;
        final newCoins = res['newCoinsBalance'] as int?;
        if (newCoins != null) AuthService().updateBalances(coins: newCoins);
        setState(() {
          _reels = serverReels;
          _isSpinning = false;
          if (winnings > 0) {
            _lastResultMsg = 'JACKPOT! Won $winnings 🪙 (${mult}x)! 🎉'.tr;
            _resultColor = const Color(0xFF10B981);
          } else {
            _lastResultMsg = 'Better luck next spin! (-$_betAmount 🪙)'.tr;
            _resultColor = Colors.grey;
          }
        });
      }
    } catch (e) {
      _slotsTimer?.cancel();
      _handlePlayError(e);
    }
  }

  Future<void> _playWheel() async {
    final user = AuthService().currentUser;
    if (user == null) return;
    if (user.coins < _betAmount) {
      _showInsufficientCoins();
      return;
    }

    setState(() {
      _isSpinning = true;
      _lastResultMsg = null;
    });

    _wheelAnimCtrl?.reset();
    _wheelAnimCtrl?.forward();

    try {
      final res = await ApiService().playGame(
        userId: user.id,
        gameId: 'ROULETTE',
        betAmount: _betAmount,
        roomId: widget.roomId,
        isAnonymous: _isAnonymous,
      );
      await Future.delayed(const Duration(milliseconds: 2000));
      if (res != null && mounted) {
        final winnings = res['winningsCoins'] as int? ?? 0;
        final mult = res['multiplier'] as int? ?? 0;
        final newCoins = res['newCoinsBalance'] as int?;
        if (newCoins != null) AuthService().updateBalances(coins: newCoins);
        setState(() {
          _isSpinning = false;
          if (winnings > 0) {
            _lastResultMsg = 'Hit ${mult}x! Won $winnings 🪙! 🎡'.tr;
            _resultColor = const Color(0xFF10B981);
          } else {
            _lastResultMsg = 'Missed! Multiplier was 0x (-$_betAmount 🪙)'.tr;
            _resultColor = Colors.grey;
          }
        });
      }
    } catch (e) {
      _handlePlayError(e);
    }
  }

  Future<void> _playDice() async {
    final user = AuthService().currentUser;
    if (user == null) return;
    if (user.coins < _betAmount) {
      _showInsufficientCoins();
      return;
    }

    setState(() {
      _isSpinning = true;
      _lastResultMsg = null;
    });

    try {
      final res = await ApiService().playGame(
        userId: user.id,
        gameId: 'DICE',
        betAmount: _betAmount,
        betChoice: _diceChoice,
        roomId: widget.roomId,
        isAnonymous: _isAnonymous,
      );
      if (res != null && mounted) {
        final outcome = res['outcomeDetails'] as Map<String, dynamic>? ?? {};
        final serverDice = (outcome['dice'] as List?)?.map((e) => (e as num).toInt()).toList() ?? [1, 2, 3];
        final sum = outcome['sum'] as int? ?? 10;
        final winnings = res['winningsCoins'] as int? ?? 0;
        final mult = res['multiplier'] as int? ?? 0;
        final newCoins = res['newCoinsBalance'] as int?;
        if (newCoins != null) AuthService().updateBalances(coins: newCoins);
        setState(() {
          _dice = serverDice;
          _isSpinning = false;
          if (winnings > 0) {
            _lastResultMsg = 'Dice Sum: $sum! Won $winnings 🪙 (${mult}x)! 🎲'.tr;
            _resultColor = const Color(0xFF10B981);
          } else {
            _lastResultMsg = 'Dice Sum: $sum. Loss (-$_betAmount 🪙)'.tr;
            _resultColor = Colors.grey;
          }
        });
      }
    } catch (e) {
      _handlePlayError(e);
    }
  }

  Future<void> _playYummy() async {
    final user = AuthService().currentUser;
    if (user == null) return;
    if (user.coins < _betAmount) {
      _showInsufficientCoins();
      return;
    }

    setState(() {
      _isSpinning = true;
      _lastResultMsg = null;
    });

    // Reel spin animation over the dish emojis
    final dishes = _dishes;
    final emojis = dishes.map((d) => (d['emoji'] ?? '🍽️').toString()).toList();
    final rng = Random();
    int spinTicks = 0;
    _yummyTimer?.cancel();
    _yummyTimer = Timer.periodic(const Duration(milliseconds: 100), (t) {
      spinTicks++;
      if (mounted) {
        setState(() {
          _yummyReels = [
            emojis[rng.nextInt(emojis.length)],
            emojis[rng.nextInt(emojis.length)],
            emojis[rng.nextInt(emojis.length)],
          ];
        });
      }
      if (spinTicks > 20) t.cancel();
    });

    try {
      final res = await ApiService().playGame(
        userId: user.id,
        gameId: 'YUMMY',
        betAmount: _betAmount,
        betChoice: _yummyChoice,
        roomId: widget.roomId,
        isAnonymous: _isAnonymous,
      );
      _yummyTimer?.cancel();
      if (res != null && mounted) {
        final outcome = res['outcomeDetails'] as Map<String, dynamic>? ?? {};
        final landed = outcome['landedDish'] as Map<String, dynamic>?;
        final landedEmoji = (landed?['emoji'] ?? '🍽️').toString();
        final winnings = res['winningsCoins'] as int? ?? 0;
        final mult = res['multiplier'] as int? ?? 0;
        final newCoins = res['newCoinsBalance'] as int?;
        if (newCoins != null) AuthService().updateBalances(coins: newCoins);
        setState(() {
          _yummyReels = [landedEmoji, landedEmoji, landedEmoji];
          _isSpinning = false;
          if (winnings > 0) {
            _lastResultMsg = '🍽️ $landedEmoji! Won $winnings 🪙 (${mult}x)! 🎉'.tr;
            _resultColor = const Color(0xFF10B981);
          } else {
            _lastResultMsg = 'Landed on $landedEmoji. Loss (-$_betAmount 🪙)'.tr;
            _resultColor = Colors.grey;
          }
        });
      }
    } catch (e) {
      _yummyTimer?.cancel();
      _handlePlayError(e);
    }
  }

  void _handlePlayError(Object e) {
    if (mounted) {
      setState(() {
        _isSpinning = false;
        _lastResultMsg = e.toString().replaceAll('Exception: ', '').tr;
        _resultColor = Colors.redAccent;
      });
    }
  }

  void _showInsufficientCoins() {
    TopUpChoiceDialog.show(context);
  }

  // ==================== BUILD ====================
  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;
    final userCoins = user?.coins ?? 0;
    final vipLevel = user?.vipLevel ?? 0;
    final hasVipAnonymous = vipLevel >= 2;

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: widget.roundedTop
            ? const BorderRadius.vertical(top: Radius.circular(28))
            : BorderRadius.zero,
        boxShadow: const [
          BoxShadow(color: Colors.black54, blurRadius: 24, spreadRadius: 4),
        ],
      ),
      padding: EdgeInsets.only(
        top: 16,
        left: 16,
        right: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle
              if (widget.roundedTop)
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)),
                ),
              if (widget.roundedTop) const SizedBox(height: 12),

              // Header Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFEF4444)]),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.casino_rounded, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Room Group Games 🎰'.tr,
                        style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ],
                  ),
                  // Coins Pill
                  InkWell(
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
                          Text('$userCoins 🪙', style: const TextStyle(color: Color(0xFFFBBF24), fontWeight: FontWeight.bold, fontSize: 12)),
                          const SizedBox(width: 4),
                          const Icon(Icons.add_circle, color: Color(0xFFF59E0B), size: 14),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: CircularProgressIndicator(color: Color(0xFFF59E0B)),
                )
              else if (_games.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 40),
                  child: Text('No games are available right now.'.tr, style: const TextStyle(color: Colors.white54)),
                )
              else ...[
                // Game Selector Tabs (dynamic)
                _buildGameTabs(),
                const SizedBox(height: 16),

                // Game Body
                if (_activeLocked) _buildLockOverlay() else _buildGameBody(),

                const SizedBox(height: 14),

                // Result Banner
                if (_lastResultMsg != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: _resultColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: _resultColor.withValues(alpha: 0.4)),
                    ),
                    child: Text(
                      _lastResultMsg!,
                      style: TextStyle(color: _resultColor, fontWeight: FontWeight.bold, fontSize: 12.5),
                      textAlign: TextAlign.center,
                    ),
                  ),

                // Bet Amount Selector
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Bet Coins:'.tr, style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                    Wrap(
                      alignment: WrapAlignment.end,
                      spacing: 6,
                      children: _betOptions.map((amt) {
                        final isSelected = _betAmount == amt;
                        return InkWell(
                          onTap: (_isSpinning || _activeLocked) ? null : () => setState(() => _betAmount = amt),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFF6366F1) : const Color(0xFF1E293B),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: isSelected ? const Color(0xFF818CF8) : Colors.white12),
                            ),
                            child: Text(
                              '$amt',
                              style: TextStyle(color: isSelected ? Colors.white : Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // VIP 2 Anonymous Mode Toggle
                if (hasVipAnonymous && !_activeLocked)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.security, color: Color(0xFF38BDF8), size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'VIP 2+ Anonymous Mode (Hide Name in Room)'.tr,
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ),
                        Switch(
                          value: _isAnonymous,
                          activeThumbColor: const Color(0xFF38BDF8),
                          onChanged: (val) => setState(() => _isAnonymous = val),
                        ),
                      ],
                    ),
                  ),

                const SizedBox(height: 14),

                // Play Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: (_isSpinning || _activeLocked) ? null : _handlePlay,
                    child: Ink(
                      decoration: BoxDecoration(
                        gradient: _activeLocked
                            ? const LinearGradient(colors: [Color(0xFF334155), Color(0xFF1E293B)])
                            : const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFEF4444)]),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Container(
                        alignment: Alignment.center,
                        child: _isSpinning
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : Text(
                                _activeLocked
                                    ? '🔒 ${'LOCKED'.tr}'
                                    : '${'BET'.tr} $_betAmount 🪙 ${'AND PLAY'.tr} 🚀',
                                style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14),
                              ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGameTabs() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: _games.map((game) => _buildTabBtn(game)).toList(),
      ),
    );
  }

  Widget _buildTabBtn(Map<String, dynamic> game) {
    final id = game['id'] as String;
    final isSelected = _activeGameId == id;
    final locked = game['locked'] == true;
    final icon = (game['icon'] ?? '🎮').toString();
    final name = (game['name'] ?? id).toString();

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () => _selectGame(game),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 14),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF6366F1) : const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isSelected ? const Color(0xFF818CF8) : Colors.white12),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(icon, style: const TextStyle(fontSize: 15)),
              const SizedBox(width: 6),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 96),
                child: Text(
                  name,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: isSelected ? Colors.white : Colors.white70,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              if (locked) ...[
                const SizedBox(width: 5),
                const Icon(Icons.lock, color: Color(0xFFFBBF24), size: 12),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGameBody() {
    switch (_activeGameId) {
      case 'SLOTS_777':
        return _buildSlotsGame();
      case 'ROULETTE':
        return _buildWheelGame();
      case 'DICE':
        return _buildDiceGame();
      case 'YUMMY':
        return _buildYummyGame();
      default:
        return _buildSlotsGame();
    }
  }

  Widget _buildLockOverlay() {
    final reason = (_activeGame?['lockReason'] ?? 'Unlock more to play this game.').toString();
    final minVip = (_activeGame?['minVipLevel'] as num?)?.toInt() ?? 0;
    final minLevel = (_activeGame?['minUserLevel'] as num?)?.toInt() ?? 1;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 30, horizontal: 20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFFBBF24).withValues(alpha: 0.35)),
      ),
      child: Column(
        children: [
          const Icon(Icons.lock_rounded, color: Color(0xFFFBBF24), size: 44),
          const SizedBox(height: 10),
          Text(
            reason,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            'Requirements: ${minVip > 0 ? 'VIP $minVip  •  ' : ''}Level $minLevel+',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white54, fontSize: 11.5),
          ),
        ],
      ),
    );
  }

  // 1. Slots UI
  Widget _buildSlotsGame() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: _reels.map((sym) {
              return Container(
                width: 76,
                height: 84,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF334155), Color(0xFF0F172A)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFFBBF24), width: 2),
                  boxShadow: const [
                    BoxShadow(color: Colors.black54, blurRadius: 8, offset: Offset(0, 4)),
                  ],
                ),
                alignment: Alignment.center,
                child: Text(sym, style: const TextStyle(fontSize: 40)),
              );
            }).toList(),
          ),
          const SizedBox(height: 10),
          Text(
            '3x 7️⃣ = 50x Mega Jackpot • 3x 💎 = 25x • 2x Match = 2x'.tr,
            style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 10.5, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  // 2. Casino Wheel UI
  Widget _buildWheelGame() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF8B5CF6).withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          RotationTransition(
            turns: _wheelAnimCtrl ?? const AlwaysStoppedAnimation(0.0),
            child: Container(
              width: 130,
              height: 130,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const SweepGradient(
                  colors: [
                    Color(0xFFEF4444),
                    Color(0xFF10B981),
                    Color(0xFF3B82F6),
                    Color(0xFFF59E0B),
                    Color(0xFF8B5CF6),
                    Color(0xFFEC4899),
                    Color(0xFFEF4444),
                  ],
                ),
                border: Border.all(color: Colors.white, width: 3),
              ),
              child: const Center(
                child: Text('🎡', style: TextStyle(fontSize: 48)),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Multipliers: 2x, 5x, 10x, 20x, 50x Fortune!'.tr,
            style: const TextStyle(color: Color(0xFFA78BFA), fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  // 3. Sic Bo Dice UI
  Widget _buildDiceGame() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: _dice.map((d) {
              return Container(
                width: 52,
                height: 52,
                margin: const EdgeInsets.symmetric(horizontal: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 6)],
                ),
                alignment: Alignment.center,
                child: Text('$d', style: const TextStyle(color: Colors.black, fontSize: 28, fontWeight: FontWeight.w900)),
              );
            }).toList(),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _buildDiceChoiceBtn('SMALL', 'Small (4 - 10)\n2x'.tr),
              const SizedBox(width: 6),
              _buildDiceChoiceBtn('TRIPLE', 'Any Triple\n30x'.tr),
              const SizedBox(width: 6),
              _buildDiceChoiceBtn('BIG', 'Big (11 - 17)\n2x'.tr),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDiceChoiceBtn(String key, String label) {
    final isSelected = _diceChoice == key;
    return Expanded(
      child: GestureDetector(
        onTap: _isSpinning ? null : () => setState(() => _diceChoice = key),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF10B981) : const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isSelected ? const Color(0xFF34D399) : Colors.white12),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isSelected ? Colors.white : Colors.white70,
              fontSize: 10.5,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }

  // 4. Yummy Foodie Draw UI
  Widget _buildYummyGame() {
    final dishes = _dishes;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: _yummyReels.map((emoji) {
              return Container(
                width: 68,
                height: 74,
                margin: const EdgeInsets.symmetric(horizontal: 5),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF334155), Color(0xFF0F172A)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF10B981), width: 2),
                ),
                alignment: Alignment.center,
                child: Text(emoji, style: const TextStyle(fontSize: 34)),
              );
            }).toList(),
          ),
          const SizedBox(height: 14),
          Text(
            'Pick your lucky dish 🍽️'.tr,
            style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            alignment: WrapAlignment.center,
            children: dishes.map((dish) {
              final key = (dish['key'] ?? '').toString();
              final isSelected = _yummyChoice == key;
              return GestureDetector(
                onTap: _isSpinning ? null : () => setState(() => _yummyChoice = key),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFF10B981) : const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isSelected ? const Color(0xFF34D399) : Colors.white12),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text((dish['emoji'] ?? '🍽️').toString(), style: const TextStyle(fontSize: 20)),
                      const SizedBox(height: 2),
                      Text(
                        (dish['label'] ?? key).toString(),
                        style: TextStyle(
                          color: isSelected ? Colors.white : Colors.white70,
                          fontSize: 9.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 8),
          Text(
            'Match your dish for up to 40x! 🍩'.tr,
            style: const TextStyle(color: Color(0xFF6EE7B7), fontSize: 10.5, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
