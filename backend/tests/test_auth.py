from app.auth import get_password_hash, verify_password, create_access_token
from app.config import settings
import jwt

def test_password_hashing():
    pwd = "my-secure-password"
    hashed = get_password_hash(pwd)
    
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrong-pwd", hashed) is False

def test_jwt_token_creation():
    data = {"sub": "user@cspm.local", "role": "admin"}
    token = create_access_token(data)
    
    # Decode token
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    
    assert decoded["sub"] == "user@cspm.local"
    assert decoded["role"] == "admin"
    assert "exp" in decoded
