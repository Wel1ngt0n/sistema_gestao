import { useState, useEffect } from 'react';
import MonitorV2 from './MonitorV2';
import MonitorLegacy from './MonitorLegacy';

export default function Monitor() {
    const [useV2, setUseV2] = useState(() => localStorage.getItem('monitor_use_v2') === 'true');

    useEffect(() => {
        localStorage.setItem('monitor_use_v2', String(useV2));
    }, [useV2]);

    if (useV2) {
        return (
            <>
                <div className="fixed bottom-4 right-4 z-[100]">
                    <button
                        onClick={() => setUseV2(false)}
                        className="bg-zinc-800 text-zinc-400 text-xs px-3 py-1.5 rounded-full shadow-lg border border-zinc-700 hover:bg-zinc-700 hover:text-white transition-all opacity-50 hover:opacity-100"
                    >
                        Reverter para V1 (Legacy)
                    </button>
                </div>
                <MonitorV2 />
            </>
        );
    }

    return <MonitorLegacy onEnableV2={() => setUseV2(true)} />;
}
