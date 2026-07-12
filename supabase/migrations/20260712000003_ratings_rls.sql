-- Update ratings_reviews RLS policy to enforce order participation

DROP POLICY IF EXISTS "Users can insert ratings if they are reviewers" ON ratings_reviews;

CREATE POLICY "Users can insert ratings if involved in order" ON ratings_reviews 
FOR INSERT WITH CHECK (
  auth.uid() = reviewer_id AND 
  EXISTS (
    SELECT 1 FROM orders 
    LEFT JOIN deliveries ON deliveries.order_id = orders.id
    WHERE orders.id = ratings_reviews.order_id 
    AND (
      orders.buyer_id = auth.uid() OR 
      orders.farmer_id = auth.uid() OR 
      deliveries.agent_id = auth.uid()
    )
  )
);
