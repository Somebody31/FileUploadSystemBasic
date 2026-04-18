const express = require('express');
const multer = require('multer');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Database connection — change these to match your MySQL setup
// Database connection — change these to match your MySQL setup
var dbConfig = {
  user: 'file_user', // Use a specific user instead of 'root' for better security/access
  password: '',
  database: 'file_upload_db'
};

// Auto-detect: use socket if available, otherwise use host
var socketFile = path.join(__dirname, 'mysql.sock');
if (fs.existsSync(socketFile)) {
  dbConfig.socketPath = socketFile;
} else {
  dbConfig.host = 'localhost';
}

const pool = mysql.createPool(dbConfig);

// Multer: save uploaded files to ./uploads with a unique name
const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads',
    filename: function (req, file, cb) {
      cb(null, Date.now() + '_' + file.originalname);
    }
  })
});

// Middleware
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Serve the main page
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Create uploads folder if it doesn't exist
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// Upload a file
app.post('/upload', upload.single('file'), async function (req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    await pool.execute(
      'INSERT INTO files (filename, filepath) VALUES (?, ?)',
      [req.file.originalname, req.file.filename]
    );
    res.json({ message: 'File uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// List all files
app.get('/files', async function (req, res) {
  try {
    var [rows] = await pool.execute('SELECT * FROM files ORDER BY upload_date DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete a file
app.delete('/files/:id', async function (req, res) {
  try {
    var [rows] = await pool.execute('SELECT filepath FROM files WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'File not found' });

    var filePath = './uploads/' + rows[0].filepath;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.execute('DELETE FROM files WHERE id = ?', [req.params.id]);
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Rename a file
app.put('/files/:id', async function (req, res) {
  var newName = req.body.filename;
  if (!newName) return res.status(400).json({ error: 'Filename required' });

  try {
    var [rows] = await pool.execute('SELECT filepath FROM files WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'File not found' });

    var oldFilepath = rows[0].filepath;
    var timestamp = oldFilepath.split('_')[0];
    var newFilepath = timestamp + '_' + newName;

    if (fs.existsSync('./uploads/' + oldFilepath)) {
      fs.renameSync('./uploads/' + oldFilepath, './uploads/' + newFilepath);
    }

    await pool.execute('UPDATE files SET filename = ?, filepath = ? WHERE id = ?', [newName, newFilepath, req.params.id]);
    res.json({ message: 'File renamed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, function () {
  console.log('Server running on http://localhost:' + PORT);
});