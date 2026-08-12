import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function CollectionLoading() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pb-24 bg-cream">
        {/* Banner Skeleton */}
        <div className="w-full h-[50vh] md:h-[60vh] bg-cream-dark animate-pulse relative">
          <div className="absolute inset-0 bg-charcoal/30"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5">
            <div className="h-12 w-3/4 max-w-xl bg-white/50 animate-pulse rounded-lg mb-6"></div>
            <div className="h-4 w-1/2 max-w-md bg-white/40 animate-pulse rounded-full"></div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-5 md:px-10 mt-16">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-[2rem] p-3 sm:p-4 border border-border-light shadow-sm">
                <div className="aspect-[4/3] w-full rounded-[1.5rem] bg-cream-dark animate-pulse mb-4"></div>
                <div className="h-5 w-3/4 bg-border animate-pulse rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-border/50 animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
