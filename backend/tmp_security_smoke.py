from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.test.utils import override_settings
from django.core.management import call_command
from django.core.management.base import CommandError
from evaluaciones.utils import limpiar_fragmento_latex
import uuid

print('=== SECURITY SMOKE TEST ===')

User = get_user_model()
student = User.objects.filter(is_active=True, is_staff=False).first()
created_temp = False

if student is None:
    student = User.objects.create_user(
        username='tmp_security_student',
        correo_institucional='tmp_security_student@usco.edu.co',
        documento='9999999999',
        nombres='Tmp',
        apellidos='Student',
        rol='ESTUDIANTE',
        password='Tmp12345!'
    )
    created_temp = True

client = APIClient()
client.force_authenticate(user=student)

admin_only_urls = [
    '/api/auth/usuarios/dashboard-stats/',
    '/api/evaluaciones/admin/simulacros/dashboard-stats/',
    f"/api/evaluaciones/admin/plantillas/{uuid.uuid4()}/exportar_excel_resultados/",
]

print('\n[1] Admin endpoints as non-admin user (expect 403):')
for u in admin_only_urls:
    r = client.get(u)
    print(f' - {u} -> {r.status_code}')

print('\n[2] bulk-update-estado as non-admin (expect 403):')
r_bulk = client.patch(
    '/api/evaluaciones/admin/preguntas/bulk-update-estado/',
    {'ids': [str(uuid.uuid4())], 'estado': 'Publicada'},
    format='json'
)
print(f' - /api/evaluaciones/admin/preguntas/bulk-update-estado/ -> {r_bulk.status_code}')

print('\n[3] LaTeX dangerous command block (expect ValueError):')
try:
    limpiar_fragmento_latex(r"\\input{secret.tex}")
    print(' - FAIL: \\input was not blocked')
except ValueError as e:
    print(' - OK:', str(e)[:120])

print('\n[4] limpiar_db kill-switch under DEBUG=False (expect CommandError):')
with override_settings(DEBUG=False):
    try:
        call_command('limpiar_db', force=True, verbosity=0)
        print(' - FAIL: command executed under DEBUG=False')
    except CommandError as e:
        print(' - OK:', str(e))

if created_temp:
    student.delete()

print('\n=== END SECURITY SMOKE TEST ===')
