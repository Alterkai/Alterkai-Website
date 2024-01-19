


[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)



# Alterkai-Manga

A simple manga reader website based on Express JS and MySQL.



## Features

- Add Manga, Chapter, Tags/Genres
- All pictures stored in Imgbox
- Token-based admin registration



## Installation

### Main files 
Git Clone this repo using commands below : 

```bash
  git clone https://github.com/Faralha/Alterkai-Website.git
```
To run the Express server, simply type `npm run devStart` (case sensitive)

### Setting up database
Create database in mysql using `CREATE DATABASE` and use it.

```mysql
  CREATE DATABASE (database_name);
  USE (database_name)
```
Change (database_name) with whatever you preferred without the ( ).

Then, Copy all lines from db.sql to mysql CLI. You're all set.

### Creating a registration token

Since admin account registration is based of "token" like, you'll need to create token manually using the sql `INSERT INTO` function.

```mysql
  INSERT INTO redeemtoken (token) VALUES ('token');
```

Change the token to suit your need.

### Registration and login links

I didn't create any button that directly sends to login/register page. So you'll need to enter the address manually.

Since this is yet to be released, i didn't configure a way to install required modules, so please install any required manually.
## Screenshots

Desktop
![image](https://github.com/Faralha/Alterkai-Website/assets/69440085/3d34b570-b3c4-486b-bb6e-4e1fccd2e4ff)
![image](https://github.com/Faralha/Alterkai-Website/assets/69440085/f077518f-a67a-4387-bdca-6bc0f3101d7f)

Mobile
![image](https://github.com/Faralha/Alterkai-Website/assets/69440085/cea594e2-5431-455b-ac7c-e680273673b4)

