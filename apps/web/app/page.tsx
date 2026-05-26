import PromoCarousel from "./components/PromoCarousel";
import HomeClient from "./components/HomeClient";
import AuthStatusNav from "./components/AuthStatusNav";
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
    <main className="min-h-screen text-gray-900 antialiased">
      <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <span className="text-2xl font-black tracking-tight text-orange-600">
              Munchies.
            </span>
          </div>
          <AuthStatusNav />
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PromoCarousel stores={stores} />
        <HomeClient stores={stores} fetchError={fetchError} />
      </div>
    </main>
  );
}