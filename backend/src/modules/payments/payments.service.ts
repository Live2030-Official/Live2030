import { Injectable, Logger, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { SignalingGateway } from '../signaling/signaling.gateway';
import { CreateOrderDto, RsomPayWebhookDto } from './dto/payment.dto';
import { LevelsService } from '../levels/levels.service';
import { CoinPackagesService } from '../coin-packages/coin-packages.service';
import * as crypto from 'crypto';

export interface CoinPackage {
  id: string;
  name?: string;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  amountUSD?: number;
  amountSAR: number;
  badge?: string;
  popular?: boolean;
}

export interface PaymentOrderRecord {
  orderId: string;
  userId: string;
  userDisplayName: string;
  packageId?: string;
  coins: number;
  amountSAR: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  checkoutUrl: string;
  paymentMethod?: string;
  gatewayReference?: string;
  paidAt?: string;
  simulatorPaid?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 1 USD = 3.75 SAR (matches CoinPackagesService.USD_TO_SAR) */
const USD_TO_SAR = 3.75;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  // In-memory cache mirroring the durable PaymentOrder table (fast lookups).
  public static ordersMap = new Map<string, PaymentOrderRecord>();

  // Fallback Curated Coin Packages (used only if the coin_packages table is unavailable)
  public static readonly COIN_PACKAGES: CoinPackage[] = [
    { id: 'pkg_100', name: 'Starter Pack', coins: 100, bonusCoins: 0, totalCoins: 100, amountUSD: 0.53, amountSAR: 2.0, badge: 'Starter' },
    { id: 'pkg_500', name: 'Value Pack', coins: 500, bonusCoins: 50, totalCoins: 550, amountUSD: 2.67, amountSAR: 10.0, badge: '+10% Bonus' },
    { id: 'pkg_1200', name: 'Plus Pack', coins: 1200, bonusCoins: 200, totalCoins: 1400, amountUSD: 6.4, amountSAR: 24.0, badge: '+16% Bonus' },
    { id: 'pkg_2500', name: 'Popular Pack', coins: 2500, bonusCoins: 500, totalCoins: 3000, amountUSD: 13.33, amountSAR: 50.0, badge: 'Most Popular 🔥', popular: true },
    { id: 'pkg_6000', name: 'Mega Pack', coins: 6000, bonusCoins: 1500, totalCoins: 7500, amountUSD: 32.0, amountSAR: 120.0, badge: '+25% Extra ✨' },
    { id: 'pkg_15000', name: 'VIP Pack', coins: 15000, bonusCoins: 5000, totalCoins: 20000, amountUSD: 80.0, amountSAR: 300.0, badge: 'VIP Deal 👑' },
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly coinPackagesService: CoinPackagesService,
    private readonly signalingGateway?: SignalingGateway,
    private readonly levelsService?: LevelsService,
  ) {}

  /**
   * Get all active coin packages with active payment configuration
   */
  async getCoinPackages() {
    const isSandbox = this.getEnvironment() === 'sandbox';
    let packages: CoinPackage[] = [];
    try {
      packages = (await this.coinPackagesService.getActivePackages()) as CoinPackage[];
    } catch {
      packages = [];
    }
    if (!packages || packages.length === 0) {
      packages = PaymentsService.COIN_PACKAGES;
    }
    return {
      packages,
      environment: this.getEnvironment(),
      currency: 'SAR',
      isSandbox,
      testCards: isSandbox
        ? [
            { brand: 'mada', cardNumber: '4464040000000007', expiry: '01/39', cvv: '100' },
            { brand: 'Mastercard', cardNumber: '5123450000000008', expiry: '01/39', cvv: '100' },
          ]
        : [],
    };
  }

  /**
   * Determine RsomPay environment ('sandbox' | 'production')
   */
  private getEnvironment(): string {
    return (this.configService.get<string>('RSOMPAY_ENV') || 'sandbox').toLowerCase();
  }

  /**
   * Whether a production RsomPay API key has been explicitly configured.
   */
  private getApiKeyConfigured(): boolean {
    return !!((this.configService.get<string>('RSOMPAY_API_KEY') || '').trim());
  }

  /**
   * Simulator mode: no real RsomPay key configured (or RSOMPAY_SIMULATE=true).
   * Only ever active in sandbox/dev — never when a real API key is set.
   */
  private isSimulatorMode(): boolean {
    const simulateFlag = (this.configService.get<string>('RSOMPAY_SIMULATE') || 'false').toLowerCase() === 'true';
    return simulateFlag || (this.getEnvironment() === 'sandbox' && !this.getApiKeyConfigured());
  }

  /**
   * Integration API Base URL
   */
  private getBaseUrl(): string {
    if (this.getEnvironment() === 'production') {
      return (
        this.configService.get<string>('RSOMPAY_BASE_URL') ||
        'https://integration.rsompay.com/api/external/v1'
      );
    }
    return (
      this.configService.get<string>('RSOMPAY_BASE_URL') ||
      'https://demo-integration.rsompay.com/api/external/v1'
    );
  }

  /**
   * Resolve the public base URL used for gateway callbacks.
   * Prefers an explicit PUBLIC_BASE_URL / RSOMPAY_RETURN_URL, otherwise derives
   * from the request Host header. Flags local/private hosts so live-mode calls
   * can fail fast with a clear message instead of the gateway's opaque 422.
   */
  private resolvePublicBaseUrl(hostHeader?: string): { base: string; isLocal: boolean } {
    const explicit =
      this.configService.get<string>('PUBLIC_BASE_URL') ||
      this.configService.get<string>('RSOMPAY_RETURN_URL');
    if (explicit && explicit.trim()) {
      try {
        const u = new URL(explicit);
        return { base: `${u.protocol}//${u.host}`, isLocal: false };
      } catch {
        // fall through to host header derivation
      }
    }
    const port = this.configService.get<string>('PORT') || '4000';
    const host = (hostHeader && hostHeader.trim()) || `localhost:${port}`;
    const hostname = host.split(':')[0];
    const isLocal =
      /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|.*\.local|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(
        hostname,
      );
    return { base: `${isLocal ? 'http' : 'https'}://${host}`, isLocal };
  }

  private getApiKey(): string {
    const key = this.configService.get<string>('RSOMPAY_API_KEY');
    if (key && key.trim().length > 5) {
      return key.trim();
    }
    throw new Error('RSOMPAY_API_KEY environment variable is required');
  }

  /**
   * Webhook signing secret (X-Rsom-Signature)
   */
  private getWebhookSecret(): string {
    return this.configService.get<string>('RSOMPAY_WEBHOOK_SECRET') || '';
  }

  /**
   * Test live connection to official RsomPay External API
   */
  async testGatewayConnection() {
    const apiKey = this.getApiKey();
    const env = this.getEnvironment();
    const baseUrl = this.getBaseUrl();
    const webhookSecretConfigured = !!this.getWebhookSecret();
    const apiKeyConfigured = this.getApiKeyConfigured();

    if (!apiKeyConfigured) {
      return {
        officialLiveConnection: false,
        environment: env,
        baseUrl,
        apiKeyConfigured: false,
        webhookSecretConfigured,
        status: 'SIMULATOR_ACTIVE',
        reason: 'RSOMPAY_API_KEY is currently empty in backend/.env',
        explanation:
          'Because no RsomPay API Key is set yet, the server safely uses the local simulator so you can test the app without crashing.',
        howToActivateOfficialGateway: [
          '1. Log into your RsomPay Client Portal (or contact RsomPay IT at it@rsompay.com)',
          '2. Go to "Integration Settings" -> API Tokens',
          '3. Generate a token named "client-external-api" with abilities client_invoices.create and client_invoices.view',
          '4. Copy the token and paste it into RSOMPAY_API_KEY in backend/.env on your server',
          '5. Paste the webhook signing secret into RSOMPAY_WEBHOOK_SECRET in backend/.env',
        ],
      };
    }

    try {
      const response = await fetch(`${baseUrl}/transactions?customer_id=CUST-TEST&page=1&per_page=1`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      });

      const responseBody: any = await response.json();

      return {
        officialLiveConnection: response.ok,
        httpStatus: response.status,
        environment: env,
        baseUrl,
        apiKeyConfigured: true,
        webhookSecretConfigured,
        officialRsomPayResponse: responseBody,
        message: response.ok
          ? 'Successfully connected to official RsomPay API!'
          : `RsomPay returned HTTP ${response.status}. Please check token permissions.`,
      };
    } catch (err: any) {
      return {
        officialLiveConnection: false,
        environment: env,
        baseUrl,
        apiKeyConfigured: true,
        error: err.message,
        message: 'Could not connect to RsomPay API host.',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Durable order helpers
  // ---------------------------------------------------------------------------

  private toRecord(row: any): PaymentOrderRecord {
    const displayName =
      row?.user?.displayName || row?.user?.username || row?.packageName || 'Member';
    return {
      orderId: row.externalId,
      userId: row.userId,
      userDisplayName: displayName,
      packageId: row.packageId || undefined,
      coins: row.totalCoins ?? row.coins ?? 0,
      amountSAR: row.amountSAR ?? 0,
      currency: row.currency || 'SAR',
      status: row.status,
      checkoutUrl: row.checkoutUrl || '',
      gatewayReference: row.providerReference || undefined,
      paidAt: row.creditedAt ? new Date(row.creditedAt).toISOString() : undefined,
      simulatorPaid: !!row.simulatorPaid,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  /**
   * Load an order from the durable table (falling back to the memory cache).
   */
  async getOrderByReference(orderId: string): Promise<PaymentOrderRecord | null> {
    if (!orderId) return null;
    try {
      const row = await (this.prisma as any).paymentOrder.findUnique({
        where: { externalId: orderId },
        include: { user: { select: { displayName: true, username: true } } },
      });
      if (row) {
        const rec = this.toRecord(row);
        PaymentsService.ordersMap.set(orderId, rec);
        return rec;
      }
    } catch (err: any) {
      this.logger.warn(`Could not load payment order ${orderId} from DB: ${err.message}`);
    }
    return PaymentsService.ordersMap.get(orderId) || null;
  }

  private async updateOrder(orderId: string, data: Record<string, any>): Promise<void> {
    try {
      await (this.prisma as any).paymentOrder.update({ where: { externalId: orderId }, data });
    } catch (err: any) {
      this.logger.warn(`Could not persist payment order ${orderId}: ${err.message}`);
    }
    const cached = PaymentsService.ordersMap.get(orderId);
    if (cached) {
      PaymentsService.ordersMap.set(orderId, { ...cached, updatedAt: new Date().toISOString() });
    }
  }

  /**
   * Create an online coin top-up order and obtain RsomPay Checkout URL
   */
  async createCheckoutOrder(userId: string, dto: CreateOrderDto, hostHeader?: string) {
    // 1. Resolve coin package or custom coins
    let coins = 0;
    let bonusCoins = 0;
    let amountSAR = 0;
    let packageName: string | undefined;

    if (dto.packageId) {
      const pkg = await this.coinPackagesService.findPackage(dto.packageId);
      if (!pkg) {
        throw new BadRequestException(`Coin package '${dto.packageId}' not found.`);
      }
      coins = pkg.totalCoins;
      bonusCoins = (pkg as any).bonusCoins ?? 0;
      amountSAR = pkg.amountSAR;
      packageName = (pkg as any).name;
    } else if (dto.coins && dto.amountSAR) {
      coins = Number(dto.coins);
      amountSAR = Number(dto.amountSAR);
      if (coins <= 0 || amountSAR < 2) {
        throw new BadRequestException('Minimum recharge amount is 2 SAR.');
      }
    } else {
      throw new BadRequestException('Either packageId or (coins + amountSAR) must be provided.');
    }

    // 2. Fetch User Details (no silent fallback to another user)
    const user = await this.usersService.getUserById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    // 3. Generate unique order reference
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    const externalId = `LIVE2030-PAY-${timestamp}-${rand}`;

    // 4. Resolve public callback URLs.
    //    Live RsomPay requires publicly-reachable HTTPS URLs; localhost /
    //    private hosts are only acceptable in simulator mode. Fail fast with a
    //    clear message instead of the gateway's opaque 422 response.
    const { base: publicBase, isLocal } = this.resolvePublicBaseUrl(hostHeader);
    if (!this.isSimulatorMode() && isLocal) {
      throw new BadRequestException(
        'A public HTTPS callback URL is required for live RsomPay. ' +
          'Set PUBLIC_BASE_URL (e.g. https://api.your-domain.com) and try again.',
      );
    }

    const ensureHttps = (url: string) => (this.isSimulatorMode() ? url : url.replace(/^http:\/\//i, 'https://'));

    const returnUrl = ensureHttps(
      dto.returnUrl ||
        this.configService.get<string>('RSOMPAY_RETURN_URL') ||
        `${publicBase}/api/payments/rsompay/return?external_id=${externalId}`,
    );

    const notificationUrl = ensureHttps(
      dto.notificationUrl ||
        this.configService.get<string>('RSOMPAY_NOTIFICATION_URL') ||
        `${publicBase}/api/payments/rsompay/webhook`,
    );

    // 5. Build RsomPay payload
    const customer = {
      id: user.id,
      fullname: user.displayName || user.username || 'Live 2030 Member',
      email: user.email || `${user.username || user.id}@live2030.com`,
      phone: user.phone || '+966500000000',
    };

    const payload = {
      external_id: externalId,
      amount: amountSAR,
      currency_code: 'SAR',
      notification_url: notificationUrl,
      return_url: returnUrl,
      customer,
      description: `Live 2030: Recharge ${coins} Coins (${user.displayName || user.username})`,
      ...(dto.paymentMethod ? { brand: dto.paymentMethod } : {}),
      save_card: false,
    };

    let checkoutUrl = '';
    const apiKey = this.getApiKey();
    const provider = this.isSimulatorMode() ? 'SIMULATOR' : 'RSOMPAY';

    // 6. In simulator mode (sandbox + no real RSOMPAY_API_KEY), bypass the live gateway
    if (this.isSimulatorMode()) {
      const simulateHost = hostHeader || `localhost:${this.configService.get<string>('PORT') || 4000}`;
      const simulateProto = this.configService.get<string>('RSOMPAY_SIMULATE_PROTO') || 'http';
      checkoutUrl = `${simulateProto}://${simulateHost}/api/payments/rsompay/mock-checkout?orderId=${encodeURIComponent(externalId)}`;
      this.logger.warn(`[Simulator] No RSOMPAY_API_KEY set — using sandbox checkout: ${checkoutUrl}`);
    } else {
      try {
        this.logger.log(`Calling RsomPay POST /payments with external_id=${externalId}, amount=${amountSAR} SAR`);
        const response = await fetch(`${this.getBaseUrl()}/payments`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data: any = await response.json();
        this.logger.log(`RsomPay response (${response.status}): ${JSON.stringify(data)}`);

        if (response.ok && data?.data?.checkout_url) {
          checkoutUrl = data.data.checkout_url;
        } else if (data?.data?.payment_url) {
          checkoutUrl = data.data.payment_url;
        } else {
          const errorMsg = data?.message || data?.errors ? JSON.stringify(data.errors) : 'Gateway error';
          this.logger.error(`RsomPay rejected payment creation: ${errorMsg}`);
          throw new BadRequestException(`RsomPay Gateway Error: ${errorMsg}`);
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        this.logger.error(`Error communicating with RsomPay API: ${err.message}`);
        throw new BadRequestException(`Failed to communicate with RsomPay Gateway: ${err.message}`);
      }
    }

    // 7. Persist the order durably in PostgreSQL
    const amountUSD = parseFloat((amountSAR / USD_TO_SAR).toFixed(4));
    try {
      await (this.prisma as any).paymentOrder.create({
        data: {
          externalId,
          userId: user!.id,
          packageId: dto.packageId || null,
          packageName: packageName || null,
          coins: coins - bonusCoins > 0 ? coins - bonusCoins : coins,
          bonusCoins,
          totalCoins: coins,
          amountSAR,
          amountUSD,
          currency: 'SAR',
          status: 'PENDING',
          provider,
          checkoutUrl,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to persist payment order ${externalId}: ${err.message}`);
      throw new BadRequestException('Could not create payment order. Please try again.');
    }

    PaymentsService.ordersMap.set(externalId, {
      orderId: externalId,
      userId: user!.id,
      userDisplayName: user!.displayName || user!.username,
      packageId: dto.packageId,
      coins,
      amountSAR,
      currency: 'SAR',
      status: 'PENDING',
      checkoutUrl,
      paymentMethod: dto.paymentMethod,
      simulatorPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      orderId: externalId,
      checkoutUrl,
      amountSAR,
      amountUSD,
      coins,
      currency: 'SAR',
      status: 'PENDING',
      environment: this.getEnvironment(),
      message: 'Checkout session created successfully.',
    };
  }

  /**
   * Mark an order as paid via the sandbox checkout simulator, then verify/credit it.
   * Only honored while in simulator mode (no live RSOMPAY_API_KEY).
   */
  async markSimulatorPaid(orderId: string) {
    const order = await this.getOrderByReference(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }
    if (!this.isSimulatorMode()) {
      throw new BadRequestException(
        'Simulator is disabled because a live RSOMPAY_API_KEY is configured. Complete payment on the RsomPay checkout page.',
      );
    }
    await this.updateOrder(orderId, { simulatorPaid: true });
    this.logger.log(`[Simulator] Order ${orderId} marked paid by sandbox checkout.`);
    return this.verifyPaymentStatus(orderId);
  }

  /**
   * Verify Payment Status via RsomPay /payments/by-reference.
   * STRICT AUTHORITATIVE CHECK: Only credits coins after RsomPay confirms status is 'paid'
   * (or, in simulator mode, after the sandbox checkout has explicitly marked it paid).
   */
  async verifyPaymentStatus(orderId: string) {
    const order = await this.getOrderByReference(orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found.`);
    }

    // If already paid, return confirmed idempotent balance
    if (order.status === 'PAID') {
      const user = await this.usersService.getUserById(order.userId);
      return {
        success: true,
        orderId,
        status: 'PAID',
        coinsCredited: order.coins,
        currentCoins: user?.coins ?? 0,
        paidAt: order.paidAt,
        message: 'Payment already verified and coins credited!',
      };
    }

    // Authoritatively query official RsomPay GET /payments/by-reference
    const apiKey = this.getApiKey();
    let isGatewayPaid = false;
    let gatewayRef = '';

    // Only query the live gateway when a real key is configured (never in simulator mode)
    if (!this.isSimulatorMode() && this.getApiKeyConfigured()) {
      try {
        const queryUrl = `${this.getBaseUrl()}/payments/by-reference?external_id=${encodeURIComponent(orderId)}`;
        this.logger.log(`Querying RsomPay by-reference: ${queryUrl}`);
        const response = await fetch(queryUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
        });

        const resJson: any = await response.json();
        this.logger.log(`RsomPay status response for ${orderId}: ${JSON.stringify(resJson)}`);

        if (response.ok && resJson?.status === true) {
          const rsomStatus = (resJson?.data?.status || '').toLowerCase();
          if (rsomStatus === 'paid') {
            isGatewayPaid = true;
            gatewayRef = resJson?.data?.brand || resJson?.data?.reference_number || 'RsomPay Verified';
          } else if (rsomStatus === 'failed') {
            await this.updateOrder(orderId, { status: 'FAILED' });
            return {
              success: false,
              orderId,
              status: 'FAILED',
              coins: order.coins,
              amountSAR: order.amountSAR,
              message: 'Payment was declined or failed on RsomPay gateway.',
            };
          }
        }
      } catch (err: any) {
        this.logger.error(`Error querying RsomPay status: ${err.message}`);
      }
    }

    if (isGatewayPaid) {
      const updatedBalance = await this.completeOrderAndCreditCoins(
        orderId,
        gatewayRef || 'RsomPay Verified',
      );
      return {
        success: true,
        orderId,
        status: 'PAID',
        coinsCredited: order.coins,
        currentCoins: updatedBalance,
        message: `Payment verified from RsomPay! +${order.coins} coins added to your wallet.`,
      };
    }

    // Simulator mode: coins are only credited once the sandbox checkout page has explicitly
    // simulated a successful payment (order.simulatorPaid). Never in production.
    if (this.isSimulatorMode() && order.simulatorPaid) {
      const updatedBalance = await this.completeOrderAndCreditCoins(orderId, 'Simulator (sandbox)');
      return {
        success: true,
        orderId,
        status: 'PAID',
        coinsCredited: order.coins,
        currentCoins: updatedBalance,
        simulated: true,
        message: `[Simulator] Payment confirmed & +${order.coins} coins credited. Set RSOMPAY_API_KEY to go live.`,
      };
    }

    return {
      success: false,
      orderId,
      status: order.status,
      coins: order.coins,
      amountSAR: order.amountSAR,
      message: 'Payment is pending. Awaiting gateway confirmation.',
    };
  }

  /**
   * Complete payment order, credit user wallet atomically with a COIN_PURCHASE ledger entry
   * (idempotent via idempotencyKey), update VIP recharge tier, and broadcast telemetry.
   */
  async completeOrderAndCreditCoins(orderId: string, reference = 'RsomPay Online Checkout') {
    const order = await this.getOrderByReference(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    if (order.status === 'PAID') {
      const user = await this.usersService.getUserById(order.userId);
      return user?.coins ?? 0;
    }

    const shippedCoins = order.coins;
    const amountUSD = parseFloat((order.amountSAR / USD_TO_SAR).toFixed(4));
    const idempotencyKey = `PAYMENT:${orderId}`;

    // Atomic credit: wallet increment + COIN_PURCHASE ledger + order PAID.
    let newBalance: number;
    try {
      newBalance = await this.prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.upsert({
          where: { userId: order.userId },
          create: {
            userId: order.userId,
            coins: shippedCoins,
            totalCoinsPurchased: shippedCoins,
          },
          update: {
            coins: { increment: shippedCoins },
            totalCoinsPurchased: { increment: shippedCoins },
          },
        });

        await tx.transactionLedger.create({
          data: {
            type: 'COIN_PURCHASE' as any,
            recipientId: order.userId,
            amountUSD,
            notes: `${reference} — Order ${orderId} (${order.amountSAR} SAR → ${shippedCoins} coins)`,
            idempotencyKey,
          },
        });

        await tx.paymentOrder.update({
          where: { externalId: orderId },
          data: {
            status: 'PAID',
            providerReference: reference,
            creditedAt: new Date(),
            amountUSD,
          },
        });

        return wallet.coins;
      });
    } catch (err: any) {
      // P2002 = unique constraint on idempotencyKey → already credited
      if (err?.code === 'P2002') {
        this.logger.warn(`Payment ${orderId} already credited (idempotency hit).`);
        const user = await this.usersService.getUserById(order.userId);
        return user?.coins ?? 0;
      }
      throw err;
    }

    // Update memory cache + order cache
    try {
      await this.usersService.getUserById(order.userId); // refresh in-memory registry if applicable
    } catch {}
    const cached = PaymentsService.ordersMap.get(orderId);
    if (cached) {
      cached.status = 'PAID';
      cached.gatewayReference = reference;
      cached.paidAt = new Date().toISOString();
      PaymentsService.ordersMap.set(orderId, cached);
    }

    // Credit VIP recharge progression using the true paid USD value
    if (this.levelsService && amountUSD > 0) {
      try {
        await this.levelsService.awardRechargeUSD(
          order.userId,
          amountUSD,
          `RsomPay Recharge Order ${orderId} (${order.amountSAR} SAR)`,
        );
      } catch (err: any) {
        this.logger.warn(`Could not update VIP level for order ${orderId}: ${err.message}`);
      }
    }

    // Real-time WebSocket events
    if (this.signalingGateway) {
      this.signalingGateway.broadcastToUser(order.userId, 'wallet:topup_success', {
        orderId,
        coinsAdded: shippedCoins,
        newBalance,
        amountSAR: order.amountSAR,
        timestamp: Date.now(),
      });

      this.signalingGateway.broadcastAdminTelemetry('admin:payment_completed', {
        orderId,
        userId: order.userId,
        coins: shippedCoins,
        amountSAR: order.amountSAR,
        user: order.userDisplayName,
        timestamp: Date.now(),
      });
    }

    this.logger.log(
      `Successfully credited ${shippedCoins} coins to user ${order.userId} for order ${orderId}. New balance: ${newBalance}`,
    );

    return newBalance;
  }

  /**
   * Process outbound webhook from RsomPay with HMAC-SHA256 signature verification
   * and AUTHORITATIVE API VERIFICATION before crediting any coins.
   */
  async processWebhook(headers: Record<string, any>, rawBody: string, parsedBody: RsomPayWebhookDto) {
    const signature = headers['x-rsom-signature'] || headers['X-Rsom-Signature'];
    const timestamp = headers['x-rsom-timestamp'] || headers['X-Rsom-Timestamp'];
    const secret = this.getWebhookSecret();

    // 1. Signature Verification (if secret configured)
    if (secret && secret.trim().length > 0) {
      if (!signature || !timestamp) {
        this.logger.warn('Webhook rejected: Missing X-Rsom-Signature or X-Rsom-Timestamp');
        throw new UnauthorizedException('Missing webhook signature headers');
      }

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

      const sigBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (
        sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        this.logger.warn('Webhook rejected: Invalid X-Rsom-Signature HMAC');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    this.logger.log(`Received RsomPay webhook event: '${parsedBody.event}' for event_id=${parsedBody.event_id}`);

    // 2. Process Events
    const event = parsedBody.event;
    const externalId =
      parsedBody.payment?.external_id ||
      parsedBody.invoice?.external_id ||
      (parsedBody as any)?.data?.external_id;

    if (!externalId) {
      this.logger.warn('Webhook payload does not contain external_id');
      return { status: true, message: 'No external_id in payload.' };
    }

    // 3. Deduplication via ledger idempotency + order status (durable)
    const order = await this.getOrderByReference(externalId);
    if (order) {
      await this.updateOrder(externalId, { webhookPayload: parsedBody as any }).catch(() => {});
    }

    if (event === 'payment.direct.paid' || event === 'payment.completed') {
      this.logger.log(`Webhook reported paid for ${externalId}. Executing strict verification with RsomPay API...`);
      const verifyRes = await this.verifyPaymentStatus(externalId);
      if (verifyRes.success && verifyRes.status === 'PAID') {
        this.logger.log(`Webhook verification confirmed for ${externalId}. Coins credited: ${verifyRes.coinsCredited}`);
        return { status: true, message: 'Payment verified from RsomPay and coins credited successfully.' };
      }
      this.logger.warn(`Webhook received for ${externalId} but status was not paid: ${verifyRes.status}`);
      return { status: false, message: `RsomPay API status is ${verifyRes.status}, not paid.` };
    } else if (event === 'payment.direct.failed' || event === 'payment.failed') {
      await this.updateOrder(externalId, { status: 'FAILED' });
    }

    return { status: true, message: 'Webhook processed successfully' };
  }

  /**
   * Get user's top-up orders history (durable).
   */
  async getUserOrders(userId: string) {
    try {
      const rows = await (this.prisma as any).paymentOrder.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { user: { select: { displayName: true, username: true } } },
      });
      return rows.map((r: any) => this.toRecord(r));
    } catch {
      const orders: PaymentOrderRecord[] = [];
      for (const order of PaymentsService.ordersMap.values()) {
        if (order.userId === userId) orders.push(order);
      }
      return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  /**
   * Admin: list recent payment orders for the financial dashboard.
   */
  async getAdminPaymentOrders(limit = 200, status?: string) {
    try {
      const rows = await (this.prisma as any).paymentOrder.findMany({
        where: status ? { status } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { user: { select: { displayName: true, username: true } } },
      });
      const orders = rows.map((r: any) => this.toRecord(r));
      const paid = orders.filter((o: any) => o.status === 'PAID');
      const totalSAR = paid.reduce((s: number, o: any) => s + (o.amountSAR || 0), 0);
      return {
        orders,
        summary: {
          total: orders.length,
          paid: paid.length,
          pending: orders.filter((o: any) => o.status === 'PENDING').length,
          failed: orders.filter((o: any) => o.status === 'FAILED').length,
          grossRevenueSAR: parseFloat(totalSAR.toFixed(2)),
          grossRevenueUSD: parseFloat((totalSAR / USD_TO_SAR).toFixed(2)),
          coinsSold: paid.reduce((s: number, o: any) => s + (o.coins || 0), 0),
        },
      };
    } catch (err: any) {
      this.logger.warn(`Admin payment orders query failed: ${err.message}`);
      return { orders: [], summary: { total: 0, paid: 0, pending: 0, failed: 0, grossRevenueSAR: 0, grossRevenueUSD: 0, coinsSold: 0 } };
    }
  }
}
