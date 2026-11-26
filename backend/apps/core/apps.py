from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = "apps.core"

    def ready(self):
        # ثبت system checkهای امنیتی (فقط در محیط تولید فعالاند).
        from . import checks  # noqa: F401
