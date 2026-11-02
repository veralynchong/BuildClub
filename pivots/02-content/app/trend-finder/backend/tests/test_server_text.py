"""Pins the frontend sentence map (src/lib/strings/server.ts) to the backend's English sentences.

The canvas, editor and plan page show backend errors and progress words through serverText(), which looks the whole
sentence up in that map. A backend sentence the map lacks would show in English in the Chinese UI, and a map entry the
backend no longer says is dead weight, so both directions fail here.
"""
import ast
import re
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
SERVER_TS = BACKEND.parent / "src" / "lib" / "strings" / "server.ts"

# Modules whose errors and progress words reach the canvas, the editor or the plan's finished-cut area.
# server.py is left out (mostly the search pages); its generation-wallet 429 sentences are listed by hand below.
MODULES = ("canvas", "generations", "gen_providers", "editing", "brand", "takes", "renders", "cleaning", "cutting")

# server.py sentences the canvas can receive that the ast rules cannot see.
MANUAL = {
    "Today's {} generation budget has US${} left, and this needs US${}. "
    "The budget resets at midnight; to allow more, raise {} in .env and restart the API.",
}

CALLS = {"error", "CutError", "step"}


def _texts(node):
    """The sentences an argument can be: both branches of `a if c else b`, else the one literal (or none)."""
    if isinstance(node, ast.IfExp):
        return _texts(node.body) + _texts(node.orelse)
    s = _text(node)
    return [] if s is None else [s]


def _text(node):
    """A string literal or f-string as one sentence, every {expression} as {}; None for anything else."""
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.JoinedStr):
        return "".join(p.value if isinstance(p, ast.Constant) else "{}" for p in node.values)
    return None


def _looks_like_sentence(s):
    return bool(s) and s[0].isupper() and s[-1] in ".?"


def sentences(path):
    tree = ast.parse(path.read_text())
    found = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            fn = node.func
            name = fn.id if isinstance(fn, ast.Name) else fn.attr if isinstance(fn, ast.Attribute) else None
            if name in CALLS:
                # error(status, message) has an int first: the message is the first *string* argument.
                if name == "step":
                    args = node.args[1:2]
                else:
                    args = [a for a in node.args if _texts(a)][:1]
                for a in args:
                    found.update(_texts(a))
            for kw in node.keywords:
                if kw.arg == "step":
                    found.update(_texts(kw.value))
    for node in tree.body:
        if isinstance(node, ast.Assign):
            value = _text(node.value)
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id.isupper() and value and _looks_like_sentence(value):
                    found.add(value)
    return found


def backend_sentences(modules):
    out = set()
    for m in modules:
        out |= sentences(BACKEND / f"{m}.py")
    return out


def table_sentences():
    """The `en` object of server.ts: its values with every {name} normalised to {}."""
    src = SERVER_TS.read_text()
    en = src.split("export const en", 1)[1].split("export const zhHant", 1)[0]
    values = re.findall(r"^\s*['\"][\w.]+['\"]:\s*(\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*')\s*,?\s*$", en, re.M)
    return {re.sub(r"\{\w+\}", "{}", ast.literal_eval(v)) for v in values}


def test_every_canvas_and_editor_server_sentence_is_translated():
    missing = backend_sentences(MODULES) - table_sentences()
    assert not missing, "backend sentences missing from strings/server.ts:\n" + "\n".join(sorted(missing))


def test_every_translation_still_matches_backend():
    every = {p.stem for p in BACKEND.glob("*.py")}
    stale = table_sentences() - backend_sentences(every) - MANUAL
    assert not stale, "strings/server.ts sentences no backend module says any more:\n" + "\n".join(sorted(stale))
