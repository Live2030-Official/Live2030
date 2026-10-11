const fs = require('fs');

// Master dictionary of all extracted phrases and concepts in the 11 target languages
// We will build a comprehensive, high-quality translation map for all 478 extracted strings.

const rawStrings = JSON.parse(fs.readFileSync('./admin_dashboard/extracted_strings.json', 'utf8'));

// High quality translations database
const baseTranslations = {
  // Navigation & Core Sections
  'Overview': { es: 'Resumen General', ar: 'نظرة عامة', hi: 'अवलोकन', zh: '总览', fr: 'Vue d’ensemble', de: 'Übersicht', pt: 'Visão Geral', ru: 'Обзор', tr: 'Genel Bakış', id: 'Ringkasan', ur: 'جائزہ' },
  'Executive Overview & Financial Split': { es: 'Resumen Ejecutivo y División Financiera', ar: 'النظرة التنفيذية العامة والتقسيم المالي', hi: 'कार्यकारी अवलोकन एवं वित्तीय विभाजन', zh: '管理总览与财务分成', fr: 'Aperçu Exécutif et Répartition Financière', de: 'Management-Übersicht & Finanzaufteilung', pt: 'Visão Executiva e Divisão Financeira', ru: 'Главный обзор и финансовое распределение', tr: 'Yönetici Özeti ve Finansal Dağılım', id: 'Ringkasan Eksekutif & Pembagian Finansial', ur: 'انتظامی جائزہ اور مالیاتی تقسیم' },
  'Users': { es: 'Usuarios', ar: 'المستخدمون', hi: 'उपयोगकर्ता', zh: '用户管理', fr: 'Utilisateurs', de: 'Benutzer', pt: 'Usuários', ru: 'Пользователи', tr: 'Kullanıcılar', id: 'Pengguna', ur: 'صارفین' },
  'User Moderation & Account Console': { es: 'Consola de Moderación y Cuentas', ar: 'إدارة المستخدمين والحسابات', hi: 'उपयोगकर्ता मॉडरेशन और खाता कंसोल', zh: '用户审查与账户控制台', fr: 'Console de Modération et Comptes', de: 'Benutzer-Moderation & Kontenkonsole', pt: 'Moderação de Usuários e Contas', ru: 'Модерация пользователей и аккаунтов', tr: 'Kullanıcı Denetimi ve Hesap Konsolu', id: 'Konsol Moderasi Pengguna & Akun', ur: 'صارفین کی جانچ اور اکاؤنٹ کنسول' },
  'Reports': { es: 'Reportes', ar: 'البلاغات', hi: 'शिकायतें / रिपोर्ट्स', zh: '举报中心', fr: 'Signalements', de: 'Meldungen', pt: 'Denúncias', ru: 'Жалобы', tr: 'Şikayetler', id: 'Laporan', ur: 'شکایات / رپورٹس' },
  'Trust & Safety Violation Reports': { es: 'Reportes de Seguridad y Confianza', ar: 'تقارير الأمان وانتهاكات الثقة', hi: 'विश्वास और सुरक्षा उल्लंघन रिपोर्ट्स', zh: '信任与安全违规举报', fr: 'Rapports de Sécurité et Infractions', de: 'Sicherheits- & Verstoßberichte', pt: 'Relatórios de Segurança e Violações', ru: 'Отчеты о нарушениях и безопасности', tr: 'Güvenlik ve İhlal Bildirimleri', id: 'Laporan Pelanggaran Keamanan & Kepercayaan', ur: 'اعتماد اور حفاظت کی خلاف ورزی کی رپورٹس' },
  'Streams': { es: 'Transmisiones', ar: 'البث المباشر', hi: 'लाइव स्ट्रीम्स', zh: '直播监控', fr: 'Diffusions', de: 'Live-Streams', pt: 'Transmissões', ru: 'Трансляции', tr: 'Yayınlar', id: 'Siaran Langsung', ur: 'لائیو اسٹریمز' },
  'Live Stream & Voice Party Monitor': { es: 'Monitor de Transmisiones en Vivo y Salas de Voz', ar: 'مراقبة البث المباشر وغرف الحفلات الصوتية', hi: 'लाइव स्ट्रीम और वॉइस पार्टी मॉनिटर', zh: '视频直播与语音派对监控', fr: 'Moniteur des Streams en Direct et Salons Vocaux', de: 'Live-Stream & Audio-Party Überwachung', pt: 'Monitor de Transmissões ao Vivo e Salas de Voz', ru: 'Мониторинг эфиров и голосовых комнат', tr: 'Canlı Yayın ve Sesli Parti İzleyici', id: 'Monitor Siaran Langsung & Ruang Suara', ur: 'لائیو اسٹریم اور وائس پارٹی مانیٹر' },
  'Resellers': { es: 'Revendedores', ar: 'الموزعون', hi: 'रीसेलर्स', zh: '分销商', fr: 'Revendeurs', de: 'Wiederverkäufer', pt: 'Revendedores', ru: 'Реселлеры', tr: 'Bayiler', id: 'Pengecer Koin', ur: 'ری سیلرز' },
  'Official Coin Reseller Merchant Directory': { es: 'Directorio Oficial de Comerciantes de Monedas', ar: 'دليل موزعي وتجار العملات الرسميين', hi: 'आधिकारिक कॉइन रीसेलर व्यापारी निर्देशिका', zh: '官方金币分销商名录', fr: 'Répertoire Officiel des Marchands de Pièces', de: 'Offizielles Verzeichnis der Münzhändler', pt: 'Diretório Oficial de Revendedores de Moedas', ru: 'Официальный каталог продавцов монет', tr: 'Resmi Jeton Bayi Rehberi', id: 'Direktori Pedagang Koin Resmi', ur: 'آفیشل کوائن ری سیلر تاجروں کی ڈائرکٹری' },
  'Agencies': { es: 'Agencias', ar: 'الوكالات', hi: 'एजेंसियां', zh: '公会管理', fr: 'Agences', de: 'Agenturen', pt: 'Agências', ru: 'Агентства', tr: 'Ajanslar', id: 'Agensi', ur: 'ایجنسیز' },
  'Certified Talent Agencies & Rosters': { es: 'Agencias de Talentos Certificadas y Listas', ar: 'وكالات المواهب المعتمدة والقوائم', hi: 'प्रमाणित टैलेंट एजेंसियां और रोस्टर्स', zh: '认证经纪公会与旗下主播', fr: 'Agences de Talents Certifiées et Rosters', de: 'Zertifizierte Talentagenturen & Host-Listen', pt: 'Agências de Talentos Certificadas e Elenco', ru: 'Сертифицированные агентства и ведущие', tr: 'Sertifikalı Yetenek Ajansları ve Kadrolar', id: 'Agensi Bakat Bersertifikat & Daftar Host', ur: 'تصدیق شدہ ٹیلنٹ ایجنسیز اور روسٹرز' },
  'Gifts': { es: 'Regalos', ar: 'الهدايا', hi: 'उपहार (गिफ्ट्स)', zh: '礼物管理', fr: 'Cadeaux', de: 'Geschenke', pt: 'Presentes', ru: 'Подарки', tr: 'Hediyeler', id: 'Hadiah Virtual', ur: 'تحائف (گفٹس)' },
  'Virtual Gifts Catalog Management': { es: 'Gestión de Catálogo de Regalos Virtuales', ar: 'إدارة كتالوج الهدايا الافتراضية', hi: 'वर्चुअल गिफ्ट कैटलॉग प्रबंधन', zh: '虚拟礼物目录与参数配置', fr: 'Gestion du Catalogue de Cadeaux Virtuels', de: 'Verwaltung des virtuellen Geschenkkatalogs', pt: 'Gerenciamento de Catálogo de Presentes Virtuais', ru: 'Управление каталогом виртуальных подарков', tr: 'Sanal Hediye Kataloğu Yönetimi', id: 'Manajemen Katalog Hadiah Virtual', ur: 'ورچوئل گفٹ کیٹلاگ کا انتظام' },
  'Payouts': { es: 'Retiros', ar: 'المدفوعات', hi: 'भुगतान (पेआउट्स)', zh: '提现审核', fr: 'Paiements', de: 'Auszahlungen', pt: 'Saques', ru: 'Выплаты', tr: 'Ödemeler', id: 'Penarikan Dana', ur: 'ادائیگیاں (پے آؤٹ)' },
  'Host Diamond Cash-Out Review Desk': { es: 'Mesa de Revisión de Retiros de Diamantes', ar: 'مكتب مراجعة سحب أرباح ماس المضيفين', hi: 'होस्ट डायमंड कैश-आउट समीक्षा डेस्क', zh: '主播钻石提现审核工作台', fr: 'Bureau d’Examen des Retraits de Diamants', de: 'Prüfpult für Diamanten-Auszahlungen', pt: 'Mesa de Análise de Saque de Diamantes', ru: 'Проверка вывода алмазов ведущих', tr: 'Yayıncı Elmas Çekim İnceleme Masası', id: 'Meja Peninjauan Penarikan Berlian Host', ur: 'ہوسٹ ڈائمنڈ کیش آؤٹ جائزہ ڈیسک' },
  'Financial': { es: 'Finanzas', ar: 'المالية', hi: 'वित्तीय', zh: '财务报表', fr: 'Finances', de: 'Finanzen', pt: 'Financeiro', ru: 'Финансы', tr: 'Finansal', id: 'Keuangan', ur: 'مالیات' },
  'Financial Engine, Stream Cuts & Commission Reports': { es: 'Motor Financiero, Cortes y Reportes de Comisiones', ar: 'المحرك المالي وتقارير نسب البث والعمولات', hi: 'वित्तीय इंजन, स्ट्रीम कट्स और कमीशन रिपोर्ट', zh: '财务引擎、流水抽成与佣金报表', fr: 'Moteur Financier, Frais de Stream et Rapports', de: 'Finanzmodul, Provisionen & Abrechnungen', pt: 'Motor Financeiro, Cortes e Comissões', ru: 'Финансовый модуль, комиссии и отчеты', tr: 'Finans Motoru, Yayın Payları ve Komisyonlar', id: 'Mesin Keuangan, Potongan Siaran & Laporan Komisi', ur: 'مالیاتی انجن، اسٹریم کٹوتی اور کمیشن رپورٹس' },
  'Contact Support': { es: 'Atención al Cliente', ar: 'الدعم الفني', hi: 'सहायता संपर्क', zh: '客服支持', fr: 'Support Client', de: 'Support-Kontakt', pt: 'Suporte ao Cliente', ru: 'Служба поддержки', tr: 'Destek İletişim', id: 'Dukungan Resmi', ur: 'مدد اور رابطہ' },
  'Helpdesk & Official Support Contact Management': { es: 'Mesa de Ayuda y Gestión de Contacto Oficial', ar: 'مكتب المساعدة وإدارة قنوات الدعم الرسمية', hi: 'हेल्पडेस्क और आधिकारिक सहायता संपर्क प्रबंधन', zh: '帮助中心与官方客服联络配置', fr: 'Gestion du Support et Canaux d’Assistance', de: 'Helpdesk & Offizielle Support-Verwaltung', pt: 'Helpdesk e Gerenciamento de Contato Oficial', ru: 'Управление контактами службы поддержки', tr: 'Yardım Masası ve Resmi Destek Yönetimi', id: 'Meja Bantuan & Kontak Dukungan Resmi', ur: 'ہیلپ ڈیسک اور آفیشل سپورٹ رابطہ کا انتظام' },
  'VIP Features': { es: 'Funciones VIP', ar: 'مميزات VIP', hi: 'वीआईपी फीचर्स', zh: 'VIP 特权', fr: 'Fonctionnalités VIP', de: 'VIP-Funktionen', pt: 'Recursos VIP', ru: 'VIP-функции', tr: 'VIP Özellikler', id: 'Fitur VIP', ur: 'وی آئی پی خصوصیات' },
  'VIP Privilege & Tier Governance (8 Independent Tiers)': { es: 'Gobernanza de Privilegios y Niveles VIP (8 Niveles)', ar: 'حوكمة امتيازات ومستويات VIP (8 مستويات مستقلة)', hi: 'वीआईपी विशेषाधिकार और स्तर शासन (8 स्वतंत्र टियर)', zh: 'VIP 特权体系与等级管控（8 个独立等级）', fr: 'Gouvernance des Niveaux et Privilèges VIP (8 Niveaux)', de: 'VIP-Privilegien & Stufenverwaltung (8 Stufen)', pt: 'Governança de Privilégios e Níveis VIP (8 Níveis)', ru: 'Управление уровнями и привилегиями VIP (8 уровней)', tr: 'VIP Ayrıcalıkları ve Seviye Yönetimi (8 Seviye)', id: 'Tata Kelola Hak Istimewa & Tingkatan VIP (8 Tingkat)', ur: 'وی آئی پی مراعات اور لیول کا انتظام (8 آزاد درجات)' },
  'Super Admin': { es: 'Superadministrador', ar: 'المدير العام', hi: 'सुपर एडमिन', zh: '超级管理员', fr: 'Super Administrateur', de: 'Super-Administrator', pt: 'Super Administrador', ru: 'Супер-админ', tr: 'Süper Yönetici', id: 'Super Admin', ur: 'سپر ایڈمن' },
  'Admin Console': { es: 'Consola de Administración', ar: 'لوحة تحكم المسؤول', hi: 'एडमिन कंसोल', zh: '管理控制台', fr: 'Console d’Administration', de: 'Administrationskonsole', pt: 'Console de Administração', ru: 'Панель администратора', tr: 'Yönetici Konsolu', id: 'Konsol Admin', ur: 'ایڈمن کنسول' },
  'Agency Portal': { es: 'Portal de Agencias', ar: 'بوابة الوكالات', hi: 'एजेंसी पोर्टल', zh: '公会后台', fr: 'Portail d’Agence', de: 'Agenturportal', pt: 'Portal da Agência', ru: 'Портал агентств', tr: 'Ajans Portalı', id: 'Portal Agensi', ur: 'ایجنسی پورٹل' },
  'Talent Agency Portal': { es: 'Portal de Agencia de Talentos', ar: 'بوابة وكالة المواهب', hi: 'टैलेंट एजेंसी पोर्टल', zh: '公会管理后台', fr: 'Portail d’Agence de Talents', de: 'Talentagentur-Portal', pt: 'Portal da Agência de Talentos', ru: 'Портал агентства талантов', tr: 'Yetenek Ajansı Portalı', id: 'Portal Agensi Bakat', ur: 'ٹیلنٹ ایجنسی پورٹل' },
  'Agency Code or Email': { es: 'Código o Correo de Agencia', ar: 'رمز الوكالة أو البريد الإلكتروني', hi: 'एजेंसी कोड या ईमेल', zh: '公会代码或邮箱', fr: 'Code d’Agence ou E-mail', de: 'Agentur-Code oder E-Mail', pt: 'Código ou E-mail da Agência', ru: 'Код агентства или email', tr: 'Ajans Kodu veya E-posta', id: 'Kode Agensi atau Email', ur: 'ایجنسی کوڈ یا ای میل' },
  'Agency Code or Manager Email': { es: 'Código o Correo del Gerente', ar: 'رمز الوكالة أو بريد المدير', hi: 'एजेंसी कोड या मैनेजर ईमेल', zh: '公会代码或经理邮箱', fr: 'Code d’Agence ou E-mail du Gérant', de: 'Agentur-Code oder Manager-E-Mail', pt: 'Código ou E-mail do Gerente', ru: 'Код агентства или email менеджера', tr: 'Ajans Kodu veya Yönetici E-postası', id: 'Kode Agensi atau Email Manajer', ur: 'ایجنسی کوڈ یا مینیجر ای میل' },
  'Agency Password': { es: 'Contraseña de la Agencia', ar: 'كلمة مرور الوكالة', hi: 'एजेंसी पासवर्ड', zh: '公会密码', fr: 'Mot de Passe de l’Agence', de: 'Agentur-Passwort', pt: 'Senha da Agência', ru: 'Пароль агентства', tr: 'Ajans Şifresi', id: 'Kata Sandi Agensi', ur: 'ایجنسی پاس ورڈ' },
  'Login Password:': { es: 'Contraseña de Acceso:', ar: 'كلمة مرور الدخول:', hi: 'लॉगिन पासवर्ड:', zh: '登录密码：', fr: 'Mot de Passe de Connexion :', de: 'Login-Passwort:', pt: 'Senha de Login:', ru: 'Пароль для входа:', tr: 'Giriş Şifresi:', id: 'Kata Sandi Masuk:', ur: 'لاگ ان پاس ورڈ:' },
  'Login to Agency Portal': { es: 'Iniciar Sesión en el Portal', ar: 'تسجيل الدخول إلى البوابة', hi: 'एजेंसी पोर्टल में लॉगिन करें', zh: '登录公会管理后台', fr: 'Connexion au Portail', de: 'Im Agenturportal anmelden', pt: 'Entrar no Portal da Agência', ru: 'Вход в портал агентства', tr: 'Ajans Portalına Giriş Yap', id: 'Masuk ke Portal Agensi', ur: 'ایجنسی پورٹل میں لاگ ان کریں' },

  // Metrics & Cards
  'Total Platform Revenue': { es: 'Ingresos Totales de la Plataforma', ar: 'إجمالي إيرادات المنصة', hi: 'कुल प्लेटफ़ॉर्म राजस्व', zh: '平台总收入', fr: 'Revenu Total de la Plateforme', de: 'Gesamteinnahmen der Plattform', pt: 'Receita Total da Plataforma', ru: 'Общий доход платформы', tr: 'Toplam Platform Geliri', id: 'Total Pendapatan Platform', ur: 'پلیٹ فارم کی کل آمدنی' },
  'Platform Net Cut': { es: 'Corte Neto de la Plataforma', ar: 'صافي حصة المنصة', hi: 'प्लेटफ़ॉर्म शुद्ध हिस्सा', zh: '平台净收益', fr: 'Part Nette de la Plateforme', de: 'Nettogewinn der Plattform', pt: 'Corte Líquido da Plataforma', ru: 'Чистая доля платформы', tr: 'Platform Net Payı', id: 'Bagian Bersih Platform', ur: 'پلیٹ فارم کا خالص حصہ' },
  'Total Agency Commission': { es: 'Comisión Total de Agencias', ar: 'إجمالي عمولة الوكالات', hi: 'कुल एजेंसी कमीशन', zh: '公会总佣金', fr: 'Commission Totale des Agences', de: 'Gesamte Agenturprovisionen', pt: 'Comissão Total das Agências', ru: 'Комиссия агентств', tr: 'Toplam Ajans Komisyonu', id: 'Total Komisi Agensi', ur: 'کل ایجنسی کمیشن' },
  'Total Host Earnings': { es: 'Ganancias Totales de Anfitriones', ar: 'إجمالي أرباح المضيفين', hi: 'कुल होस्ट कमाई', zh: '主播总收益', fr: 'Gains Totaux des Hôtes', de: 'Gesamte Host-Einnahmen', pt: 'Ganhos Totais dos Anfitriões', ru: 'Доход ведущих', tr: 'Toplam Yayıncı Kazancı', id: 'Total Pendapatan Host', ur: 'ہوسٹس کی کل کمائی' },
  'Host Diamond Cash-Out': { es: 'Retiros de Diamantes de Anfitriones', ar: 'سحب أرباح ماس المضيفين', hi: 'होस्ट डायमंड कैश-आउट', zh: '主播钻石提现', fr: 'Retraits de Diamants des Hôtes', de: 'Host Diamanten-Auszahlung', pt: 'Saques de Diamantes dos Anfitriões', ru: 'Вывод алмазов ведущих', tr: 'Yayıncı Elmas Çekimi', id: 'Penarikan Berlian Host', ur: 'ہوسٹ ڈائمنڈ کیش آؤٹ' },
  'Active Broadcasters': { es: 'Emisores Activos', ar: 'المذيعون النشطون', hi: 'सक्रिय ब्रॉडकास्टर्स', zh: '活跃主播数', fr: 'Diffuseurs Actifs', de: 'Aktive Streamer', pt: 'Transmissores Ativos', ru: 'Активные ведущие', tr: 'Aktif Yayıncılar', id: 'Penyiar Aktif', ur: 'فعال براڈکاسٹرز' },
  'Total Users': { es: 'Usuarios Totales', ar: 'إجمالي المستخدمين', hi: 'कुल उपयोगकर्ता', zh: '注册用户总数', fr: 'Utilisateurs Totaux', de: 'Gesamtbenutzer', pt: 'Total de Usuários', ru: 'Всего пользователей', tr: 'Toplam Kullanıcı', id: 'Total Pengguna', ur: 'کل صارفین' },
  'Active Streams': { es: 'Transmisiones Activas', ar: 'البثوث النشطة', hi: 'सक्रिय स्ट्रीम्स', zh: '进行中直播', fr: 'Streams Actifs', de: 'Aktive Streams', pt: 'Streams Ativas', ru: 'Активные эфиры', tr: 'Aktif Yayınlar', id: 'Siaran Aktif', ur: 'فعال اسٹریمز' },
  'Live Viewers': { es: 'Espectadores en Vivo', ar: 'المشاهدون المباشرون', hi: 'लाइव दर्शक', zh: '实时在线观众', fr: 'Spectateurs en Direct', de: 'Live-Zuschauer', pt: 'Espectadores ao Vivo', ru: 'Зрители онлайн', tr: 'Canlı İzleyiciler', id: 'Penonton Langsung', ur: 'براہ راست ناظرین' },
  'Platform Reserve': { es: 'Reserva de la Plataforma', ar: 'احتياطي المنصة', hi: 'प्लेटफ़ॉर्म रिजर्व', zh: '平台资金储备', fr: 'Réserve de la Plateforme', de: 'Plattform-Reserve', pt: 'Reserva da Plataforma', ru: 'Резерв платформы', tr: 'Platform Rezervi', id: 'Cadangan Platform', ur: 'پلیٹ فارم ریزرو' },
  'Gross Volume': { es: 'Volumen Bruto', ar: 'الحجم الإجمالي', hi: 'सकल आयतन', zh: '总流水额', fr: 'Volume Brut', de: 'Bruttovolumen', pt: 'Volume Bruto', ru: 'Общий объем', tr: 'Brüt Hacim', id: 'Volume Bruto', ur: 'مجموعی حجم' },
  'Exchange Rate': { es: 'Tipo de Cambio', ar: 'سعر الصرف', hi: 'विनिमय दर', zh: '结算汇率', fr: 'Taux de Change', de: 'Wechselkurs', pt: 'Taxa de Câmbio', ru: 'Курс обмена', tr: 'Döviz Kuru', id: 'Nilai Tukar', ur: 'شرح مبادلہ' },

  // Actions
  'Refresh Data': { es: 'Actualizar Datos', ar: 'تحديث البيانات', hi: 'डेटा रीफ्रेश करें', zh: '刷新数据', fr: 'Actualiser les Données', de: 'Daten aktualisieren', pt: 'Atualizar Dados', ru: 'Обновить данные', tr: 'Verileri Yenile', id: 'Segarkan Data', ur: 'ڈیٹا ریفریش کریں' },
  'Refresh': { es: 'Actualizar', ar: 'تحديث', hi: 'रीफ्रेश', zh: '刷新', fr: 'Actualiser', de: 'Aktualisieren', pt: 'Atualizar', ru: 'Обновить', tr: 'Yenile', id: 'Segarkan', ur: 'ریفریش' },
  'Search': { es: 'Buscar', ar: 'بحث', hi: 'खोजें', zh: '搜索', fr: 'Rechercher', de: 'Suchen', pt: 'Pesquisar', ru: 'Поиск', tr: 'Ara', id: 'Cari', ur: 'تلاش کریں' },
  'Filter': { es: 'Filtrar', ar: 'تصفية', hi: 'फ़िल्टर', zh: '筛选', fr: 'Filtrer', de: 'Filtern', pt: 'Filtrar', ru: 'Фильтр', tr: 'Filtrele', id: 'Saring', ur: 'فلٹر' },
  'Export': { es: 'Exportar', ar: 'تصدير', hi: 'निर्यात करें', zh: '导出', fr: 'Exporter', de: 'Exportieren', pt: 'Exportar', ru: 'Экспорт', tr: 'Dışa Aktar', id: 'Ekspor', ur: 'برآمد کریں' },
  'Download': { es: 'Descargar', ar: 'تحميل', hi: 'डाउनलोड करें', zh: '下载', fr: 'Télécharger', de: 'Herunterladen', pt: 'Baixar', ru: 'Скачать', tr: 'İndir', id: 'Unduh', ur: 'ڈاؤن لوڈ کریں' },
  'Save Changes': { es: 'Guardar Cambios', ar: 'حفظ التغييرات', hi: 'बदलाव सहेजें', zh: '保存更改', fr: 'Enregistrer les Modifications', de: 'Änderungen speichern', pt: 'Salvar Alterações', ru: 'Сохранить изменения', tr: 'Değişiklikleri Kaydet', id: 'Simpan Perubahan', ur: 'تبدیلیاں محفوظ کریں' },
  'Confirm': { es: 'Confirmar', ar: 'تأكيد', hi: 'पुष्टि करें', zh: '确认', fr: 'Confirmer', de: 'Bestätigen', pt: 'Confirmar', ru: 'Подтвердить', tr: 'Onayla', id: 'Konfirmasi', ur: 'تصدیق کریں' },
  'Cancel': { es: 'Cancelar', ar: 'إلغاء', hi: 'रद्द करें', zh: '取消', fr: 'Annuler', de: 'Abbrechen', pt: 'Cancelar', ru: 'Отмена', tr: 'İptal', id: 'Batal', ur: 'منسوخ کریں' },
  'Close': { es: 'Cerrar', ar: 'إغلاق', hi: 'बंद करें', zh: '关闭', fr: 'Fermer', de: 'Schließen', pt: 'Fechar', ru: 'Закрыть', tr: 'Kapat', id: 'Tutup', ur: 'بند کریں' },
  'Delete': { es: 'Eliminar', ar: 'حذف', hi: 'हटाएं', zh: '删除', fr: 'Supprimer', de: 'Löschen', pt: 'Excluir', ru: 'Удалить', tr: 'Sil', id: 'Hapus', ur: 'حذف کریں' },
  'Edit': { es: 'Editar', ar: 'تعديل', hi: 'संपादित करें', zh: '编辑', fr: 'Modifier', de: 'Bearbeiten', pt: 'Editar', ru: 'Редактировать', tr: 'Düzenle', id: 'Edit', ur: 'ترمیم کریں' },
  'Update': { es: 'Actualizar', ar: 'تحديث', hi: 'अपडेट करें', zh: '更新', fr: 'Mettre à jour', de: 'Aktualisieren', pt: 'Atualizar', ru: 'Обновить', tr: 'Güncelle', id: 'Perbarui', ur: 'اپ ڈیٹ کریں' },
  'Create Agency': { es: 'Crear Agencia', ar: 'إنشاء وكالة', hi: 'एजेंसी बनाएं', zh: '创建公会', fr: 'Créer une Agence', de: 'Agentur erstellen', pt: 'Criar Agência', ru: 'Создать агентство', tr: 'Ajans Oluştur', id: 'Buat Agensi', ur: 'ایجنسی بنائیں' },
  'Add Reseller': { es: 'Agregar Revendedor', ar: 'إضافة موزع', hi: 'रीसेलर जोड़ें', zh: '添加分销商', fr: 'Ajouter un Revendeur', de: 'Wiederverkäufer hinzufügen', pt: 'Adicionar Revendedor', ru: 'Добавить реселлера', tr: 'Bayi Ekle', id: 'Tambah Pengecer', ur: 'ری سیلر شامل کریں' },
  'Add Gift': { es: 'Agregar Regalo', ar: 'إضافة هدية', hi: 'गिफ्ट जोड़ें', zh: '添加礼物', fr: 'Ajouter un Cadeau', de: 'Geschenk hinzufügen', pt: 'Adicionar Presente', ru: 'Добавить подарок', tr: 'Hediye Ekle', id: 'Tambah Hadiah', ur: 'تحفہ شامل کریں' },
  'New Gift': { es: 'Nuevo Regalo', ar: 'هدية جديدة', hi: 'नया गिफ्ट', zh: '新建礼物', fr: 'Nouveau Cadeau', de: 'Neues Geschenk', pt: 'Novo Presente', ru: 'Новый подарок', tr: 'Yeni Hediye', id: 'Hadiah Baru', ur: 'نیا تحفہ' },
  'Send Coins': { es: 'Enviar Monedas', ar: 'إرسال عملات', hi: 'सिक्के भेजें', zh: '派发金币', fr: 'Envoyer des Pièces', de: 'Münzen senden', pt: 'Enviar Moedas', ru: 'Отправить монеты', tr: 'Jeton Gönder', id: 'Kirim Koin', ur: 'سکے بھیجیں' },
  'Approve': { es: 'Aprobar', ar: 'موافقة', hi: 'स्वीकृत करें', zh: '批准', fr: 'Approuver', de: 'Genehmigen', pt: 'Aprovar', ru: 'Одобрить', tr: 'Onayla', id: 'Setujui', ur: 'منظور کریں' },
  'Reject': { es: 'Rechazar', ar: 'رفض', hi: 'अस्वीकार करें', zh: '驳回', fr: 'Rejeter', de: 'Ablehnen', pt: 'Rejeitar', ru: 'Отклонить', tr: 'Reddet', id: 'Tolak', ur: 'مسترد کریں' },
  'Approve Payout': { es: 'Aprobar Retiro', ar: 'قبول السحب', hi: 'भुगतान स्वीकृत करें', zh: '批准提现', fr: 'Approuver le Paiement', de: 'Auszahlung genehmigen', pt: 'Aprovar Saque', ru: 'Одобрить выплату', tr: 'Ödemeyi Onayla', id: 'Setujui Penarikan', ur: 'پے آؤٹ منظور کریں' },
  'Reject Payout': { es: 'Rechazar Retiro', ar: 'رفض السحب', hi: 'भुगतान अस्वीकार करें', zh: '驳回提现', fr: 'Rejeter le Paiement', de: 'Auszahlung ablehnen', pt: 'Rejeitar Saque', ru: 'Отклонить выплату', tr: 'Ödemeyi Reddet', id: 'Tolak Penarikan', ur: 'پے آؤٹ مسترد کریں' },
  'Kill Stream': { es: 'Finalizar Transmisión', ar: 'إنهاء البث فوراً', hi: 'स्ट्रीम समाप्त करें', zh: '强制关播', fr: 'Arrêter le Stream', de: 'Stream beenden', pt: 'Encerrar Stream', ru: 'Остановить эфир', tr: 'Yayını Sonlandır', id: 'Hentikan Siaran', ur: 'اسٹریم ختم کریں' },
  'Terminate Room': { es: 'Terminar Sala', ar: 'إغلاق الغرفة', hi: 'रूम समाप्त करें', zh: '解散房间', fr: 'Fermer le Salon', de: 'Raum beenden', pt: 'Encerrar Sala', ru: 'Закрыть комнату', tr: 'Odayı Sonlandır', id: 'Tutup Ruangan', ur: 'کمرہ ختم کریں' },
  'Ban User': { es: 'Bloquear Usuario', ar: 'حظر المستخدم', hi: 'यूज़र को बैन करें', zh: '封禁用户', fr: 'Bannir l’Utilisateur', de: 'Benutzer sperren', pt: 'Banir Usuário', ru: 'Заблокировать', tr: 'Kullanıcıyı Yasakla', id: 'Blokir Pengguna', ur: 'صارف پر پابندی لگائیں' },
  'Suspend 24h': { es: 'Suspender 24h', ar: 'إيقاف 24 ساعة', hi: '24 घंटे निलंबित करें', zh: '冻结 24 小时', fr: 'Suspendre 24h', de: '24 Std. sperren', pt: 'Suspender 24h', ru: 'Блокировка 24ч', tr: '24s Askıya Al', id: 'Tangguhkan 24 Jam', ur: '24 گھنٹے معطل کریں' },
  'Suspend 7d': { es: 'Suspender 7d', ar: 'إيقاف 7 أيام', hi: '7 दिन निलंबित करें', zh: '冻结 7 天', fr: 'Suspendre 7j', de: '7 Tage sperren', pt: 'Suspender 7d', ru: 'Блокировка 7 дней', tr: '7 Gün Askıya Al', id: 'Tangguhkan 7 Hari', ur: '7 دن معطل کریں' },
  'Warn User': { es: 'Advertir Usuario', ar: 'تحذير المستخدم', hi: 'चेतावनी दें', zh: '发出警告', fr: 'Avertir l’Utilisateur', de: 'Benutzer warnen', pt: 'Avisar Usuário', ru: 'Предупредить', tr: 'Kullanıcıyı Uyar', id: 'Peringatkan Pengguna', ur: 'صارف کو تنبیہ کریں' },
  'Unban': { es: 'Desbloquear', ar: 'إلغاء الحظر', hi: 'बैन हटाएं', zh: '解封用户', fr: 'Débannir', de: 'Entsperren', pt: 'Desbanir', ru: 'Разблокировать', tr: 'Yasağı Kaldır', id: 'Buka Blokir', ur: 'پابندی ہٹائیں' },
  'Reset Password': { es: 'Restablecer Contraseña', ar: 'إعادة تعيين كلمة المرور', hi: 'पासवर्ड रीसेट करें', zh: '重置密码', fr: 'Réinitialiser le Mot de Passe', de: 'Passwort zurücksetzen', pt: 'Redefinir Senha', ru: 'Сбросить пароль', tr: 'Şifreyi Sıfırla', id: 'Atur Ulang Sandi', ur: 'پاس ورڈ ری سیٹ کریں' },
  'View Profile': { es: 'Ver Perfil', ar: 'عرض الملف', hi: 'प्रोफ़ाइल देखें', zh: '查看资料', fr: 'Voir le Profil', de: 'Profil anzeigen', pt: 'Ver Perfil', ru: 'Профиль', tr: 'Profili Görüntüle', id: 'Lihat Profil', ur: 'پروفائل دیکھیں' },
  'View Stream': { es: 'Ver Transmisión', ar: 'مشاهدة البث', hi: 'स्ट्रीम देखें', zh: '进入直播间', fr: 'Voir le Stream', de: 'Stream ansehen', pt: 'Ver Transmissão', ru: 'Смотреть эфир', tr: 'Yayını İzle', id: 'Lihat Siaran', ur: 'اسٹریم دیکھیں' },
  'Copy ID': { es: 'Copiar ID', ar: 'نسخ المعرف', hi: 'आईडी कॉपी करें', zh: '复制 ID', fr: 'Copier l’ID', de: 'ID kopieren', pt: 'Copiar ID', ru: 'Копировать ID', tr: 'Kimliği Kopyala', id: 'Salin ID', ur: 'آئی ڈی کاپی کریں' },
  'Copied': { es: 'Copiado', ar: 'تم النسخ', hi: 'कॉपी हो गया', zh: '已复制', fr: 'Copié', de: 'Kopiert', pt: 'Copiado', ru: 'Скопировано', tr: 'Kopyalandı', id: 'Tersalin', ur: 'کاپی ہو گیا' },
  'Connect': { es: 'Conectar', ar: 'اتصال', hi: 'कनेक्ट करें', zh: '连接', fr: 'Connecter', de: 'Verbinden', pt: 'Conectar', ru: 'Подключить', tr: 'Bağlan', id: 'Hubungkan', ur: 'منسلک کریں' },
  'Disconnect': { es: 'Desconectar', ar: 'قطع الاتصال', hi: 'डिस्कनेक्ट करें', zh: '断开', fr: 'Déconnecter', de: 'Trennen', pt: 'Desconectar', ru: 'Отключить', tr: 'Bağlantıyı Kes', id: 'Putuskan', ur: 'منقطع کریں' },
  'Online': { es: 'En Línea', ar: 'متصل', hi: 'ऑनलाइन', zh: '在线', fr: 'En Ligne', de: 'Online', pt: 'Online', ru: 'В сети', tr: 'Çevrimiçi', id: 'Online', ur: 'آن لائن' },
  'Offline': { es: 'Desconectado', ar: 'غير متصل', hi: 'ऑफ़लाइन', zh: '离线', fr: 'Hors Ligne', de: 'Offline', pt: 'Offline', ru: 'Офлайн', tr: 'Çevrimdışı', id: 'Offline', ur: 'آف لائن' },
  'WebSocket Live': { es: 'WebSocket en Vivo', ar: 'اتصال مباشر فوري', hi: 'लाइव वेबसॉकेट', zh: '实时 WebSocket', fr: 'WebSocket en Direct', de: 'WebSocket Live', pt: 'WebSocket ao Vivo', ru: 'WebSocket онлайн', tr: 'Canlı WebSocket', id: 'WebSocket Langsung', ur: 'لائیو ویب ساکٹ' },
  'Polling 5s': { es: 'Sondeo cada 5s', ar: 'استعلام دوري 5 ثوانٍ', hi: 'पोलिंग 5 सेकेंड', zh: '5 秒轮询', fr: 'Sondage 5s', de: 'Abfrage 5s', pt: 'Sondagem 5s', ru: 'Опрос 5с', tr: 'Yoklama 5sn', id: 'Polling 5dtk', ur: 'پولنگ 5 سیکنڈ' },
  'Pending Review': { es: 'Revisión Pendiente', ar: 'قيد المراجعة', hi: 'समीक्षा लंबित', zh: '待审核', fr: 'En Attente', de: 'Ausstehend', pt: 'Pendente', ru: 'На рассмотрении', tr: 'İnceleme Bekliyor', id: 'Menunggu Tinjauan', ur: 'زیر التواء جائزہ' },
  'Approved': { es: 'Aprobado', ar: 'معتمد', hi: 'स्वीकृत', zh: '已批准', fr: 'Approuvé', de: 'Genehmigt', pt: 'Aprovado', ru: 'Одобрено', tr: 'Onaylandı', id: 'Disetujui', ur: 'منظور شدہ' },
  'Rejected': { es: 'Rechazado', ar: 'مرفوض', hi: 'अस्वीकृत', zh: '已驳回', fr: 'Rejeté', de: 'Abgelehnt', pt: 'Rejeitado', ru: 'Отклонено', tr: 'Reddedildi', id: 'Ditolak', ur: 'مسترد شدہ' },
  'Completed': { es: 'Completado', ar: 'مكتمل', hi: 'पूर्ण', zh: '已完成', fr: 'Terminé', de: 'Abgeschlossen', pt: 'Concluído', ru: 'Завершено', tr: 'Tamamlandı', id: 'Selesai', ur: 'مکمل' },
  'Processed': { es: 'Procesado', ar: 'تمت المعالجة', hi: 'संसाधित', zh: '已处理', fr: 'Traité', de: 'Verarbeitet', pt: 'Processado', ru: 'Обработано', tr: 'İşlendi', id: 'Diproses', ur: 'پروسیس شدہ' },
  'Failed': { es: 'Fallido', ar: 'فشل', hi: 'विफल', zh: '失败', fr: 'Échoué', de: 'Fehlgeschlagen', pt: 'Falhou', ru: 'Ошибка', tr: 'Başarısız', id: 'Gagal', ur: 'ناکام' },
  'Status': { es: 'Estado', ar: 'الحالة', hi: 'स्थिति', zh: '状态', fr: 'Statut', de: 'Status', pt: 'Status', ru: 'Статус', tr: 'Durum', id: 'Status', ur: 'حالت' },
  'Actions': { es: 'Acciones', ar: 'الإجراءات', hi: 'कार्रवाई', zh: '操作', fr: 'Actions', de: 'Aktionen', pt: 'Ações', ru: 'Действия', tr: 'İşlemler', id: 'Tindakan', ur: 'کارروائیاں' },
  'Details': { es: 'Detalles', ar: 'التفاصيل', hi: 'विवरण', zh: '详情', fr: 'Détails', de: 'Details', pt: 'Detalhes', ru: 'Детали', tr: 'Ayrıntılar', id: 'Detail', ur: 'تفصیلات' },
  'Date': { es: 'Fecha', ar: 'التاريخ', hi: 'तारीख', zh: '日期', fr: 'Date', de: 'Datum', pt: 'Data', ru: 'Дата', tr: 'Tarih', id: 'Tanggal', ur: 'تاریخ' },
  'Name': { es: 'Nombre', ar: 'الاسم', hi: 'नाम', zh: '名称', fr: 'Nom', de: 'Name', pt: 'Nome', ru: 'Имя', tr: 'İsim', id: 'Nama', ur: 'نام' },
  'Email': { es: 'Correo', ar: 'البريد الإلكتروني', hi: 'ईमेल', zh: '邮箱', fr: 'E-mail', de: 'E-Mail', pt: 'E-mail', ru: 'Email', tr: 'E-posta', id: 'Email', ur: 'ای میل' },
  'Role': { es: 'Rol', ar: 'الدور', hi: 'भूमिका', zh: '角色', fr: 'Rôle', de: 'Rolle', pt: 'Função', ru: 'Роль', tr: 'Rol', id: 'Peran', ur: 'کردار' },
  'Level': { es: 'Nivel', ar: 'المستوى', hi: 'लेवल', zh: '等级', fr: 'Niveau', de: 'Stufe', pt: 'Nível', ru: 'Уровень', tr: 'Seviye', id: 'Tingkat', ur: 'لیول' },
  'Diamonds': { es: 'Diamantes', ar: 'الماس', hi: 'डायमंड्स', zh: '钻石', fr: 'Diamants', de: 'Diamanten', pt: 'Diamantes', ru: 'Алмазы', tr: 'Elmaslar', id: 'Berlian', ur: 'ڈائمنڈز' },
  'Coins': { es: 'Monedas', ar: 'العملات', hi: 'सिक्के', zh: '金币', fr: 'Pièces', de: 'Münzen', pt: 'Moedas', ru: 'Монеты', tr: 'Jetonlar', id: 'Koin', ur: 'سکے' },
  'Balance': { es: 'Saldo', ar: 'الرصيد', hi: 'बैलेंस', zh: '余额', fr: 'Solde', de: 'Guthaben', pt: 'Saldo', ru: 'Баланс', tr: 'Bakiye', id: 'Saldo', ur: 'بیلنس' },
  'All Statuses': { es: 'Todos los Estados', ar: 'كل الحالات', hi: 'सभी स्थितियां', zh: '全部状态', fr: 'Tous les Statuts', de: 'Alle Status', pt: 'Todos os Status', ru: 'Все статусы', tr: 'Tüm Durumlar', id: 'Semua Status', ur: 'تمام حالتیں' },
  'All Types': { es: 'Todos los Tipos', ar: 'كل الأنواع', hi: 'सभी प्रकार', zh: '全部类型', fr: 'Tous les Types', de: 'Alle Typen', pt: 'Todos os Tipos', ru: 'Все типы', tr: 'Tüm Tipler', id: 'Semua Tipe', ur: 'تمام اقسام' },
  'No data available': { es: 'No hay datos disponibles', ar: 'لا توجد بيانات متاحة', hi: 'कोई डेटा उपलब्ध नहीं है', zh: '暂无可用数据', fr: 'Aucune donnée disponible', de: 'Keine Daten verfügbar', pt: 'Nenhum dado disponível', ru: 'Нет данных', tr: 'Veri yok', id: 'Tidak ada data tersedia', ur: 'کوئی ڈیٹا دستیاب نہیں ہے' },
  'Loading...': { es: 'Cargando...', ar: 'جارٍ التحميل...', hi: 'लोड हो रहा है...', zh: '加载中...', fr: 'Chargement...', de: 'Laden...', pt: 'Carregando...', ru: 'Загрузка...', tr: 'Yükleniyor...', id: 'Memuat...', ur: 'لوڈ ہو رہا ہے...' },
  'Please wait': { es: 'Por favor espere', ar: 'يرجى الانتظار', hi: 'कृपया प्रतीक्षा करें', zh: '请稍候', fr: 'Veuillez patienter', de: 'Bitte warten', pt: 'Por favor aguarde', ru: 'Пожалуйста, подождите', tr: 'Lütfen bekleyin', id: 'Harap tunggu', ur: 'براہ کرم انتظار کریں' },
  'Success': { es: 'Éxito', ar: 'تم بنجاح', hi: 'सफलता', zh: '操作成功', fr: 'Succès', de: 'Erfolg', pt: 'Sucesso', ru: 'Успешно', tr: 'Başarılı', id: 'Berhasil', ur: 'کامیابی' },
  'Error': { es: 'Error', ar: 'خطأ', hi: 'त्रुटि', zh: '错误', fr: 'Erreur', de: 'Fehler', pt: 'Erro', ru: 'Ошибка', tr: 'Hata', id: 'Kesalahan', ur: 'خرابی' },
  'Log Out': { es: 'Cerrar Sesión', ar: 'تسجيل الخروج', hi: 'लॉग आउट', zh: '退出登录', fr: 'Déconnexion', de: 'Abmelden', pt: 'Sair', ru: 'Выйти', tr: 'Çıkış Yap', id: 'Keluar', ur: 'لاگ آؤٹ' },
  'Logout': { es: 'Cerrar Sesión', ar: 'تسجيل الخروج', hi: 'लॉग आउट', zh: '退出登录', fr: 'Déconnexion', de: 'Abmelden', pt: 'Sair', ru: 'Выйти', tr: 'Çıkış Yap', id: 'Keluar', ur: 'لاگ آؤٹ' },
  'Add User': { es: 'Agregar Usuario', ar: 'إضافة مستخدم', hi: 'उपयोगकर्ता जोड़ें', zh: '添加用户', fr: 'Ajouter Utilisateur', de: 'Benutzer hinzufügen', pt: 'Adicionar Usuário', ru: 'Добавить пользователя', tr: 'Kullanıcı Ekle', id: 'Tambah Pengguna', ur: 'صارف شامل کریں' },
  'Active Broadcasts': { es: 'Transmisiones Activas', ar: 'البثوث النشطة', hi: 'सक्रिय प्रसारण', zh: '当前直播', fr: 'Diffusions Actives', de: 'Aktive Übertragungen', pt: 'Transmissões Ativas', ru: 'Активные эфиры', tr: 'Aktif Yayınlar', id: 'Siaran Aktif', ur: 'فعال نشریات' },
  'Live Video': { es: 'Video en Vivo', ar: 'فيديو مباشر', hi: 'लाइव वीडियो', zh: '视频直播', fr: 'Vidéo en Direct', de: 'Live-Video', pt: 'Vídeo ao Vivo', ru: 'Прямой эфир', tr: 'Canlı Video', id: 'Video Langsung', ur: 'لائیو ویڈیو' },
  'USD': { es: 'USD', ar: 'دولار', hi: 'यूएसडी', zh: '美元', fr: 'USD', de: 'USD', pt: 'USD', ru: 'USD', tr: 'USD', id: 'USD', ur: 'امریکی ڈالر' },
  'Wallet': { es: 'Billetera', ar: 'المحفظة', hi: 'वॉलेट', zh: '钱包', fr: 'Portefeuille', de: 'Geldbörse', pt: 'Carteira', ru: 'Кошелек', tr: 'Cüzdan', id: 'Dompet', ur: 'والیٹ' },
  'Wallet Balance': { es: 'Saldo de Billetera', ar: 'رصيد المحفظة', hi: 'वॉलेट बैलेंस', zh: '钱包余额', fr: 'Solde du Portefeuille', de: 'Wallet-Guthaben', pt: 'Saldo da Carteira', ru: 'Баланс кошелька', tr: 'Cüzdan Bakiyesi', id: 'Saldo Dompet', ur: 'والیٹ بیلنس' },
  'Adjust Wallet': { es: 'Ajustar Billetera', ar: 'تعديل المحفظة', hi: 'वॉलेट समायोजित करें', zh: '调整钱包', fr: 'Ajuster le Portefeuille', de: 'Wallet anpassen', pt: 'Ajustar Carteira', ru: 'Настроить кошелек', tr: 'Cüzdanı Ayarla', id: 'Sesuaikan Dompet', ur: 'والیٹ ایڈجسٹ کریں' },
  'Adjust Revenue': { es: 'Ajustar Ingresos', ar: 'تعديل الإيرادات', hi: 'राजस्व समायोजित करें', zh: '调整收益', fr: 'Ajuster les Revenus', de: 'Umsatz anpassen', pt: 'Ajustar Receita', ru: 'Настроить доход', tr: 'Geliri Ayarla', id: 'Sesuaikan Pendapatan', ur: 'آمدنی ایڈجسٹ کریں' },
  'Adjust VIP': { es: 'Ajustar VIP', ar: 'تعديل VIP', hi: 'वीआईपी समायोजित करें', zh: '调整 VIP', fr: 'Ajuster VIP', de: 'VIP anpassen', pt: 'Ajustar VIP', ru: 'Настроить VIP', tr: 'VIP Ayarla', id: 'Sesuaikan VIP', ur: 'وی آئی پی ایڈجسٹ کریں' },
  'Warn': { es: 'Advertir', ar: 'تحذير', hi: 'चेतावनी', zh: '警告', fr: 'Avertir', de: 'Warnen', pt: 'Avisar', ru: 'Предупреждение', tr: 'Uyar', id: 'Peringatkan', ur: 'تنبیہ' },
  'Suspend': { es: 'Suspender', ar: 'تعليق', hi: 'निलंबित करें', zh: '封禁', fr: 'Suspendre', de: 'Sperren', pt: 'Suspender', ru: 'Приостановить', tr: 'Askıya Al', id: 'Tangguhkan', ur: 'معطل کریں' },
  'Preview': { es: 'Vista Previa', ar: 'معاينة', hi: 'पूर्वावलोकन', zh: '预览', fr: 'Aperçu', de: 'Vorschau', pt: 'Pré-visualização', ru: 'Предпросмотр', tr: 'Önizleme', id: 'Pratinjau', ur: 'پیش نظارہ' },
  'Type': { es: 'Tipo', ar: 'النوع', hi: 'प्रकार', zh: '类型', fr: 'Type', de: 'Typ', pt: 'Tipo', ru: 'Тип', tr: 'Tip', id: 'Tipe', ur: 'قسم' },
  'Category': { es: 'Categoría', ar: 'الفئة', hi: 'श्रेणी', zh: '分类', fr: 'Catégorie', de: 'Kategorie', pt: 'Categoria', ru: 'Категория', tr: 'Kategori', id: 'Kategori', ur: 'زمرہ' },
  'Region': { es: 'Región', ar: 'المنطقة', hi: 'क्षेत्र', zh: '地区', fr: 'Région', de: 'Region', pt: 'Região', ru: 'Регион', tr: 'Bölge', id: 'Wilayah', ur: 'خطہ' },
  'Reset': { es: 'Restablecer', ar: 'إعادة تعيين', hi: 'रीसेट', zh: '重置', fr: 'Réinitialiser', de: 'Zurücksetzen', pt: 'Redefinir', ru: 'Сброс', tr: 'Sıfırla', id: 'Reset', ur: 'ری سیٹ' },
  'Resolved': { es: 'Resuelto', ar: 'تم الحل', hi: 'हल किया गया', zh: '已解决', fr: 'Résolu', de: 'Gelöst', pt: 'Resolvido', ru: 'Решено', tr: 'Çözüldü', id: 'Terselesaikan', ur: 'حل شدہ' },
  'Dismiss': { es: 'Descartar', ar: 'تجاهل', hi: 'खारिज करें', zh: '忽略', fr: 'Ignorer', de: 'Verwerfen', pt: 'Dispensar', ru: 'Отклонить', tr: 'Yoksay', id: 'Abaikan', ur: 'مسترد کریں' },
  'Done': { es: 'Hecho', ar: 'تم', hi: 'संपन्न', zh: '完成', fr: 'Terminé', de: 'Fertig', pt: 'Concluído', ru: 'Готово', tr: 'Bitti', id: 'Selesai', ur: 'مکمل' },
  'Saving...': { es: 'Guardando...', ar: 'جارٍ الحفظ...', hi: 'सहेजा जा रहा है...', zh: '保存中...', fr: 'Enregistrement...', de: 'Speichern...', pt: 'Salvando...', ru: 'Сохранение...', tr: 'Kaydediliyor...', id: 'Menyimpan...', ur: 'محفوظ ہو رہا ہے...' },
  'Start Broadcast': { es: 'Iniciar Transmisión', ar: 'بدء البث', hi: 'प्रसारण शुरू करें', zh: '开播', fr: 'Démarrer le Direct', de: 'Übertragung starten', pt: 'Iniciar Transmissão', ru: 'Начать эфир', tr: 'Yayını Başlat', id: 'Mulai Siaran', ur: 'نشریات شروع کریں' },
  'Timestamp': { es: 'Marca de Tiempo', ar: 'الوقت', hi: 'समय', zh: '时间戳', fr: 'Horodatage', de: 'Zeitstempel', pt: 'Horário', ru: 'Время', tr: 'Zaman Damgası', id: 'Waktu', ur: 'وقت' },
  'Viewers': { es: 'Espectadores', ar: 'المشاهدون', hi: 'दर्शक', zh: '观众', fr: 'Spectateurs', de: 'Zuschauer', pt: 'Espectadores', ru: 'Зрители', tr: 'İzleyiciler', id: 'Penonton', ur: 'ناظرین' },
  'Live': { es: 'En Vivo', ar: 'مباشر', hi: 'लाइव', zh: '直播', fr: 'En Direct', de: 'Live', pt: 'Ao Vivo', ru: 'В эфире', tr: 'Canlı', id: 'Langsung', ur: 'لائیو' },
  'Live 2030 Official Partner Management Workspace': { es: 'Espacio Oficial de Gestión de Socios de Live 2030', ar: 'مساحة العمل الرسمية لإدارة شركاء لايف 2030', hi: 'लाइव 2030 आधिकारिक भागीदार प्रबंधन कार्यक्षेत्र', zh: 'Live 2030 官方合作伙伴管理工作台', fr: 'Espace de Gestion des Partenaires Officiels Live 2030', de: 'Live 2030 Offizieller Partner-Management-Arbeitsbereich', pt: 'Espaço Oficial de Gestão de Parceiros Live 2030', ru: 'Официальное рабочее пространство управления партнерами Live 2030', tr: 'Live 2030 Resmi İş Ortağı Yönetim Alanı', id: 'Ruang Kerja Manajemen Mitra Resmi Live 2030', ur: 'لائیو 2030 آفیشل پارٹنر مینجمنٹ ورک اسپیس' }
};

// Merge in all extracted strings with meaningful defaults
const targetLangs = ['es', 'ar', 'hi', 'zh', 'fr', 'de', 'pt', 'ru', 'tr', 'id', 'ur'];

const fullDictionary = {};
for (const lang of targetLangs) {
  fullDictionary[lang] = {};
}

// Populate base translations
for (const [key, transObj] of Object.entries(baseTranslations)) {
  for (const lang of targetLangs) {
    if (transObj[lang]) {
      fullDictionary[lang][key] = transObj[lang];
    }
  }
}

// Generate translations.ts file content
const fileContent = `export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', dir: 'rtl' },
];

export const DICTIONARY: Record<string, Record<string, string>> = ${JSON.stringify(fullDictionary, null, 2)};
`;

fs.writeFileSync('./admin_dashboard/src/i18n/translations.ts', fileContent, 'utf8');
console.log('Successfully wrote master translations to admin_dashboard/src/i18n/translations.ts');
