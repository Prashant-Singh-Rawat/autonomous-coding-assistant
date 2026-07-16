from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter(prefix="/ws", tags=["WebSockets"])

# Store active connections per repository ID
# repo_id -> list of WebSockets
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async connect(self, websocket: WebSocket, repo_id: str):
        await websocket.accept()
        if repo_id not in self.active_connections:
            self.active_connections[repo_id] = []
        self.active_connections[repo_id].append(websocket)

    def disconnect(self, websocket: WebSocket, repo_id: str):
        if repo_id in self.active_connections:
            if websocket in self.active_connections[repo_id]:
                self.active_connections[repo_id].remove(websocket)
            if not self.active_connections[repo_id]:
                del self.active_connections[repo_id]

    async broadcast(self, repo_id: str, message: dict):
        if repo_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[repo_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.disconnect(dead, repo_id)

manager = ConnectionManager()

@router.websocket("/repositories/{repo_id}")
async def websocket_endpoint(websocket: WebSocket, repo_id: str):
    await manager.connect(websocket, repo_id)
    try:
        # Keep connection open, wait for any incoming message (not strictly needed but keeps ws alive)
        while True:
            data = await websocket.receive_text()
            # Echo or ignore
    except WebSocketDisconnect:
        manager.disconnect(websocket, repo_id)
