import sqlite3

import pytest

import server


CLIENT = {"id": "c1", "name": "Tofu Bar", "niche": "food", "audience": "students",
          "monthlyTarget": 8, "examples": [], "cannot": ["alcohol"]}
IDEA = {"id": "i1", "videoId": "v1", "clientId": "c1", "status": "saved", "dueDate": "2026-11-02",
        "notes": "", "shots": [{"time": "0-2s", "shot": "close-up"}]}


def test_lists_are_null_until_saved(client):
    assert client.get("/api/clients").json() is None
    assert client.get("/api/ideas").json() is None


def test_clients_round_trip(client):
    assert client.put("/api/clients", json=[CLIENT]).status_code == 200
    assert client.get("/api/clients").json() == [CLIENT]


def test_ideas_round_trip(client):
    assert client.put("/api/ideas", json=[IDEA]).status_code == 200
    got = client.get("/api/ideas").json()
    # the server adds updatedAt, and fills a missing shot id
    expected = {**IDEA, "shots": [{**sh, "id": f"s{n + 1}"} for n, sh in enumerate(IDEA["shots"])]}
    assert [{k: v for k, v in i.items() if k != "updatedAt"} for i in got] == [expected]


def test_bad_idea_status_is_rejected(client):
    assert client.put("/api/ideas", json=[{**IDEA, "status": "maybe"}]).status_code == 422


LIBRARY = {"videos": [{"id": "tt-1", "live": True, "url": "https://www.tiktok.com/@a/video/1"}],
           "formats": [{"id": "live-1", "shotList": [{"time": "0-2s", "shot": "close-up"}]}]}


def test_library_is_null_until_saved(client):
    assert client.get("/api/library").json() is None


def test_library_round_trip(client):
    assert client.put("/api/library", json=LIBRARY).status_code == 200
    assert client.get("/api/library").json() == LIBRARY


def test_library_needs_both_lists(client):
    assert client.put("/api/library", json={"videos": []}).status_code == 422


def test_added_client_round_trips(client):
    added = {"id": "acme-bakery", "name": "Acme Bakery", "niche": "bakery", "audience": "locals",
             "monthlyTarget": 8, "examples": [], "topics": ["sourdough", "cake decorating"], "cannot": []}
    assert client.put("/api/clients", json=[CLIENT, added]).status_code == 200
    saved = client.get("/api/clients").json()
    assert [c["id"] for c in saved] == ["c1", "acme-bakery"]
    assert saved[1]["topics"] == ["sourdough", "cake decorating"]


def test_medians_migration_handles_another_connection_adding_a_column(tmp_path):
    path = tmp_path / "migration.db"

    class RacingConnection(sqlite3.Connection):
        raced = False

        def execute(self, statement, parameters=()):
            cursor = super().execute(statement, parameters)
            if statement == "PRAGMA table_info(medians)" and not self.raced:
                snapshot = list(cursor)
                self.raced = True
                with sqlite3.connect(path) as other:
                    other.execute("ALTER TABLE medians ADD COLUMN base_to TEXT")
                return snapshot
            return cursor

    with sqlite3.connect(path, factory=RacingConnection) as conn:
        conn.execute("CREATE TABLE medians (author TEXT PRIMARY KEY, median REAL, fetched_at REAL NOT NULL)")
        conn.execute("INSERT INTO medians VALUES ('existing', 42, 100)")
        conn.commit()
        server.migrate_medians(conn)
        assert {row[1] for row in conn.execute("PRAGMA table_info(medians)")} >= {"n", "base_from", "base_to"}
        assert conn.execute("SELECT author, median, fetched_at FROM medians").fetchall() == [("existing", 42, 100)]


def test_medians_migration_does_not_hide_other_database_errors():
    class LockedConnection(sqlite3.Connection):
        def execute(self, statement, parameters=()):
            if statement.startswith("ALTER TABLE medians"):
                raise sqlite3.OperationalError("database is locked")
            return super().execute(statement, parameters)

    with sqlite3.connect(":memory:", factory=LockedConnection) as conn:
        conn.execute("CREATE TABLE medians (author TEXT PRIMARY KEY, median REAL, fetched_at REAL NOT NULL)")
        with pytest.raises(sqlite3.OperationalError, match="database is locked"):
            server.migrate_medians(conn)
