# Checkout communications UAT — Vaibhav Celebrations

Checkout is **Orders only**: shop products, gift registry products, and celebration packages (`OrderKind.SHOP | PACKAGE`). There is no customer Booking checkout.

## Happy path (each kind)

1. Create order (cart, registry, or `POST /shop/orders/package`).
2. Pay with Razorpay Checkout (Test Mode).
3. Verify **and** webhook both call `markOrderPaid` (idempotent).
4. Expect:
   - Order `paymentStatus = PAID`
   - Invoice PDF overlaid on VC letterhead (`backend/assets/vc-letterhead.pdf`)
   - One confirmation email + one invoice email (`emailSendStatus`)
   - One WhatsApp `order_confirmation` (`whatsappSendStatus`, `whatsappMessageId`)
   - Registry purchased qty increases only after PAID

## Duplicate / race

- Close the browser after pay: webhook still marks PAID.
- Verify + webhook together: paid transition once; emails/WhatsApp claimed once via `emailSendStatus` / `whatsappSendStatus`.

## Failures

- Failed payment: order not PAID; registry qty not incremented.
- SMTP unset: email `SKIPPED`, order still PAID.
- WhatsApp unset: WhatsApp `SKIPPED`, order still PAID.

## Guest invoice download

`POST /guest/lookup/request-otp` with `referenceType: ORDER` and the order code, then `GET /guest/order/:orderCode` / invoice download.

## Admin

- Orders tabs: Shop / Package / Registry
- Calendar: paid orders, package event dates, registry birthdays
- Invoices: resend uses Titan + Meta invoice template

## Env pointers

- Titan: `Docs/read/04-SMTP-Titan-Support-Email-Setup.md`
- Meta WhatsApp: `Docs/read/02-Meta-WhatsApp-Cloud-API-Setup.md`
- Razorpay: `Docs/read/01-Razorpay-Payment-Setup.md`
