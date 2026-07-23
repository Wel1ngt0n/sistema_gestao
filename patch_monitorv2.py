import sys

file_path = r'frontend/src/components/MonitorV2.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

find_str_1 = """    const [filterStatus, setFilterStatus] = useState<'active' | 'concluded' | 'scheduled'>('active');"""
replace_str_1 = """    const [filterStatus, setFilterStatus] = useState<'active' | 'concluded' | 'scheduled' | 'archived'>('active');"""

find_str_2 = """        // 1. Filtros Básicos (Ativas, Concluídas, etc)
        // Isso pode ser injetado caso a gente queira ligar o filterStatus (do cabeçalho) aqui no MonitorV2
        if (filterStatus === 'active') {
            res = res.filter(s => s.status !== 'CONCLUÍDO');
        } else if (filterStatus === 'concluded') {
            res = res.filter(s => s.status === 'CONCLUÍDO');
        } else if (filterStatus === 'scheduled') {
            res = res.filter(s => s.status === 'AGENDADO');
        }"""
        
replace_str_2 = """        // 1. Filtros Básicos (Ativas, Concluídas, etc)
        // Isso pode ser injetado caso a gente queira ligar o filterStatus (do cabeçalho) aqui no MonitorV2
        if (filterStatus === 'active') {
            res = res.filter(s => s.status !== 'CONCLUÍDO' && s.status !== 'ARQUIVADA');
        } else if (filterStatus === 'concluded') {
            res = res.filter(s => s.status === 'CONCLUÍDO');
        } else if (filterStatus === 'scheduled') {
            res = res.filter(s => s.status === 'AGENDADO');
        } else if (filterStatus === 'archived') {
            res = res.filter(s => s.status === 'ARQUIVADA');
        }"""

if find_str_1 in content:
    content = content.replace(find_str_1, replace_str_1)
if find_str_2 in content:
    content = content.replace(find_str_2, replace_str_2)
elif "res = res.filter(s => s.status !== 'CONCLUÍDO');" in content:
    # If the exact block is not there, let's just find the line and replace
    content = content.replace("res = res.filter(s => s.status !== 'CONCLUÍDO');", "res = res.filter(s => s.status !== 'CONCLUÍDO' && s.status !== 'ARQUIVADA');")
elif "if (globalFilter)" in content:
    # Fallback to inject filter logic before globalFilter
    content = content.replace("if (globalFilter)", """
        if (filterStatus === 'active') {
            res = res.filter(s => s.status !== 'CONCLUÍDO' && s.status !== 'ARQUIVADA');
        } else if (filterStatus === 'concluded') {
            res = res.filter(s => s.status === 'CONCLUÍDO');
        } else if (filterStatus === 'archived') {
            res = res.filter(s => s.status === 'ARQUIVADA');
        }
        
        if (globalFilter)""")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

file_path = r'frontend/src/components/monitor/MonitorHeader.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "filterStatus: 'active' | 'concluded' | 'scheduled';", 
    "filterStatus: 'active' | 'concluded' | 'scheduled' | 'archived';"
)

content = content.replace(
    "setFilterStatus: (val: 'active' | 'concluded' | 'scheduled') => void;",
    "setFilterStatus: (val: 'active' | 'concluded' | 'scheduled' | 'archived') => void;"
)

content = content.replace(
    """<option value="active">Ativas</option>
                        <option value="concluded">Concluídas</option>""",
    """<option value="active">Ativas</option>
                        <option value="concluded">Concluídas</option>
                        <option value="archived">Arquivadas</option>"""
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('MonitorV2 and Header patched')
