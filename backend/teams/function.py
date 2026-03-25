import json
import os
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
    record_id = path_params.get("id")

    try:
        token_payload, token_err = verify_token(event)
        if token_err:
            return token_err
        perm_err = check_permission(token_payload, method)
        if perm_err:
            return perm_err

        teams = get_db("teams")
        individuals = get_db("individuals")

        # CREATE
        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            errors = []
            if not body.get("name", "").strip():
                errors.append("name is required")
            if not body.get("location", "").strip():
                errors.append("location is required")
            if not body.get("leader_id", "").strip():
                errors.append("leader_id is required")
            if errors:
                return res(400, {"errors": errors})

            if not individuals.find_one({"_id": body["leader_id"]}):
                return res(400, {"error": "leader_id does not reference a valid individual"})

            member_ids = body.get("member_ids", [])
            for mid in member_ids:
                if not individuals.find_one({"_id": mid}):
                    return res(400, {"error": f"member_id '{mid}' does not reference a valid individual"})

            now = datetime.now(timezone.utc).isoformat()
            doc = {
                "_id": str(uuid.uuid4()),
                "name": body["name"].strip(),
                "location": body["location"].strip(),
                "leader_id": body["leader_id"],
                "member_ids": member_ids,
                "org_id": body.get("org_id", "").strip() or None,
                "created_at": now,
                "updated_at": now,
            }
            teams.insert_one(doc)
            return res(201, serialize(doc))

        # LIST ALL
        elif method == "GET" and not record_id:
            docs = list(teams.find())
            result = []
            for doc in docs:
                team = serialize(doc)
                leader = individuals.find_one({"_id": team["leader_id"]})
                team["leader"] = serialize(leader) if leader else None
                team["members"] = [
                    serialize(individuals.find_one({"_id": mid}))
                    for mid in team.get("member_ids", [])
                ]
                result.append(team)
            return res(200, result)

        # GET BY ID
        elif method == "GET" and record_id:
            doc = teams.find_one({"_id": record_id})
            if not doc:
                return res(404, {"error": "Team not found"})
            team = serialize(doc)
            leader = individuals.find_one({"_id": team["leader_id"]})
            team["leader"] = serialize(leader) if leader else None
            team["members"] = [
                serialize(individuals.find_one({"_id": mid}))
                for mid in team.get("member_ids", [])
            ]
            return res(200, team)

        # UPDATE
        elif method == "PUT":
            if not record_id:
                return res(400, {"error": "ID is required"})
            body = json.loads(event.get("body") or "{}")
            if not teams.find_one({"_id": record_id}):
                return res(404, {"error": "Team not found"})
            updates = {}
            if "name" in body:
                updates["name"] = body["name"].strip()
            if "location" in body:
                updates["location"] = body["location"].strip()
            if "leader_id" in body:
                if not individuals.find_one({"_id": body["leader_id"]}):
                    return res(400, {"error": "leader_id does not reference a valid individual"})
                updates["leader_id"] = body["leader_id"]
            if "member_ids" in body:
                for mid in body["member_ids"]:
                    if not individuals.find_one({"_id": mid}):
                        return res(400, {"error": f"member_id '{mid}' does not reference a valid individual"})
                updates["member_ids"] = body["member_ids"]
            if "org_id" in body:
                updates["org_id"] = body["org_id"].strip() or None
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            teams.update_one({"_id": record_id}, {"$set": updates})
            updated = teams.find_one({"_id": record_id})
            return res(200, serialize(updated))

        # DELETE
        elif method == "DELETE":
            if not record_id:
                return res(400, {"error": "ID is required"})
            if not teams.find_one({"_id": record_id}):
                return res(404, {"error": "Team not found"})
            teams.delete_one({"_id": record_id})
            return res(204, {})

        else:
            return res(405, {"error": "Method not allowed"})

    except Exception as e:
        return res(500, {"error": str(e)})