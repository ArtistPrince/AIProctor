from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

TENANT_SCHEMA = "tenant_partitions"
PUBLIC_SCHEMA = "public"


PARTITIONED_TABLES = (
    "institute_admins",
    "batches",
    "faculties",
    "students",
    "exams",
    "ques_ans",
    "exam_assignments",
    "exam_sessions",
)


def _partition_suffix(institute_id: str) -> str:
    normalized = institute_id.replace("-", "_").lower()
    if not re.fullmatch(r"[0-9a-f_]{32,64}", normalized):
        raise ValueError("Invalid institute_id for partition suffix")
    return normalized


def ensure_tenant_partitions(db: Session, institute_id: str | UUID) -> None:
    institute_id_text = str(institute_id)
    institute_uuid_text = str(UUID(institute_id_text))
    suffix = _partition_suffix(institute_id_text)

    db.execute(text(f"CREATE SCHEMA IF NOT EXISTS {TENANT_SCHEMA}"))

    for parent_table in PARTITIONED_TABLES:
        partition_bound_rows = db.execute(
            text(
                """
                SELECT pg_get_expr(child.relpartbound, child.oid) AS bound_expr
                FROM pg_class child
                JOIN pg_inherits inh ON inh.inhrelid = child.oid
                JOIN pg_class parent ON parent.oid = inh.inhparent
                JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
                WHERE parent_ns.nspname = :parent_schema
                  AND parent.relname = :parent_table
                """
            ),
            {"parent_schema": PUBLIC_SCHEMA, "parent_table": parent_table},
        ).fetchall()

        if any(institute_uuid_text in str(row[0] or "") for row in partition_bound_rows):
            continue

        partition_table = f"{parent_table}_{suffix}"
        public_regclass = db.execute(
            text("SELECT to_regclass(:relname)"),
            {"relname": f"{PUBLIC_SCHEMA}.{partition_table}"},
        ).scalar()
        tenant_regclass = db.execute(
            text("SELECT to_regclass(:relname)"),
            {"relname": f"{TENANT_SCHEMA}.{partition_table}"},
        ).scalar()

        if public_regclass and not tenant_regclass:
            db.execute(text(f"ALTER TABLE {PUBLIC_SCHEMA}.{partition_table} SET SCHEMA {TENANT_SCHEMA}"))
            tenant_regclass = db.execute(
                text("SELECT to_regclass(:relname)"),
                {"relname": f"{TENANT_SCHEMA}.{partition_table}"},
            ).scalar()

        if not tenant_regclass:
            statement = text(
                f"""
                CREATE TABLE IF NOT EXISTS {TENANT_SCHEMA}.{partition_table}
                PARTITION OF {PUBLIC_SCHEMA}.{parent_table}
                FOR VALUES IN ('{institute_uuid_text}')
                """
            )
            db.execute(statement)
