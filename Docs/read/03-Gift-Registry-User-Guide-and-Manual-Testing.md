# Gift Registry — User Guide & Manual Testing

**Audience:** QA, Project Lead, client UAT  
**Apps:** Storefront `frontend` (customer + guest) · Admin `admin` · API `backend`  
**Depends on:** [01-Razorpay-Payment-Setup.md](./01-Razorpay-Payment-Setup.md) for real checkout; Twilio is optional for this checklist.

Use this document to **operate** Gift Registry and to **sign off** that the full lifecycle works. Do not treat a public page that “loads” as done.

You need **two browsers** (or one browser + one incognito profile):

| Role | Who | How they sign in |
|---|---|---|
| **Owner** | Person creating the registry | Storefront account (email/password) → `/account/registry` |
| **Guest / buyer** | Friend buying a gift | Separate account recommended for Vaibhav Celebrations products |
| **Admin** | Operations | Admin panel → **CRM → Gift Registries** |

---

## Part A — How to use Gift Registry (owner)

### 1. Create

1. Open the website → **Login / Sign up**.
2. Go to **Account → Gift Registry** (`/account/registry`).
3. **New Registry**.
4. Fill:
   - Registry title (e.g. Aarav’s 5th Birthday)
   - Recipient / host name
   - Occasion + event date
   - Message to guests
   - **Delivery address** (required — gifts ship here)
   - Visibility:
     - **Link only (Unlisted)** — anyone with the link
     - **Public** — link + search/social preview
     - **Private** — guests need the password
5. Create. Status starts as **DRAFT**. Guests cannot see a draft.

### 2. Configure & add gifts

Open the registry from the list.

**Shop products (Vaibhav Celebrations)**  
Toggle **Our shop** → search → select → quantity wanted → **Add gift**. Guests will check out and pay on this website.

**External products**  
Toggle **External URL** → paste a product link (Amazon, etc.) → **Fetch**.

- Success: title, image, store, price (if found) fill in. Review and save.
- Failure: message *We couldn't automatically retrieve this product information…* — type title, image URL, price, store by hand, then save.

External gifts are **not** paid on Vaibhav Celebrations. Guests open the store in a new tab.

### 3. Publish & share

1. Click **Publish** (status **ACTIVE**).
2. Share:
   - **Copy link** — `/registry/<code>`
   - **WhatsApp** / **Email** / **Share** (phone share sheet)
3. Optional: **Copy Address** on the owner page to send the delivery address separately.

Unpublish = back to Draft. Close = guests cannot add gifts. Archive = hidden from your list (confirm first).

### 4. After guests buy

Owner dashboard shows:

- Wanted / purchased / remaining
- Paid shop orders linked to this registry
- External “I purchased this” confirmations — **Reverse** if a guest ticked the wrong item

---

## Part B — How guests use a shared link

1. Open the registry URL (WhatsApp / email).
2. **Private** registries: enter the password.
3. Confirm whose celebration it is, the date, and **Gifts will be delivered to the registry address**.
4. **Copy Address** if buying from an external store (courier form).
5. Each card shows: Requested / Purchased / Remaining.

**Vaibhav Celebrations gift**  
Add gift to cart (sign in if asked) → Checkout. Delivery fields are **locked** to the registry recipient. Pay with Razorpay. Do not replace the address with your own.

**External gift**  
**View Product on Store** (new tab) → buy there → return → **I purchased this gift** so others see it as taken. This is honour-based; we cannot see Amazon/Myntra receipts.

---

## Part C — Manual test plan (sign-off)

Tick every row. Use Razorpay **Test Mode** unless this is production UAT.

### C1. Registry creation

| # | Test | Pass? |
|---|---|---|
| 1 | Create registry with title, recipient, occasion, date, full address | |
| 2 | Validation: missing address or private-without-password is blocked | |
| 3 | Draft is **not** visible at `/registry/<code>` | |
| 4 | Edit title/message/address (blur-save or Save address) | |
| 5 | Publish → guest can open the link | |
| 6 | Unpublish → guest gets unavailable / not found | |
| 7 | Close → guest cannot buy | |
| 8 | Archive asks for confirmation; registry leaves the owner list | |

### C2. Vaibhav Celebrations products

| # | Test | Pass? |
|---|---|---|
| 9 | Add one shop product, quantity wanted = 2 | |
| 10 | Add a second shop product | |
| 11 | Change remaining qty on the card (guest cannot buy more than remaining) | |
| 12 | Guest adds gift to cart → Checkout shows **Gift recipient** + locked address | |
| 13 | **Successful payment** (Razorpay test success) → order PAID | |
| 14 | Owner dashboard: purchased 1, remaining 1 | |
| 15 | Admin → Gift Registries and Orders show registry code + buyer | |
| 16 | Second guest buys remaining 1 → gift **Purchased** / remaining 0 | |
| 17 | Third guest cannot add that gift | |

### C3. Payment failure / cancel (same internal gift, qty still available)

| # | Test | Pass? |
|---|---|---|
| 18 | Start checkout, **fail** the test card | Order not PAID; remaining qty **unchanged** |
| 19 | Start checkout, **close** Razorpay modal | Gift still available; cart still usable |
| 20 | Retry payment on a pending order (if shown) until success | Then qty increments **once** |

### C4. External products

Use at least **two different store URLs** (and one junk URL).

| # | Test | Pass? |
|---|---|---|
| 21 | Paste a URL with Open Graph tags → image + title appear | |
| 22 | If OG image missing, Twitter or JSON-LD still fills something **or** manual fallback is offered | |
| 23 | Broken / slow / 404 URL → no crash; manual entry works | |
| 24 | Save external gift; guest sees **External store** + **View Product on Store** (new tab, real URL) | |
| 25 | Guest cannot “checkout” an external gift on Vaibhav Celebrations | |
| 26 | Guest marks **I purchased this** → remaining decreases | |
| 27 | Owner **Reverse** confirmation → remaining restored | |
| 28 | Broken image URL still shows **Image unavailable** (layout intact) | |

### C5. Multiple buyers / last piece

| # | Test | Pass? |
|---|---|---|
| 29 | Wanted = 1. Two guests open the page. Both try to buy the last shop gift. Only **one** paid order succeeds; the other gets an error / no remaining qty | |
| 30 | Owner and Admin counts match paid orders (never higher than wanted) | |

### C6. Checkout & order linkage

| # | Test | Pass? |
|---|---|---|
| 31 | Paid registry order shipping = registry address, not the buyer’s home | |
| 32 | Order is tied to registry id / gift id in admin | |
| 33 | Buyer contact email/phone are on the order (for receipt), recipient is the registry owner | |

### C7. Sharing, privacy, SEO

| # | Test | Pass? |
|---|---|---|
| 34 | Copy link pastes a clean `/registry/<code>` URL | |
| 35 | WhatsApp share text includes owner/occasion/link | |
| 36 | **Public:** WhatsApp/Facebook debugger shows title + image (OG) | |
| 37 | **Unlisted:** link works; page should not be advertised as indexed | |
| 38 | **Private:** wrong password rejected; guessing the URL without password fails | |
| 39 | Owner cannot edit someone else’s registry (other account → 403 / not found) | |

### C8. Admin

| # | Test | Pass? |
|---|---|---|
| 40 | Search by registry code / title / owner email | |
| 41 | Open drawer: gifts, internal vs external, quantities, product URL | |
| 42 | Change status (activate / close / archive) | |
| 43 | Extractions tab: failed fetch listed; **Retry** | |
| 44 | Filter shop orders that came from a registry | |

### C9. Mobile

| # | Test | Pass? |
|---|---|---|
| 45 | Create + add gift on a phone | |
| 46 | Open shared link in WhatsApp in-app browser | |
| 47 | Add to cart → pay on mobile Checkout | |
| 48 | Copy address works; toast **Address copied!** | |

---

## Part D — Suggested UAT accounts (create these, do not commit passwords)

| Account | Email (example) | Role |
|---|---|---|
| Owner | `registry-owner@example.com` | Creates/publishes registry |
| Guest A | `registry-guest-a@example.com` | First buyer |
| Guest B | `registry-guest-b@example.com` | Second buyer / race test |
| Admin | existing SUPER_ADMIN / OPERATIONS | Oversight |

Use **real test addresses** in Jaipur (or the client’s city) so courier copy-paste looks realistic.

---

## Part E — Definition of done (must all be true)

1. Owner created, configured, added **shop + external** gifts, published, shared.  
2. Guest opened the page, saw host / occasion / address, copied address.  
3. Guest paid for a Vaibhav Celebrations gift; **only then** purchased qty increased.  
4. Failed/cancelled payment did **not** consume remaining qty.  
5. External gift opened the real store; optional confirm updated the list.  
6. Admin can find the registry, gifts, extraction status, and the paid order.

If any of C2–C6 fail, Gift Registry is **not** signed off — even if the UI looks complete.
