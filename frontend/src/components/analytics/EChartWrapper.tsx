import React from 'react';
import ReactECharts from 'echarts-for-react';

// Minimal wrapper to handle Theme and Resizing
interface EChartWrapperProps {
    option: any;
    height?: string | number;
    className?: string;
    loading?: boolean;
}

export const EChartWrapper: React.FC<EChartWrapperProps> = ({ option, height = '300px', className, loading }) => {
    // Detect dark mode - simple check on document class if ThemeProvider isn't readily available
    // But let's simplify. ECharts has a 'dark' theme.
    const isDark = document.documentElement.classList.contains('dark');

    return (
        <div className={`w-full ${className || ''}`} style={{ height }}>
            <ReactECharts
                option={option}
                theme={isDark ? 'dark' : undefined}
                style={{ height: '100%', width: '100%' }}
                showLoading={loading}
                loadingOption={{
                    text: 'Carregando...',
                    color: '#6366f1',
                    textColor: isDark ? '#fff' : '#333',
                    maskColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)'
                }}
                opts={{ renderer: 'canvas' }}
            />
        </div>
    );
};
