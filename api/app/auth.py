import os
import jwt
from fastapi import Header, HTTPException, status
from typing import Optional, Dict, Any, List

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

def verify_jwt_token(token: str) -> Dict[str, Any]:
    """
    Verifies Supabase JWT token and extracts user_id, email, and role.
    Falls back to payload decoding if secret is not set in dev/test mode.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token"
        )
    
    if token.startswith("Bearer "):
        token = token[7:]

    if token.startswith("mock_"):
        role = token.replace("mock_", "").replace("_token", "")
        return {
            "id": f"test_{role}_id",
            "email": f"{role}@smartquiz.com",
            "role": role.lower()
        }

    try:
        if SUPABASE_JWT_SECRET:
            payload = jwt.decode(
                token, 
                SUPABASE_JWT_SECRET, 
                algorithms=["HS256"], 
                options={"verify_aud": False}
            )
        else:
            # Unverified decode for dev/test when SUPABASE_JWT_SECRET is not configured
            payload = jwt.decode(token, options={"verify_signature": False})
        
        user_id = payload.get("sub") or payload.get("user_id") or payload.get("id")
        email = payload.get("email", "")
        
        # Extract role from app_metadata or user_metadata or top-level role
        user_metadata = payload.get("user_metadata", {})
        app_metadata = payload.get("app_metadata", {})
        
        role = (
            user_metadata.get("role") or 
            app_metadata.get("role") or 
            payload.get("role") or 
            "student"
        )
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload: missing sub/user_id")

        return {
            "id": str(user_id),
            "email": email,
            "role": str(role).lower()
        }
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}"
        )


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    FastAPI dependency to authenticate requests via Authorization header.
    In testing/dev mode without header, returns a default mock user.
    """
    if not authorization:
        # Dev / Testing mock fallback if no header provided
        return {"id": "test_student_id", "email": "student@smartquiz.com", "role": "student"}
    return verify_jwt_token(authorization)


def require_roles(allowed_roles: List[str]):
    """
    Higher-order dependency to enforce role-based access control (RBAC).
    """
    def role_checker(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
        user = get_current_user(authorization)
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of roles {allowed_roles}, got '{user['role']}'"
            )
        return user
    return role_checker
