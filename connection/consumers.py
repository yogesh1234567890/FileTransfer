import json
from channels.generic.websocket import AsyncWebsocketConsumer


class SharingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Join room group for sharing files
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = "chat_%s" % self.room_name

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        if text_data_json["msg_type"] == "offer":
            offer = text_data_json.get("offer")
            sender = text_data_json.get("sender")
            await self.channel_layer.group_send(
                self.room_group_name,
                {"type": "chat_message", "offer": offer, "sender": sender},
            )

        if text_data_json["msg_type"] == "answer":
            print(text_data_json)
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
