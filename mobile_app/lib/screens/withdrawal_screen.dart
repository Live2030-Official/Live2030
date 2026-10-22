import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

/// Host diamond cash-out request form.
/// Backed by `POST /api/withdrawals/request` (minimum 10,000 diamonds = $100).
class WithdrawalScreen extends StatefulWidget {
  const WithdrawalScreen({super.key});

  @override
  State<WithdrawalScreen> createState() => _WithdrawalScreenState();
}

class _WithdrawalScreenState extends State<WithdrawalScreen> {
  static const int minDiamonds = 10000;
  static const int diamondsPerUsd = 100;

  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _accountNameController = TextEditingController();
  final _accountNumberController = TextEditingController();
  final _bankNameController = TextEditingController();
  final _swiftController = TextEditingController();
  final _paypalController = TextEditingController();
  final _usdtController = TextEditingController();

  String _method = 'BANK';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _amountController.dispose();
    _accountNameController.dispose();
    _accountNumberController.dispose();
    _bankNameController.dispose();
    _swiftController.dispose();
    _paypalController.dispose();
    _usdtController.dispose();
    super.dispose();
  }

  double get _amountUsd {
    final amount = int.tryParse(_amountController.text.trim()) ?? 0;
    return amount / diamondsPerUsd;
  }

  Future<void> _submit() async {
    final user = AuthService().currentUser;
    if (user == null) return;
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final amount = int.parse(_amountController.text.trim());
    if (amount < minDiamonds) {
      _showError('Minimum withdrawal is ${minDiamonds.toString()} diamonds.');
      return;
    }
    if (amount > user.diamonds) {
      _showError('You only have ${user.diamonds} diamonds available.');
      return;
    }

    Map<String, dynamic> details;
    if (_method == 'BANK') {
      details = {
        'accountName': _accountNameController.text.trim(),
        'accountNumberOrIBAN': _accountNumberController.text.trim(),
        'bankName': _bankNameController.text.trim(),
        if (_swiftController.text.trim().isNotEmpty) 'swiftCode': _swiftController.text.trim(),
      };
    } else if (_method == 'PAYPAL') {
      details = {
        'accountName': _accountNameController.text.trim(),
        'paypalEmail': _paypalController.text.trim(),
      };
    } else {
      details = {
        'accountName': _accountNameController.text.trim(),
        'usdtTrc20Address': _usdtController.text.trim(),
      };
    }

    setState(() => _isSubmitting = true);
    final ok = await ApiService().requestWithdrawal(
      userId: user.id,
      amountDiamonds: amount,
      paymentMethod: _method,
      accountDetails: details,
    );
    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (ok) {
      await AuthService().refreshCurrentUser();
      if (!mounted) return;
      await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: LiveColors.backgroundElevated,
          title: const Text('Withdrawal requested', style: TextStyle(color: Colors.white)),
          content: Text(
            'Your request for ${amount.toString()} 💎 (\$${_amountUsd.toStringAsFixed(2)}) has been sent to the payouts desk. '
            'You will be notified once it is reviewed.',
            style: const TextStyle(color: Colors.white70, fontSize: 13),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              style: TextButton.styleFrom(foregroundColor: LiveColors.accentPink),
              child: const Text('Done'),
            ),
          ],
        ),
      );
      if (mounted) Navigator.pop(context);
    } else {
      _showError('Could not submit your withdrawal request. Please try again.');
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(backgroundColor: Colors.redAccent, content: Text(message)),
    );
  }

  InputDecoration _decoration(String label, {String? hint, String? prefix}) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixText: prefix,
      labelStyle: const TextStyle(color: Colors.white54),
      hintStyle: const TextStyle(color: Colors.white30),
      filled: true,
      fillColor: LiveColors.backgroundInput,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;
    final diamonds = user?.diamonds ?? 0;

    return Scaffold(
      backgroundColor: LiveColors.background,
      appBar: AppBar(
        backgroundColor: LiveColors.background,
        elevation: 0,
        title: const Text('Cash Out Diamonds'),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
            children: [
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: LiveColors.primaryGradient,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.diamond_rounded, color: Colors.white, size: 34),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'AVAILABLE BALANCE',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.1,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$diamonds 💎',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _amountController,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                style: const TextStyle(color: Colors.white),
                onChanged: (_) => setState(() {}),
                decoration: _decoration(
                  'Amount in diamonds',
                  hint: 'Minimum $minDiamonds',
                  prefix: '💎 ',
                ),
                validator: (value) {
                  final amount = int.tryParse((value ?? '').trim());
                  if (amount == null || amount <= 0) return 'Enter a valid amount';
                  if (amount < minDiamonds) return 'Minimum is $minDiamonds diamonds';
                  if (amount > diamonds) return 'Exceeds your available balance';
                  return null;
                },
              ),
              const SizedBox(height: 8),
              Text(
                'You will receive \$${_amountUsd.toStringAsFixed(2)} USD '
                '(100 💎 = \$1 USD). Payouts are reviewed within 1–3 business days.',
                style: const TextStyle(color: Colors.white54, fontSize: 11),
              ),
              const SizedBox(height: 20),
              const Text(
                'PAYOUT METHOD',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: LiveColors.backgroundInput,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _method,
                    isExpanded: true,
                    dropdownColor: LiveColors.backgroundElevated,
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                    items: const [
                      DropdownMenuItem(value: 'BANK', child: Text('Bank transfer')),
                      DropdownMenuItem(value: 'PAYPAL', child: Text('PayPal')),
                      DropdownMenuItem(value: 'USDT', child: Text('USDT (TRC20)')),
                    ],
                    onChanged: (value) {
                      if (value != null) setState(() => _method = value);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _accountNameController,
                style: const TextStyle(color: Colors.white),
                decoration: _decoration('Account holder name'),
                validator: (value) =>
                    (value ?? '').trim().isEmpty ? 'Account name is required' : null,
              ),
              const SizedBox(height: 12),
              if (_method == 'BANK') ...[
                TextFormField(
                  controller: _accountNumberController,
                  style: const TextStyle(color: Colors.white),
                  decoration: _decoration('IBAN / Account number'),
                  validator: (value) =>
                      (value ?? '').trim().isEmpty ? 'Account number is required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _bankNameController,
                  style: const TextStyle(color: Colors.white),
                  decoration: _decoration('Bank name'),
                  validator: (value) =>
                      (value ?? '').trim().isEmpty ? 'Bank name is required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _swiftController,
                  style: const TextStyle(color: Colors.white),
                  decoration: _decoration('SWIFT / BIC (optional)'),
                ),
              ] else if (_method == 'PAYPAL') ...[
                TextFormField(
                  controller: _paypalController,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: Colors.white),
                  decoration: _decoration('PayPal email'),
                  validator: (value) {
                    final email = (value ?? '').trim();
                    if (email.isEmpty) return 'PayPal email is required';
                    if (!email.contains('@')) return 'Enter a valid email';
                    return null;
                  },
                ),
              ] else ...[
                TextFormField(
                  controller: _usdtController,
                  style: const TextStyle(color: Colors.white),
                  decoration: _decoration('USDT TRC20 wallet address'),
                  validator: (value) =>
                      (value ?? '').trim().isEmpty ? 'Wallet address is required' : null,
                ),
              ],
              const SizedBox(height: 28),
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: LiveColors.accentPink,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Request Withdrawal',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
