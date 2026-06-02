import type { ChartOptions } from 'chart.js';

export const coresAnalytics = {
    laranja: '#ff7900',
    verde: '#128131',
    texto: '#18181b',
    textoSuave: '#71717a',
    borda: '#e4e4e7',
    fundo: '#ffffff',
    fundoSuave: '#fafafa',
    alerta: '#eab308',
    perigo: '#dc2626',
};

export const formatarMoeda = (valor?: number | null) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
    }).format(valor || 0);
};

export const formatarNumero = (valor?: number | null) => {
    return new Intl.NumberFormat('pt-BR').format(valor || 0);
};

export const opcoesGraficoExecutivo = <TipoGrafico extends 'bar' | 'line' = 'bar'>(): ChartOptions<TipoGrafico> => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        intersect: false,
        mode: 'index',
    },
    layout: {
        padding: { top: 8, right: 8, bottom: 0, left: 0 },
    },
    plugins: {
        legend: {
            position: 'bottom',
            align: 'start',
            labels: {
                boxHeight: 8,
                boxWidth: 18,
                color: coresAnalytics.textoSuave,
                padding: 18,
                usePointStyle: true,
                font: { size: 11, weight: 500 },
            },
        },
        tooltip: {
            backgroundColor: coresAnalytics.texto,
            titleColor: coresAnalytics.fundo,
            bodyColor: '#e4e4e7',
            borderColor: '#27272a',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            padding: 12,
            boxPadding: 6,
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
        },
    },
    scales: {
        x: {
            grid: { display: false },
            ticks: { color: coresAnalytics.textoSuave, font: { size: 11 } },
            border: { display: false },
        },
        y: {
            beginAtZero: true,
            grid: { color: 'rgba(100, 116, 139, 0.12)', drawTicks: false },
            ticks: { color: coresAnalytics.textoSuave, font: { size: 11 } },
            border: { display: false },
        },
    },
});

export const estiloBarraLaranja = {
    backgroundColor: 'rgba(255, 121, 0, 0.28)',
    hoverBackgroundColor: 'rgba(255, 121, 0, 0.42)',
    borderColor: 'rgba(255, 121, 0, 0.62)',
    borderWidth: 1,
    borderRadius: 6,
    borderSkipped: false,
    barPercentage: 0.58,
    categoryPercentage: 0.82,
    maxBarThickness: 46,
};

export const estiloBarraVerde = {
    backgroundColor: 'rgba(18, 129, 49, 0.18)',
    hoverBackgroundColor: 'rgba(18, 129, 49, 0.28)',
    borderColor: 'rgba(18, 129, 49, 0.58)',
    borderWidth: 1,
    borderRadius: 6,
    borderSkipped: false,
    barPercentage: 0.58,
    categoryPercentage: 0.82,
    maxBarThickness: 46,
};

export const estiloLinhaLaranja = {
    borderColor: coresAnalytics.laranja,
    backgroundColor: 'rgba(255, 121, 0, 0.12)',
    pointBackgroundColor: coresAnalytics.fundo,
    pointBorderColor: coresAnalytics.laranja,
    pointBorderWidth: 2,
    pointRadius: 3,
    pointHoverRadius: 5,
    borderWidth: 3,
    fill: true,
    tension: 0.36,
};

export const estiloLinhaMetaVariavel = {
    borderColor: coresAnalytics.verde,
    backgroundColor: 'rgba(18, 129, 49, 0.08)',
    pointBackgroundColor: coresAnalytics.fundo,
    pointBorderColor: coresAnalytics.verde,
    pointBorderWidth: 2,
    pointRadius: 3,
    pointHoverRadius: 5,
    borderWidth: 2,
    borderDash: [7, 7],
    fill: false,
    tension: 0.28,
};
