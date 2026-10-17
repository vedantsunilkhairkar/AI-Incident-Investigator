import json
import logging
import secrets
import urllib.request
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import models
from app.auth import hash_password, verify_password, create_access_token, verify_token
from app.database import SessionLocal
from app.schemas.auth import UserCreate, TokenResponse, GoogleAuthRequest

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/register")
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    clean_username = user.username.strip()
    clean_email = str(user.email).strip().lower()

    if not clean_username:
        raise HTTPException(
            status_code=400,
            detail="Username cannot be empty"
        )

    existing_user = (
        db.query(models.User)
        .filter(models.User.username == clean_username)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    existing_email = (
        db.query(models.User)
        .filter(models.User.email.ilike(clean_email))
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = models.User(
        username=clean_username,
        email=clean_email,
        password_hash=hash_password(user.password),
        role="user"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "username": new_user.username,
        "email": new_user.email
    }


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    identifier = form_data.username.strip()

    # Support login with either username or email
    existing_user = (
        db.query(models.User)
        .filter(
            (models.User.username == identifier) |
            (models.User.email.ilike(identifier))
        )
        .first()
    )

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username/email or password"
        )

    if not verify_password(
        form_data.password,
        existing_user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username/email or password"
        )

    access_token = create_access_token(
        data={
            "sub": existing_user.username,
            "role": existing_user.role
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": existing_user.username,
        "email": existing_user.email,
        "avatar_url": existing_user.avatar_url
    }


@router.post("/google", response_model=TokenResponse)
def google_auth(
    payload: GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    email = None
    name = None
    picture = None

    # 1. If Google ID Token credential was passed, verify via Google's tokeninfo API
    if payload.credential:
        try:
            req = urllib.request.Request(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.credential}",
                headers={"User-Agent": "AI-Incident-Investigator/1.0"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                google_data = json.loads(response.read().decode())
                email = google_data.get("email")
                name = google_data.get("name")
                picture = google_data.get("picture")
        except Exception as e:
            logger.warning("Google token verification via API failed: %s", e)

    # 2. Fallback to direct payload if provided (for instant one-click or client profile)
    if not email and payload.email:
        email = str(payload.email).strip().lower()
        name = payload.name
        picture = payload.picture

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Unable to retrieve verified email from Google authentication"
        )

    clean_email = email.strip().lower()

    # 3. Check if user already exists
    user = (
        db.query(models.User)
        .filter(models.User.email.ilike(clean_email))
        .first()
    )

    if not user:
        # Generate clean unique username
        base_username = (clean_email.split("@")[0] or "user").replace(".", "_").replace("-", "_")
        candidate_username = base_username

        counter = 1
        while db.query(models.User).filter(models.User.username == candidate_username).first():
            candidate_username = f"{base_username}_{counter}"
            counter += 1

        random_password = secrets.token_urlsafe(32)
        user = models.User(
            username=candidate_username,
            email=clean_email,
            password_hash=hash_password(random_password),
            role="user",
            auth_provider="google",
            avatar_url=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update avatar if provided
        if picture and not user.avatar_url:
            user.avatar_url = picture
            db.commit()
            db.refresh(user)

    # 4. Generate app JWT access token
    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "email": user.email,
        "avatar_url": user.avatar_url
    }


@router.patch("/email")
def change_email(
    new_email: str,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    username = verify_token(token)

    if not username:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    existing_user = (
        db.query(models.User)
        .filter(models.User.username == username)
        .first()
    )

    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    existing_email = (
        db.query(models.User)
        .filter(models.User.email == new_email)
        .first()
    )

    if existing_email and existing_email.username != username:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    existing_user.email = new_email

    db.commit()
    db.refresh(existing_user)

    return {
        "message": "Email updated successfully",
        "username": existing_user.username,
        "email": existing_user.email
    }