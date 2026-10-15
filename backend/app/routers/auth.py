from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import models
from app.auth import hash_password, verify_password, create_access_token, verify_token
from app.database import SessionLocal
from app.schemas.auth import UserCreate, TokenResponse

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
        "email": existing_user.email
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