/// <reference types="vite/client" />

declare module 'react-chartjs-2' {
    import { Chart as ChartJS } from 'chart.js';
    import { ComponentType } from 'react';

    export interface ChartProps {
        type: string;
        data: any;
        options?: any;
        plugins?: any[];
        redraw?: boolean;
        datasetIdKey?: string;
        fallbackContent?: React.ReactNode;
        updateMode?: 'resize' | 'reset' | 'none' | 'hide' | 'show' | 'normal' | 'active';
    }

    export const Chart: ComponentType<ChartProps>;
}
