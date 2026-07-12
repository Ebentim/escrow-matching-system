-- Fix auth-triggered profile creation under RLS and make the role enum creation idempotent
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'user_role' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.user_role AS ENUM ('farmer', 'buyer', 'agent', 'admin');
    END IF;
END$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role_text TEXT;
BEGIN
    SET LOCAL row_security = off;

    user_role_text := COALESCE(NEW.raw_user_meta_data->>'role', 'buyer');

    IF user_role_text NOT IN ('farmer', 'buyer', 'agent', 'admin') THEN
        user_role_text := 'buyer';
    END IF;

    INSERT INTO public.users (id, role, full_name, phone, email, location, is_verified, is_active)
    VALUES (
        NEW.id,
        user_role_text::public.user_role,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
        NEW.raw_user_meta_data->>'phone',
        NEW.email,
        NEW.raw_user_meta_data->>'location',
        FALSE,
        TRUE
    );

    IF user_role_text = 'farmer' THEN
        INSERT INTO public.farmer_profiles (user_id, farm_name, farm_location, bio)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'farm_name', 'My Farm'),
            COALESCE(NEW.raw_user_meta_data->>'farm_location', 'Unknown Location'),
            ''
        );
    ELSIF user_role_text = 'buyer' THEN
        INSERT INTO public.buyer_profiles (user_id, business_name, delivery_address)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'business_name', COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Business')),
            COALESCE(NEW.raw_user_meta_data->>'delivery_address', 'Unknown Address')
        );
    ELSIF user_role_text = 'agent' THEN
        INSERT INTO public.delivery_agent_profiles (user_id, vehicle_type, coverage_area)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'vehicle_type', 'Unknown'),
            COALESCE(NEW.raw_user_meta_data->>'coverage_area', 'Unknown')
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
