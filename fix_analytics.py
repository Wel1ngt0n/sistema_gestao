import os

path = 'backend/app/services/analytics_service.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """        total_points_done = 0
        done_types = throughput_query.with_entities(Store.tipo_loja).all()
        for s in done_types:
            total_points_done += w_matriz if s.tipo_loja == 'Matriz' else w_filial"""

replacement1 = """        total_points_done = 0
        matrix_count_done = 0
        filial_count_done = 0
        done_types = throughput_query.with_entities(Store.tipo_loja).all()
        for s in done_types:
            if s.tipo_loja == 'Matriz':
                total_points_done += w_matriz
                matrix_count_done += 1
            else:
                total_points_done += w_filial
                filial_count_done += 1"""

content = content.replace(target1, replacement1)

target2 = """            "matrix_count": matrix_count,
            "filial_count": filial_count,
            "total_points_done": round(total_points_done, 1),"""

replacement2 = """            "matrix_count": matrix_count,
            "filial_count": filial_count,
            "matrix_count_done": matrix_count_done,
            "filial_count_done": filial_count_done,
            "total_points_done": round(total_points_done, 1),"""

content = content.replace(target2, replacement2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
