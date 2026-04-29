from channels.generic.websocket import AsyncJsonWebsocketConsumer


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or user.is_anonymous:
            await self.close(code=4001)
            return

        self.user_group_name = f'notifications_user_{user.id}'
        await self.channel_layer.group_add(self.user_group_name, self.channel_name)

        if getattr(user, 'rol', None) == 'ESTUDIANTE':
            await self.channel_layer.group_add('notifications_students', self.channel_name)

        await self.accept()

    async def disconnect(self, _close_code):
        user = self.scope.get('user')
        if not user or user.is_anonymous:
            return

        await self.channel_layer.group_discard(self.user_group_name, self.channel_name)

        if getattr(user, 'rol', None) == 'ESTUDIANTE':
            await self.channel_layer.group_discard('notifications_students', self.channel_name)

    async def notification_message(self, event):
        await self.send_json(
            {
                'type': event.get('event_type', 'NOTIFICACION_NUEVA'),
                'mensaje': event.get('mensaje', ''),
                'payload': event.get('payload', {}),
            }
        )

    async def receive(self, text_data=None, bytes_data=None, **kwargs):
        # [!] DEFENSIVIDAD: Parche Anti-Spam
        # Los sockets de notificacion son estrictamente 'Server-Sent'.
        # Destruimos la conexion inmediatamente si un cliente "habla" para evadir Parseo de Memoria.
        await self.close(code=4003)
