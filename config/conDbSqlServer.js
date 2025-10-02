const sql = require('mssql');

const sqlConfig = {
  server: '172.99.8.18',
  user: 'usr_bsc',
  password: 'bi@3879',
  database: 'cursoIA',
  port: 1433,
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
