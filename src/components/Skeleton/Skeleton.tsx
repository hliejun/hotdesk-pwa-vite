import React from "react";
import { cx } from "../../lib/cx";

export interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => {
  return <div className={cx("skeleton", className)} aria-hidden="true" />;
};
