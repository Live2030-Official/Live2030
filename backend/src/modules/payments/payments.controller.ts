import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateOrderDto, RsomPayWebhookDto } from './dto/payment.dto';
import { RequirePermissions } from '../auth/permissions.decorator';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { UseGuards } from '@nestjs/common';
import type { Response, Request } from 'express';

@Controller('api/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * 1. Get available Coin Top-Up Packages & Pricing (SAR)
   */
  @Get('packages')
  getCoinPackages() {
    return this.paymentsService.getCoinPackages();
  }

  /**
   * Test Connection to Official RsomPay Gateway
   */
  @Get('rsompay/test-connection')
  async testConnection() {
    return this.paymentsService.testGatewayConnection();
  }

  /**
   * 2. Create RsomPay Checkout Order
   */
  @Post('rsompay/create-order')
  @UseGuards(UserAuthGuard)
  async createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    const userId = req.user.id;
    const hostHeader = req.headers['host'] || req.headers['x-forwarded-host'];
    return this.paymentsService.createCheckoutOrder(userId, dto, hostHeader);
  }

  /**
   * 3. Verify Payment Status & Auto-Credit Coins
   */
  @Get('rsompay/status/:orderId')
  async verifyPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.verifyPaymentStatus(orderId);
  }

  /**
   * 4. Outbound Webhook Receiver from RsomPay
   */
  @Post('rsompay/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers() headers: Record<string, any>,
    @Req() req: Request,
    @Body() body: RsomPayWebhookDto,
  ) {
    const rawBuf = (req as any).rawBody;
    const rawBody = Buffer.isBuffer(rawBuf) ? rawBuf.toString('utf8') : (rawBuf || JSON.stringify(body));
    return this.paymentsService.processWebhook(headers, rawBody, body);
  }

  /**
   * 5. User Payment History
   */
  @Get('history/:userId')
  @UseGuards(UserAuthGuard)
  getUserOrders(@Req() req: any, @Param('userId') userId: string) {
    return this.paymentsService.getUserOrders(req.user.id);
  }

  /**
   * 5b. Admin: recent payment orders + revenue summary
   */
  @Get('admin/orders')
  @RequirePermissions('financial.view')
  getAdminOrders(@Query('limit') limit?: string, @Query('status') status?: string) {
    return this.paymentsService.getAdminPaymentOrders(Number(limit) || 200, status);
  }

  /**
   * 6. RsomPay Return Page (Browser UX redirect after customer checkout)
   */
  @Get('rsompay/return')
  async paymentReturnPage(
    @Query('status') status: string,
    @Query('external_id') externalId: string,
    @Query('reference_number') referenceNumber: string,
    @Query('amount_paid') amountPaid: string,
    @Query('currency_code') currencyCode: string,
    @Res() res: Response,
  ) {
    let verified = false;
    let coinsAdded = 0;
    let currentBalance = 0;

    if (externalId) {
      try {
        const verifyRes = await this.paymentsService.verifyPaymentStatus(externalId);
        if (verifyRes && verifyRes.status === 'PAID') {
          verified = true;
          coinsAdded = verifyRes.coinsCredited || 0;
          currentBalance = verifyRes.currentCoins || 0;
        }
      } catch (e) {
        // If order not yet confirmed
      }
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment ${verified ? 'Successful' : 'Processing'} — Live 2030</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: radial-gradient(circle at 50% 10%, #1e1b4b 0%, #09090b 100%);
      color: #ffffff;
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: rgba(24, 24, 27, 0.85);
      border: 1px solid rgba(139, 92, 246, 0.3);
      backdrop-filter: blur(20px);
      border-radius: 28px;
      padding: 40px 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(124, 58, 237, 0.25);
      animation: popIn 0.5s ease-out;
    }
    @keyframes popIn {
      0% { transform: scale(0.9); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .icon-badge {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: ${verified ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #F59E0B, #D97706)'};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px ${verified ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'};
      font-size: 36px;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #ffffff, #c4b5fd);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #a1a1aa;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .details {
      background: rgba(39, 39, 42, 0.7);
      border-radius: 18px;
      padding: 20px;
      margin-bottom: 28px;
      text-align: left;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .row:last-child { margin-bottom: 0; }
    .label { color: #71717a; font-weight: 600; }
    .value { color: #f4f4f5; font-weight: 700; }
    .btn {
      display: block;
      width: 100%;
      padding: 16px;
      border-radius: 16px;
      background: linear-gradient(135deg, #7C3AED, #6366F1);
      color: white;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      box-shadow: 0 10px 20px rgba(124, 58, 237, 0.35);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 28px rgba(124, 58, 237, 0.45);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-badge">${verified ? '🪙' : '⏳'}</div>
    <h1>${verified ? 'Coins Recharged!' : 'Payment Received'}</h1>
    <p>${verified ? 'Your payment via RsomPay has been confirmed and coins have been added to your wallet.' : 'Your transaction is being verified by our secure gateway.'}</p>
    
    <div class="details">
      <div class="row">
        <span class="label">Order ID</span>
        <span class="value">${externalId || 'N/A'}</span>
      </div>
      <div class="row">
        <span class="label">Coins Added</span>
        <span class="value" style="color: #FBBF24;">+${coinsAdded.toLocaleString()} 🪙</span>
      </div>
      <div class="row">
        <span class="label">Amount Paid</span>
        <span class="value">${amountPaid || 'SAR'} ${currencyCode || 'SAR'}</span>
      </div>
      <div class="row">
        <span class="label">Status</span>
        <span class="value" style="color: #34D399;">${verified ? 'COMPLETED' : 'PENDING'}</span>
      </div>
    </div>

    <a href="live2030://wallet/success?order_id=${externalId || ''}" class="btn">Return to Live 2030 App</a>
  </div>
</body>
</html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  /**
   * 6b. Sandbox payment simulator confirm handler.
   * Marks the order as paid (simulator mode only) and redirects to the return page.
   */
  @Get('rsompay/simulate')
  async simulatePayment(
    @Query('orderId') orderId: string,
    @Query('amount_paid') amountPaid: string,
    @Query('currency_code') currencyCode: string,
    @Res() res: Response,
  ) {
    try {
      await this.paymentsService.markSimulatorPaid(orderId);
    } catch (e) {
      // Fall through to the return page which will display PENDING
    }
    const params = new URLSearchParams({
      status: 'success',
      external_id: orderId || '',
      amount_paid: amountPaid || '',
      currency_code: currencyCode || 'SAR',
    });
    res.redirect(`/api/payments/rsompay/return?${params.toString()}`);
  }

  /**
   * 7. Interactive RsomPay Sandbox Checkout Simulator
   * Allows testing without live credentials or offline testing.
   */
  @Get('rsompay/mock-checkout')
  async mockCheckout(@Query('orderId') orderId: string, @Res() res: Response) {
    const order = await this.paymentsService.getOrderByReference(orderId);
    const amount = order?.amountSAR || 10;
    const coins = order?.coins || 500;
    const userName = order?.userDisplayName || 'User';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RsomPay Sandbox Checkout — Live 2030</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f172a;
      color: #f8fafc;
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .modal {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 24px;
      max-width: 420px;
      width: 100%;
      padding: 28px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #334155;
    }
    .logo {
      font-size: 20px;
      font-weight: 800;
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge {
      font-size: 11px;
      background: #f59e0b;
      color: #000;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 99px;
      text-transform: uppercase;
    }
    .order-summary {
      background: #0f172a;
      padding: 16px;
      border-radius: 16px;
      margin-bottom: 20px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 18px;
      font-weight: 800;
      color: #38bdf8;
      border-top: 1px solid #334155;
      padding-top: 10px;
      margin-top: 10px;
    }
    .test-cards-box {
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 14px;
      padding: 14px;
      margin-bottom: 20px;
      font-size: 12px;
    }
    .card-option {
      background: #334155;
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid transparent;
      transition: all 0.2s;
    }
    .card-option:hover, .card-option.selected {
      border-color: #38bdf8;
      background: #1e3a5f;
    }
    .btn-pay {
      display: block;
      width: 100%;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      border: none;
      padding: 16px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3);
      transition: transform 0.2s;
      text-align: center;
      text-decoration: none;
    }
    .btn-pay:hover {
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="modal">
    <div class="header">
      <div class="logo">
        <span>💳 RsomPay</span>
      </div>
      <span class="badge">Sandbox Test</span>
    </div>

    <div class="order-summary">
      <div class="item-row">
        <span style="color: #94a3b8;">Merchant</span>
        <span style="font-weight: 600;">Live 2030 Platform</span>
      </div>
      <div class="item-row">
        <span style="color: #94a3b8;">Item</span>
        <span style="font-weight: 600; color: #fbbf24;">+${coins.toLocaleString()} Coins</span>
      </div>
      <div class="item-row">
        <span style="color: #94a3b8;">User</span>
        <span style="font-weight: 600;">${userName}</span>
      </div>
      <div class="total-row">
        <span>Total Due</span>
        <span>${amount.toFixed(2)} SAR</span>
      </div>
    </div>

    <div class="test-cards-box">
      <strong>🧪 Official Sandbox Cards (docs.rsompay.com):</strong>
      <div style="margin-top: 6px;">• Mada: <code>4464040000000007</code> (Exp 01/39, CVV 100)</div>
      <div style="margin-top: 4px;">• Mastercard: <code>5123450000000008</code> (Exp 01/39, CVV 100)</div>
    </div>

    <form method="GET" action="/api/payments/rsompay/simulate">
      <input type="hidden" name="orderId" value="${orderId || ''}">
      <input type="hidden" name="amount_paid" value="${amount}">
      <input type="hidden" name="currency_code" value="SAR">
      <input type="hidden" name="payment_method" value="mada">
      <button type="submit" class="btn-pay">Simulate Successful Payment (${amount.toFixed(2)} SAR)</button>
    </form>
  </div>
</body>
</html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}
