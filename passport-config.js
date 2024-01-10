const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const db = require('./db'); // Menggunakan db.js untuk koneksi

function initialize(passport) {
  const authenticateUser = async (email, password, done) => {
    try {
      // Menggunakan placeholder (?) untuk menghindari SQL injection
      const [results] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

      if (results.length === 0) {
        return done(null, false, { message: 'No user with that email' });
      }

      const user = results[0];

      try {
        if (await bcrypt.compare(password, user.password)) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Password incorrect' });
        }
      } catch (e) {
        return done(e);
      }
    } catch (error) {
      return done(error);
    }
  };

  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    try {
      // Menggunakan placeholder (?) untuk menghindari SQL injection
      const [results] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);

      return done(null, results[0]);
    } catch (error) {
      return done(error);
    }
  });
}

module.exports = initialize;
