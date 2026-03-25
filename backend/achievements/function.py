import json
import os
import re
import uuid
import base64
import hmac as _hmac
import hashlib as _hashlib
import time as _time
from datetime import datetime, timezone

# Import pymongo lazily inside get_db to avoid import-time crashes

def get_db(name):
    host = os.environ.get("MONGO_HOST", "host.docker.internal")
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

    client = MongoClient(uri)
    db_name = os.environ.get("MONGO_NAME", "workshop")
    return client[db_name][name]


def res(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, default=str),
    }


def serialize(doc):
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


MONTH_PATTERN = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def _b64url_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode((s + padding).encode("ascii"))


def verify_token(event: dict):
    """Return (payload, None) on success or (None, error_response) on failure."""
    secret = os.environ.get("JWT_SECRET", "workshop-secret-key")
    headers = event.get("headers") or {}
    auth = headers.get("Authorization") or headers.get("authorization") or ""
    if not auth.startswith("Bearer "):
        return None, res(401, {"error": "Missing or invalid Authorization header"})
    token = auth.split(" ", 1)[1].strip()
    try:
        header_b, payload_b, sig_b = token.split(".")
    except ValueError:
        return None, res(401, {"error": "Invalid token format"})
    to_sign = f"{header_b}.{payload_b}".encode()
    expected = _hmac.new(secret.encode(), to_sign, _hashlib.sha256).digest()
    if not _hmac.compare_digest(expected, _b64url_decode(sig_b)):
        return None, res(401, {"error": "Invalid token signature"})
    payload = json.loads(_b64url_decode(payload_b))
    if "exp" in payload and int(_time.time()) > int(payload["exp"]):
        return None, res(401, {"error": "Token has expired"})
    return payload, None


_REQUIRED_PERMISSION = {"GET": "read", "POST": "create", "PUT": "update", "DELETE": "delete"}


def check_permission(payload: dict, method: str):
    perm = _REQUIRED_PERMISSION.get(method)
    if perm and perm not in (payload.get("permissions") or []):
        return res(403, {"error": f"Insufficient permissions: '{perm}' required"})
    return None


def lambda_handler(event, context):
    method = event.get("httpMethod") or (event.get("requestContext") or {}).get("http", {}).get("method", "")
    path_params = event.get("pathParameters") or {}
    if not path_params:
        raw_path = event.get("rawPath", "")
        parts = [p for p in raw_path.strip("/").split("/") if p]
        if parts:
            path_params = {"id": parts[0]}
    query_params = event.get("queryStringParameters") or {}
    record_id = path_params.get("id")

    try:
        token_payload, token_err = verify_token(event)
        if token_err:
            return token_err
        perm_err = check_permission(token_payload, method)
        if perm_err:
            return perm_err

        achievements = get_db("achievements")
        teams = get_db("teams")

        # CREATE
        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            errors = []
            if not body.get("team_id", "").strip():
                errors.append("team_id is required")
            if not body.get("month", "").strip():
                errors.append("month is required (format: YYYY-MM)")
            elif not MONTH_PATTERN.match(body["month"]):
                errors.append("month must be in YYYY-MM format")
            if not body.get("description", "").strip():
                errors.append("description is required")
            if errors:
                return res(400, {"errors": errors})

            if not teams.find_one({"_id": body["team_id"]}):
                return res(400, {"error": "team_id does not reference a valid team"})

            now = datetime.now(timezone.utc).isoformat()
            doc = {
                "_id": str(uuid.uuid4()),
                "team_id": body["team_id"],
                "month": body["month"],
                "description": body["description"].strip(),
                "metrics": body.get("metrics"),
                "created_at": now,
                "updated_at": now,
            }
            achievements.insert_one(doc)
            return res(201, serialize(doc))

        # LIST ALL with optional filters
        elif method == "GET" and not record_id:
            query = {}
            if query_params.get("team_id"):
                query["team_id"] = query_params["team_id"]
            if query_params.get("month"):
                query["month"] = query_params["month"]
            docs = list(achievements.find(query))
            return res(200, [serialize(d) for d in docs])

        # GET BY ID
        elif method == "GET" and record_id:
            doc = achievements.find_one({"_id": record_id})
            if not doc:
                return res(404, {"error": "Achievement not found"})
            return res(200, serialize(doc))

        # UPDATE
        elif method == "PUT":
            if not record_id:
                return res(400, {"error": "ID is required"})
            body = json.loads(event.get("body") or "{}")
            if not achievements.find_one({"_id": record_id}):
                return res(404, {"error": "Achievement not found"})
            updates = {}
            if "team_id" in body:
                if not teams.find_one({"_id": body["team_id"]}):
                    return res(400, {"error": "team_id does not reference a valid team"})
                updates["team_id"] = body["team_id"]
            if "month" in body:
                if not MONTH_PATTERN.match(body["month"]):
                    return res(400, {"error": "month must be in YYYY-MM format"})
                updates["month"] = body["month"]
            if "description" in body:
                updates["description"] = body["description"].strip()
            if "metrics" in body:
                updates["metrics"] = body["metrics"]
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            achievements.update_one({"_id": record_id}, {"$set": updates})
            updated = achievements.find_one({"_id": record_id})
            return res(200, serialize(updated))

        # DELETE
        elif method == "DELETE":
            if not record_id:
                return res(400, {"error": "ID is required"})
            if not achievements.find_one({"_id": record_id}):
                return res(404, {"error": "Achievement not found"})
            achievements.delete_one({"_id": record_id})
            return res(204, {})

        else:
            return res(405, {"error": "Method not allowed"})

    except Exception as e:
        return res(500, {"error": str(e)})