-- Seed data for testing

-- Create mock auth users first (assuming a local development environment where auth.users can be inserted into directly, or we can just mock the users table if auth.users is populated separately). 
-- For a complete seed that works with Supabase local dev, we insert into auth.users.
INSERT INTO auth.users (id, email) VALUES
    ('11111111-1111-1111-1111-111111111111', 'farmer1@test.com'),
    ('11111111-1111-1111-1111-111111111112', 'farmer2@test.com'),
    ('11111111-1111-1111-1111-111111111113', 'farmer3@test.com'),
    ('11111111-1111-1111-1111-111111111114', 'farmer4@test.com'),
    ('11111111-1111-1111-1111-111111111115', 'farmer5@test.com'),
    ('22222222-2222-2222-2222-222222222221', 'buyer1@test.com'),
    ('22222222-2222-2222-2222-222222222222', 'buyer2@test.com'),
    ('22222222-2222-2222-2222-222222222223', 'buyer3@test.com'),
    ('22222222-2222-2222-2222-222222222224', 'buyer4@test.com'),
    ('22222222-2222-2222-2222-222222222225', 'buyer5@test.com'),
    ('33333333-3333-3333-3333-333333333331', 'agent1@test.com'),
    ('33333333-3333-3333-3333-333333333332', 'agent2@test.com'),
    ('44444444-4444-4444-4444-444444444441', 'admin1@test.com')
ON CONFLICT DO NOTHING;

-- Users
INSERT INTO public.users (id, role, full_name, phone, email, location, is_verified, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'farmer', 'Oluwaseun Adebayo', '+2348000000001', 'farmer1@test.com', 'Ogun State', true, true),
    ('11111111-1111-1111-1111-111111111112', 'farmer', 'Chinedu Okafor', '+2348000000002', 'farmer2@test.com', 'Enugu State', true, true),
    ('11111111-1111-1111-1111-111111111113', 'farmer', 'Amina Yusuf', '+2348000000003', 'farmer3@test.com', 'Kano State', true, true),
    ('11111111-1111-1111-1111-111111111114', 'farmer', 'Tunde Bakare', '+2348000000004', 'farmer4@test.com', 'Oyo State', true, true),
    ('11111111-1111-1111-1111-111111111115', 'farmer', 'Ngozi Eze', '+2348000000005', 'farmer5@test.com', 'Anambra State', true, true),
    ('22222222-2222-2222-2222-222222222221', 'buyer', 'FoodCo Supermarkets', '+2349000000001', 'buyer1@test.com', 'Lagos State', true, true),
    ('22222222-2222-2222-2222-222222222222', 'buyer', 'Lagos Fresh Produce', '+2349000000002', 'buyer2@test.com', 'Lagos State', true, true),
    ('22222222-2222-2222-2222-222222222223', 'buyer', 'Ibadan Agro Allied', '+2349000000003', 'buyer3@test.com', 'Oyo State', true, true),
    ('22222222-2222-2222-2222-222222222224', 'buyer', 'Abuja Central Market', '+2349000000004', 'buyer4@test.com', 'FCT Abuja', true, true),
    ('22222222-2222-2222-2222-222222222225', 'buyer', 'Port Harcourt Foods', '+2349000000005', 'buyer5@test.com', 'Rivers State', true, true),
    ('33333333-3333-3333-3333-333333333331', 'agent', 'Kunle Logistics', '+2347000000001', 'agent1@test.com', 'Lagos State', true, true),
    ('33333333-3333-3333-3333-333333333332', 'agent', 'Emeka Transport', '+2347000000002', 'agent2@test.com', 'Enugu State', true, true),
    ('44444444-4444-4444-4444-444444444441', 'admin', 'System Admin', '+2348111111111', 'admin1@test.com', 'Lagos State', true, true)
ON CONFLICT (id) DO NOTHING;

-- Farmer Profiles
INSERT INTO public.farmer_profiles (user_id, farm_name, farm_location, geolocation, bio, rating_avg) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Adebayo Farms', 'Abeokuta, Ogun State', '{"lat": 7.1557, "lng": 3.3451}', 'We grow the best cassava and maize in Ogun state.', 4.5),
    ('11111111-1111-1111-1111-111111111112', 'Chinedu Agro', 'Nsukka, Enugu State', '{"lat": 6.8561, "lng": 7.3916}', 'Specialist in yams and palm oil.', 4.8),
    ('11111111-1111-1111-1111-111111111113', 'Amina Harvests', 'Kano, Kano State', '{"lat": 12.0022, "lng": 8.5920}', 'Quality groundnuts and sorghum.', 4.2),
    ('11111111-1111-1111-1111-111111111114', 'Bakare Farm Produce', 'Ibadan, Oyo State', '{"lat": 7.3775, "lng": 3.9470}', 'Fresh vegetables and fruits directly from the farm.', 4.9),
    ('11111111-1111-1111-1111-111111111115', 'Ngozi Farms', 'Awka, Anambra State', '{"lat": 6.2107, "lng": 7.0741}', 'Cassava and plantain plantation.', 4.6)
ON CONFLICT (user_id) DO NOTHING;

-- Buyer Profiles
INSERT INTO public.buyer_profiles (user_id, business_name, delivery_address, geolocation, rating_avg) VALUES
    ('22222222-2222-2222-2222-222222222221', 'FoodCo Supermarkets', 'Ikeja, Lagos', '{"lat": 6.6018, "lng": 3.3515}', 4.7),
    ('22222222-2222-2222-2222-222222222222', 'Lagos Fresh Produce', 'Yaba, Lagos', '{"lat": 6.5095, "lng": 3.3711}', 4.4),
    ('22222222-2222-2222-2222-222222222223', 'Ibadan Agro Allied', 'Ring Road, Ibadan', '{"lat": 7.3619, "lng": 3.8642}', 4.8),
    ('22222222-2222-2222-2222-222222222224', 'Abuja Central Market', 'Wuse, Abuja', '{"lat": 9.0765, "lng": 7.3986}', 4.5),
    ('22222222-2222-2222-2222-222222222225', 'Port Harcourt Foods', 'GRA Phase 2, Port Harcourt', '{"lat": 4.8156, "lng": 7.0498}', 4.6)
ON CONFLICT (user_id) DO NOTHING;

-- Delivery Agent Profiles
INSERT INTO public.delivery_agent_profiles (user_id, vehicle_type, coverage_area, rating_avg, availability_status) VALUES
    ('33333333-3333-3333-3333-333333333331', 'Light Truck', 'South West (Lagos, Ogun, Oyo)', 4.7, true),
    ('33333333-3333-3333-3333-333333333332', 'Heavy Duty Truck', 'South East (Enugu, Anambra)', 4.9, true)
ON CONFLICT (user_id) DO NOTHING;

-- Products (15 products)
INSERT INTO public.products (id, farmer_id, name, crop_type, quantity, unit, price, harvest_date, location, geolocation, status) VALUES
    ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'Premium Cassava Tubers', 'Cassava', 5000, 'kg', 250, '2023-11-01', 'Abeokuta, Ogun', '{"lat": 7.1557, "lng": 3.3451}', 'available'),
    ('55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', 'Yellow Maize', 'Maize', 2000, 'kg', 450, '2023-10-15', 'Abeokuta, Ogun', '{"lat": 7.1557, "lng": 3.3451}', 'available'),
    ('55555555-5555-5555-5555-555555555553', '11111111-1111-1111-1111-111111111112', 'Abuja Yam Tubers', 'Yam', 1000, 'tubers', 1200, '2023-12-01', 'Nsukka, Enugu', '{"lat": 6.8561, "lng": 7.3916}', 'available'),
    ('55555555-5555-5555-5555-555555555554', '11111111-1111-1111-1111-111111111112', 'Pure Palm Oil', 'Palm Oil', 500, 'liters', 1500, '2023-11-10', 'Nsukka, Enugu', '{"lat": 6.8561, "lng": 7.3916}', 'available'),
    ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111113', 'Dried Groundnuts', 'Groundnut', 3000, 'kg', 800, '2023-09-20', 'Kano, Kano', '{"lat": 12.0022, "lng": 8.5920}', 'available'),
    ('55555555-5555-5555-5555-555555555556', '11111111-1111-1111-1111-111111111113', 'Sorghum Seeds', 'Sorghum', 4000, 'kg', 600, '2023-10-05', 'Kano, Kano', '{"lat": 12.0022, "lng": 8.5920}', 'sold'),
    ('55555555-5555-5555-5555-555555555557', '11111111-1111-1111-1111-111111111114', 'Fresh Tomatoes', 'Tomato', 1000, 'baskets', 8000, '2023-12-15', 'Ibadan, Oyo', '{"lat": 7.3775, "lng": 3.9470}', 'available'),
    ('55555555-5555-5555-5555-555555555558', '11111111-1111-1111-1111-111111111114', 'Habanero Peppers', 'Pepper', 500, 'baskets', 12000, '2023-12-20', 'Ibadan, Oyo', '{"lat": 7.3775, "lng": 3.9470}', 'available'),
    ('55555555-5555-5555-5555-555555555559', '11111111-1111-1111-1111-111111111114', 'Onions', 'Onion', 1500, 'bags', 25000, '2023-11-25', 'Ibadan, Oyo', '{"lat": 7.3775, "lng": 3.9470}', 'reserved'),
    ('55555555-5555-5555-5555-555555555560', '11111111-1111-1111-1111-111111111115', 'Raw Cassava', 'Cassava', 8000, 'kg', 240, '2023-12-10', 'Awka, Anambra', '{"lat": 6.2107, "lng": 7.0741}', 'available'),
    ('55555555-5555-5555-5555-555555555561', '11111111-1111-1111-1111-111111111115', 'Unripe Plantain', 'Plantain', 2000, 'bunches', 1500, '2023-12-05', 'Awka, Anambra', '{"lat": 6.2107, "lng": 7.0741}', 'available'),
    ('55555555-5555-5555-5555-555555555562', '11111111-1111-1111-1111-111111111111', 'White Maize', 'Maize', 1500, 'kg', 430, '2023-10-18', 'Abeokuta, Ogun', '{"lat": 7.1557, "lng": 3.3451}', 'pending_approval'),
    ('55555555-5555-5555-5555-555555555563', '11111111-1111-1111-1111-111111111112', 'Water Yam', 'Yam', 800, 'tubers', 900, '2023-11-15', 'Nsukka, Enugu', '{"lat": 6.8561, "lng": 7.3916}', 'available'),
    ('55555555-5555-5555-5555-555555555564', '11111111-1111-1111-1111-111111111113', 'Millet', 'Millet', 2500, 'kg', 550, '2023-09-25', 'Kano, Kano', '{"lat": 12.0022, "lng": 8.5920}', 'available'),
    ('55555555-5555-5555-5555-555555555565', '11111111-1111-1111-1111-111111111114', 'Green Bell Peppers', 'Pepper', 300, 'baskets', 15000, '2023-12-22', 'Ibadan, Oyo', '{"lat": 7.3775, "lng": 3.9470}', 'available')
ON CONFLICT (id) DO NOTHING;

-- Orders
INSERT INTO public.orders (id, buyer_id, product_id, farmer_id, quantity_ordered, total_price, status) VALUES
    ('66666666-6666-6666-6666-666666666661', '22222222-2222-2222-2222-222222222221', '55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 1000, 250000, 'completed'),
    ('66666666-6666-6666-6666-666666666662', '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555557', '11111111-1111-1111-1111-111111111114', 50, 400000, 'out_for_delivery'),
    ('66666666-6666-6666-6666-666666666663', '22222222-2222-2222-2222-222222222223', '55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', 500, 225000, 'in_escrow'),
    ('66666666-6666-6666-6666-666666666664', '22222222-2222-2222-2222-222222222224', '55555555-5555-5555-5555-555555555553', '11111111-1111-1111-1111-111111111112', 200, 240000, 'pending')
ON CONFLICT (id) DO NOTHING;

-- Escrow Transactions
INSERT INTO public.escrow_transactions (id, order_id, amount, status, released_at) VALUES
    ('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666661', 250000, 'released', '2023-11-20 10:00:00+00'),
    ('77777777-7777-7777-7777-777777777772', '66666666-6666-6666-6666-666666666662', 400000, 'held', NULL),
    ('77777777-7777-7777-7777-777777777773', '66666666-6666-6666-6666-666666666663', 225000, 'held', NULL)
ON CONFLICT (id) DO NOTHING;

-- Deliveries
INSERT INTO public.deliveries (id, order_id, agent_id, status) VALUES
    ('88888888-8888-8888-8888-888888888881', '66666666-6666-6666-6666-666666666661', '33333333-3333-3333-3333-333333333331', 'delivered'),
    ('88888888-8888-8888-8888-888888888882', '66666666-6666-6666-6666-666666666662', '33333333-3333-3333-3333-333333333331', 'in_transit')
ON CONFLICT (id) DO NOTHING;

-- Verifications
INSERT INTO public.delivery_verifications (id, delivery_id, method, code_hash, status) VALUES
    ('99999999-9999-9999-9999-999999999991', '88888888-8888-8888-8888-888888888881', 'otp', 'mock_hash_1', 'verified'),
    ('99999999-9999-9999-9999-999999999992', '88888888-8888-8888-8888-888888888882', 'qr', 'mock_hash_2', 'pending')
ON CONFLICT (id) DO NOTHING;
