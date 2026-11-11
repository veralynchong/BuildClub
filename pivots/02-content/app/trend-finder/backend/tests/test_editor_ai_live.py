"""ONE live smoke run of the editor's four Claude calls with tiny inputs (about 4 small Haiku calls, well under US$0.01).
Skipped unless RUN_LIVE_LLM=1 and ANTHROPIC_API_KEY is set in the environment. Run with:
  RUN_LIVE_LLM=1 backend/.venv/bin/python -m pytest backend/tests/test_editor_ai_live.py -s
Each call prints its model and token usage ([editor_ai:<tag>] ... in= out=)."""

import os

import pytest

import editor_ai

pytestmark = pytest.mark.skipif(os.environ.get("RUN_LIVE_LLM") != "1" or not os.environ.get("ANTHROPIC_API_KEY"),
                                reason="live Claude smoke test: set RUN_LIVE_LLM=1 and ANTHROPIC_API_KEY")


def test_each_editor_ai_call_once():
    hook = editor_ai.check_hook(editor_ai.ask(editor_ai.HookOut, editor_ai.hook_system, {
        "hook": "Fresh tofu in five minutes", "shotLines": ["Fresh tofu in five minutes", "Press it, crisp it, done"],
        "firstThreeSeconds": {"captions": [{"start": 1.1, "text": "So today I want to show you"}], "onScreenText": []}, "firstWordAt": 1.1}, "hook"))
    print(hook)
    assert 1 <= hook["score"] <= 5

    entries = [{"id": "c1", "text": "So today I really want to show you how crispy tofu is made"}]
    items = editor_ai.rewrite_items(entries, {r.id: r.text for r in editor_ai.ask(
        editor_ai.RewriteOut, editor_ai.rewrite_system, {"captions": entries}, "rewrite").captions})
    print(items)

    ctx = {"hook": "Fresh tofu in five minutes", "cta": "", "title": "", "client": "Tofu Bar", "niche": "food", "shotLines": []}
    copy = editor_ai.check_copy(editor_ai.ask(editor_ai.CopyOut, editor_ai.copy_system.format(platform="TikTok"), {
        "hook": ctx["hook"], "shotLines": [], "client": "Tofu Bar", "niche": "food", "referenceTitle": ""}, "copy"), ctx, "tiktok")
    print(copy)
    assert len(copy["title"]) <= 60 and 3 <= len(copy["hashtags"]) <= 5

    notes = [{"id": "n1", "atSec": 2.5, "text": "Use the other take of shot 2"}]
    tasks = editor_ai.check_tasks(editor_ai.ask(editor_ai.TasksOut, editor_ai.tasks_system, {
        "notes": [{"commentId": "n1", "atSec": 2.5, "text": notes[0]["text"]}]}, "tasks"), notes)
    print(tasks)
    assert tasks[0]["commentId"] == "n1"
