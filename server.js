const express = require('express');
const session = require('express-session');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const passport = require('passport');
const db = require('./db');
const LocalStrategy = require('passport-local').Strategy;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Konfigurasi sesi Express
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
}));

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
  
    res.redirect('/login');
  }

passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            // Temukan pengguna berdasarkan username
            const [results] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);

            if (results.length === 0) {
                // Pengguna tidak ditemukan
                return done(null, false, { message: 'Incorrect username' });
            }

            const user = results[0];

            // Periksa kata sandi menggunakan bcrypt
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                // Kata sandi tidak cocok
                return done(null, false, { message: 'Incorrect password' });
            }

            // Autentikasi berhasil
            return done(null, user);
        } catch (error) {
            console.error(error);
            return done(error);
        }
    }
));

// Passport Configuration
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            // Temukan pengguna berdasarkan username
            const [results] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);

            if (results.length === 0) {
                // Pengguna tidak ditemukan
                return done(null, false, { message: 'Incorrect username' });
            }

            const user = results[0];

            // Periksa kata sandi menggunakan bcrypt
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                // Kata sandi tidak cocok
                return done(null, false, { message: 'Incorrect password' });
            }

            // Autentikasi berhasil
            return done(null, user);
        } catch (error) {
            console.error(error);
            return done(error);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const [results] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);

        if (results.length === 0) {
            return done(null, false);
        }

        const user = results[0];
        return done(null, user);
    } catch (error) {
        console.error(error);
        return done(error);
    }
});

app.use(passport.initialize());
app.use(passport.session());

app.get('/', async (req, res) => {
    try {
        const [results] = await db.execute('SELECT * FROM judul');
        
        // Tambahkan informasi apakah pengguna sudah masuk atau tidak
        const isLoggedIn = req.isAuthenticated();  // Mengecek apakah pengguna sudah masuk atau tidak
        const username = isLoggedIn ? req.user.username : null;  // Mengambil username jika pengguna sudah masuk, null jika belum
        
        res.render('index', { judul: results, isLoggedIn, username });
    } catch (error) {
        console.error('Error fetching judul from MySQL:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    try {
        // Ambil data dari formulir
        const { redeemToken, username, password } = req.body;

        // Periksa apakah redeemToken valid
        const [redeemResult] = await db.execute('SELECT * FROM redeemtoken WHERE token = ?', [redeemToken]);

        if (redeemResult.length === 0) {
            // Token tidak valid
            return res.redirect('/register?error=Invalid redeem token');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user baru ke tabel users
         const [result] = await db.execute(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );

        // Hapus redeemToken setelah digunakan
        await db.execute('DELETE FROM redeemtoken WHERE token = ?', [redeemToken]);

        // Redirect ke halaman login setelah berhasil register
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.redirect('/register?error=Registration failed');
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

app.get('/judul/:judul', async (req, res) => {
    try {
        // Dapatkan nilai parameter judul dari URL
        const judul = req.params.judul;

        const isLoggedIn = req.isAuthenticated();  // Mengecek apakah pengguna sudah masuk atau tidak
        const username = isLoggedIn ? req.user.username : null;  // Mengambil username jika pengguna sudah masuk, null jika belum

        // Lakukan apa yang diperlukan dengan nilai judul, misalnya dapatkan detail dari database
        // Contoh: const [results] = await db.execute('SELECT * FROM judul WHERE nama = ?', [judul]);
        const [results] = await db.execute(`
        SELECT *
        FROM judul AS j
        LEFT JOIN chapter AS c ON j.id = c.judul_id
        LEFT JOIN gambar AS g ON c.id = g.chapter_id
        WHERE j.nama = ?
        `, [judul]);

        const formattedResults = results.map(result => {
            return {
                chapter: result.chapter,
                nama: result.nama,
                keterangan: result.keterangan,
                imageUrl: result.link_gambar,
                chapterId: result.chapter_id, // Ambil chapter_id dari tabel gambar
            };
        });
        // Kirim data yang diperlukan ke halaman render
        res.render('baca', { judul: formattedResults, isLoggedIn, username }); // Ubah sesuai kebutuhan aplikasi Anda
    } catch (error) {
        console.error('Error fetching judul details from MySQL:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/tambah-manga',checkAuthenticated, (req, res) => {
    res.render('tambah-manga', { message: null});
})

app.post('/tambah-manga', async (req, res) => {
    try {
        const { nama, keterangan, thumbnail } = req.body;
        await db.execute('insert into judul (nama, keterangan, thumbnail) values (?, ?, ?)',[nama, keterangan, thumbnail]);
        res.render('tambah-manga', { message: 'Manga berhasil ditambahkan!'})
    } catch (error) {
        console.error(error);
    }
})

app.get('/tambah-chapter/:judul', checkAuthenticated, async (req, res) => {
    try {
      // Fetch judul details from the database based on the provided nama
      const namaJudul = req.params.judul;
      const [results] = await db.execute('SELECT * FROM judul WHERE nama = ?', [namaJudul]);
  
      if (results.length === 0) {
        // Handle the case where judul is not found
        return res.status(404).send('Judul not found');
      }
  
      const judul = results[0];
  
      // Render the 'tambah-chapter' page with judul data, including the 'id' property
      res.render('tambah-chapter', { message: null, judul });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
  

  app.post('/tambah-chapter/:judul', checkAuthenticated, async (req, res) => {
    try {
        const { chapter, link_gambar, judul_id } = req.body;

        // Langkah 1: Sisipkan data ke dalam tabel "chapter"
        const [chapterResult] = await db.execute('INSERT INTO chapter (chapter, judul_id) VALUES (?, ?)', [chapter, judul_id]);

        // Dapatkan ID chapter yang baru disisipkan
        const newChapterId = chapterResult.insertId;

        // Langkah 2: Sisipkan data ke dalam tabel "gambar" dengan merujuk pada ID chapter yang baru
        await db.execute('INSERT INTO gambar (link_gambar, chapter_id, judul_id) VALUES (?, ?, ?)', [link_gambar, newChapterId, judul_id]);
        res.render('tambah-chapter', { message: null, judul });
    } catch (error) {
        console.error(error);
        // Handle kesalahan dan kirim respons kesalahan ke pengguna
        res.status(500).send('Internal Server Error');
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
