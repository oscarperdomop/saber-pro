from django.apps import AppConfig


class EvaluacionesConfig(AppConfig):
    name = 'evaluaciones'

    def ready(self):
        from . import signals  # noqa: F401
