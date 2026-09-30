import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata = { title: "Page Not Found | Vaibhav Celebrations" };

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="min-h-[70vh] bg-cream pt-36 pb-24 px-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-mocha mb-3">404</p>
        <h1 className="font-display text-3xl md:text-5xl font-semibold text-charcoal">We couldn&apos;t find that page</h1>
        <p className="mt-4 text-text-muted max-w-md mx-auto">
          The link may be old, or the page may have moved. Here are some good places to continue.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="btn-primary px-8 py-3 text-sm">
            Go to Home
          </Link>
          <Link href="/packages" className="btn-outline px-8 py-3 text-sm">
            View Packages
          </Link>
          <Link href="/gifts" className="btn-outline px-8 py-3 text-sm">
            Shop Gifts
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
