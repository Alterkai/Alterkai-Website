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
        const [resultsRaw] = await db.execute(`select group_concat(g.nama) as 'genre', j.nama as 'judul', j.keterangan as 'keterangan', j.thumbnail as 'thumbnail' from judul as j left join genre_judul as gj on gj.judul_id = j.id left join genre as g on g.id = gj.genre_id group by j.nama order by j.view asc limit 5;`);
        const results = resultsRaw.map(result => {
            return {
                nama: result.judul,
                keterangan: result.keterangan,
                thumbnail: result.thumbnail,
                genre: result.genre
            }
        })

        const [judulSemua] = await db.execute(`select nama, keterangan, thumbnail from judul`)

        // Tambahkan informasi apakah pengguna sudah masuk atau tidak
        const isLoggedIn = req.isAuthenticated();  // Mengecek apakah pengguna sudah masuk atau tidak
        const username = isLoggedIn ? req.user.username : null;  // Mengambil username jika pengguna sudah masuk, null jika belum
        
        res.render('index', { judul: results, isLoggedIn, username, judulSemua });
    } catch (error) {
        console.error('Error fetching judul from MySQL:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/search', async (req, res) => {
    res.render('search.ejs')
})

app.post('/search', async (req, res) => {
    try {
        const {judul} = req.body;

        const [result] = await db.execute(`select group_concat(g.nama) as 'genre', j.nama, j.keterangan, j.thumbnail from judul as j left join genre_judul as gj on gj.judul_id = j.id left join genre as g on g.id = gj.genre_id where lower(j.nama) like lower(?) group by j.nama;`, ['%' + judul + '%']);

        res.render('search', {result, judul})
    } catch (error) {
        console.error(error)
    }
})

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



app.get('/tambah-genre/:judul', checkAuthenticated, (req, res) => {
    const judul = req.params.judul;

    res.render('tambah-genre', { judul });
})

app.post('/tambah-genre', checkAuthenticated, async (req, res) => {
    try {
        const {genre, judul} = req.body;

        const nama = judul;
        const genreMasuk = genre.split(',');
        const [judulIdRaw] = await db.execute('SELECT id FROM judul WHERE nama = ?', [nama]);
        console.log(judulIdRaw);
        const judulId = judulIdRaw[0].id;

        for (const genreFilter of genreMasuk) {
            const [checkGenre] = await db.execute('SELECT nama FROM genre WHERE nama = ?', [genreFilter]);

            if (checkGenre.length === 0) {
                await db.execute('INSERT INTO genre (nama) VALUES (?)', [genreFilter]);

                const [genreIdRaw] = await db.execute('SELECT id FROM genre WHERE nama = ?', [genreFilter]);
                const genreId = genreIdRaw[0].id;

                await db.execute('INSERT INTO genre_judul VALUES (?, ?)', [genreId, judulId]);
            } else {
                const [genreIdRaw] = await db.execute('SELECT id FROM genre WHERE nama = ?', [genreFilter]);
                const genreId = genreIdRaw[0].id;

                await db.execute('INSERT INTO genre_judul VALUES (?, ?)', [genreId, judulId]);
            }
        }
        res.redirect(`/${nama}`);
    } catch (error) {
        console.error(error);
    }
})

app.get('/tambah-manga',checkAuthenticated, (req, res) => {
    res.render('tambah-manga', { message: null});
})

app.post('/tambah-manga', checkAuthenticated, async (req, res) => {
    try {
        const { nama, keterangan, thumbnail, genre, author } = req.body;
        console.log(genre);
        await db.execute('insert into judul (nama, keterangan, thumbnail, author) values (?, ?, ?, ?)',[nama, keterangan, thumbnail, author]);

        const genreMasuk = genre.split(',');
        const [judulIdRaw] = await db.execute('SELECT id FROM judul WHERE nama = ?', [nama]);
        console.log(judulIdRaw);
        const judulId = judulIdRaw[0].id;

        for (const genreFilter of genreMasuk) {
            const [checkGenre] = await db.execute('SELECT nama FROM genre WHERE nama = ?', [genreFilter]);

            if (checkGenre.length === 0) {
                await db.execute('INSERT INTO genre (nama) VALUES (?)', [genreFilter]);

                const [genreIdRaw] = await db.execute('SELECT id FROM genre WHERE nama = ?', [genreFilter]);
                const genreId = genreIdRaw[0].id;

                await db.execute('INSERT INTO genre_judul VALUES (?, ?)', [genreId, judulId]);
            } else {
                const [genreIdRaw] = await db.execute('SELECT id FROM genre WHERE nama = ?', [genreFilter]);
                const genreId = genreIdRaw[0].id;

                await db.execute('INSERT INTO genre_judul VALUES (?, ?)', [genreId, judulId]);
            }
        }



        
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
      res.render('tambah-chapter.ejs', { message: null, judul, namaJudul });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
});

  app.post('/tambah-chapter/:judul', checkAuthenticated, async (req, res) => {
    try {
        const { chapter, link_gambar, judul_id } = req.body;
        const judul = req.params.judul;
        const manga = req.body.judul;

        const imageUrls = extractImageURLs(link_gambar);

        // Langkah 1: Sisipkan data ke dalam tabel "chapter"
        const [chapterResult] = await db.execute('INSERT INTO chapter (chapter, judul_id) VALUES (?, ?)', [chapter, judul_id]);

        // Dapatkan ID chapter yang baru disisipkan
        const newChapterId = chapterResult.insertId;

        // Langkah 2: Sisipkan data ke dalam tabel "gambar" dengan merujuk pada ID chapter yang baru
        if (Array.isArray(imageUrls)) {
            // If link_gambar is an array, iterate through the array and insert each link
            for (const link of imageUrls) {
                await db.execute('INSERT INTO gambar (link_gambar, chapter_id, judul_id) VALUES (?, ?, ?)', [link, newChapterId, judul_id]);
            }
        } else {
            // If link_gambar is not an array, insert a single link
            await db.execute('INSERT INTO gambar (link_gambar, chapter_id, judul_id) VALUES (?, ?, ?)', [imageUrls, newChapterId, judul_id]);
        }

        res.redirect(`/urutan/${manga}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin', checkAuthenticated, (req, res) => {
    res.render('admin.ejs');
});

app.get('/urutan/:manga', checkAuthenticated, async (req, res) => {
    try {
        const manga = req.params.manga;
        const [results] = await db.execute('select * from judul as j left join chapter as c on j.id = c.judul_id where j.nama = ?;',[manga]);
        
        const formattedResults = results.map(result => {
            return {
                nama: result.nama,
                chapter: result.chapter,
                urutan: result.urutan
            }
        })

        res.render('urutan', {manga, formattedResults})
    } catch (error) {
        console.error(error)
    }
})

app.post('/urutan', checkAuthenticated, async (req, res) => {
    try {
        for (const key in req.body) {
            if (key.startsWith('Urutan_')) {
                const chapter = key.replace('Urutan_', ''); // 
                const urutan = req.body[key];
                const manga = req.body.manga;
                
                await db.execute('UPDATE chapter JOIN judul ON chapter.judul_id = judul.id SET chapter.urutan = ? WHERE judul.nama = ? AND chapter.chapter = ?;', [urutan, manga, chapter])
            }
        }
        res.redirect('/');
    } catch (error) {
        console.error(error);
    }
})

app.get('/:judul', async (req, res) => {
    try {
        // Dapatkan nilai parameter judul dari URL
        const judul = req.params.judul;        

        const [viewRaw] = await db.execute('select view from judul where nama = ?', [judul]);
        let view = viewRaw[0].view+1;
        await db.execute('update judul set view = ? where nama = ?;', [view ,judul]);

        const isLoggedIn = req.isAuthenticated();  // Mengecek apakah pengguna sudah masuk atau tidak
        const username = isLoggedIn ? req.user.username : null;  // Mengambil username jika pengguna sudah masuk, null jika belum

        const [genre] = await db.execute(`select g.nama as 'genre', j.nama as 'judul' from judul as j join genre_judul as gj on gj.judul_id = j.id join genre as g on g.id = gj.genre_id where j.nama = ?;`,[judul]);

        const [results] = await db.execute('SELECT c.view,author,chapter,nama,keterangan,thumbnail,link_gambar,chapter_id,date(tanggal_dibuat) as tanggal FROM judul AS j LEFT JOIN chapter AS c ON j.id = c.judul_id LEFT JOIN gambar AS g ON c.id = g.chapter_id WHERE j.nama = ? GROUP BY g.chapter_id', [judul]);

        const formattedResults = results.map(result => {
            return {
                view: result.view,
                author: result.author,
                chapter: result.chapter,
                nama: result.nama,
                keterangan: result.keterangan,
                thumbnail: result.thumbnail,
                imageUrl: result.link_gambar,
                chapterId: result.chapter_id, // Ambil chapter_id dari tabel gambar
                tanggal: result.tanggal
            };
        });
        // Kirim data yang diperlukan ke halaman render
        res.render('judul', { judul, formattedResults, isLoggedIn, username, genre }); // Ubah sesuai kebutuhan aplikasi Anda
    } catch (error) {
        console.error('Error fetching judul details from MySQL:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/:judul/:chapter_id', async (req, res) => {
    const judul = req.params.judul;
    const chapter_id = req.params.chapter_id;
    const chapter = chapter_id
    try {
        const [results] = await db.execute('select * from gambar as g join judul as j on j.id = g.judul_id join chapter as c on c.id = g.chapter_id where j.nama = ? and c.chapter = ?;', [judul, chapter_id]);
        const nama = req.params.judul;
        
        const [viewRaw] = await db.execute('select view from chapter where chapter = ?', [chapter_id]);
        let view = viewRaw[0].view+1;
        await db.execute('update chapter set view = ? where chapter = ?',[view, chapter_id])
        console.log(view);

        const [currentChapter] = await db.execute('SELECT c.urutan FROM judul AS j LEFT JOIN chapter AS c ON j.id = c.judul_id where j.nama = ? and c.chapter = ?', [nama, chapter_id]);
        const nextUrutan = currentChapter[0].urutan + 1;
        
        const [nextChapter] = await db.execute('select c.chapter from judul as j left join chapter as c on c.judul_id = j.id where c.urutan = ? and j.nama = ?;',[nextUrutan, nama]);
        const cleanNext = nextChapter && nextChapter[0] && nextChapter[0].chapter !== undefined ? nextChapter[0].chapter : null;
        console.log(nextChapter);

        const formattedResults = results.map(result => {
            return {
                judul: result.nama,
                imageUrl: result.link_gambar,
                chapterId: result.chapter_id, // Ambil chapter_id dari tabel gambar
            };
        });

        res.render('baca', { formattedResults, nama, cleanNext, chapter})
    } catch (error) {
        console.error(error);
    }
})


function extractImageURLs(inputText) {
  
    const regex = /\[IMG\](.*?)\[\/IMG\]/g;
    const imageUrls = [];
    
    let match;
    while ((match = regex.exec(inputText)) !== null) {
      imageUrls.push(match[1]);
    }
  
    return imageUrls;
  }

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
