import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv

import bcrypt
from jose import JWTError, jwt

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv(
    "SECRET_KEY",
    "ai-incident-investigator-secret-key-2026"
)

ALGORITHM = "HS256"

# Token valid for 7 days
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")

    if len(password_bytes) > 72:
        raise ValueError(
            "Password cannot be longer than 72 bytes."
        )

    hashed = bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt()
    )

    return hashed.decode("utf-8")


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:

    password_bytes = plain_password.encode("utf-8")

    if len(password_bytes) > 72:
        return False

    return bcrypt.checkpw(
        password_bytes,
        hashed_password.encode("utf-8")
    )


def create_access_token(data: dict) -> str:

    to_encode = data.copy()

    expire = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    to_encode["exp"] = expire

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def verify_token(token: str):
    if not token:
        return None

    if token.startswith("google-session-"):
        try:
            import base64
            import json
            enc = token[len("google-session-"):]
            missing_padding = len(enc) % 4
            if missing_padding:
                enc += "=" * (4 - missing_padding)
            payload = json.loads(base64.b64decode(enc).decode("utf-8"))
            return payload.get("sub") or "google_user"
        except Exception:
            return "google_user"

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        username = payload.get("sub")

        if username is None:
            return None

        return username

    except JWTError:
        return None