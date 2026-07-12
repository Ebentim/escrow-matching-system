-- Admin Analytics RPCs

CREATE OR REPLACE FUNCTION get_admin_dashboard_metrics()
RETURNS JSONB AS $$
DECLARE
  users_by_role JSONB;
  active_listings_count INT;
  orders_by_status JSONB;
  gross_value NUMERIC;
  open_disputes INT;
BEGIN
  -- Users by role
  SELECT jsonb_object_agg(role, count) INTO users_by_role
  FROM (SELECT role, COUNT(*) as count FROM users GROUP BY role) sub;

  -- Active listings
  SELECT COUNT(*) INTO active_listings_count FROM products WHERE status = 'available';

  -- Orders by status
  SELECT jsonb_object_agg(status, count) INTO orders_by_status
  FROM (SELECT status, COUNT(*) as count FROM orders GROUP BY status) sub;

  -- Gross transaction value (completed orders)
  SELECT COALESCE(SUM(total_price), 0) INTO gross_value FROM orders WHERE status = 'completed';

  -- Open disputes
  SELECT COUNT(*) INTO open_disputes FROM disputes WHERE status = 'open';

  RETURN jsonb_build_object(
    'users_by_role', COALESCE(users_by_role, '{}'::jsonb),
    'active_listings', active_listings_count,
    'orders_by_status', COALESCE(orders_by_status, '{}'::jsonb),
    'gross_value', gross_value,
    'open_disputes', open_disputes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_admin_charts()
RETURNS JSONB AS $$
DECLARE
  top_crops JSONB;
  order_volume JSONB;
BEGIN
  -- Top crop types (active listings)
  SELECT json_agg(row_to_json(t)) INTO top_crops FROM (
    SELECT crop_type, COUNT(*) as count 
    FROM products 
    GROUP BY crop_type 
    ORDER BY count DESC 
    LIMIT 5
  ) t;

  -- Order volume over time (last 30 days)
  SELECT json_agg(row_to_json(t)) INTO order_volume FROM (
    SELECT DATE(created_at) as date, COUNT(*) as count 
    FROM orders 
    WHERE created_at > NOW() - INTERVAL '30 days' 
    GROUP BY DATE(created_at) 
    ORDER BY DATE(created_at)
  ) t;

  RETURN jsonb_build_object(
    'top_crops', COALESCE(top_crops, '[]'::jsonb),
    'order_volume', COALESCE(order_volume, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
