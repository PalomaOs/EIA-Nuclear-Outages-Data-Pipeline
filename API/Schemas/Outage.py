from typing import Generic, Optional, TypeVar
from pydantic import BaseModel, Field


T = TypeVar("T")

class DateRangeQuery(BaseModel):
    date_from: Optional[str] = Field(
        default=None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="Start date inclusive (YYYY-MM-DD).",
    )
    date_to: Optional[str] = Field(
        default=None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="End date inclusive (YYYY-MM-DD).",
    )

class PaginationQuery(BaseModel):
    page:      int = Field(default=1,  ge=1,             description="Page number (1-based).")
    page_size: int = Field(default=50, ge=1,   le=500,   description="Records per page.")

class GeneratorQuery(DateRangeQuery, PaginationQuery):
    facility_id:    Optional[int] = Field(default=None, description="Filter by numeric facility ID.")
    generator_name: Optional[str] = Field(default=None, description="Filter by generator name.")

class NuclearQuery(DateRangeQuery, PaginationQuery):
    pass

class GeneratorOutageOut(BaseModel):
    period: str
    facilityId: int
    facilityName: str
    generatorName: str
    capacity: Optional[float]
    outage: Optional[float]
    percentOutage: Optional[float]

    model_config = {"from_attributes": True}

class FacilityOut(BaseModel):
    facilityId: int
    facilityName: str

class NuclearOutagesOut (BaseModel):
    period: str
    capacity: Optional[float]
    outage: Optional[float]
    percentOutage: Optional[float]

    model_config = {"from_attributes": True}

class PaginatedResponse(BaseModel, Generic[T]):
    total: int
    page: int
    page_size: int
    results: list[T]

