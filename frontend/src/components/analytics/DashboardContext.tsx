import React, { createContext, useContext, useState, ReactNode } from 'react';

// Tipos para os Filtros
export interface AnalyticsFiltersState {
    startDate: Date | null;
    endDate: Date | null;
    implantador: string | null;
    baseTemporal: 'conclusao' | 'inicio' | 'snapshot';
}

interface DashboardContextType {
    filters: AnalyticsFiltersState;
    setFilters: (filters: AnalyticsFiltersState) => void;
    updateFilter: (key: keyof AnalyticsFiltersState, value: any) => void;
}

const defaultFilters: AnalyticsFiltersState = {
    startDate: null,
    endDate: null,
    implantador: null,
    baseTemporal: 'conclusao'
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [filters, setFilters] = useState<AnalyticsFiltersState>(defaultFilters);

    const updateFilter = (key: keyof AnalyticsFiltersState, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <DashboardContext.Provider value={{ filters, setFilters, updateFilter }}>
            {children}
        </DashboardContext.Provider>
    );
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
};
