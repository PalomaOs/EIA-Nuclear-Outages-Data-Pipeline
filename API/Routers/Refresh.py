from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool

from Core.Dependencies import get_current_user

router = APIRouter(prefix="/refresh", tags=["refresh"])


@router.post("")
async def trigger_refresh(
    _user: str = Depends(get_current_user),
) -> dict:
    from Services.RefreshService import run_refresh
    result = await run_in_threadpool(run_refresh)
    return result