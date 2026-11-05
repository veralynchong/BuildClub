"""Offline native takes -> edit API -> real Remotion export acceptance."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time

ROOT = Path.cwd()
APP = ROOT / 'pivots/02-content/app/trend-finder'
assert not (APP / '.env').exists(), 'Local configuration present; refusing import'
sys.path[:0] = [str(APP / 'backend'), str(APP / 'backend/tests')]
import pytest
import conftest
import server
import editing
from fastapi.testclient import TestClient
from test_takes import A, store_ideas, with_shots, up
from test_zero_spend import zero_spend, CAPS

assert all(os.environ.get(name) == '0' for name in CAPS)
assert any((APP / 'node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64' / name).is_file()
           for name in ('headless_shell', 'chrome-headless-shell'))
OUT = ROOT / 'pivots/02-content/docs/demo-qa/2026-11-05-zero-spend'
SOURCE = APP / 'public/media/remake-tour.mp4'
if len(sys.argv) == 3 and sys.argv[1] == '--reopen':
    from unittest.mock import Mock
    import socket
    import agent, analyze, assist, channels, gen_providers, shotlist
    saved = json.loads((OUT / 'native-takes-evidence.json').read_text())
    assert sys.argv[2] == saved['work']
    with pytest.MonkeyPatch.context() as m:
        conftest.offline.__wrapped__(Path(sys.argv[2]), m)
        for name in CAPS:
            m.setattr(server, name, 0)
        denied = Mock(side_effect=AssertionError('Unexpected provider/network call'))
        for obj, name in ((server, 'run_actor'), (assist, 'call_claude'), (agent, 'ask_claude'),
                          (shotlist, 'ask_claude'), (analyze, 'prepare'), (analyze, 'breakdown'),
                          (channels, 'ask_claude'), (gen_providers, 'adapter_for'),
                          (socket.socket, 'connect'), (socket, 'create_connection')):
            m.setattr(obj, name, denied)
        with TestClient(server.app) as c:
            assert c.get('/api/ideas/ia/edit').json() == {'version': 1, 'project': saved['project']}
            assert c.get('/api/ideas/ia/takes').json() == saved['takes']
            state = c.get('/api/ideas/ia/cut').json()
            assert state['status'] == 'done' and state['stale'] is False
            assert hashlib.sha256(c.get(state['output']['url']).content).hexdigest() == saved['outputSha256']
            assert not server.load(f'spend:{server.today()}')
        assert denied.call_count == 0
        saved['freshProcessReopen'] = 'PASS: new Python process, same DB/media, edit/takes/output hash match; provider/network spy 0, wallet empty'
        (OUT / 'native-takes-evidence.json').write_text(json.dumps(saved, indent=2) + '\n')
    print('PASS fresh-process TestClient reopen: same DB/media, edit/takes/final MP4 hash match; provider/network spy=0, wallet empty')
    sys.exit(0)
WORK = Path(tempfile.mkdtemp(prefix='buildclub-native-chain-'))
mp = pytest.MonkeyPatch()
conftest.offline.__wrapped__(WORK, mp)
client = TestClient(server.app)
guard = zero_spend.__wrapped__(WORK, client, mp)
denied = next(guard)
trace = []

def checked(method, path, expected=200, **kwargs):
    r = getattr(client, method)(path, **kwargs)
    trace.append({'method': method, 'path': path, 'status': r.status_code})
    assert r.status_code == expected, r.text
    return r

try:
    with client:
        store_ideas(with_shots('ia', 's1', 's2', 's3'))
        body = SOURCE.read_bytes()
        takes = []
        for shot in range(3):
            r = up(client, shot=shot, body=body, name=f'repo-tour-shot-{shot+1}.mp4')
            assert r.status_code == 200, r.text
            takes.append(r.json())
            assert hashlib.sha256(client.get(r.json()['url']).content).hexdigest() == hashlib.sha256(body).hexdigest()
        alternate = up(client, shot=1, body=body, name='repo-tour-alternate.mp4').json()
        assert alternate['chosen'] is False
        chosen = checked('post', f"/api/ideas/ia/takes/{alternate['id']}/choose").json()
        assert next(t for t in chosen if t['id'] == takes[1]['id'])['chosen'] is False
        assert next(t for t in chosen if t['id'] == alternate['id'])['chosen'] is True
        takes[1] = alternate
        listed = checked('get', '/api/ideas/ia/edit/sources').json()['sources']
        assert len(listed) == 4 and all(s['duration'] > 19 and s['hasAudio'] for s in listed)
        p = editing.empty_project()
        p['captions'] = {'enabled': True}
        p['clips'] = [dict(id=f'c{i}', source={'kind': 'take', 'id': t['id'], 'shotId': f's{i+1}'},
                           **{'in': start, 'out': start + 3}, volume=1, muted=False,
                           caption=f'Engineering proof: native take {i+1}')
                      for i, (t, start) in enumerate(zip(takes, [0, 8, 16]))]
        p['primaries'] = {f's{i+1}': c['source'] for i, c in enumerate(p['clips'])}
        assert checked('put', '/api/ideas/ia/edit', json={'version': 0, 'project': p}).json() == {'version': 1}
        assert checked('get', '/api/ideas/ia/edit').json() == {'version': 1, 'project': p}
        checked('post', '/api/ideas/ia/edit/export', expected=202)
        deadline = time.monotonic() + 240
        while time.monotonic() < deadline:
            state = client.get('/api/ideas/ia/cut').json()
            if state['status'] in ('done', 'failed'):
                break
            time.sleep(.5)
        assert state['status'] == 'done', state
        assert state['source'] == 'editor' and not state['stale'], state
        result = checked('get', state['output']['url']).content
        output = OUT / 'native-takes-proof.mp4'
        output.write_bytes(result)
        assert (server.MEDIA_DIR / 'ia/cut/final.mp4').read_bytes() == result
    # Same persistent DB/media, new application lifespan; not a separate process restart.
    with TestClient(server.app) as reopened:
        assert reopened.get('/api/ideas/ia/edit').json() == {'version': 1, 'project': p}
        assert reopened.get('/api/ideas/ia/takes').json() == chosen
        restored = reopened.get('/api/ideas/ia/cut').json()
        assert restored['status'] == 'done' and restored['stale'] is False
        assert reopened.get(restored['output']['url']).content == result
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
        'stream=codec_name,width,height,r_frame_rate,sample_rate,channels', '-show_entries',
        'format=duration', '-of', 'json', str(output)]))
    assert probe['streams'][0]['codec_name'] == 'h264'
    assert (probe['streams'][0]['width'], probe['streams'][0]['height']) == (1080, 1920)
    assert probe['streams'][0]['r_frame_rate'] == '30/1'
    assert probe['streams'][1]['codec_name'] == 'aac'
    assert abs(float(probe['format']['duration']) - 9) < .1
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(output), '-f', 'null', '-'], check=True)
    next(guard, None)
    evidence = dict(scope='Native backend engineering proof; not campaign, human speech or new Canvas acceptance',
        date='2026-11-05', baseHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
        work=str(WORK), source=str(SOURCE.relative_to(ROOT)), sourceSha256=hashlib.sha256(body).hexdigest(),
        outputSha256=hashlib.sha256(result).hexdigest(), sourceRanges=[[0,3],[8,11],[16,19]],
        takes=chosen, project=p, state=state, ffprobe=probe, fullDecodeExit=0, trace=trace,
        persistence='PASS same DB/media across two TestClient lifespans; no separate process restart',
        providerNetworkSpyCalls=denied.call_count, budgets={name: os.environ[name] for name in CAPS},
        wallet=server.load(f'spend:{server.today()}'),
        notes=['Real native API and renderer, no fake probe/export/output',
               'Landscape product tour is center-cropped by native Reel cover; captions are authored labels',
               'No HTTP backend listener, backend copy, paid credentials or dependency installation',
               'Renderer uses existing browser and own local cache; Python network spy does not instrument child Chromium',
               'Browser playback and subjective audio review not included in this command'])
    (OUT / 'native-takes-evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print('PASS native upload: 4 takes / 3 shots, byte hashes match repository source')
    print('PASS choose alternate: correct shot selected, original deselected')
    print('PASS real sources probe, versioned edit save/read, native export HTTP 202 -> done')
    print('PASS same DB/media across two TestClient lifespans, downloadable MP4 bytes match')
    print('PASS ffprobe H264 1080x1920 30fps / AAC / ' + probe['format']['duration'] + 's; full decode exit 0')
    print('PASS provider/network spy calls=0; seven budgets=0; wallet empty')
    print('Evidence: ' + str(OUT / 'native-takes-evidence.json'))
    print('Temporary DB/media retained: ' + str(WORK))
finally:
    mp.undo()
