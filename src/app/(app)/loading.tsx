import { Skeleton } from "@/components/ui";

export default function AppLoading() {
  return (
    <div className="mx-auto max-w-md space-y-5 px-5 pb-28 pt-4">
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );
}
