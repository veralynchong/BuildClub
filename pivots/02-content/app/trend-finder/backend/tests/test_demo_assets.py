"""The demo asset script: the free quote, and the guards that keep `run` from spending anything it should not."""

import urllib.request

import pytest

import demo_assets
import gen_providers
import generations
import server
from test_auth import add_user, fresh_limits  # noqa: F401  (fresh_limits is an autouse fixture)
from test_canvas import plan
from test_takes import store_ideas

MODELS = {m["id"]: m for m in generations.load_models()}


@pytest.fixture
def offline_net(monkeypatch):
    def no_network(*a, **kw):
        raise AssertionError("the script opened a connection")

    monkeypatch.setattr(urllib.request, "urlopen", no_network)
    monkeypatch.setattr(urllib.request, "build_opener", no_network)


def quote_cli(capsys, idea="ia", image="seedream-4.5", video="hailuo-2.3-fast", *extra):
    code = demo_assets.main(["quote", "--idea", idea, "--image-model", image, "--video-model", video,
                             "--db", str(server.DB_PATH), *extra])
    return code, capsys.readouterr()


def test_quote_prices_each_shot_and_model(client, capsys, offline_net):
    store_ideas(plan("ia", ids=("s1", "s2", "s3")))
    code, cap = quote_cli(capsys, "ia", "seedream-4.5", "hailuo-2.3-fast", "--duration", "6")
    assert code == 0
    items = demo_assets.plan_items([{"id": i} for i in ("s1", "s2", "s3")], MODELS["seedream-4.5"],
                                   MODELS["hailuo-2.3-fast"], 6)
    assert [(i["imageUsd"], i["videoUsd"]) for i in items] == [(0.04, 0.192)] * 3
    q = demo_assets.quote(items)
    assert q["total"] == 0.696 and q["byModel"] == {"seedream-4.5": 0.12, "hailuo-2.3-fast": 0.576}
    assert "Total US$0.70" in cap.out and "hailuo-2.3-fast" in cap.out and cap.err == ""


def test_quote_mock_models_is_free(client, capsys, offline_net):
    store_ideas(plan("ia"))
    code, cap = quote_cli(capsys, "ia", "mock-image", "mock-video")
    assert code == 0 and "Total US$0.00" in cap.out and "DAILY_GEN" not in cap.out


def test_quote_warns_over_daily_caps(client, capsys, offline_net, monkeypatch):
    monkeypatch.delenv("DAILY_GEN_VIDEO_USD", raising=False)
    store_ideas(plan("ia", ids=tuple(f"s{i}" for i in range(6))))
    code, cap = quote_cli(capsys, "ia", "seedream-4.5", "hailuo-2.3-fast", "--duration", "6")
    assert code == 0 and "DAILY_GEN_VIDEO_USD" in cap.out and "DAILY_GEN_IMAGE_USD" not in cap.out


def test_quote_rejects_bad_input(client, capsys, offline_net):
    store_ideas(plan("ia"), plan("iw", "waiting"))
    for args in (("ia", "nope", "hailuo-2.3-fast"), ("ia", "hailuo-2.3-fast", "hailuo-2.3-fast"),
                 ("ia", "seedream-4.5", "seedream-4.5"), ("ia", "seedream-4.5", "hailuo-2.3-fast", "--duration", "7"),
                 ("iw", "seedream-4.5", "hailuo-2.3-fast"), ("missing", "seedream-4.5", "hailuo-2.3-fast")):
        code, cap = quote_cli(capsys, *args)
        assert code == 2 and cap.out == "" and cap.err.strip(), args


def test_pick_duration():
    assert demo_assets.pick_duration(MODELS["veo-3.1-fast"], None) == 4
    assert demo_assets.pick_duration(MODELS["veo-3.1-fast"], 8) == 8


# ---- run, against a fake of the server ----------------------------------------------------------------------

class FakeServer:
    """Records every call and answers like the server: a canvas with versions, chain quotes and generation rows."""

    def __init__(self, shot_ids=("s1", "s2"), extra=0.0, fail_video_of=None, wallet=None, reject_confirm_of=None,
                 stuck=False, put_fails_after_confirm=False):
        self.calls, self.extra, self.fail_video_of = [], extra, fail_video_of
        self.wallet = wallet or {"image": 0.5, "video": 1.0}
        self.reject_confirm_of, self.stuck, self.put_fails = reject_confirm_of, stuck, put_fails_after_confirm
        nodes, edges = [], []
        for n, sid in enumerate(shot_ids):
            y = n * 400
            nodes += [{"id": f"n_shot_{sid}", "type": "shot", "shotId": sid, "position": {"x": 0, "y": y},
                       "data": {"removed": False}},
                      {"id": f"n_sb_{sid}", "type": "storyboard", "shotId": sid, "position": {"x": 360, "y": y},
                       "data": {"primary": True, "model": "mock-image"}}]
            edges.append({"id": f"e_{sid}", "source": f"n_shot_{sid}", "sourceHandle": "out",
                          "target": f"n_sb_{sid}", "targetHandle": "in:text"})
        self.doc, self.version, self.gens = {"nodes": nodes, "edges": edges}, 1, {}

    def __call__(self, method, path, body):
        self.calls.append((method, path, body))
        if path == "/api/auth/login":
            return 200, {}
        if path.endswith("/canvas"):
            if method == "GET":
                return 200, {"version": self.version, "doc": __import__("copy").deepcopy(self.doc)}
            if self.put_fails and self.gens:
                return 500, {"error": "Something went wrong."}
            if body["version"] != self.version:
                return 409, {"error": "stale"}
            self.doc, self.version = body["doc"], self.version + 1
            return 200, {"version": self.version}
        if path.endswith("/gen/chain"):
            usd = 0.04 + 0.192 + self.extra
            if not body["confirm"]:
                return 200, {"total": usd, "remaining": self.wallet}
            n = len(self.gens) // 2
            if self.reject_confirm_of == n:
                return 429, {"error": "Today's budget has US$0.00 left."}
            rows = {"image": {"id": f"i{n}", "status": "done", "estUsd": 0.04},
                    "video": {"id": f"v{n}", "status": "failed" if self.fail_video_of == n else "done",
                              "estUsd": 0.192, "error": "The generation failed. Try again."}}
            self.gens.update({r["id"]: r for r in rows.values()})
            return 201, rows
        if "/gen/" in path:
            row = self.gens[path.rsplit("/", 1)[1]]
            return 200, {**row, "status": "running"} if self.stuck else row
        raise AssertionError(path)

    def confirms(self):
        return [c for c in self.calls if c[1].endswith("/gen/chain") and c[2]["confirm"]]


SHOTS = [{"id": "s1", "shot": "one", "line": None}, {"id": "s2", "shot": "two", "line": "say two"}]


def go(api, cap=1.0, yes=True, image="seedream-4.5", video="hailuo-2.3-fast", shots=SHOTS):
    lines = []
    code = demo_assets.run(api, "ia", MODELS[image], MODELS[video], 6, cap, yes, "a@b.test", "pw",
                           out=lines.append, shots=shots, poll_s=0, sleep=lambda s: None)
    return code, lines


def test_run_refuses_without_yes_or_over_cap_and_sends_nothing():
    for kwargs in ({"yes": False}, {"cap": 0.4}):  # the quote is 0.464
        fake = FakeServer()
        code, _ = go(fake, **kwargs)
        assert code == 3 and fake.calls == [], kwargs


def test_run_aborts_when_server_quote_differs():
    fake = FakeServer(extra=0.01)
    code, lines = go(fake)
    assert code == 4 and fake.confirms() == [] and "quotes" in lines[-1]
    assert not [c for c in fake.calls if c[0] == "PUT" and any("awaiting" in n["data"] for n in c[2]["doc"]["nodes"])]


def test_run_stops_at_first_failure():
    fake = FakeServer(fail_video_of=0)
    code, lines = go(fake)
    assert code == 5 and len(fake.confirms()) == 1 and "Shot 1 video failed" in lines[-1]


def test_run_aborts_when_server_quote_is_lower_too():
    fake = FakeServer(extra=-0.01)
    code, lines = go(fake)
    assert code == 4 and fake.confirms() == []


def test_run_refuses_when_server_total_is_over_cap():
    fake = FakeServer(extra=0.1)  # local 0.464 passes a 0.5 cap, the server's 0.664 does not (and also differs)
    code, _ = go(fake, cap=0.5)
    assert code in (3, 4) and fake.confirms() == []


def test_run_refuses_when_wallet_is_too_low():
    fake = FakeServer(wallet={"image": 0.5, "video": 0.3})  # videos need 0.384
    code, lines = go(fake)
    assert code == 3 and fake.confirms() == [] and "wallet" in lines[-1]


def test_run_stops_when_a_confirm_is_rejected():
    fake = FakeServer(shot_ids=("s1", "s2", "s3"), reject_confirm_of=1)
    shots = SHOTS + [{"id": "s3", "shot": "three", "line": None}]
    code, lines = go(fake, shots=shots, cap=2.0)
    assert code == 5 and len(fake.confirms()) == 2 and "1 of 3 shots were confirmed" in lines[-1]
    assert not any(c[2] and c[2].get("prompt") == "three" and c[2].get("confirm") for c in fake.calls)


def test_run_timeout_says_the_shot_may_still_be_generating(monkeypatch):
    monkeypatch.setattr(generations, "GEN_TIMEOUT_S", {"image": 0, "video": 0, "voice": 0})
    fake = FakeServer(stuck=True)
    code, lines = go(fake)
    assert code == 5 and len(fake.confirms()) == 1 and "Shot 1 may still be generating" in lines[-1]
    assert "1 of 2 shots were confirmed" in lines[-1]


def test_run_canvas_save_failure_after_confirm_reports_committed_money():
    fake = FakeServer(put_fails_after_confirm=True)
    code, lines = go(fake)
    assert code == 5 and len(fake.confirms()) == 1 and "may still be generating" in lines[-1]


def test_run_network_error_after_confirm_exits_5():
    fake = FakeServer()

    def flaky(method, path, body):
        if method == "GET" and "/gen/" in path and not path.endswith("chain"):
            raise OSError("connection reset")
        return fake(method, path, body)

    code, lines = go(flaky)
    assert code == 5 and len(fake.confirms()) == 1 and "may still be generating" in lines[-1]


def test_run_wires_missing_nodes_and_awaits_the_new_rows():
    fake = FakeServer()
    code, lines = go(fake)
    assert code == 0 and len(fake.confirms()) == 2
    nodes = {n["id"]: n for n in fake.doc["nodes"]}
    for n, sid in enumerate(("s1", "s2")):
        assert nodes[f"n_sb_{sid}"]["data"]["awaiting"] == f"i{n}" and nodes[f"n_video_{sid}"]["data"]["awaiting"] == f"v{n}"
        assert any(e["source"] == f"n_sb_{sid}" and e["target"] == f"n_video_{sid}" and e["targetHandle"] == "in:start"
                   for e in fake.doc["edges"])
    assert fake.confirms()[1][2]["prompt"] == "say two" and fake.confirms()[0][2]["prompt"] == "one"
    assert lines[-2].startswith("Shot 1: image i0")


def test_run_with_mock_models_fills_every_shot(client, monkeypatch):
    monkeypatch.setattr(gen_providers, "MOCK_DELAY_S", 0)
    monkeypatch.setattr(server.gen_jobs, "submit", server.gen_jobs.run)  # inline, no worker thread
    store_ideas(plan("ia"))
    add_user("a@b.test", "correct horse")
    client.get("/api/ideas/ia/canvas")

    def api(method, path, body):
        r = client.request(method, path, json=body)
        return r.status_code, r.json()

    lines = []
    code = demo_assets.run(api, "ia", MODELS["mock-image"], MODELS["mock-video"], 4, 0.0, True, "a@b.test",
                           "correct horse", out=lines.append, poll_s=0, sleep=lambda s: None,
                           shots=[{"id": "s1", "shot": "shot s1", "line": None}, {"id": "s2", "shot": "shot s2", "line": None}])
    assert code == 0, lines
    body = client.get("/api/ideas/ia/canvas").json()
    gens = {g["id"]: g for g in body["generations"]}
    for sid in ("s1", "s2"):
        for kind, node_type in (("image", "storyboard"), ("video", "video")):
            node = next(n for n in body["doc"]["nodes"] if n["type"] == node_type and n["shotId"] == sid)
            made = [g for g in gens.values() if g["nodeId"] == node["id"] and g["kind"] == kind and g["status"] == "done"
                    and g["model"].startswith("mock-")]
            assert len(made) == 1 and node["data"]["awaiting"] == made[0]["id"]
