from fastapi import APIRouter, HTTPException, status

from Core.Config import settings
from Core.Security import verify_password, create_access_token
from Schemas.Token import TokenRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

#Username and hashed password are read from .env (Settings).
@router.post("/token", response_model=TokenResponse)
def login(body: TokenRequest) -> TokenResponse:
    
    credentials_invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if body.username != settings.app_username:
        raise credentials_invalid

    if not verify_password(body.password, settings.app_password):
        raise credentials_invalid

    token = create_access_token(subject=body.username)
    return TokenResponse(access_token=token)