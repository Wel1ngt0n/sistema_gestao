import sys

file_path = r'frontend/src/features/integration/components/IntegrationKanbanView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update status matching
content = content.replace(
    "const status = (store.status || '').toLowerCase();",
    "const status = (store.current_status || store.status || '').toLowerCase();"
)

# 2. Update layout wrapper
content = content.replace(
    '<div className="flex gap-4 items-start min-w-full pb-4">',
    '<div className="flex h-full min-w-max items-start gap-4 pb-4">'
)

# 3. Update column wrapper
content = content.replace(
    'className="flex-none w-80 flex flex-col bg-slate-100/40/40 rounded-xl border border-slate-200/60 backdrop-blur-sm"',
    'className="flex h-full w-80 flex-none flex-col rounded-xl border border-slate-200 bg-white/85 shadow-sm backdrop-blur-sm"'
)

# 4. Update column header
content = content.replace(
    '<div className="p-3 border-b border-slate-200/60 flex justify-between items-center bg-slate-100/40/40 rounded-t-xl sticky top-0 backdrop-blur-md z-20">',
    '<div className="p-3 border-b border-slate-100 flex justify-between items-center bg-white/95 rounded-t-xl sticky top-0 backdrop-blur-md z-20">'
)

# 5. Update cards container
content = content.replace(
    '<div className="p-2 space-y-2.5 min-h-[150px]">',
    '<div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto rounded-b-xl bg-slate-50/40 p-2.5">'
)

# 6. Add empty state to the end of the cards mapping.
find_str = """                                    <Field label="CRM" value={(store as any).crm} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}"""

replace_str = """                                    <Field label="CRM" value={(store as any).crm} />
                                </div>
                            </div>
                        ))}
                        {columns[col.id]?.length === 0 && (
                            <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center text-xs font-medium text-slate-400">
                                Sem lojas nesta etapa
                            </div>
                        )}
                    </div>
                </div>
            ))}"""

content = content.replace(find_str, replace_str)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('File updated successfully.')
