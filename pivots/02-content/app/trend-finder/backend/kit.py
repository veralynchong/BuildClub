"""A client's consistency kit: named characters, products, places and styles, each with a note and up to four
reference images. The kit lives on the client record (so the client list and the editor share it); the image
files live in media/kit/<client id>/. Only signed-in staff reach these routes."""

import os
import secrets
import time
from pathlib import Path
from typing import Callable, Optional

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, ValidationError

import generations
from brand import lock
from canvas import ID_RE
from models import Client, Kit, KitItem

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_ITEMS = 20
MAX_IMAGES = 4
IMAGE_TYPES = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
MEDIA_TYPES = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}
NO_CLIENT = "That client doesn't exist."
NO_ITEM = "That kit item doesn't exist."
NO_IMAGE = "That image doesn't exist."
NOT_IMAGE = "The image must be a PNG, JPG or WebP file."
IMAGE_TOO_BIG = "The image is over the 10 MB limit."
TOO_MANY_ITEMS = "A kit holds at most 20 items."
TOO_MANY_IMAGES = "A kit item holds at most 4 images."
DUPLICATE = "Another item in this kit already has that name."
BAD_BODY = "The request body is not valid."


class ItemIn(BaseModel):
    kind: str
    name: str
    note: str = ""


class ItemPatch(BaseModel):
    kind: Optional[str] = None
    name: Optional[str] = None
    note: Optional[str] = None


def kit_folder(media: Path, client_id: str) -> Optional[Path]:
    """<media>/kit/<client id>, or None when the id could lead out of the media folder."""
    if not ID_RE.match(client_id):
        return None
    return Path(media).resolve() / "kit" / client_id


def _clients(load) -> list[Client]:
    return [Client(**c) for c in load("clients") or []]


def find_item(load, client_id: str, item_id: str) -> Optional[KitItem]:
    client = next((c for c in _clients(load) if c.id == client_id), None)
    return next((i for i in client.kit.items if i.id == item_id), None) if client and client.kit else None


KEEP = {"character": "keep their face, hair and outfit the same", "product": "keep its shape, colour and logo the same",
        "place": "keep its layout and look the same"}


def _image_numbers(numbers: list[int]) -> str:
    """'image 3 is', 'image 1\u20132 are' (a run) or 'images 1, 3 are'."""
    if len(numbers) == 1:
        return f"image {numbers[0]} is"
    if numbers == list(range(numbers[0], numbers[0] + len(numbers))):
        return f"image {numbers[0]}\u2013{numbers[-1]} are"
    return f"images {', '.join(str(n) for n in numbers)} are"


def kit_prefix(items: list[tuple[KitItem, list[int]]]) -> str:
    """The English lines put before a prompt so the model knows what each reference image is. `items` are the
    kit items in use, each with the 1-based positions of its images in the whole reference list. The first image
    sentence opens with 'Reference images:'; the style lines come last."""
    lines, styles = [], []
    for item, numbers in items:
        note = f" ({item.note})" if item.note else ""
        if item.kind == "style":
            styles.append(f"Style: {item.name} \u2014 {item.note}." if item.note else f"Style: {item.name}.")
        elif numbers:
            text = f'{_image_numbers(numbers)} the {item.kind} "{item.name}"{note} \u2014 {KEEP[item.kind]}.'
            lines.append(text)
    if lines:
        lines[0] = f"Reference images: {lines[0]}"
        lines[1:] = [f"{l[0].upper()}{l[1:]}" for l in lines[1:]]
    return "".join(f"{l}\n" for l in [*lines, *styles])


def error(status: int, message: str) -> JSONResponse:
    return JSONResponse({"error": message}, status_code=status)


def _next_stamp(previous: int = 0) -> int:
    return max(int(time.time() * 1000), previous + 1)


def _validation_message(e: ValidationError) -> str:
    first = e.errors()[0]
    field = ".".join(str(p) for p in first["loc"])
    return f"Invalid {field}: {first['msg']}." if field else BAD_BODY


def make_router(load, save, media_dir: Callable[[], Path]) -> APIRouter:
    router = APIRouter()

    def find(client_id: str):
        """(all clients, this client) or (None, None)."""
        if kit_folder(media_dir(), client_id) is None:
            return None, None
        clients = _clients(load)
        return clients, next((c for c in clients if c.id == client_id), None)

    def locate(client_id: str, item_id: str):
        """(clients, client, item); client or item is None when missing."""
        clients, client = find(client_id)
        if client is None:
            return None, None, None
        item = next((i for i in client.kit.items if i.id == item_id), None) if client.kit else None
        return clients, client, item

    def taken(client: Client, name: str, except_id: Optional[str] = None) -> bool:
        return any(i.name.lower() == name.lower() and i.id != except_id for i in (client.kit.items if client.kit else []))

    async def body_of(request: Request, model):
        try:
            return model(**(await request.json())), None
        except ValidationError as e:
            return None, error(422, _validation_message(e))
        except (ValueError, TypeError):
            return None, error(422, BAD_BODY)

    @router.get("/api/clients/{client_id}/kit")
    def get_kit(client_id: str):
        _, client = find(client_id)
        if client is None:
            return error(404, NO_CLIENT)
        return client.kit or Kit()

    @router.post("/api/clients/{client_id}/kit/items", status_code=201)
    async def create_item(client_id: str, request: Request):
        body, bad = await body_of(request, ItemIn)
        if bad:
            return bad
        with lock:
            clients, client = find(client_id)
            if client is None:
                return error(404, NO_CLIENT)
            kit = client.kit or Kit()
            if len(kit.items) >= MAX_ITEMS:
                return error(422, TOO_MANY_ITEMS)
            if taken(client, body.name):
                return error(422, DUPLICATE)
            try:
                item = KitItem(id=f"k_{secrets.token_urlsafe(9)}", kind=body.kind, name=body.name, note=body.note,
                               updatedAt=_next_stamp())
            except ValidationError as e:
                return error(422, _validation_message(e))
            kit.items.append(item)
            client.kit = kit
            save("clients", clients)
            return JSONResponse(item.model_dump(), status_code=201)

    @router.patch("/api/clients/{client_id}/kit/items/{item_id}")
    async def patch_item(client_id: str, item_id: str, request: Request):
        body, bad = await body_of(request, ItemPatch)
        if bad:
            return bad
        with lock:
            clients, client, item = locate(client_id, item_id)
            if client is None:
                return error(404, NO_CLIENT)
            if item is None:
                return error(404, NO_ITEM)
            fields = body.model_dump(exclude_none=True)
            if "name" in fields and taken(client, fields["name"], item.id):
                return error(422, DUPLICATE)
            try:
                updated = KitItem(**{**item.model_dump(), **fields, "updatedAt": _next_stamp(item.updatedAt)})
            except ValidationError as e:
                return error(422, _validation_message(e))
            client.kit.items = [updated if i.id == item.id else i for i in client.kit.items]
            save("clients", clients)
            return updated

    @router.delete("/api/clients/{client_id}/kit/items/{item_id}")
    def delete_item(client_id: str, item_id: str):
        with lock:
            clients, client, item = locate(client_id, item_id)
            if client is None:
                return error(404, NO_CLIENT)
            if item is None:
                return error(404, NO_ITEM)
            client.kit.items = [i for i in client.kit.items if i.id != item.id]
            save("clients", clients)
            folder = kit_folder(media_dir(), client_id)
            for name in item.images:
                (folder / name).unlink(missing_ok=True)
            return client.kit

    @router.put("/api/clients/{client_id}/kit/items/{item_id}/images")
    async def put_image(client_id: str, item_id: str, request: Request):
        ext = IMAGE_TYPES.get(request.headers.get("content-type", "").split(";")[0].strip().lower())
        if ext is None:
            return error(415, NOT_IMAGE)
        declared = request.headers.get("content-length", "")
        if declared.isdigit() and int(declared) > MAX_IMAGE_BYTES:
            return error(413, IMAGE_TOO_BIG)
        _, client, item = locate(client_id, item_id)
        if client is None:
            return error(404, NO_CLIENT)
        if item is None:
            return error(404, NO_ITEM)
        if len(item.images) >= MAX_IMAGES:
            return error(422, TOO_MANY_IMAGES)
        folder = kit_folder(media_dir(), client_id)
        folder.mkdir(parents=True, exist_ok=True)
        name = f"ka_{secrets.token_urlsafe(9)}.{ext}"
        part = folder / f".{name}.part"
        size, head = 0, b""
        try:
            with open(part, "wb") as f:
                async for chunk in request.stream():
                    size += len(chunk)
                    if size > MAX_IMAGE_BYTES:
                        part.unlink(missing_ok=True)
                        return error(413, IMAGE_TOO_BIG)
                    if len(head) < 16:
                        head += chunk[:16 - len(head)]
                    f.write(chunk)
            if not generations.image_header_ok(ext, head):
                part.unlink(missing_ok=True)
                return error(415, NOT_IMAGE)
            with lock:
                clients, client, item = locate(client_id, item_id)
                if client is None or item is None or len(item.images) >= MAX_IMAGES:
                    part.unlink(missing_ok=True)
                    if client is None:
                        return error(404, NO_CLIENT)
                    return error(404, NO_ITEM) if item is None else error(422, TOO_MANY_IMAGES)
                os.replace(part, folder / name)
                updated = item.model_copy(update={"images": [*item.images, name],
                                                  "updatedAt": _next_stamp(item.updatedAt)})
                client.kit.items = [updated if i.id == item.id else i for i in client.kit.items]
                save("clients", clients)
                return updated
        except BaseException:
            part.unlink(missing_ok=True)
            raise

    @router.delete("/api/clients/{client_id}/kit/items/{item_id}/images/{name}")
    def delete_image(client_id: str, item_id: str, name: str):
        with lock:
            clients, client, item = locate(client_id, item_id)
            if client is None:
                return error(404, NO_CLIENT)
            if item is None:
                return error(404, NO_ITEM)
            if name not in item.images:
                return error(404, NO_IMAGE)
            updated = item.model_copy(update={"images": [n for n in item.images if n != name],
                                              "updatedAt": _next_stamp(item.updatedAt)})
            client.kit.items = [updated if i.id == item.id else i for i in client.kit.items]
            save("clients", clients)
            (kit_folder(media_dir(), client_id) / name).unlink(missing_ok=True)
            return updated

    @router.get("/api/clients/{client_id}/kit/files/{name}")
    def get_file(client_id: str, name: str):
        _, client = find(client_id)
        if client is None:
            return error(404, NO_CLIENT)
        if not any(name in i.images for i in (client.kit.items if client.kit else [])):
            return error(404, NO_IMAGE)
        path = kit_folder(media_dir(), client_id) / name
        if not path.is_file():
            return error(404, NO_IMAGE)
        return FileResponse(path, media_type=MEDIA_TYPES[path.suffix[1:]])

    return router
