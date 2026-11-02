"""A client's brand kit: the logo file, the font and the colour. The kit lives on the client record (so the
client list and the editor share it); the logo file lives in media/brand/<client id>/. Only signed-in staff
reach these routes."""

import os
import secrets
import threading
from pathlib import Path
from typing import Callable, Literal, Optional

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

import generations
from canvas import ID_RE
from models import Brand, Client, Hex

MAX_LOGO_BYTES = 5 * 1024 * 1024
LOGO_TYPES = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
NO_CLIENT = "That client doesn't exist."
NOT_LOGO = "The logo must be a PNG, JPG or WebP image."
LOGO_TOO_BIG = "The logo is over the 5 MB limit."
NO_LOGO = "This client has no logo."

lock = threading.Lock()


class BrandIn(BaseModel):
    font: Literal["Noto Sans TC"] = "Noto Sans TC"
    color: Optional[Hex] = None


def brand_folder(media: Path, client_id: str) -> Optional[Path]:
    """<media>/brand/<client id>, or None when the id could lead out of the media folder."""
    if not ID_RE.match(client_id):
        return None
    return Path(media).resolve() / "brand" / client_id


def error(status: int, message: str) -> JSONResponse:
    return JSONResponse({"error": message}, status_code=status)


def make_router(load, save, media_dir: Callable[[], Path]) -> APIRouter:
    router = APIRouter()

    def find(client_id: str):
        """(all clients, this client) or (None, None)."""
        if brand_folder(media_dir(), client_id) is None:
            return None, None
        clients = [Client(**c) for c in load("clients") or []]
        return clients, next((c for c in clients if c.id == client_id), None)

    @router.put("/api/clients/{client_id}/brand")
    def put_brand(client_id: str, body: BrandIn):
        with lock:
            clients, client = find(client_id)
            if client is None:
                return error(404, NO_CLIENT)
            client.brand = Brand(logo=client.brand.logo if client.brand else None, font=body.font, color=body.color)
            save("clients", clients)
            return client.brand

    @router.put("/api/clients/{client_id}/brand/logo")
    async def put_logo(client_id: str, request: Request):
        ext = LOGO_TYPES.get(request.headers.get("content-type", "").split(";")[0].strip().lower())
        if ext is None:
            return error(415, NOT_LOGO)
        declared = request.headers.get("content-length", "")
        if declared.isdigit() and int(declared) > MAX_LOGO_BYTES:
            return error(413, LOGO_TOO_BIG)
        _, client = find(client_id)
        if client is None:
            return error(404, NO_CLIENT)
        folder = brand_folder(media_dir(), client_id)
        folder.mkdir(parents=True, exist_ok=True)
        name = f"logo-{secrets.token_urlsafe(9)}.{ext}"
        part = folder / f".{name}.part"
        size, head = 0, b""
        try:
            with open(part, "wb") as f:
                async for chunk in request.stream():
                    size += len(chunk)
                    if size > MAX_LOGO_BYTES:
                        part.unlink(missing_ok=True)
                        return error(413, LOGO_TOO_BIG)
                    if len(head) < 16:
                        head += chunk[:16 - len(head)]
                    f.write(chunk)
            if not generations.image_header_ok(ext, head):
                part.unlink(missing_ok=True)
                return error(415, NOT_LOGO)
            with lock:
                clients, client = find(client_id)
                if client is None:
                    part.unlink(missing_ok=True)
                    return error(404, NO_CLIENT)
                old = client.brand.logo if client.brand else None
                os.replace(part, folder / name)
                base = client.brand or Brand()
                client.brand = Brand(logo=name, font=base.font, color=base.color)
                save("clients", clients)
                if old:
                    (folder / old).unlink(missing_ok=True)
                return client.brand
        except BaseException:
            part.unlink(missing_ok=True)
            raise

    @router.get("/api/clients/{client_id}/brand/logo")
    def get_logo(client_id: str):
        _, client = find(client_id)
        if client is None:
            return error(404, NO_CLIENT)
        logo = client.brand.logo if client.brand else None
        path = brand_folder(media_dir(), client_id) / logo if logo else None
        if path is None or not path.is_file():
            return error(404, NO_LOGO)
        return FileResponse(path, media_type={"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}[
            path.suffix[1:]])

    @router.delete("/api/clients/{client_id}/brand/logo")
    def delete_logo(client_id: str):
        with lock:
            clients, client = find(client_id)
            if client is None:
                return error(404, NO_CLIENT)
            old = client.brand.logo if client.brand else None
            if old:
                client.brand = Brand(logo=None, font=client.brand.font, color=client.brand.color)
                save("clients", clients)
                (brand_folder(media_dir(), client_id) / old).unlink(missing_ok=True)
            return client.brand or Brand()

    return router
