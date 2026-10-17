from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    username: str
    email: EmailStr
    avatar_url: str | None = None


class GoogleAuthRequest(BaseModel):
    credential: str | None = None
    email: EmailStr | None = None
    name: str | None = None
    picture: str | None = None