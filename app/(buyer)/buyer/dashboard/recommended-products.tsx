"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Product } from "@/lib/types"
import { MapPin, Target, Sparkles, TrendingUp, Calendar, AlertCircle } from "lucide-react"
import Link from "next/link"

interface MatchResult extends Product {
  product_images: { storage_path: string; is_primary: boolean }[]
  matchScore: number
  scoreBreakdown: {
    proximity: number
    quantity: number
    price: number
    seasonality: number
  }
}

export function RecommendedProducts({ userGeolocation }: { userGeolocation: { lat: number, lng: number } | null }) {
  const [cropType, setCropType] = useState("")
  const [quantity, setQuantity] = useState("")
  const [targetPrice, setTargetPrice] = useState("")
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleMatch = async () => {
    if (!cropType) {
      setError("Please specify a crop type to get recommendations.")
      return
    }
    
    setLoading(true)
    setError("")
    
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: {
            cropType,
            quantity: quantity ? Number(quantity) : undefined,
            targetPrice: targetPrice ? Number(targetPrice) : undefined,
            lat: userGeolocation?.lat,
            lng: userGeolocation?.lng
          }
        })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch matches")
      
      setMatches(data.matches || [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>I am looking for (Crop Type) *</Label>
              <Input 
                placeholder="e.g. Tomato" 
                value={cropType} 
                onChange={e => setCropType(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity Needed</Label>
              <Input 
                type="number" 
                placeholder="e.g. 50" 
                value={quantity} 
                onChange={e => setQuantity(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Target Price (₦)</Label>
              <Input 
                type="number" 
                placeholder="Max budget per unit" 
                value={targetPrice} 
                onChange={e => setTargetPrice(e.target.value)} 
              />
            </div>
            <Button onClick={handleMatch} disabled={loading || !cropType} className="w-full">
              {loading ? "Matching..." : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" /> Find Best Matches
                </>
              )}
            </Button>
          </div>
          {error && <p className="text-destructive text-sm mt-3 flex items-center"><AlertCircle className="w-4 h-4 mr-1"/> {error}</p>}
        </CardContent>
      </Card>

      {matches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => (
            <Card key={match.id} className="overflow-hidden flex flex-col relative border-2 border-transparent hover:border-primary/20 transition-all">
              <div className="absolute top-3 right-3 z-10 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full border shadow-sm flex items-center">
                <Target className="w-3.5 h-3.5 text-primary mr-1" />
                <span className="text-sm font-bold">{match.matchScore}% Match</span>
              </div>
              
              <div className="h-48 bg-muted relative">
                {match.product_images?.length > 0 ? (
                  <img 
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${match.product_images.find(img => img.is_primary)?.storage_path || match.product_images[0].storage_path}`}
                    alt={match.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/20">No Image</div>
                )}
              </div>
              
              <div className="flex-1 p-4 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg line-clamp-1">{match.name}</h3>
                    <p className="text-sm text-muted-foreground">{match.crop_type}</p>
                  </div>
                  <p className="font-bold text-primary">₦{match.price}</p>
                </div>
                
                <div className="space-y-1 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center"><MapPin className="w-3 h-3 mr-1.5"/> {match.location}</div>
                  <div className="flex items-center"><Calendar className="w-3 h-3 mr-1.5"/> Harvest: {new Date(match.harvest_date).toLocaleDateString()}</div>
                  <div className="flex items-center"><TrendingUp className="w-3 h-3 mr-1.5"/> Available: {match.quantity} {match.unit}</div>
                </div>

                <div className="mt-auto">
                  <div className="mb-4 bg-muted/40 rounded-md p-3 text-xs">
                    <p className="font-semibold mb-2 text-foreground">Why this match?</p>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Distance</span>
                        <span className={match.scoreBreakdown.proximity >= 30 ? "text-green-600 font-medium" : ""}>{match.scoreBreakdown.proximity}/40</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Price</span>
                        <span className={match.scoreBreakdown.price >= 15 ? "text-green-600 font-medium" : ""}>{match.scoreBreakdown.price}/20</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quantity</span>
                        <span className={match.scoreBreakdown.quantity >= 15 ? "text-green-600 font-medium" : ""}>{match.scoreBreakdown.quantity}/20</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Freshness</span>
                        <span className={match.scoreBreakdown.seasonality >= 15 ? "text-green-600 font-medium" : ""}>{match.scoreBreakdown.seasonality}/20</span>
                      </div>
                    </div>
                  </div>
                  
                  <Link href={`/products/${match.id}`} className="block w-full">
                    <Button variant="secondary" className="w-full">View Details</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {matches.length === 0 && !loading && !error && cropType && (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-muted-foreground">No matches found for this criteria.</p>
        </div>
      )}
    </div>
  )
}
