const mysql = require('mysql2');

// Konfigurasi koneksi MySQL
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'alterkai', // Ganti 'nama_database' dengan nama database yang Anda gunakan
  connectionLimit: 10,
});

module.exports = pool.promise();
