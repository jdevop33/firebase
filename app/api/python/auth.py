from typing import Optional, List
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
import os
from datetime import datetime
from prisma import Prisma

security = HTTPBearer()
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_PEM_PUBLIC_KEY = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0f3qKl6NqPNHYpWGYGQV
YsQwOJe9yZ9RHO/VF8z3QvhZc1Fz0Jk8nxeqwgKDxZ0IjP4z7KqVmtGZqPP4Dsog
x5kJXx1Edx9zO9tPqy4zBx1tL8Bv/9zckG4Qc5kHxPR6HJ8Ry5pTzwXdRyYYbqz9
xK9QCm9OZx9Z4xA4kF0x9J4XrM6x8qE9jqZKEBqPCkXEKY5mX5Q8bWwZ8VZ4Ry9D
hGpI4UJy5UYUzX+RlKUqhPYZVaUxXl5tZrCJz1ub6U1VGz2qJz8xO+KhN1Z7oXQY
wGEKo1ph9GqQZE0HkxQE4M4ghrUy0qKQEk5YLlXX6Rk7qwIDAQAB
-----END PUBLIC KEY-----"""

prisma = Prisma()

class AuthError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=401, detail=detail)

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token,
            CLERK_PEM_PUBLIC_KEY,
            algorithms=["RS256"],
            audience="bolt-2.0",
            options={"verify_exp": True}
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthError("Token has expired")
    except jwt.InvalidTokenError:
        raise AuthError("Invalid token")

async def get_current_user(payload: dict = Depends(verify_token)) -> dict:
    try:
        # Get user from database
        user = await prisma.user.find_unique(
            where={"clerk_id": payload.get("sub")}
        )
        
        if not user:
            raise AuthError("User not found")
            
        return {
            "user_id": user.clerk_id,
            "email": user.email,
            "role": user.role
        }
    except Exception as e:
        raise AuthError(f"Could not validate user: {str(e)}")

def check_roles(allowed_roles: List[str]):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to perform this action"
            )
        return user
    return role_checker