"""Root-only explicit launcher: normal APP import, OR environment only, no server start."""
import argparse
import importlib
import os
from pathlib import Path
import sys

APP=Path('/Users/tommy/orca/workspaces/BuildClub/demo-readiness/pivots/02-content/app/trend-finder')
HERE=Path(__file__).resolve().parent
PYTHON=APP/'backend/.venv/bin/python'


def prepare_environment(environ,loader):
    if environ.get('BUILDCLUB_OFFLINE_VERIFY')=='1':raise ValueError('normal APP environment loading required')
    loader()  # Import existing server normally; never call startup/lifespan or run a server.
    if not environ.get('OPENROUTER_API_KEY'):raise ValueError('normal APP did not load OpenRouter credential')
    for name in list(environ):
        if name not in ('PATH','HOME','OPENROUTER_API_KEY'):del environ[name]


def main():
    parser=argparse.ArgumentParser(description=__doc__);g=parser.add_mutually_exclusive_group(required=True);g.add_argument('--check',action='store_true');g.add_argument('--bootstrap',action='store_true');g.add_argument('--run',choices=('s18',));args=parser.parse_args()
    if Path(sys.prefix).resolve()!=(APP/'backend/.venv').resolve():os.execv(str(PYTHON),[str(PYTHON),'-I','-B',str(HERE/'launch_or.py'),*sys.argv[1:]])
    if args.run:
        sys.path.insert(0,str(HERE));from veo import load,sha,require,acceptance
        plan,pins=load();acceptance(plan,pins);require(sha((APP/'backend/server.py').read_bytes())==pins['appServerSha256'],'normal APP server changed')
        sys.path.insert(0,str(APP/'backend'))
        prepare_environment(os.environ,lambda:importlib.import_module('server'))
    # --check and --bootstrap never import server or load credentials.
    os.execv(str(PYTHON),[str(PYTHON),'-I','-B',str(HERE/'veo.py'),*sys.argv[1:]])

if __name__=='__main__':main()
