import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <main id="main-content">
      <Skeleton className="h-64 rounded-none" />
      <div className="bg-[#f5f5f5] py-8 md:py-12">
        <div className="product-catalog-shell grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Skeleton className="hidden h-[34rem] bg-white lg:block" />
          <div>
            <Skeleton className="mb-7 h-28 bg-white" />
            <div className="grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => <Skeleton className="aspect-[.72] bg-white" key={index} />)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
