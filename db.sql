CREATE TABLE genre (
    id   INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(20) NOT NULL
);

CREATE TABLE judul (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    nama       VARCHAR(50) NOT NULL,
    keterangan VARCHAR(255) NOT NULL,
    thumbnail  VARCHAR(50)
);

CREATE TABLE chapter (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    chapter  VARCHAR(20) NOT NULL,
    judul_id INT NOT NULL,
    FOREIGN KEY (judul_id) REFERENCES judul (id) ON DELETE CASCADE
);

CREATE TABLE gambar (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    link_gambar VARCHAR(100) NOT NULL,
    chapter_id  INT NOT NULL,
    judul_id    INT NOT NULL,
    FOREIGN KEY (chapter_id) REFERENCES chapter (id) ON DELETE CASCADE,
    FOREIGN KEY (judul_id) REFERENCES judul (id) ON DELETE CASCADE
);


CREATE TABLE relation_3 (
    genre_id   INT NOT NULL,
    chapter_id INT NOT NULL,
    PRIMARY KEY (genre_id, chapter_id),
    FOREIGN KEY (chapter_id) REFERENCES chapter (id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genre (id) ON DELETE CASCADE
);


CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE redeemtoken (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    is_redeemed BOOLEAN DEFAULT 0
);
