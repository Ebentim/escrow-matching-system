"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, LayoutGrid, List as ListIcon, MapPin, Calendar, LayoutTemplate } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface ProductsClientProps {
  initialProducts: (Product & { product_images?: { storage_path: string; is_primary: boolean }[] })[];
  totalCount: number;
  currentPage: number;
  searchParams: Record<string, string>;
}

export function ProductsClient({ initialProducts, totalCount, currentPage, searchParams }: ProductsClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isPending, setIsPending] = useState(false);
  
  // Local state for filters
  const [filters, setFilters] = useState({
    q: searchParams.q || "",
    crop: searchParams.crop || "",
    loc: searchParams.loc || "",
    minPrice: searchParams.minPrice || "",
    maxPrice: searchParams.maxPrice || "",
    harvestFrom: searchParams.harvestFrom || "",
    harvestTo: searchParams.harvestTo || "",
  });

  // Sync state when searchParams change
  useEffect(() => {
    // Only set pending if filters are actively changing
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters({
      q: searchParams.q || "",
      crop: searchParams.crop || "",
      loc: searchParams.loc || "",
      minPrice: searchParams.minPrice || "",
      maxPrice: searchParams.maxPrice || "",
      harvestFrom: searchParams.harvestFrom || "",
      harvestTo: searchParams.harvestTo || "",
    });
  }, [searchParams]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setIsPending(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    // Reset to page 1 on new filter
    params.set("page", "1");
    router.push(`/products?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({
      q: "", crop: "", loc: "", minPrice: "", maxPrice: "", harvestFrom: "", harvestTo: ""
    });
    router.push("/products");
  };

  const goToPage = (page: number) => {
    setIsPending(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("page", page.toString());
    router.push(`/products?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalCount / 12) || 1;

  const filterSidebar = (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Search</Label>
        <Input 
          placeholder="Product name..." 
          value={filters.q}
          onChange={(e) => handleFilterChange("q", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Crop Type</Label>
        <Input 
          placeholder="e.g. Cassava" 
          value={filters.crop}
          onChange={(e) => handleFilterChange("crop", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Location</Label>
        <Input 
          placeholder="City, State" 
          value={filters.loc}
          onChange={(e) => handleFilterChange("loc", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Price Range (₦)</Label>
        <div className="flex items-center space-x-2">
          <Input 
            type="number" 
            placeholder="Min" 
            value={filters.minPrice}
            onChange={(e) => handleFilterChange("minPrice", e.target.value)}
          />
          <span>-</span>
          <Input 
            type="number" 
            placeholder="Max" 
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Harvest Date Range</Label>
        <Input 
          type="date" 
          className="mb-2"
          value={filters.harvestFrom}
          onChange={(e) => handleFilterChange("harvestFrom", e.target.value)}
        />
        <Input 
          type="date" 
          value={filters.harvestTo}
          onChange={(e) => handleFilterChange("harvestTo", e.target.value)}
        />
      </div>
      <div className="flex space-x-2 pt-2">
        <Button className="flex-1" onClick={applyFilters}>Apply</Button>
        <Button variant="outline" className="flex-1" onClick={clearFilters}>Clear</Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-muted-foreground mt-1">Discover fresh produce directly from verified farmers.</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Mobile Filter */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger render={<Button variant="outline" size="icon" />}>
                <Filter className="h-4 w-4" />
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px]">
                <SheetHeader className="mb-6">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                {filterSidebar}
              </SheetContent>
            </Sheet>
          </div>
          
          {/* View Toggles */}
          <div className="hidden md:flex border rounded-md">
            <Button 
              variant={viewMode === "grid" ? "secondary" : "ghost"} 
              size="icon" 
              className="rounded-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === "list" ? "secondary" : "ghost"} 
              size="icon" 
              className="rounded-none"
              onClick={() => setViewMode("list")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 shrink-0 space-y-6 border-r pr-6">
          <div>
            <h3 className="font-semibold text-lg mb-4 flex items-center"><Filter className="w-4 h-4 mr-2"/> Filters</h3>
            {filterSidebar}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {isPending ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : initialProducts.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-lg border border-dashed">
              <LayoutTemplate className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your filters or search terms.</p>
              <Button onClick={clearFilters} variant="outline">Clear all filters</Button>
            </div>
          ) : (
            <>
              <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
                {initialProducts.map((product) => (
                  <Card key={product.id} className={`overflow-hidden flex ${viewMode === "list" ? "flex-row sm:h-48" : "flex-col"} hover:shadow-md transition-shadow`}>
                    <div className={`${viewMode === "list" ? "w-48 shrink-0" : "h-48 w-full"} bg-muted relative group`}>
                      {product.product_images && product.product_images.length > 0 ? (
                        <img 
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${product.product_images.find((img) => img.is_primary)?.storage_path || product.product_images[0].storage_path}`}
                          alt={product.name}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm bg-secondary/20">No Image</div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <CardTitle className="text-lg line-clamp-1">
                              <Link href={`/products/${product.id}`} className="hover:text-primary transition-colors">
                                {product.name}
                              </Link>
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">{product.crop_type}</p>
                          </div>
                          <p className="font-bold text-lg text-primary whitespace-nowrap">₦{product.price}</p>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pb-4 flex-1">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                            <span className="truncate">{product.location}</span>
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                            <span>Harvest: {new Date(product.harvest_date).toLocaleDateString()}</span>
                          </div>
                          <div className="text-foreground font-medium mt-2">
                            Available: {product.quantity} {product.unit}
                          </div>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="pt-0">
                        <Link href={`/products/${product.id}`} className="w-full">
                          <Button className="w-full" variant="secondary">View Details</Button>
                        </Link>
                      </CardFooter>
                    </div>
                  </Card>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-12">
                  <Button 
                    variant="outline" 
                    disabled={currentPage <= 1}
                    onClick={() => goToPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    disabled={currentPage >= totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
