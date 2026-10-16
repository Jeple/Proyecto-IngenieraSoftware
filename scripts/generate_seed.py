#!/usr/bin/env python3
"""Genera los CSV sintéticos de US-01 (esquema de datos y stock dinámico).

Salida (data/seed/): medicamentos.csv, pedidos.csv, items_pedido.csv,
log_reservas.csv. Solo biblioteca estándar, semilla fija: dos corridas
producen archivos idénticos.

El stock se obtiene simulando cronológicamente los eventos del log, de modo
que Stock_Real / Stock_Reservado finales son consistentes con los pedidos.
"""
import csv
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

SEED = 20261015
TZ = timezone(timedelta(hours=-3))  # America/Santiago (horario de verano)
NOW = datetime(2026, 10, 15, 12, 0, tzinfo=TZ)
OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "seed"

ESTADOS = [
    "PENDIENTE_RECETA", "RECETA_RECIBIDA", "EN_PREPARACION",
    "EN_RUTA", "ENTREGADO", "CANCELADO_EXPIRADO",
]
ESTADOS_VIVOS = ESTADOS[:4]  # mantienen stock reservado
TIPOS_EVENTO = [
    "RESERVA", "CONFIRMACION_ENTREGA",
    "LIBERACION_CANCELACION", "LIBERACION_EXPIRACION",
]
ORIGENES = ["BOT", "ADMIN", "JOB_EXPIRACION"]

# (principio activo, dosis, forma, grupo bioequivalente, receta, [(marca, precio CLP)])
PRESENTACIONES = [
    ("Pregabalina", "75 mg", "Cápsula", "BE-PREG-75", "SI", [("Pregalex", 8990), ("Neurogab", 7490)]),
    ("Pregabalina", "150 mg", "Cápsula", "BE-PREG-150", "SI", [("Pregalex", 12990), ("Neurogab", 10990)]),
    ("Melatonina", "3 mg", "Comprimido", "BE-MELA-3", "NO", [("Somnia", 5990), ("Melaton", 4990)]),
    ("Multivitamínico", "Adultos", "Comprimido", "BE-MULT-AD", "NO", [("Vitalmax", 9990), ("Multivit Plus", 8490)]),
    ("Celecoxib", "200 mg", "Cápsula", "BE-CELE-200", "SI", [("Celoxib", 7990), ("Artrocel", 6990)]),
    ("Losartán", "50 mg", "Comprimido", "BE-LOSA-50", "SI", [("Losarmed", 4990), ("Cardiosar", 3990)]),
    ("Escitalopram", "10 mg", "Comprimido", "BE-ESCI-10", "SI", [("Esciprax", 6490), ("Lexamind", 5490)]),
    ("Escitalopram", "20 mg", "Comprimido", "BE-ESCI-20", "SI", [("Esciprax", 9490), ("Lexamind", 7990)]),
]

# (estado final, horas desde la creación hasta NOW, [(n° MED, cantidad)], tipo de cancelación)
PEDIDOS_SPEC = [
    ("ENTREGADO", 12 * 24 + 3, [(1, 2), (5, 1)], None),
    ("ENTREGADO", 10 * 24 + 5, [(11, 2)], None),
    ("ENTREGADO", 9 * 24 + 1, [(5, 1), (7, 1)], None),
    ("ENTREGADO", 6 * 24 + 7, [(13, 1)], None),
    ("CANCELADO_EXPIRADO", 8 * 24 + 2, [(3, 1)], "EXPIRACION"),
    ("CANCELADO_EXPIRADO", 7 * 24 + 4, [(9, 1), (6, 1)], "CANCELACION"),
    ("EN_RUTA", 2 * 24 + 6, [(2, 1), (8, 2)], None),
    ("EN_RUTA", 30, [(15, 1)], None),
    ("EN_PREPARACION", 20, [(10, 2)], None),
    ("RECETA_RECIBIDA", 8, [(12, 1), (4, 1)], None),
    ("RECETA_RECIBIDA", 4, [(5, 2), (7, 1)], None),
    ("PENDIENTE_RECETA", 3, [(14, 1), (3, 1)], None),
    ("PENDIENTE_RECETA", 18, [(16, 1)], None),
]

SECTORES = ["Lo Hermida", "La Faena", "San Luis", "Peñalolén Alto", "Peñalolén Nuevo"]
CALLES = [
    "Av. Grecia", "Av. Tobalaba", "Av. Quilín", "Av. Consistorial",
    "Los Presidentes", "Camino El Alba", "Av. Las Torres", "Calle Oriente",
]

FIELDS = {
    "medicamentos": [
        "ID_Medicamento", "Principio_Activo", "Marca", "Dosis", "Forma_Farmaceutica",
        "Grupo_Bioequivalente", "Requiere_Receta", "Precio_CLP", "Stock_Real",
        "Stock_Reservado", "Activo",
    ],
    "pedidos": [
        "ID_Pedido", "RUT", "Telefono", "Direccion", "Sector", "Estado", "URL_Receta",
        "Timestamp_Creacion", "Timestamp_Actualizacion", "Timestamp_Expiracion", "Total_CLP",
    ],
    "items_pedido": ["ID_Pedido", "ID_Medicamento", "Cantidad", "Precio_Unitario_CLP"],
    "log_reservas": [
        "ID_Log", "Timestamp", "ID_Pedido", "ID_Medicamento", "Cantidad", "Tipo_Evento",
        "Stock_Real_Despues", "Stock_Reservado_Despues", "Origen",
    ],
}


def rut_dv(cuerpo):
    suma, mult = 0, 2
    for d in reversed(str(cuerpo)):
        suma += int(d) * mult
        mult = mult + 1 if mult < 7 else 2
    r = 11 - suma % 11
    return "0" if r == 11 else "K" if r == 10 else str(r)


def iso(dt):
    return dt.isoformat(timespec="seconds")


def build(rng):
    meds = {}
    for p, (activo, dosis, forma, grupo, receta, marcas) in enumerate(PRESENTACIONES):
        for m, (marca, precio) in enumerate(marcas):
            n = p * 2 + m + 1
            meds[n] = {
                "ID_Medicamento": f"MED-{n:03d}",
                "Principio_Activo": activo, "Marca": marca, "Dosis": dosis,
                "Forma_Farmaceutica": forma, "Grupo_Bioequivalente": grupo,
                "Requiere_Receta": receta, "Precio_CLP": precio,
                "Stock_Real": rng.randint(40, 120), "Stock_Reservado": 0, "Activo": "SI",
            }

    pedidos, items, eventos = [], [], []
    for n, (estado, horas, lineas, cancel) in enumerate(PEDIDOS_SPEC, start=1):
        pid = f"#FAR-{n:04d}"
        t0 = NOW - timedelta(hours=horas)
        necesita_receta = any(meds[m]["Requiere_Receta"] == "SI" for m, _ in lineas)
        t = t0
        url = ""
        if cancel:
            t = t0 + timedelta(hours=48 if cancel == "EXPIRACION" else 30)
        else:
            idx = ESTADOS.index(estado)
            if necesita_receta and idx >= 1:
                t += timedelta(hours=rng.randint(1, 2))
                url = f"https://recetas.example.org/{pid[1:]}.jpg"
            for _ in range(2, idx + 1):
                t += timedelta(hours=rng.randint(1, 3))
        assert t <= NOW, f"{pid}: actualización en el futuro"

        cuerpo = rng.randint(6_000_000, 24_000_000)
        total = 0
        for m, cant in lineas:
            precio = meds[m]["Precio_CLP"]
            total += precio * cant
            items.append({
                "ID_Pedido": pid, "ID_Medicamento": meds[m]["ID_Medicamento"],
                "Cantidad": cant, "Precio_Unitario_CLP": precio,
            })
            eventos.append((t0, n, m, cant, "RESERVA", "BOT"))
            if estado == "ENTREGADO":
                eventos.append((t, n, m, cant, "CONFIRMACION_ENTREGA", "ADMIN"))
            elif cancel == "EXPIRACION":
                eventos.append((t, n, m, cant, "LIBERACION_EXPIRACION", "JOB_EXPIRACION"))
            elif cancel == "CANCELACION":
                eventos.append((t, n, m, cant, "LIBERACION_CANCELACION", "ADMIN"))

        pedidos.append({
            "ID_Pedido": pid,
            "RUT": f"{cuerpo}-{rut_dv(cuerpo)}",
            "Telefono": f"+569{rng.randint(10_000_000, 99_999_999)}",
            "Direccion": f"{rng.choice(CALLES)} {rng.randint(100, 9999)}",
            "Sector": rng.choice(SECTORES),
            "Estado": estado,
            "URL_Receta": url,
            "Timestamp_Creacion": iso(t0),
            "Timestamp_Actualizacion": iso(t),
            "Timestamp_Expiracion": iso(t0 + timedelta(hours=48)),
            "Total_CLP": total,
        })

    # Simulación cronológica: el stock final sale de aplicar el log al stock inicial.
    log = []
    real = {m: d["Stock_Real"] for m, d in meds.items()}
    reservado = {m: 0 for m in meds}
    for ts, n, m, cant, tipo, origen in sorted(eventos, key=lambda e: (e[0], e[1], e[2], e[4])):
        if tipo == "RESERVA":
            assert real[m] - reservado[m] >= cant, f"sobreventa en MED-{m:03d}"
            reservado[m] += cant
        elif tipo == "CONFIRMACION_ENTREGA":
            real[m] -= cant
            reservado[m] -= cant
        else:
            reservado[m] -= cant
        log.append({
            "ID_Log": f"LOG-{len(log) + 1:05d}",
            "Timestamp": iso(ts),
            "ID_Pedido": f"#FAR-{n:04d}",
            "ID_Medicamento": meds[m]["ID_Medicamento"],
            "Cantidad": cant,
            "Tipo_Evento": tipo,
            "Stock_Real_Despues": real[m],
            "Stock_Reservado_Despues": reservado[m],
            "Origen": origen,
        })
    for m, d in meds.items():
        d["Stock_Real"], d["Stock_Reservado"] = real[m], reservado[m]
    return list(meds.values()), pedidos, items, log


def validar(meds, pedidos, items, log):
    errores = []
    for nombre, filas, clave in [
        ("medicamentos", meds, "ID_Medicamento"), ("pedidos", pedidos, "ID_Pedido"),
        ("log_reservas", log, "ID_Log"),
    ]:
        ids = [f[clave] for f in filas]
        if len(ids) != len(set(ids)):
            errores.append(f"{nombre}: {clave} duplicado")

    med_ids = {m["ID_Medicamento"]: m for m in meds}
    ped = {p["ID_Pedido"]: p for p in pedidos}
    vivos = {pid for pid, p in ped.items() if p["Estado"] in ESTADOS_VIVOS}

    for p in pedidos:
        if p["Estado"] not in ESTADOS:
            errores.append(f"{p['ID_Pedido']}: estado inválido {p['Estado']}")
        cuerpo, dv = p["RUT"].split("-")
        if rut_dv(cuerpo) != dv:
            errores.append(f"{p['ID_Pedido']}: DV de RUT inválido")
    for it in items:
        if it["ID_Pedido"] not in ped or it["ID_Medicamento"] not in med_ids:
            errores.append(f"items_pedido: FK inválida {it}")
    for ev in log:
        if ev["ID_Pedido"] not in ped or ev["ID_Medicamento"] not in med_ids:
            errores.append(f"log_reservas: FK inválida {ev['ID_Log']}")
        if ev["Tipo_Evento"] not in TIPOS_EVENTO or ev["Origen"] not in ORIGENES:
            errores.append(f"log_reservas: valor inválido {ev['ID_Log']}")

    esperado = {mid: 0 for mid in med_ids}
    for it in items:
        if it["ID_Pedido"] in vivos:
            esperado[it["ID_Medicamento"]] += it["Cantidad"]
    for mid, m in med_ids.items():
        if m["Stock_Reservado"] != esperado[mid]:
            errores.append(f"{mid}: Stock_Reservado {m['Stock_Reservado']} != {esperado[mid]}")
        if m["Stock_Real"] - m["Stock_Reservado"] < 0:
            errores.append(f"{mid}: stock neto negativo")
    for pid, p in ped.items():
        total = sum(i["Cantidad"] * i["Precio_Unitario_CLP"] for i in items if i["ID_Pedido"] == pid)
        if p["Total_CLP"] != total:
            errores.append(f"{pid}: Total_CLP no coincide con items")
        lineas = [i for i in items if i["ID_Pedido"] == pid]
        necesita = any(med_ids[i["ID_Medicamento"]]["Requiere_Receta"] == "SI" for i in lineas)
        if p["Estado"] == "PENDIENTE_RECETA" and not necesita:
            errores.append(f"{pid}: PENDIENTE_RECETA sin medicamentos con receta")
        if p["Estado"] in ESTADOS[1:5] and necesita and not p["URL_Receta"]:
            errores.append(f"{pid}: falta URL_Receta")
    return errores


def escribir(nombre, filas):
    with open(OUT_DIR / f"{nombre}.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS[nombre], lineterminator="\n")
        w.writeheader()
        w.writerows(filas)


def main():
    meds, pedidos, items, log = build(random.Random(SEED))
    errores = validar(meds, pedidos, items, log)
    if errores:
        print("Validación fallida:", *errores, sep="\n  - ")
        sys.exit(1)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for nombre, filas in [("medicamentos", meds), ("pedidos", pedidos),
                          ("items_pedido", items), ("log_reservas", log)]:
        escribir(nombre, filas)
        print(f"{nombre}.csv: {len(filas)} filas")
    print("Validación OK")


if __name__ == "__main__":
    main()
