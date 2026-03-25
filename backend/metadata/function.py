import json
import os
import uuid
import base64
import hmac as _hmac
import hashlib as _hashlib
import time as _time
from datetime import datetime, timezone

# Import pymongo lazily inside get_collection to avoid import-time crashes

def get_collection():
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
    return client[db_name]["metadata"]


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


VALID_CATEGORIES = {"individual", "team", "organization"}


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
        if len(parts) >= 3:
            path_params = {"id": parts[-1]}
    record_id = path_params.get("id")

    try:
        token_payload, token_err = verify_token(event)
        if token_err:
            return token_err
        perm_err = check_permission(token_payload, method)
        if perm_err:
            return perm_err

        collection = get_collection()

        # CREATE
        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            errors = []
            if not body.get("category", "").strip():
                errors.append("category is required")
            elif body["category"] not in VALID_CATEGORIES:
                errors.append(f"category must be one of: {', '.join(VALID_CATEGORIES)}")
            if not body.get("key", "").strip():
                errors.append("key is required")
            if not body.get("value", "").strip():
                errors.append("value is required")
            if errors:
                return res(400, {"errors": errors})

            existing = collection.find_one({
                "category": body["category"],
                "key": body["key"].strip()
            })
            if existing:
                return res(400, {"error": f"Metadata with category '{body['category']}' and key '{body['key']}' already exists"})

            now = datetime.now(timezone.utc).isoformat()
            doc = {
                "_id": str(uuid.uuid4()),
                "category": body["category"],
                "key": body["key"].strip(),
                "value": body["value"].strip(),
                "created_at": now,
                "updated_at": now,
            }
            collection.insert_one(doc)
            return res(201, serialize(doc))

        # LIST ALL organised by category
        elif method == "GET" and not record_id:
            docs = list(collection.find())
            organized = {}
            for doc in docs:
                item = serialize(doc)
                cat = item["category"]
                if cat not in organized:
                    organized[cat] = []
                organized[cat].append(item)
            return res(200, organized)

        # GET BY ID
        elif method == "GET" and record_id:
            doc = collection.find_one({"_id": record_id})
            if not doc:
                return res(404, {"error": "Metadata not found"})
            return res(200, serialize(doc))

        # UPDATE
        elif method == "PUT":
            if not record_id:
                return res(400, {"error": "ID is required"})
            body = json.loads(event.get("body") or "{}")
            existing = collection.find_one({"_id": record_id})
            if not existing:
                return res(404, {"error": "Metadata not found"})
            updates = {}
            if "category" in body:
                if body["category"] not in VALID_CATEGORIES:
                    return res(400, {"error": f"category must be one of: {', '.join(VALID_CATEGORIES)}"})
                updates["category"] = body["category"]
            if "key" in body:
                updates["key"] = body["key"].strip()
            if "value" in body:
                updates["value"] = body["value"].strip()
            check_category = updates.get("category", existing["category"])
            check_key = updates.get("key", existing["key"])
            conflict = collection.find_one({
                "category": check_category,
                "key": check_key,
                "_id": {"$ne": record_id}
            })
            if conflict:
                return res(400, {"error": f"Metadata with category '{check_category}' and key '{check_key}' already exists"})
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            collection.update_one({"_id": record_id}, {"$set": updates})
            updated = collection.find_one({"_id": record_id})
            return res(200, serialize(updated))

        # DELETE
        elif method == "DELETE":
            if not record_id:
                return res(400, {"error": "ID is required"})
            if not collection.find_one({"_id": record_id}):
                return res(404, {"error": "Metadata not found"})
            collection.delete_one({"_id": record_id})
            return res(204, {})

        else:
            return res(405, {"error": "Method not allowed"})

    except Exception as e:
        return res(500, {"error": str(e)})