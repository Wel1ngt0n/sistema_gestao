import sys

file_path = r'frontend/src/features/integration/IntegrationMonitor.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

find_str_1 = """        if (filterStatus === 'active') {
            result = result.filter(d => d.status !== 'CONCLUÍDO')
        } else {
            result = result.filter(d => d.status === 'CONCLUÍDO')
        }"""
        
replace_str_1 = """        if (filterStatus === 'active') {
            result = result.filter(d => d.status !== 'CONCLUÍDO' && d.status !== 'ARQUIVADA')
        } else if (filterStatus === 'concluded') {
            result = result.filter(d => d.status === 'CONCLUÍDO')
        } else if (filterStatus === 'archived') {
            result = result.filter(d => d.status === 'ARQUIVADA')
        }"""

find_str_2 = """        const active = data.filter(d => d.status !== 'CONCLUÍDO')"""
replace_str_2 = """        const active = data.filter(d => d.status !== 'CONCLUÍDO' && d.status !== 'ARQUIVADA')"""

find_str_3 = """                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 lg:col-span-2">
                            <option value="active">Ativas</option>
                            <option value="concluded">Concluídas</option>
                        </select>"""
                        
replace_str_3 = """                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 lg:col-span-2">
                            <option value="active">Ativas</option>
                            <option value="concluded">Concluídas</option>
                            <option value="archived">Arquivadas</option>
                        </select>"""

content = content.replace(find_str_1, replace_str_1)
content = content.replace(find_str_2, replace_str_2)
content = content.replace(find_str_3, replace_str_3)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('IntegrationMonitor updated.')
