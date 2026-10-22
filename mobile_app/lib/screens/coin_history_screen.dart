import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

/// Wallet & coin transaction history (gifts sent/received, recharges,
/// withdrawals and payouts). Backed by `GET /api/payments/transactions`.
class CoinHistoryScreen extends StatefulWidget {
  const CoinHistoryScreen({super.key});

  @override
  State<CoinHistoryScreen> createState() => _CoinHistoryScreenState();
}

class _CoinHistoryScreenState extends State<CoinHistoryScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _transactions = [];
  String? _error;
  String _filter = 'ALL';

  static const _filters = <String, String>{
    'ALL': 'All',
    'IN': 'Received',
    'OUT': 'Spent',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final rows = await ApiService().getTransactions();
      if (!mounted) return;
      setState(() {
        _transactions = rows;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error = 'Could not load your transaction history. Pull down to retry.';
      });
    }
  }

  List<Map<String, dynamic>> get _visible {
    if (_filter == 'ALL') return _transactions;
    return _transactions.where((t) => (t['direction'] ?? '') == _filter).toList();
  }

  Color _typeColor(String type) {
    switch (type) {
      case 'GIFT_TRANSACTION':
        return LiveColors.accentPink;
      case 'COIN_PURCHASE':
        return LiveColors.gold;
      case 'WITHDRAWAL':
        return LiveColors.accentBlue;
      case 'DIAMOND_PAYOUT':
        return LiveColors.waveGreen;
      default:
        return LiveColors.accentPurple;
    }
  }

  IconData _typeIcon(String type) {
    switch (type) {
      case 'GIFT_TRANSACTION':
        return Icons.card_giftcard_rounded;
      case 'COIN_PURCHASE':
        return Icons.add_shopping_cart_rounded;
      case 'WITHDRAWAL':
        return Icons.account_balance_rounded;
      case 'DIAMOND_PAYOUT':
        return Icons.diamond_rounded;
      default:
        return Icons.swap_horiz_rounded;
    }
  }

  String _typeLabel(String type) {
    switch (type) {
      case 'GIFT_TRANSACTION':
        return 'Gift';
      case 'COIN_PURCHASE':
        return 'Coin recharge';
      case 'WITHDRAWAL':
        return 'Withdrawal';
      case 'DIAMOND_PAYOUT':
        return 'Diamond payout';
      case 'AGENCY_COMMISSION':
        return 'Agency commission';
      default:
        return type.replaceAll('_', ' ').toLowerCase();
    }
  }

  String _formatDate(dynamic raw) {
    final date = DateTime.tryParse('${raw ?? ''}');
    if (date == null) return '';
    final local = date.toLocal();
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final h = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final ampm = local.hour >= 12 ? 'PM' : 'AM';
    final minute = local.minute.toString().padLeft(2, '0');
    return '${local.day} ${months[local.month - 1]} ${local.year} · $h:$minute $ampm';
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;
    return Scaffold(
      backgroundColor: LiveColors.background,
      appBar: AppBar(
        backgroundColor: LiveColors.background,
        elevation: 0,
        title: const Text('Coin & Diamond History'),
      ),
      body: RefreshIndicator(
        color: LiveColors.accentPink,
        onRefresh: _load,
        child: Column(
          children: [
            _buildBalanceCard(user?.coins ?? 0, user?.diamonds ?? 0),
            _buildFilters(),
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: LiveColors.accentPink),
                    )
                  : _error != null
                      ? _buildEmpty(_error!)
                      : _visible.isEmpty
                          ? _buildEmpty('No transactions yet.')
                          : ListView.separated(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                              itemCount: _visible.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 10),
                              itemBuilder: (context, index) =>
                                  _buildRow(_visible[index]),
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBalanceCard(int coins, int diamonds) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LiveColors.primaryGradient,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'COIN BALANCE',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.1,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  coins.toString(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          Container(width: 1, height: 42, color: Colors.white24),
          const SizedBox(width: 18),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'DIAMONDS',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                diamonds.toString(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: _filters.entries.map((entry) {
          final selected = _filter == entry.key;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => setState(() => _filter = entry.key),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: selected
                      ? LiveColors.accentPink.withValues(alpha: 0.18)
                      : LiveColors.backgroundSurface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: selected ? LiveColors.accentPink : Colors.white12,
                  ),
                ),
                child: Text(
                  entry.value,
                  style: TextStyle(
                    color: selected ? LiveColors.accentPink : Colors.white70,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildEmpty(String message) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        SizedBox(height: MediaQuery.of(context).size.height * 0.18),
        Icon(Icons.receipt_long_rounded, color: Colors.white24, size: 56),
        const SizedBox(height: 12),
        Center(
          child: Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white54, fontSize: 13),
          ),
        ),
      ],
    );
  }

  Widget _buildRow(Map<String, dynamic> tx) {
    final type = '${tx['type'] ?? ''}';
    final direction = '${tx['direction'] ?? ''}';
    final coins = (tx['coinsDebited'] as num?)?.toInt() ?? 0;
    final diamonds = (tx['diamondsCredited'] as num?)?.toInt() ?? 0;
    final counterpart = tx['counterpart'] as Map<String, dynamic>?;
    final counterpartName = counterpart?['displayName'] ?? counterpart?['username'];

    String amountText;
    Color amountColor;
    if (diamonds > 0 && direction != 'OUT') {
      amountText = '+$diamonds 💎';
      amountColor = LiveColors.waveGreen;
    } else if (coins > 0 && direction == 'OUT') {
      amountText = '-$coins 🪙';
      amountColor = LiveColors.accentPink;
    } else if (coins > 0) {
      amountText = '+$coins 🪙';
      amountColor = LiveColors.waveGreen;
    } else {
      amountText = '—';
      amountColor = Colors.white54;
    }

    final subtitleParts = <String>[
      _formatDate(tx['createdAt']),
      if (counterpartName != null && '$counterpartName'.isNotEmpty)
        direction == 'OUT' ? 'to $counterpartName' : 'from $counterpartName',
    ];

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: LiveColors.backgroundSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: _typeColor(type).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(_typeIcon(type), color: _typeColor(type), size: 21),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _typeLabel(type),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitleParts.join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white54, fontSize: 11),
                ),
              ],
            ),
          ),
          Text(
            amountText,
            style: TextStyle(
              color: amountColor,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
