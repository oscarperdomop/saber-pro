from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ProgramaAcademico, Usuario


class UsuariosListSearchTests(APITestCase):
    def setUp(self):
        self.url = reverse('usuarios_list')

        self.admin = Usuario.objects.create_user(
            correo_institucional='admin@usco.edu.co',
            password='admin123',
            documento='900000001',
            tipo_documento='CC',
            nombres='ADMIN',
            apellidos='ROOT',
            rol=Usuario.ROL_ADMIN,
        )
        self.client.force_authenticate(self.admin)

        self.usuario_objetivo = Usuario.objects.create_user(
            correo_institucional='oscar.perdomo@usco.edu.co',
            password='123456',
            documento='100000001',
            tipo_documento='CC',
            nombres='OSCAR E',
            apellidos='PERDOMO',
            rol=Usuario.ROL_ESTUDIANTE,
        )
        Usuario.objects.create_user(
            correo_institucional='juan.tesuno@usco.edu.co',
            password='123456',
            documento='100000002',
            tipo_documento='CC',
            nombres='JUAN',
            apellidos='TESUNO',
            rol=Usuario.ROL_ESTUDIANTE,
        )

    def test_search_encuentra_por_nombre_completo_con_nombre_y_apellido(self):
        response = self.client.get(self.url, {'search': 'oscar e p'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        correos = [row['correo_institucional'] for row in response.data['results']]
        self.assertIn(self.usuario_objetivo.correo_institucional, correos)

    def test_search_normaliza_espacios_multiples(self):
        response = self.client.get(self.url, {'search': '   oscar    e   p   '})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        correos = [row['correo_institucional'] for row in response.data['results']]
        self.assertIn(self.usuario_objetivo.correo_institucional, correos)


class UsuariosListFilterTests(APITestCase):
    def setUp(self):
        self.url = reverse('usuarios_list')

        self.admin = Usuario.objects.create_user(
            correo_institucional='admin.filters@usco.edu.co',
            password='admin123',
            documento='900000021',
            tipo_documento='CC',
            nombres='ADMIN',
            apellidos='FILTERS',
            rol=Usuario.ROL_ADMIN,
        )
        self.client.force_authenticate(self.admin)

        self.programa_ing = ProgramaAcademico.objects.create(
            codigo_snies='SNIES-1001',
            nombre='Ingenieria de Software',
            facultad='Ingenieria',
            sede='Principal',
        )
        self.programa_der = ProgramaAcademico.objects.create(
            codigo_snies='SNIES-1002',
            nombre='Derecho',
            facultad='Ciencias Juridicas',
            sede='Principal',
        )

        self.usuario_profesor = Usuario.objects.create_user(
            correo_institucional='profesor.filters@usco.edu.co',
            password='123456',
            documento='100000121',
            tipo_documento='CC',
            nombres='PROFESOR',
            apellidos='ACTIVO',
            rol=Usuario.ROL_PROFESOR,
            is_staff=True,
            programa=self.programa_ing,
            is_active=True,
        )
        self.usuario_estudiante_inactivo = Usuario.objects.create_user(
            correo_institucional='estudiante.inactivo@usco.edu.co',
            password='123456',
            documento='100000122',
            tipo_documento='CC',
            nombres='ESTUDIANTE',
            apellidos='INACTIVO',
            rol=Usuario.ROL_ESTUDIANTE,
            programa=self.programa_der,
            is_active=False,
        )

    def test_filtra_por_rol(self):
        response = self.client.get(self.url, {'rol': 'PROFESOR'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 1)
        self.assertTrue(all(row['rol'] == Usuario.ROL_PROFESOR for row in response.data['results']))

    def test_filtra_por_is_active(self):
        response = self.client.get(self.url, {'is_active': 'false'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 1)
        self.assertTrue(all(not bool(row['is_active']) for row in response.data['results']))

    def test_filtra_por_programa(self):
        response = self.client.get(self.url, {'programa': str(self.programa_ing.id)})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 1)
        correos = [row['correo_institucional'] for row in response.data['results']]
        self.assertIn(self.usuario_profesor.correo_institucional, correos)
        self.assertNotIn(self.usuario_estudiante_inactivo.correo_institucional, correos)

    def test_filtra_por_semestre(self):
        self.usuario_profesor.semestre_actual = 7
        self.usuario_profesor.save(update_fields=['semestre_actual'])
        self.usuario_estudiante_inactivo.semestre_actual = 3
        self.usuario_estudiante_inactivo.save(update_fields=['semestre_actual'])

        response = self.client.get(self.url, {'semestre': '7'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 1)
        correos = [row['correo_institucional'] for row in response.data['results']]
        self.assertIn(self.usuario_profesor.correo_institucional, correos)
        self.assertNotIn(self.usuario_estudiante_inactivo.correo_institucional, correos)


class UsuariosExportExcelTests(APITestCase):
    def setUp(self):
        self.url = reverse('usuarios_export_excel')

        self.admin = Usuario.objects.create_user(
            correo_institucional='admin.export@usco.edu.co',
            password='admin123',
            documento='900000031',
            tipo_documento='CC',
            nombres='ADMIN',
            apellidos='EXPORT',
            rol=Usuario.ROL_ADMIN,
        )
        self.client.force_authenticate(self.admin)

        self.programa = ProgramaAcademico.objects.create(
            codigo_snies='SNIES-2001',
            nombre='Ingenieria de Software',
            facultad='Ingenieria',
            sede='Principal',
        )

        Usuario.objects.create_user(
            correo_institucional='estudiante.export@usco.edu.co',
            password='123456',
            documento='100000131',
            tipo_documento='CC',
            nombres='USUARIO',
            apellidos='EXCEL',
            rol=Usuario.ROL_ESTUDIANTE,
            programa=self.programa,
            is_active=True,
            semestre_actual=8,
        )

    def test_export_excel_devuelve_archivo_xlsx(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response['Content-Type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        self.assertIn('reporte_usuarios.xlsx', response['Content-Disposition'])
        self.assertGreater(len(response.content), 0)

    def test_export_excel_respeta_filtros(self):
        response = self.client.get(
            self.url,
            {
                'rol': 'ESTUDIANTE',
                'is_active': 'true',
                'programa': str(self.programa.id),
                'semestre': '8',
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.content), 0)


class UsuariosDeleteRulesTests(APITestCase):
    def setUp(self):
        self.admin_autenticado = Usuario.objects.create_user(
            correo_institucional='admin.auth@usco.edu.co',
            password='admin123',
            documento='900000011',
            tipo_documento='CC',
            nombres='ADMIN',
            apellidos='AUTH',
            rol=Usuario.ROL_ADMIN,
        )
        self.client.force_authenticate(self.admin_autenticado)

        self.superusuario_objetivo = Usuario.objects.create_user(
            correo_institucional='admin.target@usco.edu.co',
            password='admin123',
            documento='900000012',
            tipo_documento='CC',
            nombres='ADMIN',
            apellidos='TARGET',
            rol=Usuario.ROL_ADMIN,
        )

        self.usuario_normal = Usuario.objects.create_user(
            correo_institucional='estudiante.target@usco.edu.co',
            password='123456',
            documento='100000111',
            tipo_documento='CC',
            nombres='USUARIO',
            apellidos='NORMAL',
            rol=Usuario.ROL_ESTUDIANTE,
        )

    def test_no_permite_eliminar_superusuario(self):
        url = reverse('usuarios_estado_update', kwargs={'user_id': self.superusuario_objetivo.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('detalle'), 'No se puede eliminar el superusuario.')
        self.assertTrue(Usuario.objects.filter(id=self.superusuario_objetivo.id).exists())

    def test_permite_eliminar_usuario_no_superusuario(self):
        url = reverse('usuarios_estado_update', kwargs={'user_id': self.usuario_normal.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Usuario.objects.filter(id=self.usuario_normal.id).exists())


class CargaMasivaCsvEncodingTests(APITestCase):
    def test_lee_csv_utf8_sig_con_tildes_correctamente(self):
        csv_content = (
            "documento;tipo_documento;nombres;apellidos;correo_institucional;programa;genero;semestre\r\n"
            "1001234567;CC;JOSÉ;PÉREZ;jose.perez@usco.edu.co;INGENIERÍA DE SOFTWARE;M;5\r\n"
        ).encode('utf-8-sig')

        uploaded = SimpleUploadedFile('usuarios.csv', csv_content, content_type='text/csv')

        # Import local para evitar dependencia circular en import-time de tests.
        from .views import CargaMasivaUsuariosView

        df = CargaMasivaUsuariosView._read_csv_uploaded_file(uploaded)

        self.assertEqual(df.iloc[0]['apellidos'], 'PÉREZ')
        self.assertEqual(df.iloc[0]['programa'], 'INGENIERÍA DE SOFTWARE')
