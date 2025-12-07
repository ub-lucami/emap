from django.contrib import admin

from .models import Sequence, UserSequence, TestTableMigration, StepSettings

admin.site.register(Sequence)
admin.site.register(UserSequence)
admin.site.register(TestTableMigration)
admin.site.register(StepSettings)
