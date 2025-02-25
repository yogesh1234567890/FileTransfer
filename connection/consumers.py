import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

class SharingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Handles WebSocket connection and joins the room group."""
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        logger.info(f"WebSocket connected to room: {self.room_name}")

    async def disconnect(self, close_code):
        """Handles WebSocket disconnection and leaves the room group."""
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        logger.info(f"WebSocket disconnected from room: {self.room_name}")

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        if text_data_json["msg_type"] == "offer":
            offer = text_data_json.get("offer")
            sender = text_data_json.get("sender")
            await self.channel_layer.group_send(
                self.room_group_name,
                {"type": "chat_message", "offer": offer, "sender": sender},
            )

        elif text_data_json["msg_type"] == "answer":
            answer = text_data_json.get("answer")
            answerer = text_data_json.get("answerer")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_answer",
                    "answer": answer,
                    "answerer": answerer,
                },
            )

        elif text_data_json["msg_type"] == "candidate":
            candidate = text_data_json.get("candidate")
            print(candidate)
            await self.channel_layer.group_send(
                self.room_group_name, {"type": "ICEcandidate", "candidate": candidate}
            )

        elif text_data_json["msg_type"] == "file_info":
            data = text_data_json.get("data")
            await self.channel_layer.group_send(
                self.room_group_name, {"type": "file_info", "data": data}
            )

    async def chat_message(self, event):
        message = event["offer"]
        sender = event["sender"]
        await self.send(text_data=json.dumps({"message": message, "sender": sender}))

    async def chat_answer(self, event):
        message = event["answer"]
        answerer = event["answerer"]
        await self.send(
            text_data=json.dumps({"message": message, "answerer": answerer})
        )

    async def ICEcandidate(self, event):
        candidate = event["candidate"]
        await self.send(
            text_data=json.dumps(
                {
                    "message": "candidate",
                    "candidate": candidate,
                }
            )
        )

    async def file_info(self, event):
        data = event["data"]
        await self.send(
            text_data=json.dumps(
                {
                    "message": "file_information",
                    "data": data,
                }
            )
        )
