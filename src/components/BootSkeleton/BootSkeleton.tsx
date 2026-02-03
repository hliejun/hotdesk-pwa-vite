import { Skeleton } from "../Skeleton";

export const BootSkeleton = () => {
  return (
    <div className="stack">
      <section className="card">
        <Skeleton className="skeletonTitle" />
        <div style={{ height: 10 }} />
        <Skeleton className="skeletonLine" />
      </section>
      <section className="card">
        <Skeleton className="skeletonBlock" />
      </section>
    </div>
  );
};
