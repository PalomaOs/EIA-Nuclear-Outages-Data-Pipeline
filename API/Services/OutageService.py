import sqlite3
import logging
from typing import Optional

from Schemas.Outage import GeneratorOutageOut, PaginatedResponse
from Schemas.Outage import PaginatedResponse, FacilityOut, NuclearOutagesOut

logger = logging.getLogger(__name__)


#Returns paginated outage rows joined across all three tables.
# All filters are optional — omitting them returns everything.
    
def get_outages(
    conn: sqlite3.Connection,
    date_from: Optional[str],
    date_to: Optional[str],
    facility_id: Optional[int],
    generator_name: Optional[str],
    page: int,
    page_size: int,
) -> PaginatedResponse:
    
    base_query = """
        FROM DailyOutage   d
        JOIN Generator     g  ON g.id         = d.generatorId
        JOIN Facility      f ON f.facilityId = g.facilityId
        WHERE 1=1
    """
    params: list = []

    if date_from:
        base_query += " AND d.period >= ?"
        params.append(date_from)
    if date_to:
        base_query += " AND d.period <= ?"
        params.append(date_to)
    if facility_id is not None:
        base_query += " AND f.facilityId = ?"
        params.append(facility_id)
    if generator_name:
        base_query += " AND g.generatorName = ?"
        params.append(generator_name)

    # Total count
    count_row = conn.execute(f"SELECT COUNT(*) {base_query}", params).fetchone()
    total = count_row[0] if count_row else 0

    # Paginated data
    offset = (page - 1) * page_size
    select_query = f"""
        SELECT
            d.period,
            f.facilityId,
            f.facilityName,
            g.generatorName,
            d.capacity,
            d.outage,
            d.percentOutage
        {base_query}
        ORDER BY d.period DESC, f.facilityId ASC, g.generatorName ASC
        LIMIT ? OFFSET ?
    """
    rows = conn.execute(select_query, params + [page_size, offset]).fetchall()

    results = [GeneratorOutageOut(**dict(row)) for row in rows]
    logger.info(
        "Query returned %d/%d records (page=%d, size=%d).",
        len(results), total, page, page_size,
    )
    return PaginatedResponse(total=total, page=page, page_size=page_size, results=results)


def get_facilities(conn: sqlite3.Connection) -> list[FacilityOut]:
    rows = conn.execute("""
        SELECT facilityId, facilityName
        FROM Facility
        ORDER BY facilityName ASC
    """).fetchall()
    return [FacilityOut(**dict(row)) for row in rows]

def get_nuclearOutages(
    conn: sqlite3.Connection,
    date_from: Optional[str],
    date_to: Optional[str],
    page: int,
    page_size: int,
) -> PaginatedResponse:
    
    base_query = "FROM DailyOutage WHERE 1=1"
    params: list = []

    if date_from:
        base_query += " AND period >= ?"
        params.append(date_from)
    if date_to:
        base_query += " AND period <= ?"
        params.append(date_to)

    # Total count of distinct periods for pagination metadata
    total = conn.execute(
        f"SELECT COUNT(DISTINCT period) {base_query}", params
    ).fetchone()[0]

    # Paginated data
    offset = (page - 1) * page_size
    rows = conn.execute(f"""
        SELECT period,
               SUM(capacity)     AS capacity,
               SUM(outage)       AS outage,
               SUM(percentOutage) AS percentOutage
        {base_query}
        GROUP BY period
        ORDER BY period DESC
        LIMIT ? OFFSET ?
    """, params + [page_size, offset]).fetchall()

    result = []
    for row in rows:
        data = dict(row)
        capacity = data["capacity"] or 0
        outage   = data["outage"]   or 0
        data["outage"]        = round(outage, 3)
        data["percentOutage"] = round((outage / capacity * 100), 2) if capacity > 0 else 0.0
        result.append(NuclearOutagesOut(**data))

    return PaginatedResponse(total=total, page=page, page_size=page_size, results=result)