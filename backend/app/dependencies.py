from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import User
from backend.app.config import settings

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """
    Resolves the current authenticated user.
    - In local development / test mode: resolves a deterministic local user if no token is passed.
    - If a Bearer token is provided:
        * Checks for test tokens (e.g. Bearer test-user-id) in dev mode.
        * In production mode with Supabase secret configured, verifies JWT signature and claims.
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()

    if not token:
        if settings.LOCAL_AUTH_DEV_MODE:
            # Deterministic default local user
            default_email = "local-dev@mindtrace.local"
            user = db.query(User).filter(User.email == default_email).first()
            if not user:
                user = User(
                    id="usr_local_dev_001",
                    email=default_email,
                    profile_name="Local Developer"
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # If in test/dev mode with a mock token like test_user_xxx
    if settings.LOCAL_AUTH_DEV_MODE and (token.startswith("test_") or token.startswith("usr_")):
        email = f"{token}@mindtrace.local"
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(id=token, email=email, profile_name="Test User")
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    # Production JWT Verification (when SUPABASE_JWT_SECRET is configured)
    if settings.SUPABASE_JWT_SECRET:
        try:
            import jwt
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
            user_id = payload.get("sub")
            email = payload.get("email") or f"{user_id}@supabase.auth"
            if not user_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject.")

            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                user = User(id=user_id, email=email, profile_name="Supabase User")
                db.add(user)
                db.commit()
                db.refresh(user)
            return user
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Fallback in local dev mode when token doesn't match
    if settings.LOCAL_AUTH_DEV_MODE:
        user = db.query(User).filter(User.id == "usr_local_dev_001").first()
        if user:
            return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or unverified authentication credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
