# 🌾 FarmConnect — Digital Farmer-Buyer Matching System

A marketplace platform connecting Nigerian smallholder farmers directly with buyers, featuring escrow payments and OTP/QR-based Pay-on-Delivery verification.

## Architecture Overview

### Client-Server Model

```
┌─────────────────────┐     HTTPS      ┌─────────────────────────┐
│   React Client      │ ◄────────────► │   Supabase Backend      │
│   (Next.js App)     │                │                         │
│                     │                │ ┌─────────────────────┐ │
│ ┌─────────────────┐ │                │ │ Auth (GoTrue)       │ │
│ │ Components      │ │   REST /       │ ├─────────────────────┤ │
│ │ (View Layer)    │ │   Realtime     │ │ PostgreSQL Database │ │
│ ├─────────────────┤ │ ◄────────────► │ │ (Model Layer)       │ │
│ │ Zustand Stores  │ │                │ ├─────────────────────┤ │
│ │ + API Calls     │ │                │ │ Edge Functions      │ │
│ │ (Controller)    │ │                │ │ (Business Logic)    │ │
│ └─────────────────┘ │                │ ├─────────────────────┤ │
│                     │                │ │ Storage (S3)        │ │
│                     │                │ │ (File Uploads)      │ │
└─────────────────────┘                │ └─────────────────────┘ │
                                       └─────────────────────────┘
```

### MVC Mapping to This Stack

| MVC Layer      | Implementation                                           |
| -------------- | -------------------------------------------------------- |
| **Model**      | Supabase PostgreSQL tables with RLS policies             |
| **View**       | React components (Next.js App Router pages & components) |
| **Controller** | Client-side logic (Zustand stores + Supabase API calls) + Supabase Edge Functions for server-side business logic |

## Tech Stack

| Technology       | Purpose                                |
| ---------------- | -------------------------------------- |
| Next.js 16       | React framework (App Router)           |
| TypeScript       | Type safety                            |
| TailwindCSS v4   | Utility-first CSS                      |
| Shadcn/ui        | Accessible UI component library        |
| Zustand          | Lightweight client state management    |
| Supabase         | Auth, Database, Realtime, Storage, Edge Functions |
| Zod              | Schema validation                      |

## Project Structure

```
/app
  /(auth)          → Authentication routes (login, register)
  /(farmer)        → Farmer-specific routes (dashboard, products)
  /(buyer)         → Buyer-specific routes (dashboard, browse, orders)
  /(agent)         → Delivery agent routes (dashboard, deliveries)
  /(admin)         → Admin routes (dashboard, approvals, disputes)
  layout.tsx       → Root layout with navigation shell
  page.tsx         → Public landing page
/components
  /ui              → Shadcn/ui components
  navigation.tsx   → Role-aware navigation bar
  footer.tsx       → Site footer
/lib
  /env             → Environment variable configuration
  /supabase        → Supabase client helpers (browser, server, middleware)
  /stores          → Zustand state stores
  /types           → Shared TypeScript type definitions
  /validators      → Zod validation schemas
  utils.ts         → Utility functions (cn, etc.)
/supabase
  /migrations      → SQL migration files
middleware.ts      → Next.js middleware (Supabase session refresh)
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Supabase account (for database, auth, storage)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
4. Update `.env.local` with your Supabase project credentials
5. Run the development server:
   ```bash
   pnpm dev
   ```
6. Open [http://localhost:3000](http://localhost:3000)

## Development

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm lint         # Run ESLint
pnpm start        # Start production server
```

## Phased Development

This project follows a phased development approach:

| Phase | Description                          | Status |
| ----- | ------------------------------------ | ------ |
| 0     | Project Scaffolding & Architecture   | ✅ Done |
| 1     | Database Design & Schema             | ✅ Done |
| 2     | Authentication & User Registration   | ✅ Done |
| 3     | Farmer Product Listing               | ✅ Done |
| 4     | Buyer Search & Discovery             | ⏳ Pending |
| 5     | Matching Algorithm                   | ⏳ Pending |
| 6     | Order & Escrow Payments              | ⏳ Pending |
| 7     | Delivery & Real-Time Tracking        | ⏳ Pending |
| 8     | Pay-on-Delivery Verification         | ⏳ Pending |
| 9     | Digital Receipts                     | ⏳ Pending |
| 10    | Ratings & Reviews                    | ⏳ Pending |
| 11    | Admin Dashboard                      | ⏳ Pending |
| 12    | Security Hardening                   | ⏳ Pending |
| 13    | Deployment & Evaluation              | ⏳ Pending |
