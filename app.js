const express = require('express');
const mysql = require('mysql');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: './.env' });

const app = express();

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('MySQL connection success');
});

app.use(bodyParser.json());
app.use(cors());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.post('/register', (req, res) => {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
        return res.status(400).json({ message: 'Please fill in all fields' });
    }

    const checkUserQuery = 'SELECT * FROM register WHERE email = ? ';
    db.query(checkUserQuery, [email], (err, results) => {
        if (err) {
            console.error('Error checking user:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const insertUserQuery = 'INSERT INTO register (email, name, password) VALUES (?, ?, ?)';
        db.query(insertUserQuery, [email, name, password], (err, result) => {
            if (err) {
                console.error('Error inserting user:', err);
                return res.status(500).json({ message: 'Database error' });
            }
            res.status(201).json({ message: 'Account created successfully' });
        });
    });
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    const loginQuery = "SELECT * FROM register WHERE email = ? AND password = ?";
    db.query(loginQuery, [email, password], (err, result) => {
        if (err) {
            res.status(500).json({ err: err });
        } else {
            if (result.length > 0) {
                const user = result[0];
                res.status(200).json({ id: user.id, email: user.email, name: user.name });
            } else {
                res.status(400).json({ message: "WRONG USERNAME OR PASSWORD!" });
            }
        }
    });
});

app.post('/addphotos', upload.array('photos', 12), (req, res) => {
    const { title, description, user_id } = req.body;
    const photoPaths = req.files.map(file => file.path);

    const insertPhotoQuery = 'INSERT INTO photos (title, description, paths, user_id) VALUES (?, ?, ?, ?)';
    db.query(insertPhotoQuery, [title, description, JSON.stringify(photoPaths), user_id], (err, result) => {
        if (err) {
            console.error('Error inserting photos:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.status(201).json({ message: 'Photos uploaded successfully' });
    });
});

app.get('/photos/:userId', (req, res) => {
    const userId = req.params.userId;
    const query = 'SELECT * FROM photos WHERE user_id = ?';
  
    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error('Error fetching photos:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.status(200).json(results);
    });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(5000, () => {
    console.log('Server started at port 5000');
});
