import json
import os
import uuid
import hmac
import hashlib
import base64
import secrets
import time
from datetime import datetime, timezone


RBAC = {
    "admin":       ["read", "create", "update", "delete", "manage_users"],
    "manager":     ["read", "create", "update", "delete"],
    "contributor": ["read", "create", "update"],
    "viewer":      ["read"],
}


def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def b64url_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode((s + padding).encode("ascii"))


def jwt_encode(payload: dict, secret: str, exp_seconds: int = 28800) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = dict(payload)
    payload.setdefault("iat", now)
    payload.setdefault("exp", now + exp_seconds)
    header_b = b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    payload_b = b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    to_sign = f"{header_b}.{payload_b}".encode()
    # ✅ FIXED: use hmac.new() correctly
    sig = hmac.new(secret.encode(), to_sign, hashlib.sha256).digest()
    return f"{header_b}.{payload_b}.{b64url_encode(sig)}"


def jwt_decode(token: str, secret: str) -> dict:
    try:
        header_b, payload_b, sig_b = token.split(".")
    except ValueError:
        raise ValueError("Invalid token format")
    to_sign = f"{header_b}.{payload_b}".encode()
    # ✅ FIXED: use hmac.new() correctly
    expected = hmac.new(secret.encode(), to_sign, hashlib.sha256).digest()
    if not hmac.compare_digest(expected, b64url_decode(sig_b)):
        raise ValueError("Invalid token signature")
    payload = json.loads(b64url_decode(payload_b))
    if "exp" in payload and int(time.time()) > int(payload["exp"]):
        raise ValueError("Token has expired")
    return payload


def hash_password(password: str) -> dict:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
    return {
        "salt": salt.hex(),
        "iterations": 100000,
        "hash": dk.hex(),
    }


def verify_password(stored: dict, password: str) -> bool:
    salt = bytes.fromhex(stored["salt"])
    iterations = int(stored.get("iterations", 100000))
    expected = bytes.fromhex(stored["hash"])
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return hmac.compare_digest(dk, expected)


def get_collection():
    host = os.environ.get("MONGO_HOST", "172.17.0.1")  # ✅ FIXED: localhost not host.docker.internal
    port = int(os.environ.get("MONGO_PORT", "27017"))
    user = os.environ.get("MONGO_USER", "")
    password = os.environ.get("MONGO_PASS", "")
    is_local = os.environ.get("IS_LOCAL", "true").lower() == "true"

    if is_local or not user:
        uri = f"mongodb://{host}:{port}"
    else:
        uri = (
            f"mongodb://{user}:{password}@{host}:{port}/"
            f"?tls=true&tlsAllowInvalidCertificates=true&retryWrites=false"
        )

    try:
        from pymongo import MongoClient
    except ImportError:
        raise RuntimeError("pymongo is not installed; please install it (pip install pymongo)")

    client = MongoClient(uri, serverSelectionTimeoutMS=5000)  # ✅ FIXED: added timeout
    db_name = os.environ.get("MONGO_NAME", "workshop")
    return client[db_name]["users"]


def res(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, default=str),
    }


def lambda_handler(event, context):
    method = event.get("httpMethod") or (event.get("requestContext") or {}).get("http", {}).get("method", "")
    path = event.get("path") or event.get("rawPath", "")

    try:
        users = get_collection()
        secret = os.environ.get("JWT_SECRET", "workshop-secret-key")

        # REGISTER
        if method == "POST" and ("register" in path):
            body = json.loads(event.get("body") or "{}")
            username = (body.get("username") or "").strip()
            password = body.get("password") or ""
            role = (body.get("role") or "viewer").strip()

            errors = []
            if not username:
                errors.append("username is required")
            if not password or len(password) < 8:
                errors.append("password must be at least 8 characters")
            if role not in RBAC:
                errors.append(f"role must be one of: {', '.join(RBAC.keys())}")
            if errors:
                return res(400, {"errors": errors})

            if users.find_one({"username": username}):
                return res(400, {"error": "Username already exists"})

            pwd = hash_password(password)
            now = datetime.now(timezone.utc).isoformat()
            doc = {
                "_id": str(uuid.uuid4()),
                "username": username,
                "salt": pwd["salt"],
                "pwd_hash": pwd["hash"],
                "iterations": pwd["iterations"],
                "role": role,
                "permissions": RBAC[role],
                "created_at": now,
                "updated_at": now,
            }
            users.insert_one(doc)
            return res(201, {
                "id": doc["_id"],
                "username": doc["username"],
                "role": doc["role"],
                "permissions": doc["permissions"],
            })

        # LOGIN
        elif method == "POST" and ("login" in path):
            body = json.loads(event.get("body") or "{}")
            username = (body.get("username") or "").strip()
            password = body.get("password") or ""

            if not username or not password:
                return res(400, {"error": "username and password are required"})

            user = users.find_one({"username": username})
            if not user:
                return res(401, {"error": "Invalid credentials"})

            stored = {
                "salt": user.get("salt"),
                "hash": user.get("pwd_hash"),
                "iterations": user.get("iterations", 100000)
            }
            if not verify_password(stored, password):
                return res(401, {"error": "Invalid credentials"})

            token = jwt_encode({
                "sub": user["_id"],
                "username": user["username"],
                "role": user.get("role"),
                "permissions": user.get("permissions", []),
            }, secret)

            return res(200, {
                "token": token,
                "user": {
                    "id": user["_id"],
                    "username": user["username"],
                    "role": user.get("role"),
                    "permissions": user.get("permissions", []),
                },
            })

        # GET CURRENT USER
        elif method == "GET" and ("me" in path):
            headers = event.get("headers") or {}
            auth = headers.get("Authorization") or headers.get("authorization") or ""
            if not auth.startswith("Bearer "):
                return res(401, {"error": "Missing or invalid Authorization header"})
            token = auth.split(" ", 1)[1].strip()
            try:
                payload = jwt_decode(token, secret)
            except ValueError as e:
                return res(401, {"error": str(e)})
            user = users.find_one({"_id": payload.get("sub")})
            if not user:
                return res(404, {"error": "User not found"})
            return res(200, {
                "id": user["_id"],
                "username": user["username"],
                "role": user.get("role"),
                "permissions": user.get("permissions", []),
            })

        else:
            return res(404, {"error": "Not found"})

    except Exception as e:
        return res(500, {"error": str(e)})