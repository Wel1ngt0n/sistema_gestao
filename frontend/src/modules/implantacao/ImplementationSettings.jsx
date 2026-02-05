import React, { useState } from 'react';
import UnifiedStoreMonitor from './UnifiedStoreMonitor';

const TabNavigation = ({ tabs, activeTab, onTabChange }) => (
    <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`
                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                        ${activeTab === tab.id
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                    `}
                >
                    {tab.label}
                </button>
            ))}
        </nav>
    </div>
);

const ImplementationSettings = () => {
    const [activeTab, setActiveTab] = useState('monitor_implantacao');

    const tabs = [
        { id: 'monitor_implantacao', label: 'Monitores: Implantação' },
        { id: 'monitor_integracao', label: 'Monitor: Integração' },
        { id: 'monitor_suporte', label: 'Monitor: Suporte' },
        { id: 'regras', label: 'Regras de Score' }
    ];

    return (
        <div className="space-y-4">
            <div className="md:flex md:items-center md:justify-between mb-4">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                        Configurações & Monitoramento
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Área administrativa para gestão de listas e regras de negócio.
                    </p>
                </div>
            </div>

            <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Content Area */}
            <div>
                {activeTab === 'monitor_implantacao' && (
                    <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">Monitor de Implantação (V3.0 Legacy Mode)</h3>
                            <UnifiedStoreMonitor />
                        </div>
                    </div>
                )}

                {activeTab === 'monitor_integracao' && (
                    <div className="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-500">Monitor de Integração em desenvolvimento...</p>
                        <p className="text-xs text-gray-400 mt-2">Use o menu "Integração" para ver o Kanban atual.</p>
                    </div>
                )}

                {activeTab === 'monitor_suporte' && (
                    <div className="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-500">Monitor de Suporte em desenvolvimento...</p>
                    </div>
                )}

                {activeTab === 'regras' && (
                    <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
                        <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">Regras de Pontuação (Score de Risco)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                            <div>
                                <label className="block text-sm font-medium leading-6 text-gray-900">Peso por Dia Parado</label>
                                <input type="number" className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6" defaultValue="2.0" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium leading-6 text-gray-900">SLA Padrão (Dias)</label>
                                <input type="number" className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6" defaultValue="90" />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">Salvar Regras</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImplementationSettings;
