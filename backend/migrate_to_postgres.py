"""
Migración SQLite → PostgreSQL

Uso:
  DATABASE_URL=postgresql://user:pass@host/db python3 migrate_to_postgres.py

Requiere que la base SQLite local (metaads.db) esté en el mismo directorio.
Crea todas las tablas en PostgreSQL y copia los datos fila por fila.
"""

import os
import sys
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# ── Origen: SQLite local ───────────────────────────────────────────────────────
SQLITE_URL = "sqlite:///./metaads.db"
sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
SQLiteSession = sessionmaker(bind=sqlite_engine)

# ── Destino: PostgreSQL ────────────────────────────────────────────────────────
PG_URL = os.environ.get("DATABASE_URL", "")
if not PG_URL:
    print("ERROR: definí DATABASE_URL con la URL de PostgreSQL")
    sys.exit(1)

if PG_URL.startswith("postgres://"):
    PG_URL = PG_URL.replace("postgres://", "postgresql://", 1)

pg_engine = create_engine(PG_URL, pool_pre_ping=True)
PGSession = sessionmaker(bind=pg_engine)

# ── Crear tablas en PG usando los mismos modelos ───────────────────────────────
# Importar Base después de parchear DATABASE_URL para que no rompa nada
os.environ["DATABASE_URL"] = PG_URL
from database import Base  # noqa: E402
Base.metadata.create_all(bind=pg_engine)
print("✓ Tablas creadas en PostgreSQL")

TABLAS = [
    "clients",
    "ad_accounts",
    "alerts",
    "recommendations",
    "action_logs",
    "hypotheses",
]


def migrar_tabla(tabla: str):
    with sqlite_engine.connect() as src:
        rows = src.execute(text(f"SELECT * FROM {tabla}")).mappings().all()

    if not rows:
        print(f"  {tabla}: vacía, se omite")
        return

    with pg_engine.begin() as dst:
        # Limpiar destino para que la migración sea idempotente
        dst.execute(text(f"DELETE FROM {tabla}"))

        cols = list(rows[0].keys())
        placeholders = ", ".join(f":{c}" for c in cols)
        col_names = ", ".join(cols)
        stmt = text(f"INSERT INTO {tabla} ({col_names}) VALUES ({placeholders})")

        data = [dict(r) for r in rows]

        # Convertir campos datetime que SQLite devuelve como string
        for row in data:
            for k, v in row.items():
                if isinstance(v, str) and len(v) == 19 and "T" in v or (isinstance(v, str) and len(v) >= 19 and v[10] == " "):
                    try:
                        row[k] = datetime.fromisoformat(v)
                    except ValueError:
                        pass

        dst.execute(stmt, data)

        # Resetear la secuencia de PG para que auto-increment siga desde el máximo
        max_id = max((r.get("id") or 0) for r in data)
        if max_id:
            dst.execute(text(f"SELECT setval(pg_get_serial_sequence('{tabla}', 'id'), {max_id})"))

    print(f"  {tabla}: {len(rows)} filas migradas ✓")


print("\nMigrando datos...\n")
for t in TABLAS:
    try:
        migrar_tabla(t)
    except Exception as e:
        print(f"  {t}: ERROR — {e}")

print("\n✓ Migración completa")
