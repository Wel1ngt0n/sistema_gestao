import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';

export interface AnalyticsFiltersState {
    startDate: Date | null;
    endDate: Date | null;
    implantador: string | null;
    baseTemporal: 'conclusao' | 'inicio' | 'snapshot';
}

export const useDashboardUrlParams = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Leitura dos filtros
    const filters: AnalyticsFiltersState = useMemo(() => {
        const startParam = searchParams.get('start_date');
        const endParam = searchParams.get('end_date');
        const implantadorParam = searchParams.get('implantador');
        const baseTemporalParam = searchParams.get('base_temporal');

        const start = startParam ? parseISO(startParam) : null;
        const end = endParam ? parseISO(endParam) : null;

        return {
            startDate: (start && isValid(start)) ? start : null,
            endDate: (end && isValid(end)) ? end : null,
            implantador: implantadorParam || null,
            baseTemporal: (baseTemporalParam as any) || 'conclusao',
        };
    }, [searchParams]);

    // Update Filter Function (Compatible with legacy Context)
    const updateFilter = (key: keyof AnalyticsFiltersState, value: any) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);

            if (key === 'startDate') {
                if (value && isValid(value)) next.set('start_date', format(value, 'yyyy-MM-dd'));
                else next.delete('start_date');
            }

            else if (key === 'endDate') {
                if (value && isValid(value)) next.set('end_date', format(value, 'yyyy-MM-dd'));
                else next.delete('end_date');
            }

            else if (key === 'implantador') {
                if (value) next.set('implantador', value);
                else next.delete('implantador');
            }

            else if (key === 'baseTemporal') {
                if (value) next.set('base_temporal', value);
                else next.delete('base_temporal');
            }

            return next;
        });
    };

    return { filters, updateFilter };
};
