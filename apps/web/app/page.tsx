import PromoCarousel from "./components/PromoCarousel";
import HomeClient from "./components/HomeClient";
import { getStores, type Store } from "./lib/munchies";

export default async function HomePage() {
  let stores: Store[] = [];
  let fetchError = false;

  try {
    stores = await getStores();
  } catch {
    fetchError = true;
  }

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">

      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <span className="text-2xl font-extrabold tracking-tight text-orange-600">
            Munchies.
          </span>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PromoCarousel />
        <HomeClient stores={stores} fetchError={fetchError} />

      </div>
    </main>
  );
}