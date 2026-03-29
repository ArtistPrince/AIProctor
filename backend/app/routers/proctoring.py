import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect

from .. import schemas
from ..security import require_role

router = APIRouter()
require_proctor = require_role(["super_admin", "institute_admin", "exam_admin", "proctor"])
LOG_FILE_PATH = Path(__file__).resolve().parents[2] / "upload" / "proctoring_logs.jsonl"


def _append_log(entry: dict) -> None:
	LOG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
	with LOG_FILE_PATH.open("a", encoding="utf-8") as handle:
		handle.write(json.dumps(entry, ensure_ascii=False) + "\n")


def _read_logs() -> list[dict]:
	if not LOG_FILE_PATH.exists():
		return []

	rows: list[dict] = []
	with LOG_FILE_PATH.open("r", encoding="utf-8") as handle:
		for line in handle:
			raw = line.strip()
			if not raw:
				continue
			try:
				rows.append(json.loads(raw))
			except json.JSONDecodeError:
				continue
	return rows


class ProctoringSignalHub:
	def __init__(self) -> None:
		self._rooms: dict[str, set[WebSocket]] = defaultdict(set)

	async def connect(self, room_key: str, websocket: WebSocket) -> None:
		await websocket.accept()
		self._rooms[room_key].add(websocket)

	def disconnect(self, room_key: str, websocket: WebSocket) -> None:
		room = self._rooms.get(room_key)
		if not room:
			return
		room.discard(websocket)
		if not room:
			self._rooms.pop(room_key, None)

	async def broadcast(self, room_key: str, payload: dict, sender: WebSocket) -> None:
		room = self._rooms.get(room_key, set())
		dead_sockets: list[WebSocket] = []
		message = json.dumps(payload)
		for peer in room:
			if peer is sender:
				continue
			try:
				await peer.send_text(message)
			except Exception:
				dead_sockets.append(peer)

		for dead in dead_sockets:
			self.disconnect(room_key, dead)


hub = ProctoringSignalHub()


@router.post("/proctoring/logs", response_model=schemas.ProctoringLogOut, status_code=201)
def create_proctoring_log(
	payload: schemas.ProctoringLogCreate,
	current_user=Depends(require_proctor),
):
	action = (payload.action or "").strip().lower()
	if action not in {"warning", "remark", "mode_change"}:
		raise HTTPException(status_code=400, detail="Invalid proctoring log action")

	mode = (payload.mode or "").strip().lower() or None
	if mode and mode not in {"one-way", "two-way"}:
		raise HTTPException(status_code=400, detail="Invalid proctoring mode")

	remark = (payload.remark or "").strip() or None
	if action in {"warning", "remark"} and not remark:
		raise HTTPException(status_code=400, detail="Remark is required for warning/remark logs")

	now = datetime.now(timezone.utc)
	entry = {
		"id": str(uuid4()),
		"exam_id": payload.exam_id,
		"student_id": payload.student_id,
		"action": action,
		"remark": remark,
		"mode": mode,
		"proctor_id": str(current_user.id),
		"proctor_email": current_user.email,
		"created_at": now.isoformat(),
	}

	_append_log(entry)

	return schemas.ProctoringLogOut(
		id=entry["id"],
		exam_id=entry["exam_id"],
		student_id=entry["student_id"],
		action=entry["action"],
		remark=entry["remark"],
		mode=entry["mode"],
		proctor_id=entry["proctor_id"],
		proctor_email=entry["proctor_email"],
		created_at=now,
	)


@router.get("/proctoring/logs", response_model=list[schemas.ProctoringLogOut])
def list_proctoring_logs(
	exam_id: str,
	student_id: str,
	current_user=Depends(require_proctor),
):
	del current_user
	logs = _read_logs()
	filtered = [
		item for item in logs
		if item.get("exam_id") == exam_id and item.get("student_id") == student_id
	]

	result: list[schemas.ProctoringLogOut] = []
	for item in filtered:
		created_raw = item.get("created_at")
		try:
			created = datetime.fromisoformat(created_raw) if created_raw else datetime.now(timezone.utc)
		except ValueError:
			created = datetime.now(timezone.utc)

		result.append(
			schemas.ProctoringLogOut(
				id=str(item.get("id") or uuid4()),
				exam_id=str(item.get("exam_id") or ""),
				student_id=str(item.get("student_id") or ""),
				action=str(item.get("action") or "remark"),
				remark=item.get("remark"),
				mode=item.get("mode"),
				proctor_id=item.get("proctor_id"),
				proctor_email=item.get("proctor_email"),
				created_at=created,
			)
		)

	return sorted(result, key=lambda row: row.created_at, reverse=True)


@router.websocket("/proctoring/ws/{exam_id}/{student_id}")
async def proctoring_signal_socket(
	websocket: WebSocket,
	exam_id: str,
	student_id: str,
):
	role = (websocket.query_params.get("role") or "unknown").strip().lower()
	room_key = f"{exam_id}:{student_id}"
	await hub.connect(room_key, websocket)

	await hub.broadcast(
		room_key,
		{
			"type": "peer-joined",
			"role": role,
		},
		sender=websocket,
	)

	try:
		while True:
			raw = await websocket.receive_text()
			try:
				message = json.loads(raw)
			except json.JSONDecodeError:
				continue

			payload = {
				**message,
				"from_role": role,
			}
			await hub.broadcast(room_key, payload, sender=websocket)
	except WebSocketDisconnect:
		hub.disconnect(room_key, websocket)
		await hub.broadcast(
			room_key,
			{
				"type": "peer-left",
				"role": role,
			},
			sender=websocket,
		)
