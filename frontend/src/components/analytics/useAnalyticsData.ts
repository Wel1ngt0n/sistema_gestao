import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { AnalyticsFiltersState } from '../../hooks/useDashboardUrlParams';

// Reuse existing interfaces
export interface KPIData {
    wip_stores: number;
    throughput_period: number;
    mrr_backlog: number;
    mrr_done_period: number;
    cycle_time_avg: number;
    otd_percentage: number;
    idle_stores_count: number;
    avg_risk_score: number;
    matrix_count: number;
    filial_count: number;
    total_points_done: number;
    total_points_wip: number;
}

export interface TrendData {
    month: string;
    throughput: number;
    total_points: number;
    total_mrr: number;
    cycle_time_avg: number;
    otd_percentage: number;
}

export interface PerformanceData {
    implantador: string;
    wip: number;
    done: number;
    otd_percentage: number;
    avg_cycle_time: number;
    score: number;
    points: number;
}

export interface BottleneckData {
    step_name: string;
    total_days: number;
    avg_days: number;
    reopens: number;
}

export interface CapacityData {
    implantador: string;
    current_points: number;
    max_points: number;
    store_count: number;
    utilization_pct: number;
    risk_level: 'NORMAL' | 'HIGH' | 'CRITICAL' | 'LOW';
    active_networks: string[];
}

export interface ForecastData {
    month: string;
    realized: number;
    projected: number;
    is_future: boolean;
    total_accumulated: number;
}

export interface DistributionData {
    steps: Record<string, number>;
    erps: Record<string, number>;
}

const API_BASE_URL = 'http://localhost:5000';

const buildParams = (filters: AnalyticsFiltersState) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('start_date', filters.startDate.toISOString().split('T')[0]);
    if (filters.endDate) params.append('end_date', filters.endDate.toISOString().split('T')[0]);
    if (filters.implantador) params.append('implantador', filters.implantador);
    if (filters.baseTemporal) params.append('base_temporal', filters.baseTemporal);
    return params;
};

export const useAnalyticsData = (filters: AnalyticsFiltersState) => {
    // Generate valid query keys from filters
    const queryKey = [
        'analytics',
        filters.startDate?.toISOString(),
        filters.endDate?.toISOString(),
        filters.implantador,
        filters.baseTemporal
    ];

    const kpiQuery = useQuery({
        queryKey: [...queryKey, 'kpi'],
        queryFn: async () => {
            const res = await axios.get<KPIData>(`${API_BASE_URL}/api/analytics/kpi-cards`, { params: buildParams(filters) });
            return res.data;
        }
    });

    const trendQuery = useQuery({
        queryKey: [...queryKey, 'trends'],
        queryFn: async () => {
            const params = buildParams(filters);
            params.append('months', '6');
            const res = await axios.get<TrendData[]>(`${API_BASE_URL}/api/analytics/trends`, { params });
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    const perfQuery = useQuery({
        queryKey: [...queryKey, 'performance'],
        queryFn: async () => {
            const res = await axios.get<PerformanceData[]>(`${API_BASE_URL}/api/analytics/performance`, { params: buildParams(filters) });
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    const bottleQuery = useQuery({
        queryKey: [...queryKey, 'bottlenecks'],
        queryFn: async () => {
            const res = await axios.get<BottleneckData[]>(`${API_BASE_URL}/api/analytics/bottlenecks`, { params: buildParams(filters) });
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    // Capacity is snapshot, technically doesn't need date filters but good to keep consistent invalidation if needed
    // Actually capacity is usually real-time, so we might not want to re-fetch on date change, but implantador filter definitely affects it if implemented.
    // For now, let's keep it separate or just linked to implantador
    const capacityQuery = useQuery({
        queryKey: ['capacity', filters.implantador],
        queryFn: async () => {
            // Note: Add implantador param to capacity if backend supports it. Legacy didn't, but maybe it should.
            // Keeping it simple as before:
            const res = await axios.get<CapacityData[]>(`${API_BASE_URL}/api/analytics/capacity`);
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    const forecastQuery = useQuery({
        queryKey: ['forecast', 6],
        queryFn: async () => {
            const res = await axios.get<ForecastData[]>(`${API_BASE_URL}/api/analytics/forecast`, { params: { months: 6 } });
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    const riskQuery = useQuery({
        queryKey: ['risk-scatter', filters.implantador],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.implantador) params.append('implantador', filters.implantador);
            // Using logic component to fetch 
            const res = await axios.get<any[][]>(`${API_BASE_URL}/api/analytics/risk-scatter`, { params });
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    const distQuery = useQuery({
        queryKey: ['distribution'],
        queryFn: async () => {
            const res = await axios.get<DistributionData>(`${API_BASE_URL}/api/analytics/distribution`);
            return res.data;
        }
    });

    const isLoading = kpiQuery.isLoading || trendQuery.isLoading || perfQuery.isLoading || bottleQuery.isLoading || capacityQuery.isLoading || forecastQuery.isLoading || riskQuery.isLoading || distQuery.isLoading;
    const isError = kpiQuery.isError || trendQuery.isError || perfQuery.isError || bottleQuery.isError || riskQuery.isError || distQuery.isError;

    return {
        kpiData: kpiQuery.data || null,
        trendData: trendQuery.data || [],
        performanceData: perfQuery.data || [],
        bottleneckData: bottleQuery.data || [],
        capacityData: capacityQuery.data || [],
        forecastData: forecastQuery.data || [],
        riskData: riskQuery.data || [],
        distributionData: distQuery.data || null,
        loading: isLoading,
        error: isError ? 'Erro ao carregar dados' : null
    };
};
