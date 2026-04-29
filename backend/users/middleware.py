from urllib.parse import parse_qs

import jwt
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import UntypedToken

from .models import Usuario


@database_sync_to_async
def get_user(user_id):
    try:
        return Usuario.objects.get(id=user_id)
    except Usuario.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        close_old_connections()
        scope['user'] = AnonymousUser()

        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]

        if token:
            try:
                UntypedToken(token)
                decoded_data = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                user_id = decoded_data.get('user_id')

                if user_id:
                    scope['user'] = await get_user(user_id)
            except (TokenError, jwt.PyJWTError, ValueError):
                scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
