import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

// Haversine distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // Require auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { intent } = await req.json();
    const { cropType, quantity, targetPrice, lat, lng } = intent;

    if (!cropType) {
      return NextResponse.json({ error: 'Crop type is required' }, { status: 400 });
    }

    // Fetch all available products of this crop type
    const { data: products, error } = await supabase
      .from('products')
      .select('*, product_images(storage_path, is_primary), farmer:users!products_farmer_id_fkey(farmer_profiles(farm_name, rating_avg))')
      .eq('status', 'available')
      .ilike('crop_type', `%${cropType}%`);

    if (error) throw error;

    if (!products || products.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Calculate median price
    const sortedPrices = [...products].map(p => Number(p.price)).sort((a, b) => a - b);
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)] || 0;

    // Score products
    const scoredProducts = products.map((product) => {
      let score = 0;
      const breakdowns = {} as Record<string, number>;

      // 1. Quantity fit (weight: 20)
      if (quantity) {
        if (Number(product.quantity) >= Number(quantity)) {
          breakdowns.quantity = 20;
        } else {
          breakdowns.quantity = Math.round((Number(product.quantity) / Number(quantity)) * 20);
        }
      } else {
        breakdowns.quantity = 20; // Default full if not specified
      }
      score += breakdowns.quantity;

      // 2. Proximity (weight: 40)
      if (lat && lng && product.geolocation && typeof product.geolocation === 'object' && 'lat' in product.geolocation && 'lng' in product.geolocation) {
        const prodGeo = product.geolocation as {lat: number, lng: number};
        const dist = calculateDistance(lat, lng, prodGeo.lat, prodGeo.lng);
        let proxScore = 0;
        if (dist <= 50) proxScore = 40;
        else if (dist <= 100) proxScore = 30;
        else if (dist <= 200) proxScore = 20;
        else if (dist <= 500) proxScore = 10;
        
        breakdowns.proximity = proxScore;
      } else {
        breakdowns.proximity = 20; // Average score if no location data
      }
      score += breakdowns.proximity;

      // 3. Price competitiveness (weight: 20)
      let priceScore = 0;
      const prodPrice = Number(product.price);
      const target = targetPrice || medianPrice;
      if (target > 0) {
        if (prodPrice <= target * 0.9) priceScore = 20;
        else if (prodPrice <= target * 1.1) priceScore = 15;
        else if (prodPrice <= target * 1.3) priceScore = 10;
        else priceScore = 5;
      } else {
        priceScore = 15; // default if target is 0
      }
      breakdowns.price = priceScore;
      score += priceScore;

      // 4. Seasonal fit (weight: 20)
      const today = new Date();
      const harvestDate = new Date(product.harvest_date);
      const daysDiff = Math.abs((today.getTime() - harvestDate.getTime()) / (1000 * 3600 * 24));
      let seasonScore = 0;
      if (daysDiff <= 7) seasonScore = 20;
      else if (daysDiff <= 30) seasonScore = 15;
      else if (daysDiff <= 90) seasonScore = 10;
      else seasonScore = 5;
      breakdowns.seasonality = seasonScore;
      score += seasonScore;

      return {
        ...product,
        matchScore: score,
        scoreBreakdown: breakdowns
      };
    });

    // Sort by score descending
    scoredProducts.sort((a, b) => b.matchScore - a.matchScore);

    // Notify farmer of top match if score >= 80
    if (scoredProducts.length > 0 && scoredProducts[0].matchScore >= 80) {
      const topMatch = scoredProducts[0];
      const serviceClient = createServiceClient();
      // Insert notification
      await serviceClient.from('notifications').insert({
        user_id: topMatch.farmer_id,
        type: 'high_match',
        message: `Your product ${topMatch.name} is highly matched with an active buyer searching for ${cropType}.`
      });
    }

    return NextResponse.json({ matches: scoredProducts });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
