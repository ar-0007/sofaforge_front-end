import React from "react";
import StoreLayout from "@/components/StoreLayout";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useRoute } from "wouter";

export function OurStory() {
  return (
    <StoreLayout>
      <div className="max-w-4xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#8C7A6B]">EST. 2024 — TORONTO, CANADA</span>
          <h1 className="font-serif text-5xl font-light tracking-wide">Crafted with Purpose.</h1>
          <p className="text-lg font-serif italic text-muted-foreground">The Art of Living.</p>
        </div>
        <div className="aspect-[16/9] overflow-hidden bg-gray-100">
          <OptimizedImage src="https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80" alt="Workshop" sizes="100vw" className="w-full h-full object-cover" />
        </div>
        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <p>
            The Sofa Co. was founded on a single conviction — that Canadian craftsmanship deserves a place at the centre of the modern home. We work with a small collective of artisans across Ontario and Quebec, each trained in traditional upholstery techniques passed down through generations.
          </p>
          <p>
            Every frame begins as kiln-dried hardwood. Every fabric is chosen for its ability to age beautifully. Every stitch is placed by hand. We are not a fast furniture company. We never will be.
          </p>
        </div>
      </div>
    </StoreLayout>
  );
}

export function Craftsmanship() {
  return (
    <StoreLayout>
      <div className="max-w-4xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#8C7A6B]">Uncompromising Standards</span>
          <h1 className="font-serif text-5xl font-light tracking-wide">The Art of Construction</h1>
        </div>
        <div className="aspect-[16/9] overflow-hidden bg-gray-100">
          <OptimizedImage src="https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80" alt="Craftsmanship" sizes="100vw" className="w-full h-full object-cover" />
        </div>
        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <p>
            Our frames are constructed from sustainably harvested, kiln-dried Canadian hardwood, joined with mortise and tenon joinery to guarantee 25 years of structural integrity.
          </p>
          <p>
            Cushioning is engineered with multi-layer high-resilience foam wrapped in feather-down chambers for a luxurious sit that maintains its composure over decades.
          </p>
        </div>
      </div>
    </StoreLayout>
  );
}

export function Sustainability() {
  return (
    <StoreLayout>
      <div className="max-w-4xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#8C7A6B]">Responsible Living</span>
          <h1 className="font-serif text-5xl font-light tracking-wide">Conscious Craft</h1>
        </div>
        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <p>
            Sustainability is embedded in our definition of an heirloom. By building furniture that lasts generations, we eliminate landfill waste associated with fast furniture.
          </p>
          <p>
            We partner exclusively with textile mills utilizing Oeko-Tex certified organic fibers, water-based dyes, and local supply chains to minimize carbon footprints.
          </p>
        </div>
      </div>
    </StoreLayout>
  );
}

export function Lookbook() {
  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#8C7A6B]">Visual Inspiration</span>
          <h1 className="font-serif text-5xl font-light tracking-wide">The 2026 Lookbook</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-[4/5] bg-gray-100 overflow-hidden">
            <OptimizedImage src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80" alt="Lookbook 1" sizes="(min-width: 768px) 50vw, 100vw" className="w-full h-full object-cover" />
          </div>
          <div className="aspect-[4/5] bg-gray-100 overflow-hidden">
            <OptimizedImage src="https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=800&q=80" alt="Lookbook 2" sizes="(min-width: 768px) 50vw, 100vw" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}

export function ShippingReturns() {
  return (
    <StoreLayout>
      <div className="max-w-4xl mx-auto px-6 py-20 space-y-8">
        <h1 className="font-serif text-4xl font-light">Shipping & Returns</h1>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <h3 className="text-lg font-serif text-[#1C1A17] font-medium">White Glove Delivery</h3>
          <p>We provide complimentary white glove delivery on all orders over $200 within Canada. Our professional delivery team places and assembles your furniture in your room of choice and removes all packaging.</p>
          <h3 className="text-lg font-serif text-[#1C1A17] font-medium">Custom Orders</h3>
          <p>Because each custom piece is handcrafted to your exact specifications, custom orders enter production immediately upon placement and cannot be cancelled or returned after 48 hours.</p>
        </div>
      </div>
    </StoreLayout>
  );
}

export function CareGuide() {
  return (
    <StoreLayout>
      <div className="max-w-4xl mx-auto px-6 py-20 space-y-8">
        <h1 className="font-serif text-4xl font-light">Care Guide</h1>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <h3 className="text-lg font-serif text-[#1C1A17] font-medium">Upholstery Care</h3>
          <p>Regularly vacuum with a soft brush attachment to prevent dust accumulation. For spills, blot immediately with a clean, dry absorbent cloth. Do not rub or use harsh chemical solvents.</p>
          <h3 className="text-lg font-serif text-[#1C1A17] font-medium">Cushion Maintenance</h3>
          <p>Fluff and rotate cushions bi-weekly to ensure even wear and longevity across feather-down filling.</p>
        </div>
      </div>
    </StoreLayout>
  );
}
