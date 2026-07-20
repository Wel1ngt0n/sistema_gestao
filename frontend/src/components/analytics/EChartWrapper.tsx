import React from 'react';
import ReactECharts from 'echarts-for-react';

// Componente mínimo para aplicar o tema e acompanhar o redimensionamento.
interface EChartWrapperProps {
    option: any;
    height?: string | number;
    className?: string;
    loading?: boolean;
}

export const EChartWrapper: React.FC<EChartWrapperProps> = ({ option, height = '300px', className, loading }) => {
    // Detecta o modo escuro pela classe do documento quando o provedor de tema não está disponível.
    // O ECharts já fornece um tema escuro próprio.
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
