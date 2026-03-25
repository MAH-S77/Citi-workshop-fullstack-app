import json
import pytest
from unittest.mock import patch, MagicMock


def make_event(method="GET", body=None, path="/", path_params=None, query=None, headers=None):
    return {
        "httpMethod": method,
        "body": json.dumps(body) if body is not None else None,
        "path": path,
        "pathParameters": path_params or {},
        "queryStringParameters": query or {},
        "headers": headers or {},
    }


# ── INDIVIDUALS ───────────────────────────────────────────────────────────────

@patch("backend.individuals.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.individuals.function.get_collection")
def test_create_success(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.insert_one = MagicMock()
    mock_get_col.return_value = col
    from backend.individuals import function as m
    resp = m.lambda_handler(make_event("POST", {"name": "Alice", "location": "Belfast", "employment_type": "full-time"}), None)
    assert resp["statusCode"] == 201
    assert json.loads(resp["body"])["name"] == "Alice"


@patch("backend.individuals.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.individuals.function.get_collection")
def test_create_missing_name(mock_get_col, mock_verify_token):
    col = MagicMock()
    mock_get_col.return_value = col
    from backend.individuals import function as m
    resp = m.lambda_handler(make_event("POST", {"location": "Belfast", "employment_type": "full-time"}), None)
    assert resp["statusCode"] == 400
    assert "name is required" in json.loads(resp["body"]).get("errors", [])


@patch("backend.individuals.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.individuals.function.get_collection")
def test_create_invalid_employment_type(mock_get_col, mock_verify_token):
    col = MagicMock()
    mock_get_col.return_value = col
    from backend.individuals import function as m
    resp = m.lambda_handler(make_event("POST", {"name": "Bob", "location": "London", "employment_type": "intern"}), None)
    assert resp["statusCode"] == 400


@patch("backend.individuals.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.individuals.function.get_collection")
def test_list_all(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find.return_value = [
        {"_id": "1", "name": "Alice", "location": "Belfast", "employment_type": "full-time", "created_at": "", "updated_at": ""},
        {"_id": "2", "name": "Bob",   "location": "London",  "employment_type": "contractor", "created_at": "", "updated_at": ""},
    ]
    mock_get_col.return_value = col
    from backend.individuals import function as m
    resp = m.lambda_handler(make_event("GET", path="/individuals"), None)
    assert resp["statusCode"] == 200
    assert len(json.loads(resp["body"])) == 2


@patch("backend.individuals.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.individuals.function.get_collection")
def test_get_by_id_not_found(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find_one.return_value = None
    mock_get_col.return_value = col
    from backend.individuals import function as m
    resp = m.lambda_handler(make_event("GET", path="/individuals/1", path_params={"id": "missing"}), None)
    assert resp["statusCode"] == 404


@patch("backend.individuals.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.individuals.function.get_collection")
def test_delete_success(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find_one.return_value = {"_id": "1", "name": "Alice"}
    mock_get_col.return_value = col
    from backend.individuals import function as m
    resp = m.lambda_handler(make_event("DELETE", path_params={"id": "1"}), None)
    assert resp["statusCode"] == 204


@patch("backend.individuals.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.individuals.function.get_collection")
def test_delete_not_found(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find_one.return_value = None
    mock_get_col.return_value = col
    from backend.individuals import function as m
    resp = m.lambda_handler(make_event("DELETE", path_params={"id": "missing"}), None)
    assert resp["statusCode"] == 404


@patch("backend.individuals.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.individuals.function.get_collection")
def test_method_not_allowed(mock_get_col, mock_verify_token):
    col = MagicMock()
    mock_get_col.return_value = col
    from backend.individuals import function as m
    resp = m.lambda_handler(make_event("PATCH"), None)
    assert resp["statusCode"] == 405


# ── ACHIEVEMENTS ──────────────────────────────────────────────────────────────

def _ach_mock(ach_col, teams_col):
    def side(name):
        if name == "achievements":
            return ach_col
        if name == "teams":
            return teams_col
        return MagicMock()
    return side


@patch("backend.achievements.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.achievements.function.get_db")
def test_achievements_create_success(mock_get_db, mock_verify_token):
    ach = MagicMock()
    teams = MagicMock()
    teams.find_one.return_value = {"_id": "team1"}
    ach.insert_one = MagicMock()
    mock_get_db.side_effect = _ach_mock(ach, teams)
    from backend.achievements import function as m
    resp = m.lambda_handler(make_event("POST", {"team_id": "team1", "month": "2024-05", "description": "Great work"}), None)
    assert resp["statusCode"] == 201


@patch("backend.achievements.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.achievements.function.get_db")
def test_achievements_create_invalid_month(mock_get_db, mock_verify_token):
    ach = MagicMock()
    teams = MagicMock()
    mock_get_db.side_effect = _ach_mock(ach, teams)
    from backend.achievements import function as m
    resp = m.lambda_handler(make_event("POST", {"team_id": "t", "month": "2024-13", "description": "X"}), None)
    assert resp["statusCode"] == 400


@patch("backend.achievements.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.achievements.function.get_db")
def test_achievements_create_invalid_team(mock_get_db, mock_verify_token):
    ach = MagicMock()
    teams = MagicMock()
    teams.find_one.return_value = None
    mock_get_db.side_effect = _ach_mock(ach, teams)
    from backend.achievements import function as m
    resp = m.lambda_handler(make_event("POST", {"team_id": "nope", "month": "2024-05", "description": "X"}), None)
    assert resp["statusCode"] == 400


# ── METADATA ──────────────────────────────────────────────────────────────────

@patch("backend.metadata.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.metadata.function.get_collection")
def test_metadata_create_success(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find_one.return_value = None
    col.insert_one = MagicMock()
    mock_get_col.return_value = col
    from backend.metadata import function as m
    resp = m.lambda_handler(make_event("POST", {"category": "team", "key": "size", "value": "small"}), None)
    assert resp["statusCode"] == 201


@patch("backend.metadata.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.metadata.function.get_collection")
def test_metadata_create_duplicate_key(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find_one.return_value = {"_id": "existing"}
    mock_get_col.return_value = col
    from backend.metadata import function as m
    resp = m.lambda_handler(make_event("POST", {"category": "team", "key": "size", "value": "large"}), None)
    assert resp["statusCode"] == 400


@patch("backend.metadata.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.metadata.function.get_collection")
def test_metadata_create_invalid_category(mock_get_col, mock_verify_token):
    col = MagicMock()
    mock_get_col.return_value = col
    from backend.metadata import function as m
    resp = m.lambda_handler(make_event("POST", {"category": "invalid", "key": "k", "value": "v"}), None)
    assert resp["statusCode"] == 400


@patch("backend.metadata.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.metadata.function.get_collection")
def test_metadata_list_organised_by_category(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find.return_value = [
        {"_id": "1", "category": "team",       "key": "size",  "value": "small",  "created_at": "", "updated_at": ""},
        {"_id": "2", "category": "individual", "key": "level", "value": "senior", "created_at": "", "updated_at": ""},
        {"_id": "3", "category": "individual", "key": "dept",  "value": "eng",    "created_at": "", "updated_at": ""},
    ]
    mock_get_col.return_value = col
    from backend.metadata import function as m
    resp = m.lambda_handler(make_event("GET", path="/metadata"), None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "team" in body
    assert "individual" in body
    assert len(body["individual"]) == 2


# ── AUTH ──────────────────────────────────────────────────────────────────────

@patch("backend.auth.function.get_collection")
def test_auth_register_success(mock_get_col):
    col = MagicMock()
    col.find_one.return_value = None
    col.insert_one = MagicMock()
    mock_get_col.return_value = col
    from backend.auth import function as m
    resp = m.lambda_handler(make_event("POST", {"username": "alice", "password": "password123", "role": "viewer"}, path="/auth/register"), None)
    assert resp["statusCode"] == 201
    body = json.loads(resp["body"])
    assert body["username"] == "alice"
    assert body["role"] == "viewer"
    assert "id" in body


@patch("backend.auth.function.get_collection")
def test_auth_register_missing_fields(mock_get_col):
    col = MagicMock()
    mock_get_col.return_value = col
    from backend.auth import function as m
    resp = m.lambda_handler(make_event("POST", {"username": "", "password": "short"}, path="/auth/register"), None)
    assert resp["statusCode"] == 400
    errors = json.loads(resp["body"]).get("errors", [])
    assert any("username" in e for e in errors)
    assert any("password" in e for e in errors)


@patch("backend.auth.function.get_collection")
def test_auth_register_duplicate_username(mock_get_col):
    col = MagicMock()
    col.find_one.return_value = {"_id": "existing"}
    mock_get_col.return_value = col
    from backend.auth import function as m
    resp = m.lambda_handler(make_event("POST", {"username": "alice", "password": "password123"}, path="/auth/register"), None)
    assert resp["statusCode"] == 400
    assert "already exists" in json.loads(resp["body"]).get("error", "")


@patch("backend.auth.function.get_collection")
def test_auth_login_success(mock_get_col):
    from backend.auth import function as m
    # Register to get a real hash
    pwd = m.hash_password("password123")
    col = MagicMock()
    col.find_one.return_value = {
        "_id": "user1",
        "username": "alice",
        "salt": pwd["salt"],
        "pwd_hash": pwd["hash"],
        "iterations": pwd["iterations"],
        "role": "viewer",
        "permissions": ["read"],
    }
    mock_get_col.return_value = col
    resp = m.lambda_handler(make_event("POST", {"username": "alice", "password": "password123"}, path="/auth/login"), None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "token" in body
    assert body["user"]["username"] == "alice"


@patch("backend.auth.function.get_collection")
def test_auth_login_wrong_password(mock_get_col):
    from backend.auth import function as m
    pwd = m.hash_password("password123")
    col = MagicMock()
    col.find_one.return_value = {
        "_id": "user1",
        "username": "alice",
        "salt": pwd["salt"],
        "pwd_hash": pwd["hash"],
        "iterations": pwd["iterations"],
        "role": "viewer",
        "permissions": ["read"],
    }
    mock_get_col.return_value = col
    resp = m.lambda_handler(make_event("POST", {"username": "alice", "password": "wrongpass"}, path="/auth/login"), None)
    assert resp["statusCode"] == 401


@patch("backend.auth.function.get_collection")
def test_auth_login_unknown_user(mock_get_col):
    col = MagicMock()
    col.find_one.return_value = None
    mock_get_col.return_value = col
    from backend.auth import function as m
    resp = m.lambda_handler(make_event("POST", {"username": "nobody", "password": "password123"}, path="/auth/login"), None)
    assert resp["statusCode"] == 401


@patch("backend.auth.function.get_collection")
def test_auth_me_success(mock_get_col):
    from backend.auth import function as m
    token = m.jwt_encode({"sub": "user1", "username": "alice", "role": "viewer", "permissions": ["read"]}, "workshop-secret-key")
    col = MagicMock()
    col.find_one.return_value = {"_id": "user1", "username": "alice", "role": "viewer", "permissions": ["read"]}
    mock_get_col.return_value = col
    resp = m.lambda_handler(make_event("GET", path="/auth/me", headers={"Authorization": f"Bearer {token}"}), None)
    assert resp["statusCode"] == 200
    assert json.loads(resp["body"])["username"] == "alice"


@patch("backend.auth.function.get_collection")
def test_auth_me_no_token(mock_get_col):
    col = MagicMock()
    mock_get_col.return_value = col
    from backend.auth import function as m
    resp = m.lambda_handler(make_event("GET", path="/auth/me"), None)
    assert resp["statusCode"] == 401


def test_individuals_no_token():
    from backend.individuals import function as m
    resp = m.lambda_handler(make_event("GET"), None)
    assert resp["statusCode"] == 401


def test_individuals_insufficient_permission():
    from backend.individuals import function as m
    # viewer has only "read", not "create"
    from backend.auth import function as auth_m
    token = auth_m.jwt_encode({"sub": "u1", "username": "viewer", "role": "viewer", "permissions": ["read"]}, "workshop-secret-key")
    resp = m.lambda_handler(make_event("POST", {"name": "Alice"}, headers={"Authorization": f"Bearer {token}"}), None)
    assert resp["statusCode"] == 403


# ── INDIVIDUALS EXTENDED ───────────────────────────────────────────────────────

@patch("backend.individuals.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.individuals.function.get_collection")
def test_get_individual_by_id(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find_one.return_value = {"_id": "1", "name": "Alice", "location": "Belfast", "employment_type": "full-time", "created_at": "", "updated_at": ""}
    mock_get_col.return_value = col
    from backend.individuals import function as m
    resp = m.lambda_handler(make_event("GET", path_params={"id": "1"}), None)
    assert resp["statusCode"] == 200
    assert json.loads(resp["body"])["name"] == "Alice"


@patch("backend.individuals.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.individuals.function.get_collection")
def test_update_individual_success(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find_one.side_effect = [
        {"_id": "1", "name": "Alice", "location": "Belfast", "employment_type": "full-time", "created_at": "", "updated_at": ""},
        {"_id": "1", "name": "Alice Updated", "location": "Dublin", "employment_type": "full-time", "created_at": "", "updated_at": ""},
    ]
    mock_get_col.return_value = col
    from backend.individuals import function as m
    resp = m.lambda_handler(make_event("PUT", {"name": "Alice Updated", "location": "Dublin"}, path_params={"id": "1"}), None)
    assert resp["statusCode"] == 200
    assert json.loads(resp["body"])["name"] == "Alice Updated"


@patch("backend.individuals.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.individuals.function.get_collection")
def test_update_individual_not_found(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find_one.return_value = None
    mock_get_col.return_value = col
    from backend.individuals import function as m
    resp = m.lambda_handler(make_event("PUT", {"name": "X"}, path_params={"id": "missing"}), None)
    assert resp["statusCode"] == 404


@patch("backend.individuals.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.individuals.function.get_collection")
def test_update_individual_invalid_employment_type(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find_one.return_value = {"_id": "1", "name": "Alice"}
    mock_get_col.return_value = col
    from backend.individuals import function as m
    resp = m.lambda_handler(make_event("PUT", {"employment_type": "intern"}, path_params={"id": "1"}), None)
    assert resp["statusCode"] == 400


# ── TEAMS ──────────────────────────────────────────────────────────────────────

def _teams_mock(teams_col, individuals_col):
    def side(name):
        if name == "teams":
            return teams_col
        if name == "individuals":
            return individuals_col
        return MagicMock()
    return side


@patch("backend.teams.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.teams.function.get_db")
def test_teams_create_success(mock_get_db, mock_verify_token):
    teams = MagicMock()
    individuals = MagicMock()
    individuals.find_one.return_value = {"_id": "ind1", "name": "Alice"}
    teams.insert_one = MagicMock()
    mock_get_db.side_effect = _teams_mock(teams, individuals)
    from backend.teams import function as m
    resp = m.lambda_handler(make_event("POST", {"name": "Alpha", "location": "Belfast", "leader_id": "ind1"}), None)
    assert resp["statusCode"] == 201
    assert json.loads(resp["body"])["name"] == "Alpha"


@patch("backend.teams.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.teams.function.get_db")
def test_teams_create_with_org_id(mock_get_db, mock_verify_token):
    teams = MagicMock()
    individuals = MagicMock()
    individuals.find_one.return_value = {"_id": "ind1", "name": "Alice"}
    teams.insert_one = MagicMock()
    mock_get_db.side_effect = _teams_mock(teams, individuals)
    from backend.teams import function as m
    resp = m.lambda_handler(make_event("POST", {"name": "Alpha", "location": "Belfast", "leader_id": "ind1", "org_id": "org1"}), None)
    assert resp["statusCode"] == 201
    assert json.loads(resp["body"])["org_id"] == "org1"


@patch("backend.teams.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.teams.function.get_db")
def test_teams_create_missing_fields(mock_get_db, mock_verify_token):
    teams = MagicMock()
    individuals = MagicMock()
    mock_get_db.side_effect = _teams_mock(teams, individuals)
    from backend.teams import function as m
    resp = m.lambda_handler(make_event("POST", {"name": "Alpha"}), None)
    assert resp["statusCode"] == 400
    errors = json.loads(resp["body"]).get("errors", [])
    assert any("location" in e for e in errors)
    assert any("leader_id" in e for e in errors)


@patch("backend.teams.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.teams.function.get_db")
def test_teams_create_invalid_leader(mock_get_db, mock_verify_token):
    teams = MagicMock()
    individuals = MagicMock()
    individuals.find_one.return_value = None
    mock_get_db.side_effect = _teams_mock(teams, individuals)
    from backend.teams import function as m
    resp = m.lambda_handler(make_event("POST", {"name": "Alpha", "location": "Belfast", "leader_id": "bad"}), None)
    assert resp["statusCode"] == 400


@patch("backend.teams.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.teams.function.get_db")
def test_teams_list_all(mock_get_db, mock_verify_token):
    teams = MagicMock()
    individuals = MagicMock()
    teams.find.return_value = [
        {"_id": "t1", "name": "Alpha", "location": "Belfast", "leader_id": "ind1", "member_ids": [], "created_at": "", "updated_at": ""},
    ]
    individuals.find_one.return_value = {"_id": "ind1", "name": "Alice", "location": "Belfast", "employment_type": "full-time", "created_at": "", "updated_at": ""}
    mock_get_db.side_effect = _teams_mock(teams, individuals)
    from backend.teams import function as m
    resp = m.lambda_handler(make_event("GET"), None)
    assert resp["statusCode"] == 200
    assert len(json.loads(resp["body"])) == 1


@patch("backend.teams.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.teams.function.get_db")
def test_teams_get_by_id_not_found(mock_get_db, mock_verify_token):
    teams = MagicMock()
    individuals = MagicMock()
    teams.find_one.return_value = None
    mock_get_db.side_effect = _teams_mock(teams, individuals)
    from backend.teams import function as m
    resp = m.lambda_handler(make_event("GET", path_params={"id": "missing"}), None)
    assert resp["statusCode"] == 404


@patch("backend.teams.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.teams.function.get_db")
def test_teams_delete_success(mock_get_db, mock_verify_token):
    teams = MagicMock()
    individuals = MagicMock()
    teams.find_one.return_value = {"_id": "t1", "name": "Alpha"}
    mock_get_db.side_effect = _teams_mock(teams, individuals)
    from backend.teams import function as m
    resp = m.lambda_handler(make_event("DELETE", path_params={"id": "t1"}), None)
    assert resp["statusCode"] == 204


@patch("backend.teams.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.teams.function.get_db")
def test_teams_delete_not_found(mock_get_db, mock_verify_token):
    teams = MagicMock()
    individuals = MagicMock()
    teams.find_one.return_value = None
    mock_get_db.side_effect = _teams_mock(teams, individuals)
    from backend.teams import function as m
    resp = m.lambda_handler(make_event("DELETE", path_params={"id": "missing"}), None)
    assert resp["statusCode"] == 404


# ── ACHIEVEMENTS EXTENDED ──────────────────────────────────────────────────────

@patch("backend.achievements.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.achievements.function.get_db")
def test_achievements_list_all(mock_get_db, mock_verify_token):
    ach = MagicMock()
    teams = MagicMock()
    ach.find.return_value = [
        {"_id": "a1", "team_id": "t1", "month": "2024-01", "description": "Good work", "metrics": None, "created_at": "", "updated_at": ""},
    ]
    mock_get_db.side_effect = _ach_mock(ach, teams)
    from backend.achievements import function as m
    resp = m.lambda_handler(make_event("GET"), None)
    assert resp["statusCode"] == 200
    assert len(json.loads(resp["body"])) == 1


@patch("backend.achievements.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.achievements.function.get_db")
def test_achievements_get_by_id_not_found(mock_get_db, mock_verify_token):
    ach = MagicMock()
    teams = MagicMock()
    ach.find_one.return_value = None
    mock_get_db.side_effect = _ach_mock(ach, teams)
    from backend.achievements import function as m
    resp = m.lambda_handler(make_event("GET", path_params={"id": "missing"}), None)
    assert resp["statusCode"] == 404


@patch("backend.achievements.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.achievements.function.get_db")
def test_achievements_delete_success(mock_get_db, mock_verify_token):
    ach = MagicMock()
    teams = MagicMock()
    ach.find_one.return_value = {"_id": "a1", "team_id": "t1", "month": "2024-01", "description": "Good"}
    mock_get_db.side_effect = _ach_mock(ach, teams)
    from backend.achievements import function as m
    resp = m.lambda_handler(make_event("DELETE", path_params={"id": "a1"}), None)
    assert resp["statusCode"] == 204


@patch("backend.achievements.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.achievements.function.get_db")
def test_achievements_update_success(mock_get_db, mock_verify_token):
    ach = MagicMock()
    teams = MagicMock()
    ach.find_one.side_effect = [
        {"_id": "a1", "team_id": "t1", "month": "2024-01", "description": "Old", "created_at": "", "updated_at": ""},
        {"_id": "a1", "team_id": "t1", "month": "2024-02", "description": "Updated", "created_at": "", "updated_at": ""},
    ]
    mock_get_db.side_effect = _ach_mock(ach, teams)
    from backend.achievements import function as m
    resp = m.lambda_handler(make_event("PUT", {"month": "2024-02", "description": "Updated"}, path_params={"id": "a1"}), None)
    assert resp["statusCode"] == 200
    assert json.loads(resp["body"])["description"] == "Updated"


# ── METADATA EXTENDED ──────────────────────────────────────────────────────────

@patch("backend.metadata.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.metadata.function.get_collection")
def test_metadata_get_by_id(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find_one.return_value = {"_id": "m1", "category": "team", "key": "size", "value": "small", "created_at": "", "updated_at": ""}
    mock_get_col.return_value = col
    from backend.metadata import function as m
    resp = m.lambda_handler(make_event("GET", path_params={"id": "m1"}), None)
    assert resp["statusCode"] == 200
    assert json.loads(resp["body"])["key"] == "size"


@patch("backend.metadata.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.metadata.function.get_collection")
def test_metadata_get_by_id_not_found(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find_one.return_value = None
    mock_get_col.return_value = col
    from backend.metadata import function as m
    resp = m.lambda_handler(make_event("GET", path_params={"id": "missing"}), None)
    assert resp["statusCode"] == 404


@patch("backend.metadata.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.metadata.function.get_collection")
def test_metadata_update_success(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find_one.side_effect = [
        {"_id": "m1", "category": "team", "key": "size", "value": "small", "created_at": "", "updated_at": ""},
        None,
        {"_id": "m1", "category": "team", "key": "size", "value": "large", "created_at": "", "updated_at": ""},
    ]
    mock_get_col.return_value = col
    from backend.metadata import function as m
    resp = m.lambda_handler(make_event("PUT", {"value": "large"}, path_params={"id": "m1"}), None)
    assert resp["statusCode"] == 200
    assert json.loads(resp["body"])["value"] == "large"


@patch("backend.metadata.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.metadata.function.get_collection")
def test_metadata_delete_success(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find_one.return_value = {"_id": "m1", "category": "team", "key": "size", "value": "small"}
    mock_get_col.return_value = col
    from backend.metadata import function as m
    resp = m.lambda_handler(make_event("DELETE", path_params={"id": "m1"}), None)
    assert resp["statusCode"] == 204


@patch("backend.metadata.function.verify_token", return_value=({"permissions": ["read", "create", "update", "delete"]}, None))
@patch("backend.metadata.function.get_collection")
def test_metadata_delete_not_found(mock_get_col, mock_verify_token):
    col = MagicMock()
    col.find_one.return_value = None
    mock_get_col.return_value = col
    from backend.metadata import function as m
    resp = m.lambda_handler(make_event("DELETE", path_params={"id": "missing"}), None)
    assert resp["statusCode"] == 404


# ── AUTH MIDDLEWARE ON ALL CRUDS ───────────────────────────────────────────────

def test_teams_no_token():
    from backend.teams import function as m
    resp = m.lambda_handler(make_event("GET"), None)
    assert resp["statusCode"] == 401


def test_achievements_no_token():
    from backend.achievements import function as m
    resp = m.lambda_handler(make_event("GET"), None)
    assert resp["statusCode"] == 401


def test_metadata_no_token():
    from backend.metadata import function as m
    resp = m.lambda_handler(make_event("GET"), None)
    assert resp["statusCode"] == 401


def test_teams_insufficient_permission():
    from backend.teams import function as m
    from backend.auth import function as auth_m
    token = auth_m.jwt_encode({"sub": "u1", "username": "viewer", "role": "viewer", "permissions": ["read"]}, "workshop-secret-key")
    resp = m.lambda_handler(make_event("DELETE", headers={"Authorization": f"Bearer {token}"}, path_params={"id": "t1"}), None)
    assert resp["statusCode"] == 403


def test_achievements_insufficient_permission():
    from backend.achievements import function as m
    from backend.auth import function as auth_m
    token = auth_m.jwt_encode({"sub": "u1", "username": "viewer", "role": "viewer", "permissions": ["read"]}, "workshop-secret-key")
    resp = m.lambda_handler(make_event("POST", {"team_id": "t1"}, headers={"Authorization": f"Bearer {token}"}), None)
    assert resp["statusCode"] == 403