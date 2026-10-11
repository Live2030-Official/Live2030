import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../localization/app_locale_service.dart';

class CountryItem {
  final String name;
  final String dialCode;
  final String code;
  final String flag;

  const CountryItem({
    required this.name,
    required this.dialCode,
    required this.code,
    required this.flag,
  });
}

class CountryCodePicker {
  static const List<CountryItem> popularCountries = [
    CountryItem(name: 'India', dialCode: '+91', code: 'IN', flag: '🇮🇳'),
    CountryItem(name: 'United States', dialCode: '+1', code: 'US', flag: '🇺🇸'),
    CountryItem(name: 'United Kingdom', dialCode: '+44', code: 'GB', flag: '🇬🇧'),
    CountryItem(name: 'United Arab Emirates', dialCode: '+971', code: 'AE', flag: '🇦🇪'),
    CountryItem(name: 'Saudi Arabia', dialCode: '+966', code: 'SA', flag: '🇸🇦'),
    CountryItem(name: 'Canada', dialCode: '+1', code: 'CA', flag: '🇨🇦'),
    CountryItem(name: 'Pakistan', dialCode: '+92', code: 'PK', flag: '🇵🇰'),
    CountryItem(name: 'Bangladesh', dialCode: '+880', code: 'BD', flag: '🇧🇩'),
    CountryItem(name: 'Nigeria', dialCode: '+234', code: 'NG', flag: '🇳🇬'),
    CountryItem(name: 'Indonesia', dialCode: '+62', code: 'ID', flag: '🇮🇩'),
    CountryItem(name: 'Philippines', dialCode: '+63', code: 'PH', flag: '🇵🇭'),
    CountryItem(name: 'Brazil', dialCode: '+55', code: 'BR', flag: '🇧🇷'),
    CountryItem(name: 'Germany', dialCode: '+49', code: 'DE', flag: '🇩🇪'),
  ];

  static const List<CountryItem> allCountries = [
    CountryItem(name: 'Afghanistan', dialCode: '+93', code: 'AF', flag: '🇦🇫'),
    CountryItem(name: 'Albania', dialCode: '+355', code: 'AL', flag: '🇦🇱'),
    CountryItem(name: 'Algeria', dialCode: '+213', code: 'DZ', flag: '🇩🇿'),
    CountryItem(name: 'American Samoa', dialCode: '+1684', code: 'AS', flag: '🇦🇸'),
    CountryItem(name: 'Andorra', dialCode: '+376', code: 'AD', flag: '🇦🇩'),
    CountryItem(name: 'Angola', dialCode: '+244', code: 'AO', flag: '🇦🇴'),
    CountryItem(name: 'Anguilla', dialCode: '+1264', code: 'AI', flag: '🇦🇮'),
    CountryItem(name: 'Antigua and Barbuda', dialCode: '+1268', code: 'AG', flag: '🇦🇬'),
    CountryItem(name: 'Argentina', dialCode: '+54', code: 'AR', flag: '🇦🇷'),
    CountryItem(name: 'Armenia', dialCode: '+374', code: 'AM', flag: '🇦🇲'),
    CountryItem(name: 'Aruba', dialCode: '+297', code: 'AW', flag: '🇦🇼'),
    CountryItem(name: 'Australia', dialCode: '+61', code: 'AU', flag: '🇦🇺'),
    CountryItem(name: 'Austria', dialCode: '+43', code: 'AT', flag: '🇦🇹'),
    CountryItem(name: 'Azerbaijan', dialCode: '+994', code: 'AZ', flag: '🇦🇿'),
    CountryItem(name: 'Bahamas', dialCode: '+1242', code: 'BS', flag: '🇧🇸'),
    CountryItem(name: 'Bahrain', dialCode: '+973', code: 'BH', flag: '🇧🇭'),
    CountryItem(name: 'Bangladesh', dialCode: '+880', code: 'BD', flag: '🇧🇩'),
    CountryItem(name: 'Barbados', dialCode: '+1246', code: 'BB', flag: '🇧🇧'),
    CountryItem(name: 'Belarus', dialCode: '+375', code: 'BY', flag: '🇧🇾'),
    CountryItem(name: 'Belgium', dialCode: '+32', code: 'BE', flag: '🇧🇪'),
    CountryItem(name: 'Belize', dialCode: '+501', code: 'BZ', flag: '🇧🇿'),
    CountryItem(name: 'Benin', dialCode: '+229', code: 'BJ', flag: '🇧🇯'),
    CountryItem(name: 'Bermuda', dialCode: '+1441', code: 'BM', flag: '🇧🇲'),
    CountryItem(name: 'Bhutan', dialCode: '+975', code: 'BT', flag: '🇧🇹'),
    CountryItem(name: 'Bolivia', dialCode: '+591', code: 'BO', flag: '🇧🇴'),
    CountryItem(name: 'Bosnia and Herzegovina', dialCode: '+387', code: 'BA', flag: '🇧🇦'),
    CountryItem(name: 'Botswana', dialCode: '+267', code: 'BW', flag: '🇧🇼'),
    CountryItem(name: 'Brazil', dialCode: '+55', code: 'BR', flag: '🇧🇷'),
    CountryItem(name: 'British Virgin Islands', dialCode: '+1284', code: 'VG', flag: '🇻🇬'),
    CountryItem(name: 'Brunei', dialCode: '+673', code: 'BN', flag: '🇧🇳'),
    CountryItem(name: 'Bulgaria', dialCode: '+359', code: 'BG', flag: '🇧🇬'),
    CountryItem(name: 'Burkina Faso', dialCode: '+226', code: 'BF', flag: '🇧🇫'),
    CountryItem(name: 'Burundi', dialCode: '+257', code: 'BI', flag: '🇧🇮'),
    CountryItem(name: 'Cambodia', dialCode: '+855', code: 'KH', flag: '🇰🇭'),
    CountryItem(name: 'Cameroon', dialCode: '+237', code: 'CM', flag: '🇨🇲'),
    CountryItem(name: 'Canada', dialCode: '+1', code: 'CA', flag: '🇨🇦'),
    CountryItem(name: 'Cape Verde', dialCode: '+238', code: 'CV', flag: '🇨🇻'),
    CountryItem(name: 'Cayman Islands', dialCode: '+1345', code: 'KY', flag: '🇰🇾'),
    CountryItem(name: 'Central African Republic', dialCode: '+236', code: 'CF', flag: '🇨🇫'),
    CountryItem(name: 'Chad', dialCode: '+235', code: 'TD', flag: '🇹🇩'),
    CountryItem(name: 'Chile', dialCode: '+56', code: 'CL', flag: '🇨🇱'),
    CountryItem(name: 'China', dialCode: '+86', code: 'CN', flag: '🇨🇳'),
    CountryItem(name: 'Colombia', dialCode: '+57', code: 'CO', flag: '🇨🇴'),
    CountryItem(name: 'Comoros', dialCode: '+269', code: 'KM', flag: '🇰🇲'),
    CountryItem(name: 'Congo', dialCode: '+242', code: 'CG', flag: '🇨🇬'),
    CountryItem(name: 'DR Congo', dialCode: '+243', code: 'CD', flag: '🇨🇩'),
    CountryItem(name: 'Cook Islands', dialCode: '+682', code: 'CK', flag: '🇨🇰'),
    CountryItem(name: 'Costa Rica', dialCode: '+506', code: 'CR', flag: '🇨🇷'),
    CountryItem(name: 'Croatia', dialCode: '+385', code: 'HR', flag: '🇭🇷'),
    CountryItem(name: 'Cuba', dialCode: '+53', code: 'CU', flag: '🇨🇺'),
    CountryItem(name: 'Cyprus', dialCode: '+357', code: 'CY', flag: '🇨🇾'),
    CountryItem(name: 'Czech Republic', dialCode: '+420', code: 'CZ', flag: '🇨🇿'),
    CountryItem(name: 'Denmark', dialCode: '+45', code: 'DK', flag: '🇩🇰'),
    CountryItem(name: 'Djibouti', dialCode: '+253', code: 'DJ', flag: '🇩🇯'),
    CountryItem(name: 'Dominica', dialCode: '+1767', code: 'DM', flag: '🇩🇲'),
    CountryItem(name: 'Dominican Republic', dialCode: '+1809', code: 'DO', flag: '🇩🇴'),
    CountryItem(name: 'Ecuador', dialCode: '+593', code: 'EC', flag: '🇪🇨'),
    CountryItem(name: 'Egypt', dialCode: '+20', code: 'EG', flag: '🇪🇬'),
    CountryItem(name: 'El Salvador', dialCode: '+503', code: 'SV', flag: '🇸🇻'),
    CountryItem(name: 'Equatorial Guinea', dialCode: '+240', code: 'GQ', flag: '🇬🇶'),
    CountryItem(name: 'Eritrea', dialCode: '+291', code: 'ER', flag: '🇪🇷'),
    CountryItem(name: 'Estonia', dialCode: '+372', code: 'EE', flag: '🇪🇪'),
    CountryItem(name: 'Eswatini', dialCode: '+268', code: 'SZ', flag: '🇸🇿'),
    CountryItem(name: 'Ethiopia', dialCode: '+251', code: 'ET', flag: '🇪🇹'),
    CountryItem(name: 'Fiji', dialCode: '+679', code: 'FJ', flag: '🇫🇯'),
    CountryItem(name: 'Finland', dialCode: '+358', code: 'FI', flag: '🇫🇮'),
    CountryItem(name: 'France', dialCode: '+33', code: 'FR', flag: '🇫🇷'),
    CountryItem(name: 'Gabon', dialCode: '+241', code: 'GA', flag: '🇬🇦'),
    CountryItem(name: 'Gambia', dialCode: '+220', code: 'GM', flag: '🇬🇲'),
    CountryItem(name: 'Georgia', dialCode: '+995', code: 'GE', flag: '🇬🇪'),
    CountryItem(name: 'Germany', dialCode: '+49', code: 'DE', flag: '🇩🇪'),
    CountryItem(name: 'Ghana', dialCode: '+233', code: 'GH', flag: '🇬🇭'),
    CountryItem(name: 'Gibraltar', dialCode: '+350', code: 'GI', flag: '🇬🇮'),
    CountryItem(name: 'Greece', dialCode: '+30', code: 'GR', flag: '🇬🇷'),
    CountryItem(name: 'Greenland', dialCode: '+299', code: 'GL', flag: '🇬🇱'),
    CountryItem(name: 'Grenada', dialCode: '+1473', code: 'GD', flag: '🇬🇩'),
    CountryItem(name: 'Guam', dialCode: '+1671', code: 'GU', flag: '🇬🇺'),
    CountryItem(name: 'Guatemala', dialCode: '+502', code: 'GT', flag: '🇬🇹'),
    CountryItem(name: 'Guinea', dialCode: '+224', code: 'GN', flag: '🇬🇳'),
    CountryItem(name: 'Guinea-Bissau', dialCode: '+245', code: 'GW', flag: '🇬🇼'),
    CountryItem(name: 'Guyana', dialCode: '+592', code: 'GY', flag: '🇬🇾'),
    CountryItem(name: 'Haiti', dialCode: '+509', code: 'HT', flag: '🇭🇹'),
    CountryItem(name: 'Honduras', dialCode: '+504', code: 'HN', flag: '🇭🇳'),
    CountryItem(name: 'Hong Kong', dialCode: '+852', code: 'HK', flag: '🇭🇰'),
    CountryItem(name: 'Hungary', dialCode: '+36', code: 'HU', flag: '🇭🇺'),
    CountryItem(name: 'Iceland', dialCode: '+354', code: 'IS', flag: '🇮🇸'),
    CountryItem(name: 'India', dialCode: '+91', code: 'IN', flag: '🇮🇳'),
    CountryItem(name: 'Indonesia', dialCode: '+62', code: 'ID', flag: '🇮🇩'),
    CountryItem(name: 'Iran', dialCode: '+98', code: 'IR', flag: '🇮🇷'),
    CountryItem(name: 'Iraq', dialCode: '+964', code: 'IQ', flag: '🇮🇶'),
    CountryItem(name: 'Ireland', dialCode: '+353', code: 'IE', flag: '🇮🇪'),
    CountryItem(name: 'Israel', dialCode: '+972', code: 'IL', flag: '🇮🇱'),
    CountryItem(name: 'Italy', dialCode: '+39', code: 'IT', flag: '🇮🇹'),
    CountryItem(name: 'Ivory Coast', dialCode: '+225', code: 'CI', flag: '🇨🇮'),
    CountryItem(name: 'Jamaica', dialCode: '+1876', code: 'JM', flag: '🇯🇲'),
    CountryItem(name: 'Japan', dialCode: '+81', code: 'JP', flag: '🇯🇵'),
    CountryItem(name: 'Jordan', dialCode: '+962', code: 'JO', flag: '🇯🇴'),
    CountryItem(name: 'Kazakhstan', dialCode: '+7', code: 'KZ', flag: '🇰🇿'),
    CountryItem(name: 'Kenya', dialCode: '+254', code: 'KE', flag: '🇰🇪'),
    CountryItem(name: 'Kiribati', dialCode: '+686', code: 'KI', flag: '🇰🇮'),
    CountryItem(name: 'Kosovo', dialCode: '+383', code: 'XK', flag: '🇽🇰'),
    CountryItem(name: 'Kuwait', dialCode: '+965', code: 'KW', flag: '🇰🇼'),
    CountryItem(name: 'Kyrgyzstan', dialCode: '+996', code: 'KG', flag: '🇰🇬'),
    CountryItem(name: 'Laos', dialCode: '+856', code: 'LA', flag: '🇱🇦'),
    CountryItem(name: 'Latvia', dialCode: '+371', code: 'LV', flag: '🇱🇻'),
    CountryItem(name: 'Lebanon', dialCode: '+961', code: 'LB', flag: '🇱🇧'),
    CountryItem(name: 'Lesotho', dialCode: '+266', code: 'LS', flag: '🇱🇸'),
    CountryItem(name: 'Liberia', dialCode: '+231', code: 'LR', flag: '🇱🇷'),
    CountryItem(name: 'Libya', dialCode: '+218', code: 'LY', flag: '🇱🇾'),
    CountryItem(name: 'Liechtenstein', dialCode: '+423', code: 'LI', flag: '🇱🇮'),
    CountryItem(name: 'Lithuania', dialCode: '+370', code: 'LT', flag: '🇱🇹'),
    CountryItem(name: 'Luxembourg', dialCode: '+352', code: 'LU', flag: '🇱🇺'),
    CountryItem(name: 'Macau', dialCode: '+853', code: 'MO', flag: '🇲🇴'),
    CountryItem(name: 'Madagascar', dialCode: '+261', code: 'MG', flag: '🇲🇬'),
    CountryItem(name: 'Malawi', dialCode: '+265', code: 'MW', flag: '🇲🇼'),
    CountryItem(name: 'Malaysia', dialCode: '+60', code: 'MY', flag: '🇲🇾'),
    CountryItem(name: 'Maldives', dialCode: '+960', code: 'MV', flag: '🇲🇻'),
    CountryItem(name: 'Mali', dialCode: '+223', code: 'ML', flag: '🇲🇱'),
    CountryItem(name: 'Malta', dialCode: '+356', code: 'MT', flag: '🇲🇹'),
    CountryItem(name: 'Mauritania', dialCode: '+222', code: 'MR', flag: '🇲🇷'),
    CountryItem(name: 'Mauritius', dialCode: '+230', code: 'MU', flag: '🇲🇺'),
    CountryItem(name: 'Mexico', dialCode: '+52', code: 'MX', flag: '🇲🇽'),
    CountryItem(name: 'Moldova', dialCode: '+373', code: 'MD', flag: '🇲🇩'),
    CountryItem(name: 'Monaco', dialCode: '+377', code: 'MC', flag: '🇲🇨'),
    CountryItem(name: 'Mongolia', dialCode: '+976', code: 'MN', flag: '🇲🇳'),
    CountryItem(name: 'Montenegro', dialCode: '+382', code: 'ME', flag: '🇲🇪'),
    CountryItem(name: 'Morocco', dialCode: '+212', code: 'MA', flag: '🇲🇦'),
    CountryItem(name: 'Mozambique', dialCode: '+258', code: 'MZ', flag: '🇲🇿'),
    CountryItem(name: 'Myanmar', dialCode: '+95', code: 'MM', flag: '🇲🇲'),
    CountryItem(name: 'Namibia', dialCode: '+264', code: 'NA', flag: '🇳🇦'),
    CountryItem(name: 'Nepal', dialCode: '+977', code: 'NP', flag: '🇳🇵'),
    CountryItem(name: 'Netherlands', dialCode: '+31', code: 'NL', flag: '🇳🇱'),
    CountryItem(name: 'New Zealand', dialCode: '+64', code: 'NZ', flag: '🇳🇿'),
    CountryItem(name: 'Nicaragua', dialCode: '+505', code: 'NI', flag: '🇳🇮'),
    CountryItem(name: 'Niger', dialCode: '+227', code: 'NE', flag: '🇳🇪'),
    CountryItem(name: 'Nigeria', dialCode: '+234', code: 'NG', flag: '🇳🇬'),
    CountryItem(name: 'North Macedonia', dialCode: '+389', code: 'MK', flag: '🇲🇰'),
    CountryItem(name: 'Norway', dialCode: '+47', code: 'NO', flag: '🇳🇴'),
    CountryItem(name: 'Oman', dialCode: '+968', code: 'OM', flag: '🇴🇲'),
    CountryItem(name: 'Pakistan', dialCode: '+92', code: 'PK', flag: '🇵🇰'),
    CountryItem(name: 'Palestine', dialCode: '+970', code: 'PS', flag: '🇵🇸'),
    CountryItem(name: 'Panama', dialCode: '+507', code: 'PA', flag: '🇵🇦'),
    CountryItem(name: 'Papua New Guinea', dialCode: '+675', code: 'PG', flag: '🇵🇬'),
    CountryItem(name: 'Paraguay', dialCode: '+595', code: 'PY', flag: '🇵🇾'),
    CountryItem(name: 'Peru', dialCode: '+51', code: 'PE', flag: '🇵🇪'),
    CountryItem(name: 'Philippines', dialCode: '+63', code: 'PH', flag: '🇵🇭'),
    CountryItem(name: 'Poland', dialCode: '+48', code: 'PL', flag: '🇵🇱'),
    CountryItem(name: 'Portugal', dialCode: '+351', code: 'PT', flag: '🇵🇹'),
    CountryItem(name: 'Puerto Rico', dialCode: '+1787', code: 'PR', flag: '🇵🇷'),
    CountryItem(name: 'Qatar', dialCode: '+974', code: 'QA', flag: '🇶🇦'),
    CountryItem(name: 'Romania', dialCode: '+40', code: 'RO', flag: '🇷🇴'),
    CountryItem(name: 'Russia', dialCode: '+7', code: 'RU', flag: '🇷🇺'),
    CountryItem(name: 'Rwanda', dialCode: '+250', code: 'RW', flag: '🇷🇼'),
    CountryItem(name: 'Samoa', dialCode: '+685', code: 'WS', flag: '🇼🇸'),
    CountryItem(name: 'San Marino', dialCode: '+378', code: 'SM', flag: '🇸🇲'),
    CountryItem(name: 'Saudi Arabia', dialCode: '+966', code: 'SA', flag: '🇸🇦'),
    CountryItem(name: 'Senegal', dialCode: '+221', code: 'SN', flag: '🇸🇳'),
    CountryItem(name: 'Serbia', dialCode: '+381', code: 'RS', flag: '🇷🇸'),
    CountryItem(name: 'Seychelles', dialCode: '+248', code: 'SC', flag: '🇸🇨'),
    CountryItem(name: 'Sierra Leone', dialCode: '+232', code: 'SL', flag: '🇸🇱'),
    CountryItem(name: 'Singapore', dialCode: '+65', code: 'SG', flag: '🇸🇬'),
    CountryItem(name: 'Slovakia', dialCode: '+421', code: 'SK', flag: '🇸🇰'),
    CountryItem(name: 'Slovenia', dialCode: '+386', code: 'SI', flag: '🇸🇮'),
    CountryItem(name: 'Somalia', dialCode: '+252', code: 'SO', flag: '🇸🇴'),
    CountryItem(name: 'South Africa', dialCode: '+27', code: 'ZA', flag: '🇿🇦'),
    CountryItem(name: 'South Korea', dialCode: '+82', code: 'KR', flag: '🇰🇷'),
    CountryItem(name: 'South Sudan', dialCode: '+211', code: 'SS', flag: '🇸🇸'),
    CountryItem(name: 'Spain', dialCode: '+34', code: 'ES', flag: '🇪🇸'),
    CountryItem(name: 'Sri Lanka', dialCode: '+94', code: 'LK', flag: '🇱🇰'),
    CountryItem(name: 'Sudan', dialCode: '+249', code: 'SD', flag: '🇸🇩'),
    CountryItem(name: 'Suriname', dialCode: '+597', code: 'SR', flag: '🇸🇷'),
    CountryItem(name: 'Sweden', dialCode: '+46', code: 'SE', flag: '🇸🇪'),
    CountryItem(name: 'Switzerland', dialCode: '+41', code: 'CH', flag: '🇨🇭'),
    CountryItem(name: 'Syria', dialCode: '+963', code: 'SY', flag: '🇸🇾'),
    CountryItem(name: 'Taiwan', dialCode: '+886', code: 'TW', flag: '🇹🇼'),
    CountryItem(name: 'Tajikistan', dialCode: '+992', code: 'TJ', flag: '🇹🇯'),
    CountryItem(name: 'Tanzania', dialCode: '+255', code: 'TZ', flag: '🇹🇿'),
    CountryItem(name: 'Thailand', dialCode: '+66', code: 'TH', flag: '🇹🇭'),
    CountryItem(name: 'Togo', dialCode: '+228', code: 'TG', flag: '🇹🇬'),
    CountryItem(name: 'Trinidad and Tobago', dialCode: '+1868', code: 'TT', flag: '🇹🇹'),
    CountryItem(name: 'Tunisia', dialCode: '+216', code: 'TN', flag: '🇹🇳'),
    CountryItem(name: 'Turkey', dialCode: '+90', code: 'TR', flag: '🇹🇷'),
    CountryItem(name: 'Turkmenistan', dialCode: '+993', code: 'TM', flag: '🇹🇲'),
    CountryItem(name: 'Uganda', dialCode: '+256', code: 'UG', flag: '🇺🇬'),
    CountryItem(name: 'Ukraine', dialCode: '+380', code: 'UA', flag: '🇺🇦'),
    CountryItem(name: 'United Arab Emirates', dialCode: '+971', code: 'AE', flag: '🇦🇪'),
    CountryItem(name: 'United Kingdom', dialCode: '+44', code: 'GB', flag: '🇬🇧'),
    CountryItem(name: 'United States', dialCode: '+1', code: 'US', flag: '🇺🇸'),
    CountryItem(name: 'Uruguay', dialCode: '+598', code: 'UY', flag: '🇺🇾'),
    CountryItem(name: 'Uzbekistan', dialCode: '+998', code: 'UZ', flag: '🇺🇿'),
    CountryItem(name: 'Vanuatu', dialCode: '+678', code: 'VU', flag: '🇻🇺'),
    CountryItem(name: 'Vatican City', dialCode: '+39', code: 'VA', flag: '🇻🇦'),
    CountryItem(name: 'Venezuela', dialCode: '+58', code: 'VE', flag: '🇻🇪'),
    CountryItem(name: 'Vietnam', dialCode: '+84', code: 'VN', flag: '🇻🇳'),
    CountryItem(name: 'Yemen', dialCode: '+967', code: 'YE', flag: '🇾🇪'),
    CountryItem(name: 'Zambia', dialCode: '+260', code: 'ZM', flag: '🇿🇲'),
    CountryItem(name: 'Zimbabwe', dialCode: '+263', code: 'ZW', flag: '🇿🇼'),
  ];

  /// Find country by dial code (fallback to India if not found)
  static CountryItem findByDialCode(String dialCode) {
    return allCountries.firstWhere(
      (c) => c.dialCode == dialCode,
      orElse: () => const CountryItem(name: 'India', dialCode: '+91', code: 'IN', flag: '🇮🇳'),
    );
  }

  /// Displays the full searchable bottom sheet for picking a country code
  static Future<CountryItem?> showPicker({
    required BuildContext context,
    CountryItem? selectedCountry,
  }) {
    return showModalBottomSheet<CountryItem>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _CountryPickerSheet(selectedCountry: selectedCountry),
    );
  }
}

class _CountryPickerSheet extends StatefulWidget {
  final CountryItem? selectedCountry;

  const _CountryPickerSheet({this.selectedCountry});

  @override
  State<_CountryPickerSheet> createState() => _CountryPickerSheetState();
}

class _CountryPickerSheetState extends State<_CountryPickerSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<CountryItem> _filteredCountries = CountryCodePicker.allCountries;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) {
      setState(() {
        _filteredCountries = CountryCodePicker.allCountries;
      });
      return;
    }

    setState(() {
      _filteredCountries = CountryCodePicker.allCountries.where((c) {
        final matchName = c.name.toLowerCase().contains(query);
        final matchDial = c.dialCode.toLowerCase().contains(query);
        final matchIso = c.code.toLowerCase().contains(query);
        return matchName || matchDial || matchIso;
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isSearching = _searchController.text.trim().isNotEmpty;

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(
          top: BorderSide(color: Color(0xFF334155), width: 1.5),
        ),
      ),
      child: Column(
        children: [
          // Drag Handle
          const SizedBox(height: 12),
          Container(
            width: 42,
            height: 4.5,
            decoration: BoxDecoration(
              color: Colors.white24,
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          const SizedBox(height: 14),

          // Header Title
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Select Country Code',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Search across 200+ countries and territories',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        color: LiveColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white70),
                  onPressed: () => Navigator.pop(context),
                  tooltip: 'Close'.tr,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Search Input Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              height: 48,
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: TextField(
                controller: _searchController,
                style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Search country name, code or +dial (e.g. India, +1)...'.tr,
                  hintStyle: GoogleFonts.plusJakartaSans(color: Colors.white38, fontSize: 12),
                  prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF6366F1), size: 20),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, color: Colors.white54, size: 16),
                          onPressed: () => _searchController.clear(),
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Countries List
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: [
                // Quick Popular Section (only shown when not actively searching)
                if (!isSearching) ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    child: Text(
                      'POPULAR COUNTRIES',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.1,
                        color: const Color(0xFF818CF8),
                      ),
                    ),
                  ),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: CountryCodePicker.popularCountries.map((c) {
                      final isSelected = widget.selectedCountry?.dialCode == c.dialCode &&
                          (widget.selectedCountry?.code == c.code || widget.selectedCountry == null);

                      return InkWell(
                        onTap: () => Navigator.pop(context, c),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? const Color(0xFF6366F1).withValues(alpha: 0.25)
                                : const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected ? const Color(0xFF6366F1) : const Color(0xFF334155),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(c.flag, style: const TextStyle(fontSize: 14)),
                              const SizedBox(width: 6),
                              Text(
                                '${c.name} (${c.dialCode})',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: isSelected ? Colors.white : Colors.white70,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    child: Text(
                      'ALL COUNTRIES (A-Z)',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.1,
                        color: LiveColors.textSecondary,
                      ),
                    ),
                  ),
                ],

                // Full Filtered List
                if (_filteredCountries.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 40),
                    child: Column(
                      children: [
                        const Icon(Icons.search_off_rounded, size: 48, color: Colors.white24),
                        const SizedBox(height: 10),
                        Text(
                          'No country matches "${_searchController.text}"',
                          style: GoogleFonts.plusJakartaSans(
                            color: Colors.white54,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  ..._filteredCountries.map((c) {
                    final isSelected = widget.selectedCountry?.dialCode == c.dialCode &&
                        widget.selectedCountry?.code == c.code;

                    return Container(
                      margin: const EdgeInsets.symmetric(vertical: 2),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? const Color(0xFF6366F1).withValues(alpha: 0.15)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListTile(
                        dense: true,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                        leading: Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFF334155)),
                          ),
                          alignment: Alignment.center,
                          child: Text(c.flag, style: const TextStyle(fontSize: 20)),
                        ),
                        title: Text(
                          c.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.plusJakartaSans(
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                            fontSize: 13,
                            color: Colors.white,
                          ),
                        ),
                        subtitle: Text(
                          '${c.code} • ${c.dialCode}',
                          style: GoogleFonts.firaCode(
                            fontSize: 11,
                            color: const Color(0xFF10B981),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              c.dialCode,
                              style: GoogleFonts.firaCode(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(width: 8),
                            if (isSelected)
                              const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 18)
                            else
                              const Icon(Icons.chevron_right_rounded, color: Colors.white24, size: 18),
                          ],
                        ),
                        onTap: () => Navigator.pop(context, c),
                      ),
                    );
                  }),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
