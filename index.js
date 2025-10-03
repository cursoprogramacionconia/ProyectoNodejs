const express = require('express');
const path = require('path');

const { sql, poolPromise } = require('./config/conDbSqlServer');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const toBoolean = (value, defaultValue = true) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return value === 'true' || value === '1' || value === 1;
};

poolPromise.catch((error) => {
  console.error('No se pudo establecer la conexión inicial a SQL Server', error);
});

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  const { error } = req.query;
  const errorMessage =
    error === '1' ? 'Usuario no válido. Verifica tus credenciales.' : null;

  res.render('login', { error: errorMessage });
});

app.post('/login', async (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).render('login', {
      error: 'Debes proporcionar un correo y una contraseña.',
    });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('correo', sql.VarChar(50), correo);
    request.input('password', sql.VarChar(50), password);

    const result = await request.query(`
      SELECT TOP 1 id
      FROM dbo.usuario
      WHERE correo = @correo
        AND [password] = @password
        AND activo = 1;
    `);

    if (result.recordset?.length) {
      return res.redirect('/dashboard');
    }

    return res.status(401).render('login', {
      error: 'Usuario no válido. Verifica tus credenciales.',
    });
  } catch (error) {
    console.error('Error al iniciar sesión', error);
    return res.status(500).render('login', {
      error: 'Ocurrió un error al iniciar sesión. Inténtalo nuevamente.',
    });
  }
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard');
});

app.get('/consultas', (req, res) => {
  res.render('consultas');
});

app.get('/administracion', (req, res) => {
  res.render('administracion');
});

app.get('/documentacion', (req, res) => {
  res.render('documentacion');
});

app.get('/api/consultas', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        c.id,
        c.id_medico,
        c.id_paciente,
        c.sintomas,
        c.recomendaciones,
        c.diagnostico,
        m.primer_nombre + ' ' + m.apellido_paterno AS medico_nombre,
        p.primer_nombre + ' ' + p.apellido_paterno AS paciente_nombre
      FROM dbo.consulta c
      LEFT JOIN dbo.medicos m ON m.id = c.id_medico
      LEFT JOIN dbo.paciente p ON p.id = c.id_paciente
      ORDER BY c.id DESC
    `);

    res.json(result.recordset ?? []);
  } catch (error) {
    console.error('Error al obtener las consultas', error);
    res.status(500).json({ message: 'Error al obtener las consultas' });
  }
});

app.post('/api/consultas', async (req, res) => {
  const { id_medico, id_paciente, sintomas, recomendaciones, diagnostico } = req.body;

  if (!id_medico || !id_paciente) {
    return res.status(400).json({ message: 'Los campos id_medico e id_paciente son obligatorios' });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('id_medico', sql.Int, parseInt(id_medico, 10));
    request.input('id_paciente', sql.Int, parseInt(id_paciente, 10));
    request.input('sintomas', sql.VarChar(300), sintomas || null);
    request.input('recomendaciones', sql.VarChar(300), recomendaciones || null);
    request.input('diagnostico', sql.VarChar(500), diagnostico || null);

    const result = await request.query(`
      INSERT INTO dbo.consulta (id_medico, id_paciente, sintomas, recomendaciones, diagnostico)
      OUTPUT inserted.*
      VALUES (@id_medico, @id_paciente, @sintomas, @recomendaciones, @diagnostico)
    `);

    res.status(201).json(result.recordset?.[0] ?? null);
  } catch (error) {
    console.error('Error al registrar la consulta', error);
    res.status(500).json({ message: 'Error al registrar la consulta' });
  }
});

app.get('/api/usuarios', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        u.id,
        u.correo,
        u.password,
        u.nombre_completo,
        u.id_medico,
        u.activo,
        u.fecha_creacion,
        m.primer_nombre + ' ' + m.apellido_paterno AS medico_nombre
      FROM dbo.usuario u
      LEFT JOIN dbo.medicos m ON m.id = u.id_medico
      ORDER BY u.id DESC
    `);

    res.json(result.recordset ?? []);
  } catch (error) {
    console.error('Error al obtener los usuarios', error);
    res.status(500).json({ message: 'Error al obtener los usuarios' });
  }
});

app.post('/api/usuarios', async (req, res) => {
  const { correo, password, nombre_completo, id_medico, activo } = req.body;

  if (!correo || !password || !nombre_completo) {
    return res.status(400).json({ message: 'Los campos correo, password y nombre_completo son obligatorios' });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('correo', sql.VarChar(50), correo);
    request.input('password', sql.VarChar(50), password);
    request.input('nombre_completo', sql.VarChar(100), nombre_completo);
    request.input('id_medico', sql.Int, id_medico ? parseInt(id_medico, 10) : null);
    request.input('activo', sql.Bit, toBoolean(activo));

    const result = await request.query(`
      INSERT INTO dbo.usuario (correo, [password], nombre_completo, id_medico, activo)
      OUTPUT inserted.*
      VALUES (@correo, @password, @nombre_completo, @id_medico, @activo)
    `);

    res.status(201).json(result.recordset?.[0] ?? null);
  } catch (error) {
    console.error('Error al crear el usuario', error);
    res.status(500).json({ message: 'Error al crear el usuario' });
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { correo, password, nombre_completo, id_medico, activo } = req.body;

  if (!correo || !password || !nombre_completo) {
    return res.status(400).json({ message: 'Los campos correo, password y nombre_completo son obligatorios' });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.Int, parseInt(id, 10));
    request.input('correo', sql.VarChar(50), correo);
    request.input('password', sql.VarChar(50), password);
    request.input('nombre_completo', sql.VarChar(100), nombre_completo);
    request.input('id_medico', sql.Int, id_medico ? parseInt(id_medico, 10) : null);
    request.input('activo', sql.Bit, toBoolean(activo));

    const result = await request.query(`
      UPDATE dbo.usuario
      SET correo = @correo,
          [password] = @password,
          nombre_completo = @nombre_completo,
          id_medico = @id_medico,
          activo = @activo
      WHERE id = @id;
    `);

    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar el usuario', error);
    res.status(500).json({ message: 'Error al actualizar el usuario' });
  }
});

app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.Int, parseInt(id, 10));

    const result = await request.query(`
      DELETE FROM dbo.usuario WHERE id = @id;
    `);

    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar el usuario', error);
    res.status(500).json({ message: 'Error al eliminar el usuario' });
  }
});

app.get('/api/medicos', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        id,
        primer_nombre,
        segundo_nombre,
        apellido_paterno,
        apellido_materno,
        cedula,
        telefono,
        especialidad,
        email,
        activo,
        fecha_creacion
      FROM dbo.medicos
      ORDER BY apellido_paterno, apellido_materno, primer_nombre
    `);

    res.json(result.recordset ?? []);
  } catch (error) {
    console.error('Error al obtener los médicos', error);
    res.status(500).json({ message: 'Error al obtener los médicos' });
  }
});

app.post('/api/medicos', async (req, res) => {
  const {
    primer_nombre,
    segundo_nombre,
    apellido_paterno,
    apellido_materno,
    cedula,
    telefono,
    especialidad,
    email,
    activo,
  } = req.body;

  if (!primer_nombre || !apellido_paterno || !apellido_materno || !cedula || !telefono || !especialidad || !email) {
    return res.status(400).json({ message: 'Todos los campos obligatorios deben completarse' });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('primer_nombre', sql.VarChar(50), primer_nombre);
    request.input('segundo_nombre', sql.VarChar(50), segundo_nombre || null);
    request.input('apellido_paterno', sql.VarChar(50), apellido_paterno);
    request.input('apellido_materno', sql.VarChar(50), apellido_materno);
    request.input('cedula', sql.VarChar(30), cedula);
    request.input('telefono', sql.VarChar(15), telefono);
    request.input('especialidad', sql.VarChar(50), especialidad);
    request.input('email', sql.VarChar(30), email);
    request.input('activo', sql.Bit, toBoolean(activo));

    const result = await request.query(`
      INSERT INTO dbo.medicos (
        primer_nombre,
        segundo_nombre,
        apellido_paterno,
        apellido_materno,
        cedula,
        telefono,
        especialidad,
        email,
        activo
      )
      OUTPUT inserted.*
      VALUES (
        @primer_nombre,
        @segundo_nombre,
        @apellido_paterno,
        @apellido_materno,
        @cedula,
        @telefono,
        @especialidad,
        @email,
        @activo
      )
    `);

    res.status(201).json(result.recordset?.[0] ?? null);
  } catch (error) {
    console.error('Error al crear el médico', error);
    res.status(500).json({ message: 'Error al crear el médico' });
  }
});

app.put('/api/medicos/:id', async (req, res) => {
  const { id } = req.params;
  const {
    primer_nombre,
    segundo_nombre,
    apellido_paterno,
    apellido_materno,
    cedula,
    telefono,
    especialidad,
    email,
    activo,
  } = req.body;

  if (!primer_nombre || !apellido_paterno || !apellido_materno || !cedula || !telefono || !especialidad || !email) {
    return res.status(400).json({ message: 'Todos los campos obligatorios deben completarse' });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.Int, parseInt(id, 10));
    request.input('primer_nombre', sql.VarChar(50), primer_nombre);
    request.input('segundo_nombre', sql.VarChar(50), segundo_nombre || null);
    request.input('apellido_paterno', sql.VarChar(50), apellido_paterno);
    request.input('apellido_materno', sql.VarChar(50), apellido_materno);
    request.input('cedula', sql.VarChar(30), cedula);
    request.input('telefono', sql.VarChar(15), telefono);
    request.input('especialidad', sql.VarChar(50), especialidad);
    request.input('email', sql.VarChar(30), email);
    request.input('activo', sql.Bit, toBoolean(activo));

    const result = await request.query(`
      UPDATE dbo.medicos
      SET primer_nombre = @primer_nombre,
          segundo_nombre = @segundo_nombre,
          apellido_paterno = @apellido_paterno,
          apellido_materno = @apellido_materno,
          cedula = @cedula,
          telefono = @telefono,
          especialidad = @especialidad,
          email = @email,
          activo = @activo
      WHERE id = @id;
    `);

    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Médico no encontrado' });
    }

    res.json({ message: 'Médico actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar el médico', error);
    res.status(500).json({ message: 'Error al actualizar el médico' });
  }
});

app.delete('/api/medicos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.Int, parseInt(id, 10));

    const result = await request.query(`
      DELETE FROM dbo.medicos WHERE id = @id;
    `);

    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Médico no encontrado' });
    }

    res.json({ message: 'Médico eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar el médico', error);
    res.status(500).json({ message: 'Error al eliminar el médico' });
  }
});

app.listen(port, () => {
  console.log(`Server Iniciado (http://localhost:${port})`);
});
