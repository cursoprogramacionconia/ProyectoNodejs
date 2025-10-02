const express = require('express');
const path = require('path');

const { poolPromise } = require('./config/conDbSqlServer');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

poolPromise.catch((error) => {
  console.error('No se pudo establecer la conexión inicial a SQL Server', error);
});

app.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query('SELECT SYSDATETIME() AS currentDateTime');

    res.render('index', {
      titulo: 'Mi proyecto Codex ejemplo1',
      currentDateTime: result.recordset?.[0]?.currentDateTime ?? null,
    });
  } catch (error) {
    console.error('Error al consultar SQL Server', error);
    res.status(500).send('Error al obtener datos desde SQL Server');
  }
});

app.listen(port, () => {
  console.log(`Server Iniciado (http://localhost:${port})`);
});
