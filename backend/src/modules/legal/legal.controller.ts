import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

@ApiTags('Legal & Compliance Policies')
@Controller()
export class LegalController {
  private readonly appName = 'Live 2030';
  private readonly companyName = 'Live 2030 Global Entertainment Ltd.';
  private readonly contactEmail = 'support@live2030.app';
  private readonly privacyEmail = 'privacy@live2030.app';
  private readonly legalEmail = 'legal@live2030.app';
  private readonly effectiveDate = 'September 15, 2026';
  private readonly lastUpdated = 'September 19, 2026';

  /**
   * Helper to return either JSON or responsive HTML based on request
   */
  private renderPolicy(
    req: Request,
    res: Response,
    title: string,
    badge: string,
    description: string,
    sections: Array<{ heading: string; content: string[] }>,
  ) {
    const isJson =
      req.query.format === 'json' ||
      req.headers['accept']?.includes('application/json') && !req.headers['accept']?.includes('text/html');

    if (isJson) {
      return res.json({
        appName: this.appName,
        companyName: this.companyName,
        title,
        badge,
        description,
        effectiveDate: this.effectiveDate,
        lastUpdated: this.lastUpdated,
        contactEmail: this.contactEmail,
        sections,
      });
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ${this.appName} Official Legal Documentation</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #0c071e;
      --bg-surface: #150d30;
      --bg-card: rgba(27, 18, 60, 0.75);
      --border-color: rgba(168, 85, 247, 0.2);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-pink: #ec4899;
      --accent-purple: #a855f7;
      --accent-blue: #06b6d4;
      --accent-green: #10b981;
      --accent-red: #ef4444;
      --glow: rgba(236, 72, 153, 0.15);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-base);
      color: var(--text-primary);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.7;
      padding: 0;
      margin: 0;
      -webkit-font-smoothing: antialiased;
    }
    .nav-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      background: rgba(12, 7, 30, 0.85);
      border-bottom: 1px solid var(--border-color);
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: white;
    }
    .logo-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--accent-pink), var(--accent-purple));
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);
    }
    .brand-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .brand-subtitle {
      font-size: 11px;
      color: var(--text-secondary);
      font-weight: 500;
    }
    .nav-links {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .nav-link {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }
    .nav-link:hover, .nav-link.active {
      color: white;
      background: var(--bg-card);
      border-color: var(--border-color);
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 24px 80px 24px;
    }
    .hero-card {
      background: linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(168, 85, 247, 0.08));
      border: 1px solid rgba(236, 72, 153, 0.3);
      border-radius: 24px;
      padding: 36px 32px;
      margin-bottom: 32px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 12px 36px var(--glow);
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      background: rgba(236, 72, 153, 0.2);
      color: var(--accent-pink);
      border: 1px solid rgba(236, 72, 153, 0.4);
      margin-bottom: 14px;
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.8px;
      margin-bottom: 12px;
      color: white;
    }
    .meta {
      font-size: 13px;
      color: var(--text-secondary);
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .meta span { display: flex; align-items: center; gap: 6px; }
    .section-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 18px;
      padding: 28px 28px;
      margin-bottom: 22px;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .section-card:hover {
      border-color: rgba(168, 85, 247, 0.4);
      transform: translateY(-2px);
    }
    h2 {
      font-size: 18px;
      font-weight: 700;
      color: white;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .h2-indicator {
      width: 8px;
      height: 18px;
      border-radius: 4px;
      background: linear-gradient(to bottom, var(--accent-pink), var(--accent-purple));
    }
    p {
      font-size: 14px;
      color: #cbd5e1;
      margin-bottom: 12px;
    }
    ul {
      margin-left: 20px;
      margin-bottom: 12px;
    }
    li {
      font-size: 14px;
      color: #cbd5e1;
      margin-bottom: 8px;
    }
    .callout {
      background: rgba(239, 68, 68, 0.1);
      border-left: 4px solid var(--accent-red);
      padding: 16px 18px;
      border-radius: 0 12px 12px 0;
      margin: 16px 0;
      color: #fca5a5;
      font-size: 13.5px;
    }
    .callout-success {
      background: rgba(16, 185, 129, 0.1);
      border-left: 4px solid var(--accent-green);
      color: #86efac;
    }
    .footer {
      text-align: center;
      padding-top: 40px;
      border-top: 1px solid var(--border-color);
      margin-top: 48px;
      color: var(--text-muted);
      font-size: 12px;
    }
    .footer a { color: var(--accent-pink); text-decoration: none; }
    @media (max-width: 640px) {
      .hero-card { padding: 24px 20px; }
      h1 { font-size: 24px; }
      .section-card { padding: 20px 18px; }
    }
  </style>
</head>
<body>
  <nav class="nav-bar">
    <a href="/legal" class="brand">
      <div class="logo-badge">L</div>
      <div>
        <div class="brand-title">${this.appName}</div>
        <div class="brand-subtitle">Compliance & Legal Center</div>
      </div>
    </a>
    <div class="nav-links">
      <a href="/privacy-policy" class="nav-link ${title.includes('Privacy') ? 'active' : ''}">Privacy Policy</a>
      <a href="/terms-of-service" class="nav-link ${title.includes('Terms') ? 'active' : ''}">Terms of Service</a>
      <a href="/account-deletion" class="nav-link ${title.includes('Deletion') ? 'active' : ''}">Account Deletion</a>
      <a href="/community-guidelines" class="nav-link ${title.includes('Community') ? 'active' : ''}">Community Guidelines</a>
      <a href="/child-safety" class="nav-link ${title.includes('Child') ? 'active' : ''}">Child Safety</a>
      <a href="/eula" class="nav-link ${title.includes('EULA') ? 'active' : ''}">Apple EULA</a>
    </div>
  </nav>

  <main class="container">
    <div class="hero-card">
      <span class="badge">${badge}</span>
      <h1>${title}</h1>
      <p style="font-size: 15px; color: var(--text-secondary); margin-bottom: 16px;">${description}</p>
      <div class="meta">
        <span>📅 <strong>Effective:</strong> ${this.effectiveDate}</span>
        <span>🔄 <strong>Last Updated:</strong> ${this.lastUpdated}</span>
        <span>🏢 <strong>Entity:</strong> ${this.companyName}</span>
      </div>
    </div>

    ${sections
      .map(
        (s) => `
      <section class="section-card">
        <h2><span class="h2-indicator"></span>${s.heading}</h2>
        ${s.content
          .map((item) => {
            if (item.startsWith('ALERT:')) {
              return `<div class="callout">${item.replace('ALERT:', '').trim()}</div>`;
            }
            if (item.startsWith('SUCCESS:')) {
              return `<div class="callout callout-success">${item.replace('SUCCESS:', '').trim()}</div>`;
            }
            if (item.startsWith('•')) {
              return `<ul><li>${item.replace('•', '').trim()}</li></ul>`;
            }
            return `<p>${item}</p>`;
          })
          .join('')}
      </section>
    `,
      )
      .join('')}

    <footer class="footer">
      <p>&copy; 2026 ${this.companyName}. All rights reserved.</p>
      <p style="margin-top: 6px;">Questions regarding our policies? Contact our Data Protection Officer at <a href="mailto:${this.privacyEmail}">${this.privacyEmail}</a></p>
    </footer>
  </main>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  // ==========================================
  // 1. PRIVACY POLICY
  // ==========================================
  @Get(['privacy-policy', 'privacypolicy', 'api/privacy-policy'])
  @ApiOperation({ summary: 'Public Privacy Policy (Apple 5.1.1 & GDPR compliant)' })
  getPrivacyPolicy(@Req() req: Request, @Res() res: Response) {
    return this.renderPolicy(
      req,
      res,
      'Privacy Policy',
      'Apple App Store & Google Play Compliant',
      'This Privacy Policy describes how Live 2030 collects, uses, protects, and discloses personal information when you use our mobile application and real-time interactive live broadcasting platform.',
      [
        {
          heading: '1. Information We Collect',
          content: [
            'We collect information to provide, personalize, and improve your interactive streaming experience:',
            '• Account Credentials: Phone number, optional display name, avatar, bio, age, gender, and country.',
            '• User Generated Content (UGC): Live video and audio streams, text messages, comments, photos, and post media uploaded by you.',
            '• Device & Technical Data: Device model, operating system version, unique device identifier (UUID), IP address, app version, and connection latency.',
            '• Financial & Virtual Goods Data: Virtual coin recharge history, diamonds earned through virtual gifting, agency affiliation IDs, and withdrawal records (payment account details provided by you for payouts).',
            '• Permissions: Camera and microphone access (only active during live broadcasting or voice party rooms, never recorded in background), photo library access (only when selecting custom profile avatars or post photos).',
          ],
        },
        {
          heading: '2. How We Use Your Information',
          content: [
            '• To establish and maintain your authenticated user session via secure JWT tokens.',
            '• To facilitate low-latency live audio/video streaming via Agora Real-Time RTC technology.',
            '• To manage virtual wallets, virtual coin top-ups, virtual gift animations, and diamond earnings.',
            '• To enforce safety, prevent fraudulent activity, monitor against illegal or abusive content, and maintain community harmony.',
            '• To calculate host commissions, VIP level XP, and platform analytics.',
          ],
        },
        {
          heading: '3. Third-Party Service Providers',
          content: [
            'We work with trusted industry partners who process data strictly on our behalf under data protection agreements:',
            '• Agora.io RTC: Powers real-time live video and voice transmission.',
            '• MSG91 Gateway: Dispatches 6-digit SMS verification OTPs for secure mobile phone login.',
            '• AWS S3 & CloudFront: Securely stores user uploaded profile avatars, moments photos, and post thumbnails.',
            '• Apple & Google Authentication: Processes federated sign-in tokens when using Sign in with Apple or Google.',
          ],
        },
        {
          heading: '4. Data Retention & Deletion Rights',
          content: [
            'We retain your personal information only as long as your account remains active. You possess the permanent right to request full erasure of your account and personal data at any time.',
            'SUCCESS: You can delete your account instantly from within the mobile app by visiting Profile > Session & Security > Delete Account, or via our public deletion portal at /account-deletion.',
          ],
        },
        {
          heading: '5. Child & Minor Safety (COPPA Compliance)',
          content: [
            'ALERT: Live 2030 is strictly for users aged 18 and older (or the age of majority in your jurisdiction). We do not knowingly collect personal data from children under 13. Any minor account identified is immediately terminated and all associated media purged.',
          ],
        },
        {
          heading: '6. Contact Data Protection Officer',
          content: [
            `If you have questions regarding this Privacy Policy or wish to exercise your GDPR/CCPA privacy rights, contact our Data Protection Officer at: ${this.privacyEmail}`,
          ],
        },
      ],
    );
  }

  // ==========================================
  // 2. TERMS OF SERVICE
  // ==========================================
  @Get(['terms-of-service', 'termsofservice', 'terms', 'api/terms-of-service'])
  @ApiOperation({ summary: 'Terms of Service (Apple 1.2 & Google Play compliant)' })
  getTermsOfService(@Req() req: Request, @Res() res: Response) {
    return this.renderPolicy(
      req,
      res,
      'Terms of Service',
      'User Agreement & Platform Rules',
      'These Terms of Service govern your access to and use of Live 2030. By creating an account or accessing the live streaming platform, you agree to be bound by these terms.',
      [
        {
          heading: '1. Eligibility & User Accounts',
          content: [
            '• You must be at least 18 years of age (or the legal age of majority in your jurisdiction) to broadcast or make purchases on Live 2030.',
            '• You are responsible for safeguarding your login credentials and for all activities conducted under your account.',
            '• You agree to provide accurate registration information and keep your account details current.',
          ],
        },
        {
          heading: '2. Prohibited Conduct & Zero-Tolerance Policy',
          content: [
            'ALERT: Live 2030 enforces a STRICT ZERO-TOLERANCE POLICY against objectionable content and abusive users. Violation results in immediate permanent account termination and device banning.',
            '• No nudity, pornography, sexually suggestive performances, or solicitation.',
            '• No hate speech, harassment, cyberbullying, defamation, or threats of violence.',
            '• No promotion of self-harm, suicide, illegal narcotics, or weapons.',
            '• No copyright infringement or unauthorized rebroadcasting of commercial media.',
            '• No artificial viewer bots, coin fraud, money laundering, or chargeback abuse.',
          ],
        },
        {
          heading: '3. Virtual Goods & Virtual Currency Terms',
          content: [
            '• "Coins" and "Diamonds" are digital virtual goods with no cash redemption value outside the platform terms.',
            '• Coins purchased via RsomPay or authorized resellers are non-refundable once credited.',
            '• Diamonds earned by streamers from virtual gifts may be redeemed according to our official creator withdrawal thresholds (minimum 10,000 diamonds) subject to agency and tax compliance checks.',
          ],
        },
        {
          heading: '4. Content Moderation & 24-Hour Action SLA',
          content: [
            '• Users can report any stream, post, or message instantly using the in-app "Report" button.',
            '• Our 24/7 trust and safety moderation team reviews all flagged content within 24 hours, applying automated stream termination and user suspensions.',
          ],
        },
        {
          heading: '5. Account Termination',
          content: [
            'We reserve the right to suspend or terminate any account that violates these Terms without prior notice. You may also delete your own account at any time via the in-app settings.',
          ],
        },
      ],
    );
  }

  // ==========================================
  // 3. ACCOUNT DELETION POLICY & INSTRUCTIONS
  // ==========================================
  @Get(['account-deletion', 'deletionpolicy', 'delete-account', 'api/account-deletion'])
  @ApiOperation({ summary: 'Account Deletion Instructions (Mandatory Apple Guideline 5.1.1(v))' })
  getAccountDeletionPolicy(@Req() req: Request, @Res() res: Response) {
    return this.renderPolicy(
      req,
      res,
      'Account Deletion & Data Erasure Policy',
      'Apple Guideline 5.1.1(v) & Google Play Data Safety',
      'In compliance with Apple App Store Guideline 5.1.1(v) and Google Play Data Safety policies, Live 2030 empowers all users to permanently delete their account and personal data directly from inside the mobile app or through our web support portal.',
      [
        {
          heading: '1. How to Delete Your Account Directly in the Mobile App',
          content: [
            'You can permanently delete your account at any time with immediate effect by following these simple steps inside the Live 2030 app:',
            '• Step 1: Open the Live 2030 app and log in to your account.',
            '• Step 2: Navigate to your "Profile" screen using the bottom navigation bar.',
            '• Step 3: Scroll down to the "SESSION & DANGER ZONE" section.',
            '• Step 4: Tap the red "Delete Account" button.',
            '• Step 5: Read the warning dialog and confirm by tapping "Yes, Delete My Account".',
            'SUCCESS: Your account and associated profile will be deleted immediately, local session data wiped, and you will be returned to a fresh login screen.',
          ],
        },
        {
          heading: '2. What Data Is Permanently Erased Upon Deletion',
          content: [
            'When you confirm deletion of your account, the following data is permanently purged from our production databases and media storage:',
            '• User Profile Data: Username, phone number, display name, bio, avatar image, gender, birthday, and country.',
            '• Wallet & Balances: All remaining coin balances, diamond balances, and virtual item inventories are cancelled and removed.',
            '• Social & UGC Data: All photo posts, video moments, likes, comments, following records, and follower relationships.',
            '• Live Streaming History: Live room broadcast logs, stream titles, and viewer history.',
            '• Authentication Tokens: Active JWT access tokens, refresh tokens, and device identifiers.',
          ],
        },
        {
          heading: '3. Data Retention for Legal & Financial Compliance',
          content: [
            'In accordance with international tax, anti-money-laundering (AML), and banking regulations:',
            '• Financial transaction ledger entries (such as past payment receipts or withdrawal payout logs) are severed from your personal identity (anonymized) and retained solely for mandatory statutory accounting and tax audit compliance.',
          ],
        },
        {
          heading: '4. Web-Based Deletion Request (Without App)',
          content: [
            'If you have uninstalled the app or cannot access your device, you can submit an account deletion request via email:',
            `• Send an email to: ${this.contactEmail} with the subject "Permanent Account Deletion Request".`,
            '• Include your registered phone number (with country code) and registered username.',
            '• Our Trust & Safety team will verify ownership and process the deletion within 48 business hours.',
          ],
        },
      ],
    );
  }

  // ==========================================
  // 4. COMMUNITY GUIDELINES & UGC POLICY
  // ==========================================
  @Get(['community-guidelines', 'communityguidelines', 'api/community-guidelines'])
  @ApiOperation({ summary: 'Community & Live Stream Guidelines (Apple 1.2 UGC compliance)' })
  getCommunityGuidelines(@Req() req: Request, @Res() res: Response) {
    return this.renderPolicy(
      req,
      res,
      'Community Guidelines & Live Stream Safety',
      'Zero Tolerance for Objectionable Content',
      'Live 2030 is committed to maintaining a safe, respectful, and vibrant community for creators and viewers worldwide. These guidelines outline our standards for all live broadcasts, party audio rooms, comments, and moments.',
      [
        {
          heading: '1. Zero Tolerance for Objectionable Content',
          content: [
            'ALERT: There is ZERO TOLERANCE for any abusive, objectionable, or harmful content. Streamers who broadcast prohibited content will face immediate termination of their live stream and permanent ban.',
            '• Adult & Nudity: Full or partial nudity, pornography, sexually explicit gestures, or suggestive attire is strictly prohibited.',
            '• Harassment & Bullying: No targeted attacks, stalking, hate speech based on race, religion, gender, sexual orientation, or disability.',
            '• Violence & Dangerous Acts: No depiction of physical violence, weapons, self-harm, reckless driving, or encouragement of illegal acts.',
            '• Scams & Impersonation: Do not impersonate staff, celebrities, or other users. Do not solicit money or passwords.',
          ],
        },
        {
          heading: '2. Real-Time Reporting & Moderation Mechanism',
          content: [
            '• Every live room and post features a prominent "Report" flag icon.',
            '• Any user can report a violation specifying categories (Nudity, Harassment, Fraud, Violence, Spam).',
            '• Our automated AI filters flag suspicious video frames and inappropriate keywords in real time.',
            '• Human moderators operate 24/7 to review reported streams within 24 hours.',
          ],
        },
        {
          heading: '3. Enforcement Ladder',
          content: [
            'Depending on the severity of the violation, our moderation team enforces:',
            '• Level 1: Stream termination and warning.',
            '• Level 2: 24-hour to 7-day temporary suspension.',
            '• Level 3: Permanent account ban with forfeiture of virtual balances.',
            '• Level 4: Hardware device ban and referral to law enforcement when criminal conduct occurs.',
          ],
        },
      ],
    );
  }

  // ==========================================
  // 5. CHILD SAFETY & MINOR PROTECTION
  // ==========================================
  @Get(['child-safety', 'childsafety', 'api/child-safety'])
  @ApiOperation({ summary: 'Child Safety & Minor Protection Policy' })
  getChildSafetyPolicy(@Req() req: Request, @Res() res: Response) {
    return this.renderPolicy(
      req,
      res,
      'Child Safety & Minor Protection Policy',
      'COPPA & Global Child Safety Standards',
      'Live 2030 maintains absolute zero tolerance for any content or behavior that endangers, exploits, or sexualizes minors. We strictly enforce policies to protect children and prevent minors from accessing inappropriate features.',
      [
        {
          heading: '1. Age Restriction: 18+ Only',
          content: [
            '• Live 2030 is designated exclusively for users aged 18 and older.',
            '• Minors are not permitted to register accounts, host video or voice broadcasts, or purchase virtual currency.',
            '• If we discover that an account is registered by or features a minor, the account is terminated immediately.',
          ],
        },
        {
          heading: '2. Child Sexual Abuse Material (CSAM) Zero Tolerance',
          content: [
            'ALERT: Live 2030 maintains an absolute zero-tolerance policy regarding Child Sexual Abuse Material (CSAM) or Child Sexual Exploitation and Abuse (CSAE).',
            '• Any attempt to upload, broadcast, or discuss CSAM results in immediate permanent ban, IP ban, device ban, and prompt reporting to the National Center for Missing & Exploited Children (NCMEC) and relevant international law enforcement agencies.',
          ],
        },
        {
          heading: '3. Reporting Minor Safety Concerns',
          content: [
            `If you encounter any situation involving a suspected minor or safety concern, immediately contact our dedicated safety team at: ${this.privacyEmail} or use the in-app reporting tool.`,
          ],
        },
      ],
    );
  }

  // ==========================================
  // 6. STANDARD APPLE EULA
  // ==========================================
  @Get(['eula', 'api/eula'])
  @ApiOperation({ summary: 'Standard Apple End User License Agreement (EULA)' })
  getEula(@Req() req: Request, @Res() res: Response) {
    return this.renderPolicy(
      req,
      res,
      'End User License Agreement (EULA)',
      'Apple App Store Standard Terms',
      'This End User License Agreement ("Agreement") is a legal agreement between you and Live 2030 Global Entertainment Ltd. regarding the Live 2030 mobile application.',
      [
        {
          heading: '1. Acknowledgment',
          content: [
            '• You acknowledge that this Agreement is concluded between you and Live 2030 only, and not with Apple Inc. Live 2030, not Apple, is solely responsible for the Licensed Application and the content thereof.',
            '• The license granted to you for the Licensed Application is limited to a non-transferable license to use the Licensed Application on any Apple-branded products that you own or control as permitted by the Usage Rules set forth in the Apple Media Services Terms and Conditions.',
          ],
        },
        {
          heading: '2. User Generated Content & Moderation Requirements',
          content: [
            '• Live 2030 includes User Generated Content (UGC) features including live broadcasting, interactive voice chat, and social posts.',
            '• You agree that you will not submit or broadcast any objectionable, abusive, or unlawful content.',
            '• Live 2030 provides real-time mechanisms to report and block abusive users.',
            '• Live 2030 acts on objectionable content reports within 24 hours by removing the content and ejecting the user who provided the offending content.',
          ],
        },
        {
          heading: '3. Maintenance, Support & Third-Party Claims',
          content: [
            '• Live 2030 is solely responsible for providing any maintenance and support services with respect to the Licensed Application.',
            '• Apple has no obligation whatsoever to furnish any maintenance and support services with respect to the Licensed Application.',
            '• In the event of any third-party claim that the Licensed Application infringes that third party\'s intellectual property rights, Live 2030, not Apple, will be solely responsible for the investigation, defense, settlement, and discharge of any such claim.',
          ],
        },
        {
          heading: '4. Legal Contact Information',
          content: [
            `For any questions, complaints, or claims with respect to the Licensed Application, please contact: ${this.companyName}, Email: ${this.legalEmail}`,
          ],
        },
      ],
    );
  }

  // ==========================================
  // 7. MASTER LEGAL PORTAL HUB
  // ==========================================
  @Get(['legal', 'api/legal'])
  @ApiOperation({ summary: 'Master Compliance & Legal Hub' })
  getLegalHub(@Req() req: Request, @Res() res: Response) {
    return this.renderPolicy(
      req,
      res,
      'Legal & Compliance Center',
      'Official Regulatory Policies',
      'Welcome to the Live 2030 Legal & Compliance Center. Review our official privacy commitments, platform terms, safety guidelines, and consumer protection policies below.',
      [
        {
          heading: 'Official Policy Directory',
          content: [
            '• Privacy Policy: Read how we protect and process your data under GDPR, CCPA, and Apple 5.1.1 standards -> <a href="/privacy-policy" style="color:#ec4899;font-weight:700;">View Privacy Policy</a>',
            '• Terms of Service: Platform usage agreement, virtual gifts policy, and community etiquette -> <a href="/terms-of-service" style="color:#ec4899;font-weight:700;">View Terms of Service</a>',
            '• Account Deletion Instructions: Step-by-step guidance on erasing your account and data per Apple Guideline 5.1.1(v) -> <a href="/account-deletion" style="color:#ec4899;font-weight:700;">View Deletion Instructions</a>',
            '• Community & Live Stream Guidelines: Zero-tolerance rules against inappropriate or abusive live content -> <a href="/community-guidelines" style="color:#ec4899;font-weight:700;">View Community Guidelines</a>',
            '• Child Safety & Minor Protection: Strict 18+ enforcement and minor protection protocols -> <a href="/child-safety" style="color:#ec4899;font-weight:700;">View Child Safety Policy</a>',
            '• Apple Standard EULA: End User License Agreement for iOS App Store distribution -> <a href="/eula" style="color:#ec4899;font-weight:700;">View Apple EULA</a>',
          ],
        },
      ],
    );
  }
}
