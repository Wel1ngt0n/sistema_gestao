export const SkeletonLoader = () => (
    <div className="w-full max-w-[1920px] p-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>
            ))}
        </div>
        <div className="h-[600px] bg-slate-200 rounded-xl"></div>
    </div>
)
