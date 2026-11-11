#!/usr/bin/env python3
"""Split the existing AI master at shot boundaries without generating new media."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'pivots/02-content/app/trend-finder'
MASTER_SHA = 'be20427fd3dc0eaadc3379dadd3e98136eeb25b60bb68c9d0f931294972edc14'
BOUNDS = [0, 48, 97, 154, 199, 293, 315]
GROUPS = [[1, 2], list(range(3, 8)), list(range(8, 12)), list(range(12, 15)), list(range(15, 20)), [20, 21]]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def frame_hashes(path):
    output = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-map', '0:v:0', '-f', 'framemd5', '-'], text=True)
    return [line.rsplit(',', 1)[1].strip() for line in output.splitlines() if line and not line.startswith('#')]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--master', required=True, type=Path)
    args = parser.parse_args()
    master = args.master.resolve(strict=True)
    if digest(master) != MASTER_SHA:
        parser.error('This is not the verified original 21-shot master.')
    original = frame_hashes(master)
    if len(original) != 315:
        parser.error('The master must contain exactly 315 frames.')
    pcm = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(master), '-map', '0:a:0', '-f', 's32le', '-'])
    if not pcm or any(pcm):
        parser.error('The verified master must have its original silent audio.')
    output = APP / 'public/demo-assets/full-ai-six'
    if output.exists():
        parser.error('The output already exists; existing media is never overwritten.')
    output.mkdir()
    shutil.copyfile(master, output / 'original-master.mp4')
    old = APP / 'public/demo-assets/fresh-six'
    manifest = json.loads((old / 'manifest.json').read_text())
    ai = manifest['routes']['ai']
    project = ai['project']
    project.update(texts=[], captions={'enabled': False}, music=None, voiceover=[], showLogo=False)
    assets, joined = [], []
    for index, (start, end) in enumerate(zip(BOUNDS, BOUNDS[1:])):
        sid = f's{index + 1}'
        movie = output / f'ai-{sid}.mp4'
        subprocess.run(['ffmpeg', '-v', 'error', '-i', str(master), '-an', '-vf', f'trim=start_frame={start}:end_frame={end},setpts=PTS-STARTPTS', '-fps_mode', 'passthrough', '-c:v', 'libx264', '-qp', '0', '-preset', 'medium', '-movflags', '+faststart', str(movie)], check=True)
        hashes = frame_hashes(movie)
        if hashes != original[start:end]:
            raise RuntimeError(f'{sid}: decoded frames differ from the master')
        joined.extend(hashes)
        poster = output / f'ai-{sid}.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-i', str(movie), '-frames:v', '1', str(poster)], check=True)
        duration = (end - start) / 30
        provenance = f'Continuous frames {start}–{end - 1} of the original 21-shot AI master; original shots {GROUPS[index]}. Existing baked-in captions and silent audio are preserved; no new generation.'
        source = ai['sources'][index]
        source.update(nodeId=f'n_six_video_{sid}', sha256=digest(movie), provenance=provenance)
        project['clips'][index].update(out=duration)
        assets.append({'id': sid, 'sourceId': f'ai-{sid}', 'originalShots': GROUPS[index], 'startFrame': start, 'endFrame': end, 'duration': duration, 'imageUrl': f'/demo-assets/full-ai-six/ai-{sid}.png', 'videoUrl': f'/demo-assets/full-ai-six/ai-{sid}.mp4', 'videoSha256': digest(movie), 'provenance': provenance})
    if joined != original:
        raise RuntimeError('The six parts do not reproduce the complete master')
    for source in manifest['routes']['shoot']['sources']:
        shutil.copyfile(old / source['path'], output / source['path'])
    manifest['preset'] = 'full21'
    manifest['originalMaster'] = {'path': 'original-master.mp4', 'sha256': MASTER_SHA, 'frames': 315, 'fps': 30, 'decodedFramesEqual': True, 'silentAudio': True}
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    metadata = APP / 'src/lib/guided/fullAssets.ts'
    metadata.write_text('export const FULL_AI_ASSETS = ' + json.dumps(assets, indent=2) + ' as const\n\nexport const fullCutMode = (): boolean => typeof window !== \'undefined\' && new URLSearchParams(window.location?.search).get(\'cut\') === \'full21\'\n')
    print(json.dumps({'masterSha256': MASTER_SHA, 'parts': 6, 'frames': len(joined), 'decodedFramesEqual': True, 'silentAudio': True, 'bytes': sum(p.stat().st_size for p in output.iterdir())}))


if __name__ == '__main__':
    main()
