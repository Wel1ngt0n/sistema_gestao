import clsx from 'clsx';
import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, width, height, count = 1 }) => {
    const skulls = Array(count).fill(0);

    return (
        <>
            {skulls.map((_, i) => (
                <div
                    key={i}
                    className={clsx(
                        "animate-pulse bg-slate-200 dark:bg-slate-700 rounded-md",
                        className
                    )}
                    style={{
                        width: width,
                        height: height,
                        marginBottom: count > 1 && i < count - 1 ? '0.5rem' : 0
                    }}
                />
            ))}
        </>
    );
};
