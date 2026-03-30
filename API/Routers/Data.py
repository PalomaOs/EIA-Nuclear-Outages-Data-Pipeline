import sqlite3
from fastapi import APIRouter, Depends
from Core.Dependencies import get_db, get_current_user
from Schemas.Outage import ( PaginatedResponse, FacilityOut, NuclearOutagesOut, GeneratorOutageOut, GeneratorQuery, NuclearQuery)
from Services.OutageService import get_outages, get_facilities, get_nuclearOutages

router = APIRouter(prefix="/data", tags=["data"])


@router.get("/generator", response_model=PaginatedResponse[GeneratorOutageOut])
def read_outages(
    q:    GeneratorQuery      = Depends(),
    _user: str                = Depends(get_current_user),
    db:   sqlite3.Connection  = Depends(get_db),
) -> PaginatedResponse[GeneratorOutageOut]:
    return get_outages(
        conn           = db,
        date_from      = q.date_from,
        date_to        = q.date_to,
        facility_id    = q.facility_id,
        generator_name = q.generator_name,
        page           = q.page,
        page_size      = q.page_size,
    )


@router.get("/facilities", response_model=list[FacilityOut])
def read_facilities(
    _user: str               = Depends(get_current_user),
    db:   sqlite3.Connection = Depends(get_db),
) -> list[FacilityOut]:
    return get_facilities(db)


@router.get("/US", response_model=PaginatedResponse[NuclearOutagesOut])
def read_nuclear(
    q:    NuclearQuery       = Depends(),
    _user: str               = Depends(get_current_user),
    db:   sqlite3.Connection = Depends(get_db),
) -> PaginatedResponse[NuclearOutagesOut]:
    return get_nuclearOutages(db, q.date_from, q.date_to, q.page, q.page_size)
