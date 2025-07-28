const request = require('supertest');
const app = require('../index');
const path = require('path');

// Mock de login para obtener token (ajustar usuario/clave si es necesario)
const loginAndGetToken = async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'jefe_trafico', password: '123456' });
  return res.body.token;
};

describe('Formularios API', () => {
  let token;
  beforeAll(async () => {
    token = await loginAndGetToken();
  });

  test('Enviar formulario de apertura', async () => {
    const res = await request(app)
      .post('/api/formularios/apertura')
      .set('Authorization', `Bearer ${token}`)
      .send({
        empleados_no_operativos: [],
        empleados_baja: [],
        vehiculos_no_operativos: [],
        necesitan_sustitucion: [],
        no_conectados_plataforma: [],
        sin_bateria_movil: [],
        sin_bateria_vehiculo: [],
        observaciones: 'Test apertura'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.formulario).toBeDefined();
  });

  test('Enviar formulario de cierre', async () => {
    const res = await request(app)
      .post('/api/formularios/cierre')
      .set('Authorization', `Bearer ${token}`)
      .send({
        analisis_datos: 'Análisis test',
        problemas_jornada: 'Problemas test',
        propuesta_soluciones: 'Soluciones test'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.formulario).toBeDefined();
  });

  test('Enviar incidencia sin archivos', async () => {
    const res = await request(app)
      .post('/api/formularios/incidencias')
      .set('Authorization', `Bearer ${token}`)
      .field('empleados_incidencia', JSON.stringify(['test']))
      .field('tipo_incidencia', 'Test')
      .field('observaciones', 'Incidencia sin archivo');
    expect(res.statusCode).toBe(201);
    expect(res.body.incidencia).toBeDefined();
    expect(Array.isArray(res.body.incidencia.archivos)).toBe(true);
  });

  test('Enviar incidencia con archivo', async () => {
    const res = await request(app)
      .post('/api/formularios/incidencias')
      .set('Authorization', `Bearer ${token}`)
      .field('empleados_incidencia', JSON.stringify(['test']))
      .field('tipo_incidencia', 'Test')
      .field('observaciones', 'Incidencia con archivo')
      .attach('archivos', path.join(__dirname, 'testfile.pdf'));
    expect(res.statusCode).toBe(201);
    expect(res.body.incidencia).toBeDefined();
    expect(res.body.incidencia.archivos.length).toBeGreaterThan(0);
  });

  test('Validación: falta tipo_incidencia', async () => {
    const res = await request(app)
      .post('/api/formularios/incidencias')
      .set('Authorization', `Bearer ${token}`)
      .field('empleados_incidencia', JSON.stringify(['test']))
      .field('observaciones', 'Falta tipo');
    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
}); 