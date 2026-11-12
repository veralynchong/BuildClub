"""Shot lens and camera gear: optional, validated, survive a round trip."""

import pytest
from pydantic import ValidationError

from models import Shot


def test_shot_keeps_lens_and_gear():
    s = Shot(time="0-2s", shot="Loaf out of the oven", lens="50mm", gear="tripod")
    assert s.lens == "50mm" and s.gear == "tripod"
    assert Shot(**s.model_dump()).lens == "50mm"  # survives a save/load round trip


def test_shot_rejects_unknown_lens():
    with pytest.raises(ValidationError):
        Shot(time="0-2s", shot="x", lens="70mm")


def test_old_shot_without_fields_loads():
    assert Shot(time="0-2s", shot="x").lens is None
