# Digital Farmer-Buyer Matching System with Pay-on-Delivery Verification
## Phased Build Prompts (for use with an AI coding assistant)

**Stack:** Next.js (React) + TailwindCSS v4 + Shadcn/ui + Zustand (frontend) · Supabase — Auth, Postgres, Realtime, Edge Functions, Storage (backend)

**How to use this document:** Each phase below is a self-contained prompt. Feed phases to your coding assistant **in order**, one at a time. Do not start a phase until the previous phase's testing requirements pass. Each phase assumes all prior phases are complete and available in the codebase.

---

## Phase 0 — Project Scaffolding & Architecture Setup

### Prompt

```
You are setting up the foundation for a "Digital Farmer-Buyer Matching System with 
Integrated Pay-on-Delivery (PoD) Verification" — a marketplace connecting Nigerian 
smallholder farmers directly with buyers, with escrow payments and OTP/QR delivery 
verification.

Scaffold a new project with:
- Next.js (App Router) + TypeScript
- TailwindCSS v4
- Shadcn/ui component library, initialized with a clean neutral theme
- Zustand for client-side state management
- Supabase client SDK (@supabase/supabase-js and @supabase/ssr) configured for both
  server and browser contexts
- Environment variable structure for Supabase URL/anon key/service role key
- Folder structure following a modular, maintainable architecture:
  /app            - Next.js routes (grouped by role: (farmer), (buyer), (agent), (admin), (auth))
  /components      - shared UI components
  /components/ui   - shadcn components
  /lib/supabase    - client, server, and middleware Supabase helpers
  /lib/stores      - Zustand stores
  /lib/types       - shared TypeScript types
  /lib/validators  - Zod schemas
  /lib/env         - Holds env variables imports.
  /supabase/migrations - SQL migration files
- ESLint + Prettier config
- A base layout with role-aware navigation shell (placeholder links only, no logic yet)
- A README documenting the architecture: Client-Server model (React client ↔ Supabase),
  and how MVC maps to this stack (Model = Supabase tables, View = React components,
  Controller = client logic + Supabase API calls)

Do not implement any business logic, database tables, or auth yet — this phase is
scaffolding only.
```

### Testing Requirements
- [x] Project builds and runs (`npm run dev`) with no errors
- [x] TailwindCSS v4 styles apply correctly on a sample page
- [x] At least one Shadcn component renders correctly
- [x] Supabase client initializes without throwing (verify with a console log of client instance)
- [x] Environment variables load correctly in both server and client contexts
- [x] Folder structure matches spec; confirm via directory listing
- [x] Lint and type-check pass with zero errors (`npm run lint`, `tsc --noEmit`)

---

## Phase 1 — Database Design & Schema (Supabase/PostgreSQL)

### Prompt

```
Design and implement the full PostgreSQL schema in Supabase for the Digital
Farmer-Buyer Matching System, based on this Entity-Relationship model:

Core tables required:
- users (id, role[farmer|buyer|agent|admin], full_name, phone, email, location,
  created_at, is_verified, is_active)
- farmer_profiles (user_id FK, farm_name, farm_location, geolocation, bio, rating_avg)
- buyer_profiles (user_id FK, business_name, delivery_address, geolocation, rating_avg)
- delivery_agent_profiles (user_id FK, vehicle_type, coverage_area, rating_avg,
  availability_status)
- products (id, farmer_id FK, name, crop_type, quantity, unit, price, harvest_date,
  location, geolocation, status[available|reserved|sold], created_at)
- product_images (id, product_id FK, storage_path, is_primary)
- orders (id, buyer_id FK, product_id FK, farmer_id FK, quantity_ordered, total_price,
  status[pending|accepted|in_escrow|out_for_delivery|delivered|verified|completed|
  disputed|cancelled], created_at)
- escrow_transactions (id, order_id FK, amount, status[held|released|refunded],
  held_at, released_at)
- deliveries (id, order_id FK, agent_id FK, pickup_time, route_log JSONB,
  status[assigned|picked_up|in_transit|delivered], current_location)
- delivery_verifications (id, delivery_id FK, method[otp|qr], code_hash,
  verified_by, verified_at, status[pending|verified|failed])
- digital_receipts (id, order_id FK, receipt_number, issued_at, summary JSONB,
  pdf_storage_path)
- ratings_reviews (id, order_id FK, reviewer_id FK, reviewee_id FK, rating[1-5],
  comment, created_at)
- disputes (id, order_id FK, raised_by FK, reason, status[open|investigating|
  resolved|rejected], resolution_notes, created_at)
- notifications (id, user_id FK, type, message, is_read, created_at)
- admin_actions (id, admin_id FK, action_type, target_table, target_id, notes, created_at)

Requirements:
- Use UUIDs as primary keys, with sensible defaults
- Enforce foreign key constraints and cascading rules appropriate to each relationship
- Add indexes on frequently queried columns: product location, crop_type, status,
  order status, user role
- Write Row Level Security (RLS) policies for every table:
  - Farmers can only manage their own products
  - Buyers can only see their own orders; farmers can see orders for their products
  - Delivery agents can only see deliveries assigned to them
  - Admins have full read access; write access limited to moderation actions
  - Users can only edit their own profile
- Write these as versioned SQL migration files in /supabase/migrations
- Include a seed script with realistic sample data (5 farmers, 5 buyers, 2 agents,
  15 products, several orders in different statuses) for local testing
- Produce an ER diagram description (as a Mermaid erDiagram block) documenting all
  tables and relationships
```

### Testing Requirements
- [x] All migrations run cleanly against a fresh Supabase instance with zero errors
- [x] Foreign key constraints reject invalid inserts (test with at least 3 deliberate violations)
- [x] RLS policies verified per role:
  - [x] Farmer A cannot read/write Farmer B's products
  - [x] Buyer cannot view another buyer's orders
  - [x] Agent cannot view deliveries not assigned to them
  - [x] Admin can read across all tables
- [x] Seed script populates without conflict and is idempotent (safe to re-run)
- [x] Mermaid ER diagram renders correctly and matches implemented schema
- [x] Indexes confirmed via `EXPLAIN ANALYZE` on a sample product search query (should use index, not sequential scan)

---

## Phase 2 — Authentication & User Registration (Farmers, Buyers, Agents)

### Prompt

```
Implement authentication and role-based registration using Supabase Auth.

Requirements:
- Registration flows for three roles: Farmer, Buyer, Delivery Agent (Admin accounts
  are created manually/seeded, not self-registered)
- Registration form collects role-specific fields per the schema from Phase 1
- Support email + password sign-up, with email verification required before login
- Support OTP-based phone verification as an alternative/additional identity check
  (use Supabase Auth phone OTP or a custom OTP table + edge function if phone auth
  is not natively supported in the target region)
- Login page supporting both email/password and OTP-based login
- Post-login redirect based on role (farmer dashboard, buyer dashboard, agent
  dashboard, admin dashboard)
- Middleware to protect routes by role — unauthenticated or wrong-role users are
  redirected appropriately
- Zustand store for current user/session state, hydrated from Supabase session
- Simple, large-tap-target UI suitable for low digital-literacy rural users
  (minimal text, icons, clear buttons) — this is a stated non-functional requirement
- Logout functionality
- Basic profile edit page per role
```

### Testing Requirements
- [x] Farmer, buyer, and agent can each successfully register and receive a verification prompt
- [x] Unverified accounts cannot log in and receive a clear message
- [x] OTP flow: correct OTP logs user in; incorrect OTP is rejected; expired OTP is rejected
- [x] Login redirects each role to its correct dashboard
- [x] Attempting to access a farmer-only route as a buyer (and vice versa) redirects/blocks correctly
- [x] Session persists across page refresh
- [x] Logout clears session and blocks access to protected routes
- [x] Profile edit correctly updates the corresponding profile table, respecting RLS
- [x] UI tested on a small mobile viewport (360px width) for tap-target usability

---

## Phase 3 — Farmer Product Listing Management

### Prompt

```
Implement the farmer-facing product listing feature.

Requirements:
- "Add Product" form: name, crop type, quantity, unit, price, harvest date,
  location (auto-filled from profile, editable), and image upload (multiple images,
  one marked primary)
- Image upload goes to Supabase Storage; store resulting paths in product_images
- "My Products" dashboard listing all of the farmer's products with status badges
  (available, reserved, sold)
- Edit and delete product functionality (soft-delete or status change preferred
  over hard delete to preserve order history integrity)
- Product listing requires admin approval before appearing publicly (status:
  pending_approval -> available) — implement the pending state and gate visibility
  accordingly in queries/RLS
- Form validation using Zod (required fields, positive numeric quantity/price,
  harvest date not in the far past)
- Optimistic UI update on create/edit using Zustand, reconciled with server response
```

### Testing Requirements
- [x] Farmer can create a product with multiple images; primary image is correctly flagged
- [x] Newly created product is NOT visible to buyers until admin approval
- [x] Farmer can edit their product; changes persist and reflect immediately in UI
- [x] Farmer can delete/deactivate a product; it disappears from public search
- [x] Attempting to edit another farmer's product fails (RLS enforced, verified via direct API attempt)
- [x] Invalid form submissions (negative price, missing name, invalid date) are rejected client-side and server-side
- [x] Image upload rejects non-image files and oversized files with a clear error
- [x] Load test: farmer with 50+ products — list renders without significant lag (<2s)

---

## Phase 4 — Buyer Search, Filtering & Product Discovery

### Prompt

```
Implement the buyer-facing product search and discovery experience.

Requirements:
- Public product browse page showing only approved, available products
- Filters: crop type, location/region, price range (min/max), availability
  (harvest date range), and free-text search on product name
- Combine filters via query params so results are shareable/bookmarkable
- Server-side filtering/pagination via Supabase queries (do not fetch all products
  and filter client-side)
- Product detail page: full info, image gallery, farmer profile summary and rating,
  "Place Order" call to action
- Performance target: search results return in under 2 seconds (stated
  non-functional requirement) — add appropriate indexes/query optimization from
  Phase 1 schema as needed
- Empty-state and loading-state UI for search results
- Mobile-responsive grid/list view toggle
```

### Testing Requirements
- [ ] Each filter (crop type, location, price range, availability) independently narrows results correctly
- [ ] Combined filters (e.g., crop type + price range + location) return correct intersection of results
- [ ] Free-text search matches partial and case-insensitive product names
- [ ] Products pending approval or marked sold never appear in buyer search results
- [ ] Search response time measured and confirmed under 2 seconds with seed data at 500+ products (extend seed data for this test)
- [ ] Pagination works correctly at page boundaries (no duplicate/missing items)
- [ ] Product detail page correctly displays farmer rating and all images
- [ ] Filter state persists correctly on browser back/forward navigation

---

## Phase 5 — Algorithmic Farmer-Buyer Matching

### Prompt

```
Implement the farmer-buyer matching algorithm as a Supabase Edge Function.

Requirements:
- Given a buyer's search/order intent (crop type, desired quantity, location,
  target price range), return a ranked list of matching farmer products
- Matching factors and suggested weighting (make weights configurable constants):
  - Proximity: distance between buyer and farmer geolocation (closer = higher score)
  - Quantity fit: farmer's available quantity meets or exceeds buyer's request
  - Seasonal fit: harvest date recency/freshness relative to today
  - Price competitiveness: relative to median price for that crop type across
    current listings
- Compute distance using geolocation coordinates (Haversine formula) since Nigeria
  spans varied terrain and straight-line distance is an acceptable approximation
- Return match results with an explainable score breakdown (not just a final
  number) so the UI can show buyers *why* a product was recommended
- Expose this as an Edge Function endpoint the frontend calls when a buyer performs
  a search or when the system proactively suggests matches
- Add a "Recommended for you" section on the buyer dashboard using this function
- Notify farmers (via notifications table) when their product is matched highly
  against an active buyer search, to prompt engagement
```

### Testing Requirements
- [ ] Unit tests for the Haversine distance calculation against known coordinate pairs with expected distances
- [ ] Unit tests for each scoring factor in isolation (proximity, quantity, seasonality, price)
- [ ] Integration test: given a fixed set of seeded products and a sample buyer request, matching results are ranked in the expected order
- [ ] Farmer with insufficient quantity is correctly excluded or scored lower per spec
- [ ] Edge function responds within acceptable latency (<2s) under seed data load
- [ ] Score breakdown returned in the API response is consistent with the final rank order
- [ ] Notification is correctly created for a farmer when their product scores above the "high match" threshold

---

## Phase 6 — Order Placement & Escrow Payment System

### Prompt

```
Implement order placement and the escrow payment flow.

Requirements:
- Buyer places an order from a product detail page: select quantity, confirm price,
  review order summary
- On order creation: create order (status: pending), decrement/reserve product
  quantity, notify farmer
- Farmer can accept or reject the order (status -> accepted or cancelled); notify buyer
- On acceptance, buyer proceeds to payment: integrate escrow logic — funds are
  captured and held in escrow_transactions (status: held), order status ->
  in_escrow. Use a placeholder/mock payment provider interface (a PaymentProvider
  abstraction) so a real Nigerian payment gateway (e.g., Paystack/Flutterwave) can
  be plugged in later without refactoring business logic
- Encrypted wallet handling: never store raw card/payment credentials; store only
  provider transaction references
- Order status timeline UI visible to both farmer and buyer, reflecting the full
  lifecycle: pending -> accepted -> in_escrow -> out_for_delivery -> delivered ->
  verified -> completed
- Cancellation logic: buyer/farmer can cancel only while status is pending or
  accepted; cancellation triggers refund logic if funds were already captured
- Notifications fired at every status transition
```

### Testing Requirements
- [ ] Order creation correctly reserves product quantity and prevents overselling (test concurrent orders on limited-quantity product)
- [ ] Farmer accept/reject correctly transitions order status and reverses reservation on reject
- [ ] Escrow capture correctly moves funds into "held" status and updates order status
- [ ] Payment credentials are never persisted in plaintext anywhere in the database (verify by schema inspection)
- [ ] Cancellation before escrow capture requires no refund; cancellation after capture triggers refund path
- [ ] Order status timeline UI accurately reflects backend status at every transition
- [ ] Notifications generated correctly at each transition, for the correct recipient
- [ ] Attempting to place an order for a product with insufficient quantity is rejected with a clear error

---

## Phase 7 — Delivery Assignment & Real-Time Tracking

### Prompt

```
Implement the delivery agent workflow and real-time tracking.

Requirements:
- Admin or automated logic assigns a delivery agent to an order once it enters
  in_escrow status (simple rule-based assignment by coverage area/availability is
  sufficient; do not over-engineer a routing algorithm)
- Agent dashboard: list of assigned deliveries, each with pickup and drop-off details
- Agent marks "picked up" (collects produce from farmer) — status -> out_for_delivery
- Real-time location tracking: agent's app periodically updates current_location;
  use Supabase Realtime so buyer and farmer can see live delivery progress on a map
  view (a simple map component with current position marker is sufficient — full
  turn-by-turn routing is out of scope)
- Buyer-facing delivery tracking page showing live status and agent location
- Handle connectivity gaps gracefully (rural network conditions) — location updates
  should queue/retry rather than fail silently
```

### Testing Requirements
- [x] Agent is correctly assigned only to orders within their coverage area
- [x] Agent dashboard shows only their own assigned deliveries (RLS verified)
- [x] Marking "picked up" correctly transitions order and delivery status, and notifies buyer
- [x] Realtime location updates appear on buyer's tracking view within a few seconds of being sent (test with simulated location pings)
- [x] Map view correctly renders current agent position
- [x] Simulated network drop-and-reconnect: queued location updates are sent once connectivity resumes, none are silently lost
- [x] Buyer cannot view tracking details for an order that isn't theirs

---

## Phase 8 — Pay-on-Delivery (PoD) Verification: OTP & QR Code

### Prompt

```
Implement the core Pay-on-Delivery verification mechanism, following this flow:
1. Delivery agent reaches the buyer with the produce
2. Buyer inspects and confirms quality
3. Buyer enters an OTP or scans a QR code to verify receipt
4. System validates the verification
5. System releases escrow funds and generates a digital receipt

Requirements:
- On "out_for_delivery", generate a one-time verification code, store only a
  hashed version in delivery_verifications (never store the raw code in the DB)
- Deliver the raw OTP to the buyer via SMS/notification, and also render it as a
  scannable QR code accessible to the buyer in-app (for agent-side scanning at
  delivery)
- Verification UI: buyer enters the OTP (or agent scans buyer's QR code) at the
  point of delivery; system compares against the stored hash
- On successful verification: delivery status -> delivered, order status ->
  verified, escrow_transactions status -> released, order status -> completed
- On failed verification (wrong OTP, expired code): show clear error, allow limited
  retries, log failed attempts, and provide an escalation path to raise a dispute
- Code expiry: verification code expires after a reasonable window (e.g., 30
  minutes) from delivery arrival; expired codes trigger a regeneration option
- Both agent and buyer must confirm delivery in-app (two-party confirmation) before
  final release, per spec ("Delivery confirmation by both parties")
```

### Testing Requirements
- [x] OTP is never stored or transmitted in plaintext in the database (verify via direct table inspection — only hash present)
- [x] Correct OTP entry successfully verifies delivery and triggers escrow release
- [x] Incorrect OTP is rejected, with attempt counted and limited (test the retry limit boundary)
- [x] Expired OTP is rejected and regeneration flow works correctly
- [x] QR code correctly encodes a scannable reference to the verification record (does not expose raw secret in an insecure way)
- [x] Escrow funds only release after BOTH agent and buyer confirmation are recorded — test that single-party confirmation alone does not release funds
- [x] Failed verification after max retries correctly surfaces a "raise dispute" option
- [x] End-to-end test: full order lifecycle from placement to verified delivery to escrow release, confirming state at each step

---

## Phase 9 — Digital Receipts

### Prompt

```
Implement automatic digital receipt generation upon successful delivery verification.

Requirements:
- On order completion, generate a digital receipt record containing: receipt
  number (unique, sequential or UUID-based), timestamp, buyer and farmer details,
  product/order summary, price breakdown, verification method and timestamp,
  delivery agent details
- Render receipt as a downloadable PDF, stored in Supabase Storage, with the path
  saved in digital_receipts
- Receipt viewable in-app by both buyer and farmer from their order history
- Receipt includes a unique verification reference so authenticity can be
  cross-checked against the orders/delivery_verifications tables if disputed
```

### Testing Requirements
- [x] Receipt is generated automatically and only after order status reaches "completed"
- [x] Receipt PDF renders correctly with all required fields populated accurately from source order/verification data
- [x] Receipt numbers are unique across the system (test for collisions under concurrent order completion)
- [x] Buyer and farmer can each view/download their own order's receipt; cannot access another user's receipt (RLS/storage policy verified)
- [x] Receipt data matches the underlying order/escrow/verification records exactly (cross-check field by field in test)

---

## Phase 10 — Ratings & Reviews

### Prompt

```
Implement the ratings and review system covering farmers, buyers, and delivery agents.

Requirements:
- After an order reaches "completed", prompt both buyer and farmer to rate their
  counterpart (1-5 stars + optional comment); buyer additionally rates the
  delivery agent
- Prevent duplicate ratings for the same order/relationship pair
- Store in ratings_reviews; recompute and cache rating_avg on the relevant profile
  table after each new rating
- Display aggregate rating and recent reviews on farmer/agent public profiles and
  product detail pages
- Basic abuse prevention: reviews only allowed for orders the reviewer actually
  participated in (enforced via RLS/policy, not just UI)
```

### Testing Requirements
- [x] Rating can only be submitted once per order/reviewer/reviewee combination (duplicate attempt rejected)
- [x] rating_avg on profile updates correctly and accurately after each new review (verify calculation against manual average)
- [x] User cannot submit a review for an order they were not party to (attempt via direct API call, confirm RLS blocks it)
- [x] Reviews display correctly on public profile and product pages, sorted by recency
- [x] Rating prompt only appears after order status is "completed", not earlier

---

## Phase 11 — Admin Dashboard: Monitoring, Approvals, Disputes, Analytics

### Prompt

```
Implement the admin-facing control panel.

Requirements:
- Admin dashboard overview: key metrics (total users by role, active listings,
  orders by status, gross transaction value, open disputes)
- User management: view/search all users, suspend/reactivate accounts
- Product listing approvals: queue of pending_approval products with
  approve/reject actions (rejection requires a reason, notifies farmer)
- Dispute resolution: view disputes raised (from failed verification or manual
  report), view full order context, resolve with notes and outcome (refund buyer /
  release to farmer / partial), status update triggers appropriate escrow action
- Analytics/reporting: charts for order volume over time, top crop types, regional
  activity, average delivery time, dispute rate — server-side aggregation queries,
  not client-side computation over full datasets
- Log every admin action to admin_actions for auditability
- All admin routes protected by role middleware from Phase 2; only admin role can access
```

### Testing Requirements
- [x] Non-admin users are fully blocked from all admin routes and admin API calls (verified at both UI and API/RLS level)
- [x] Product approval correctly flips status and makes the listing publicly visible; rejection notifies farmer with reason
- [x] Dispute resolution correctly triggers the corresponding escrow action (release/refund/partial) and updates order status accordingly
- [x] Every admin action (approval, suspension, dispute resolution) is logged in admin_actions with correct admin_id and target reference
- [x] Analytics queries return correct aggregate figures verified against seed data (manually compute expected totals and compare)
- [x] Dashboard performs acceptably with a large seeded dataset (1000+ orders) — queries use aggregation, not full table scans to client

---

## Phase 12 — Security Hardening & Non-Functional Requirements Pass

### Prompt

```
Perform a dedicated hardening pass across the full application to satisfy the
non-functional requirements: security, performance, usability, reliability,
portability, maintainability, availability.

Requirements:
- Security audit: confirm end-to-end encryption in transit (HTTPS enforced),
  re-verify RLS policies across every table for every role combination, confirm
  no sensitive data (payment info, raw OTPs) is ever exposed in API responses or
  logs, add rate limiting on auth and OTP endpoints, add CSRF/XSS protections on
  all forms
- Performance pass: confirm search/matching endpoints meet the <2 second target
  under realistic load, add caching where appropriate (e.g., aggregate stats),
  optimize any N+1 query patterns found
- Usability pass: accessibility check (contrast, tap target sizes, readable fonts)
  for low-digital-literacy users; add loading/error states anywhere missing;
  support low-bandwidth conditions gracefully (image lazy-loading, skeleton states)
- Reliability: add error boundaries, graceful degradation when Supabase Realtime
  disconnects, retry logic for transient network failures
- Portability: confirm responsive behavior across mobile and desktop breakpoints
  for every major page built in Phases 2-11
- Maintainability: confirm modular folder structure held up across phases, add
  developer documentation for each module, ensure environment config is fully
  externalized (no hardcoded secrets/URLs)
- Produce a summary security and performance report documenting findings and fixes
```

### Testing Requirements
- [x] Penetration-style checklist: attempt SQL injection, XSS payloads in all text inputs, confirm sanitization
- [x] Attempt to access another user's data across every table via direct API calls with a valid-but-wrong-owner session — all blocked
- [x] Rate limiting confirmed on login/OTP endpoints (test rapid repeated attempts)
- [x] Load test key endpoints (search, matching, order placement) with concurrent simulated users; confirm <2s target holds
- [x] Full responsive walkthrough on mobile (360px), tablet, and desktop breakpoints for every page
- [x] Simulate Realtime disconnect during delivery tracking; confirm graceful reconnect with no data loss
- [x] Confirm zero hardcoded secrets in codebase (grep audit)
- [x] Accessibility check: color contrast ratios meet WCAG AA, all interactive elements have adequate tap target size (44x44px minimum)

---

## Phase 13 — Deployment & End-to-End Evaluation

### Prompt

```
Prepare and execute production deployment, then run a full end-to-end evaluation
of the system against the original requirements.

Requirements:
- Configure production Supabase project (separate from dev/staging) with all
  migrations applied
- Deploy frontend (e.g., Vercel) with production environment variables
- Configure custom domain, HTTPS, and confirm cloud hosting uptime monitoring
  (targeting the stated 99% uptime goal)
- Set up basic monitoring/alerting (error tracking, uptime checks)
- Write a deployment runbook: environment setup, migration process, rollback
  procedure
- Conduct a full end-to-end evaluation covering every functional requirement
  listed in the original spec, and produce an evaluation report summarizing:
  performance results, usability observations, and how the platform addresses
  each originally identified problem (middleman dependency, lack of verified PoD,
  no escrow protection, fraud risk, no real-time tracking)
```

### Testing Requirements
- [ ] Production deployment accessible via HTTPS with valid certificate
- [ ] Full user journey smoke test in production: register (each role) -> list
      product -> approve -> search/match -> order -> escrow -> delivery -> OTP/QR
      verification -> escrow release -> receipt -> ratings — completed without
      manual DB intervention
- [ ] Uptime monitoring confirmed active and alerting correctly on a simulated outage
- [ ] Rollback procedure tested against a non-production environment before relying on it
- [ ] Final requirements traceability check: every functional requirement from the
      original spec mapped to an implemented, tested feature (produce a checklist
      table with pass/fail per requirement)
- [ ] Final non-functional requirements checklist re-verified in production
      environment (security, performance, usability, reliability, portability,
      maintainability, availability)
