import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  const d = R * c; 
  return d;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { intent } = await req.json()
    const { cropType, quantity, targetPrice, lat, lng } = intent

    if (!cropType) {
      throw new Error('Crop type is required')
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('*, product_images(storage_path, is_primary)')
      .eq('status', 'available')
      .ilike('crop_type', `%${cropType}%`)

    if (error) throw error

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const sortedPrices = [...products].map(p => Number(p.price)).sort((a, b) => a - b)
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)] || 0

    const scoredProducts = products.map((product) => {
      let score = 0
      const breakdowns = {} as Record<string, number>

      if (quantity) {
        if (Number(product.quantity) >= Number(quantity)) {
          breakdowns.quantity = 20
        } else {
          breakdowns.quantity = Math.round((Number(product.quantity) / Number(quantity)) * 20)
        }
      } else {
        breakdowns.quantity = 20
      }
      score += breakdowns.quantity

      if (lat && lng && product.geolocation?.lat && product.geolocation?.lng) {
        const dist = calculateDistance(lat, lng, product.geolocation.lat, product.geolocation.lng)
        let proxScore = 0
        if (dist <= 50) proxScore = 40
        else if (dist <= 100) proxScore = 30
        else if (dist <= 200) proxScore = 20
        else if (dist <= 500) proxScore = 10
        breakdowns.proximity = proxScore
      } else {
        breakdowns.proximity = 20 
      }
      score += breakdowns.proximity

      let priceScore = 0
      const prodPrice = Number(product.price)
      const target = targetPrice || medianPrice
      if (target > 0) {
        if (prodPrice <= target * 0.9) priceScore = 20
        else if (prodPrice <= target * 1.1) priceScore = 15
        else if (prodPrice <= target * 1.3) priceScore = 10
        else priceScore = 5
      } else {
        priceScore = 15
      }
      breakdowns.price = priceScore
      score += priceScore

      const today = new Date()
      const harvestDate = new Date(product.harvest_date)
      const daysDiff = Math.abs((today.getTime() - harvestDate.getTime()) / (1000 * 3600 * 24))
      let seasonScore = 0
      if (daysDiff <= 7) seasonScore = 20
      else if (daysDiff <= 30) seasonScore = 15
      else if (daysDiff <= 90) seasonScore = 10
      else seasonScore = 5
      breakdowns.seasonality = seasonScore
      score += seasonScore

      return {
        ...product,
        matchScore: score,
        scoreBreakdown: breakdowns
      }
    })

    scoredProducts.sort((a, b) => b.matchScore - a.matchScore)

    if (scoredProducts.length > 0 && scoredProducts[0].matchScore >= 80) {
      const topMatch = scoredProducts[0]
      await supabase.from('notifications').insert({
        user_id: topMatch.farmer_id,
        type: 'high_match',
        message: `Your product ${topMatch.name} is highly matched with an active buyer searching for ${cropType}.`
      })
    }

    return new Response(JSON.stringify({ matches: scoredProducts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
