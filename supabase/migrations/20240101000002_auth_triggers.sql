-- Trigger to automatically create a public.users and profile record when a new auth user signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role user_role;
BEGIN
    -- Extract role from metadata, default to 'buyer' if not provided or invalid
    BEGIN
        user_role := (NEW.raw_user_meta_data->>'role')::user_role;
    EXCEPTION WHEN invalid_text_representation THEN
        user_role := 'buyer'::user_role;
    END;

    IF user_role IS NULL THEN
        user_role := 'buyer'::user_role;
    END IF;

    -- Insert into public.users
    INSERT INTO public.users (id, role, full_name, phone, email, location, is_verified, is_active)
    VALUES (
        NEW.id,
        user_role,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
        NEW.raw_user_meta_data->>'phone',
        NEW.email,
        NEW.raw_user_meta_data->>'location',
        FALSE, -- requires verification
        TRUE
    );

    -- Insert into respective profile table
    IF user_role = 'farmer' THEN
        INSERT INTO public.farmer_profiles (user_id, farm_name, farm_location, bio)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'farm_name', 'My Farm'),
            COALESCE(NEW.raw_user_meta_data->>'farm_location', 'Unknown Location'),
            ''
        );
    ELSIF user_role = 'buyer' THEN
        INSERT INTO public.buyer_profiles (user_id, business_name, delivery_address)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'business_name', COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Business')),
            COALESCE(NEW.raw_user_meta_data->>'delivery_address', 'Unknown Address')
        );
    ELSIF user_role = 'agent' THEN
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

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
