"""Vector store for clause similarity search.

Two interchangeable backends behind one interface:
  * OracleVectorStore  — Autonomous DB 23ai native `VECTOR` columns (oracledb).
  * InMemoryVectorStore — process-local cosine search (no DB, default offline).

Chosen by `settings.use_oracle` (i.e. whether ADB_DSN is set). Both store the
same record shape so the rest of the app doesn't care which is live:

    record = {
        "id": str,
        "text": str,
        "category": str,
        "analysis_id": str | None,   # set for doc_clauses (per-request RAG)
        "typical": str | None,       # set for cuad_clauses (market reference)
        "harshness": float | None,   # 0..100, set for cuad_clauses
        "embedding": list[float],    # unit-norm, len == settings.embed_dim
    }

Collections (table names): CUAD = market reference, DOC = per-request chat RAG.
"""

from __future__ import annotations

from typing import Any, Optional, Protocol

from app.config import settings

CUAD = "cuad_clauses"
DOC = "doc_clauses"

_FIELDS = ("id", "text", "category", "analysis_id", "typical", "harshness")


class VectorStore(Protocol):
    def add(self, table: str, records: list[dict[str, Any]]) -> None: ...

    def similar(
        self,
        table: str,
        query_embedding: list[float],
        *,
        k: int = 5,
        category: Optional[str] = None,
        analysis_id: Optional[str] = None,
    ) -> list[dict[str, Any]]: ...

    def count(self, table: str) -> int: ...


def _dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


class InMemoryVectorStore:
    """Plain cosine search over in-memory records (vectors are unit-norm)."""

    def __init__(self) -> None:
        self._tables: dict[str, list[dict[str, Any]]] = {CUAD: [], DOC: []}

    def add(self, table: str, records: list[dict[str, Any]]) -> None:
        self._tables.setdefault(table, []).extend(records)

    def similar(
        self,
        table: str,
        query_embedding: list[float],
        *,
        k: int = 5,
        category: Optional[str] = None,
        analysis_id: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        rows = self._tables.get(table, [])
        cat = category.lower() if category else None
        scored: list[dict[str, Any]] = []
        for r in rows:
            if cat and (r.get("category") or "").lower() != cat:
                continue
            if analysis_id and r.get("analysis_id") != analysis_id:
                continue
            score = _dot(query_embedding, r["embedding"])
            scored.append({**r, "score": score})
        scored.sort(key=lambda r: r["score"], reverse=True)
        return scored[:k]

    def count(self, table: str) -> int:
        return len(self._tables.get(table, []))


class OracleVectorStore:
    """Autonomous DB 23ai backend using native VECTOR columns + VECTOR_DISTANCE."""

    def __init__(self) -> None:
        import os

        if settings.tns_admin:
            os.environ.setdefault("TNS_ADMIN", settings.tns_admin)
        self._ensure_schema()

    def _connect(self):
        import oracledb

        return oracledb.connect(
            user=settings.adb_user,
            password=settings.adb_password,
            dsn=settings.adb_dsn,
        )

    def _ensure_schema(self) -> None:
        dim = settings.embed_dim
        ddl = """
            CREATE TABLE {name} (
                id           VARCHAR2(64),
                text         CLOB,
                category     VARCHAR2(128),
                analysis_id  VARCHAR2(64),
                typical      VARCHAR2(2000),
                harshness    NUMBER,
                embedding    VECTOR({dim}, FLOAT32)
            )
        """
        with self._connect() as conn, conn.cursor() as cur:
            for name in (CUAD, DOC):
                try:
                    cur.execute(ddl.format(name=name, dim=dim))
                except Exception:  # table already exists -> ignore (ORA-00955)
                    pass
            conn.commit()

    def add(self, table: str, records: list[dict[str, Any]]) -> None:
        import array

        if not records:
            return
        rows = [
            (
                r["id"],
                r.get("text") or "",
                r.get("category"),
                r.get("analysis_id"),
                r.get("typical"),
                r.get("harshness"),
                array.array("f", r["embedding"]),
            )
            for r in records
        ]
        sql = (
            f"INSERT INTO {table} (id, text, category, analysis_id, typical, harshness, embedding) "
            f"VALUES (:1, :2, :3, :4, :5, :6, :7)"
        )
        with self._connect() as conn, conn.cursor() as cur:
            cur.executemany(sql, rows)
            conn.commit()

    def similar(
        self,
        table: str,
        query_embedding: list[float],
        *,
        k: int = 5,
        category: Optional[str] = None,
        analysis_id: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        import array

        where: list[str] = []
        binds: dict[str, Any] = {"q": array.array("f", query_embedding), "k": k}
        if category:
            where.append("LOWER(category) = :cat")
            binds["cat"] = category.lower()
        if analysis_id:
            where.append("analysis_id = :aid")
            binds["aid"] = analysis_id
        clause = f"WHERE {' AND '.join(where)}" if where else ""
        sql = (
            f"SELECT id, text, category, analysis_id, typical, harshness, "
            f"VECTOR_DISTANCE(embedding, :q, COSINE) AS dist "
            f"FROM {table} {clause} "
            f"ORDER BY dist FETCH FIRST :k ROWS ONLY"
        )
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(sql, binds)
            cols = [c[0].lower() for c in cur.description]
            out: list[dict[str, Any]] = []
            for row in cur.fetchall():
                rec = dict(zip(cols, row))
                text = rec.get("text")
                if hasattr(text, "read"):  # CLOB -> str
                    rec["text"] = text.read()
                rec["score"] = 1.0 - float(rec.pop("dist"))  # cosine distance -> similarity
                out.append(rec)
            return out

    def count(self, table: str) -> int:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            return int(cur.fetchone()[0])


_store: VectorStore | None = None


def get_store() -> VectorStore:
    """Return the singleton store (Oracle if ADB configured, else in-memory)."""
    global _store
    if _store is None:
        _store = OracleVectorStore() if settings.use_oracle else InMemoryVectorStore()
    return _store
