import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function GiftsLoading() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[110px] pb-24 bg-cream">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          
          {/* Header Skeleton */}
          <div className="flex flex-col items-center mb-16 pt-8">
            <div className="h-6 w-32 bg-border animate-pulse rounded-full mb-4"></div>
            <div className="h-12 w-3/4 max-w-2xl bg-border animate-pulse rounded-lg mb-6"></div>
            <div className="h-4 w-1/2 max-w-md bg-border/50 animate-pulse rounded-full"></div>
          </div>

          <div className="flex flex-col lg:flex-row gap-10">
            {/* Sidebar Skeleton */}
            <aside className="w-full lg:w-64 shrink-0">
              <div className="h-10 w-full bg-border animate-pulse rounded-lg mb-8"></div>
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-3">
                    <div className="h-5 w-24 bg-border animate-pulse rounded mb-4"></div>
                    <div className="h-4 w-full bg-border/50 animate-pulse rounded"></div>
                    <div className="h-4 w-5/6 bg-border/50 animate-pulse rounded"></div>
                    <div className="h-4 w-4/6 bg-border/50 animate-pulse rounded"></div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Grid Skeleton */}
            <div className="flex-1">
              {/* Active Filters Bar Skeleton */}
              <div className="h-8 w-full bg-border/50 animate-pulse rounded-lg mb-6"></div>
              
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
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
