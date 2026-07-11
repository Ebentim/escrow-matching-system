-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('farmer', 'buyer', 'agent', 'admin');
CREATE TYPE product_status AS ENUM ('pending_approval', 'available', 'reserved', 'sold');
CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'in_escrow', 'out_for_delivery', 'delivered', 'verified', 'completed', 'disputed', 'cancelled');
CREATE TYPE escrow_status AS ENUM ('held', 'released', 'refunded');
CREATE TYPE delivery_status AS ENUM ('assigned', 'picked_up', 'in_transit', 'delivered');
CREATE TYPE verification_method AS ENUM ('otp', 'qr');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'failed');
CREATE TYPE dispute_status AS ENUM ('open', 'investigating', 'resolved', 'rejected');

-- Users table (extends auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Profiles
CREATE TABLE farmer_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    farm_name TEXT NOT NULL,
    farm_location TEXT NOT NULL,
    geolocation JSONB,
    bio TEXT,
    rating_avg NUMERIC(3, 2) DEFAULT 0.00
);

CREATE TABLE buyer_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    geolocation JSONB,
    rating_avg NUMERIC(3, 2) DEFAULT 0.00
);

CREATE TABLE delivery_agent_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type TEXT NOT NULL,
    coverage_area TEXT NOT NULL,
    rating_avg NUMERIC(3, 2) DEFAULT 0.00,
    availability_status BOOLEAN DEFAULT TRUE
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    crop_type TEXT NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity >= 0),
    unit TEXT NOT NULL,
    price NUMERIC NOT NULL CHECK (price >= 0),
    harvest_date DATE NOT NULL,
    location TEXT NOT NULL,
    geolocation JSONB,
    status product_status DEFAULT 'pending_approval',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    quantity_ordered NUMERIC NOT NULL CHECK (quantity_ordered > 0),
    total_price NUMERIC NOT NULL CHECK (total_price >= 0),
    status order_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escrow
CREATE TABLE escrow_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    status escrow_status DEFAULT 'held',
    held_at TIMESTAMPTZ DEFAULT NOW(),
    released_at TIMESTAMPTZ
);

-- Deliveries
CREATE TABLE deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    pickup_time TIMESTAMPTZ,
    route_log JSONB DEFAULT '[]'::jsonb,
    status delivery_status DEFAULT 'assigned',
    current_location JSONB
);

-- Verifications
CREATE TABLE delivery_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    method verification_method NOT NULL,
    code_hash TEXT NOT NULL,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    status verification_status DEFAULT 'pending'
);

-- Receipts
CREATE TABLE digital_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    receipt_number TEXT UNIQUE NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    summary JSONB NOT NULL,
    pdf_storage_path TEXT
);

-- Ratings
CREATE TABLE ratings_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id, reviewer_id, reviewee_id)
);

-- Disputes
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    raised_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    status dispute_status DEFAULT 'open',
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Actions
CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action_type TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- Indexes
-- --------------------------------------------------------
CREATE INDEX idx_products_location ON products(location);
CREATE INDEX idx_products_crop_type ON products(crop_type);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_users_role ON users(role);

-- --------------------------------------------------------
-- Row Level Security (RLS)
-- --------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- users table policies
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
-- Public read access to basic user info might be needed for farmers/buyers viewing each other, but let's keep it restricted to only when they have interactions, or just allow read for simplicity as it's a marketplace.
CREATE POLICY "Public read for users" ON users FOR SELECT USING (TRUE);

-- profiles policies
CREATE POLICY "Public read for profiles" ON farmer_profiles FOR SELECT USING (TRUE);
CREATE POLICY "Farmers update own profile" ON farmer_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Farmers insert own profile" ON farmer_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read for buyer profiles" ON buyer_profiles FOR SELECT USING (TRUE);
CREATE POLICY "Buyers update own profile" ON buyer_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Buyers insert own profile" ON buyer_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read for agent profiles" ON delivery_agent_profiles FOR SELECT USING (TRUE);
CREATE POLICY "Agents update own profile" ON delivery_agent_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Agents insert own profile" ON delivery_agent_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- products policies
CREATE POLICY "Public read for approved products" ON products FOR SELECT USING (status = 'available' OR auth.uid() = farmer_id OR is_admin());
CREATE POLICY "Farmers can insert products" ON products FOR INSERT WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "Farmers can update own products" ON products FOR UPDATE USING (auth.uid() = farmer_id);
CREATE POLICY "Farmers can delete own products" ON products FOR DELETE USING (auth.uid() = farmer_id);
CREATE POLICY "Admins can update any product" ON products FOR UPDATE USING (is_admin());

-- product_images policies
CREATE POLICY "Public read for product images" ON product_images FOR SELECT USING (TRUE);
CREATE POLICY "Farmers can insert product images" ON product_images FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM products WHERE id = product_id AND farmer_id = auth.uid())
);
CREATE POLICY "Farmers can update product images" ON product_images FOR UPDATE USING (
    EXISTS (SELECT 1 FROM products WHERE id = product_id AND farmer_id = auth.uid())
);
CREATE POLICY "Farmers can delete product images" ON product_images FOR DELETE USING (
    EXISTS (SELECT 1 FROM products WHERE id = product_id AND farmer_id = auth.uid())
);

-- orders policies
CREATE POLICY "Buyers can view own orders" ON orders FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Farmers can view own orders" ON orders FOR SELECT USING (auth.uid() = farmer_id);
CREATE POLICY "Admins can view all orders" ON orders FOR SELECT USING (is_admin());
CREATE POLICY "Buyers can insert orders" ON orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Buyers can update own orders" ON orders FOR UPDATE USING (auth.uid() = buyer_id);
CREATE POLICY "Farmers can update own orders" ON orders FOR UPDATE USING (auth.uid() = farmer_id);

-- escrow_transactions policies
CREATE POLICY "Users involved in order can view escrow" ON escrow_transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (buyer_id = auth.uid() OR farmer_id = auth.uid())) OR is_admin()
);
CREATE POLICY "Admins can manage escrow" ON escrow_transactions FOR ALL USING (is_admin());
-- edge functions or server will handle insertions mostly, but keeping it secure

-- deliveries policies
CREATE POLICY "Agents view own deliveries" ON deliveries FOR SELECT USING (auth.uid() = agent_id);
CREATE POLICY "Buyers/Farmers view deliveries for their orders" ON deliveries FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (buyer_id = auth.uid() OR farmer_id = auth.uid()))
);
CREATE POLICY "Admins view all deliveries" ON deliveries FOR SELECT USING (is_admin());
CREATE POLICY "Agents can update own deliveries" ON deliveries FOR UPDATE USING (auth.uid() = agent_id);
CREATE POLICY "Admins can manage deliveries" ON deliveries FOR ALL USING (is_admin());

-- delivery_verifications policies
CREATE POLICY "Users involved can view verifications" ON delivery_verifications FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM deliveries d
        JOIN orders o ON d.order_id = o.id
        WHERE d.id = delivery_id AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid() OR d.agent_id = auth.uid())
    ) OR is_admin()
);
-- insertions typically done by agent or edge function
CREATE POLICY "Agents can insert verifications" ON delivery_verifications FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM deliveries WHERE id = delivery_id AND agent_id = auth.uid())
);
CREATE POLICY "Agents can update verifications" ON delivery_verifications FOR UPDATE USING (
    EXISTS (SELECT 1 FROM deliveries WHERE id = delivery_id AND agent_id = auth.uid())
);
CREATE POLICY "Buyers can update verifications" ON delivery_verifications FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM deliveries d
        JOIN orders o ON d.order_id = o.id
        WHERE d.id = delivery_id AND o.buyer_id = auth.uid()
    )
);

-- digital_receipts policies
CREATE POLICY "Users involved can view receipts" ON digital_receipts FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (buyer_id = auth.uid() OR farmer_id = auth.uid())) OR is_admin()
);

-- ratings_reviews policies
CREATE POLICY "Public read for ratings" ON ratings_reviews FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert ratings if they are reviewers" ON ratings_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update own ratings" ON ratings_reviews FOR UPDATE USING (auth.uid() = reviewer_id);

-- disputes policies
CREATE POLICY "Users involved can view disputes" ON disputes FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (buyer_id = auth.uid() OR farmer_id = auth.uid()))
    OR auth.uid() = raised_by OR is_admin()
);
CREATE POLICY "Users can insert disputes" ON disputes FOR INSERT WITH CHECK (auth.uid() = raised_by);
CREATE POLICY "Admins can manage disputes" ON disputes FOR ALL USING (is_admin());

-- notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- admin_actions policies
CREATE POLICY "Admins can view admin actions" ON admin_actions FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert admin actions" ON admin_actions FOR INSERT WITH CHECK (auth.uid() = admin_id);
