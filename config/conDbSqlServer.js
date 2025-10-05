const sql = require('mssql');

const sqlConfig = {
  server: 'x.x.x.x',
  user: 'xxxxxx',
  password: 'xxxx',
  database: 'xxxxx',
  port: xxxx,
  options: {
    encrypt: false,
    trustServerCertificate: false,
  },
};

const poolPromise = new sql.ConnectionPool(sqlConfig)
  .connect()
  .then((pool) => {
    console.log('Conexión exitosa a SQL Server');
    return pool;
  })
  .catch((error) => {
    console.error('Error al conectar a SQL Server', error);
    throw error;
  });

module.exports = {
  sql,
  poolPromise,
};
