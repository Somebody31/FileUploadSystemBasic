# File Upload System — Documentation

## 1. Project Overview

### What the system does

A minimal full-stack file upload system that allows users to:
- **Upload** files from their computer to the server
- **View** a list of all uploaded files
- **Delete** files (removes from database AND disk)
- **Rename** files (updates database AND renames file on disk)

### Technologies used

| Layer       | Technology              |
|-------------|------------------------|
| Frontend    | Vanilla HTML + JS       |
| Backend     | Node.js + Express       |
| File Upload | Multer (middleware)     |
| Database    | MySQL (mysql2 driver)   |
| File System | Node.js fs module       |

### What problems it solves

- **No overwrites:** Files stored with timestamp prefix so two files with the same name don't clash
- **Metadata tracking:** Database stores file info (original name, storage name, upload date)
- **Clean deletion:** When a file is deleted, both the DB record AND the physical file are removed
- **Simple rename:** Both DB and disk file are renamed together to stay in sync

---

## 2. System Architecture

```
┌──────────────┐      HTTP Request       ┌──────────────┐
│              │ ──────────────────────► │              │
│   Browser    │                         │   Express    │
│   (index.html)│ ◄────────────────────── │   Server     │
│              │      JSON Response      │   (3000)     │
└──────────────┘                         └──────┬───────┘
                                               │
                          ┌────────────────────┼────────────────────┐
                          │                    │                    │
                          ▼                    ▼                    ▼
                   ┌────────────┐      ┌────────────┐      ┌────────────┐
                   │   Multer   │      │    MySQL    │      │     fs     │
                   │  (upload)  │      │  (storage)  │      │  (files)   │
                   └────────────┘      └────────────┘      └────────────┘
```

### Component roles

| Component    | Role                                                            |
|--------------|-----------------------------------------------------------------|
| `index.html` | UI for user interactions (select, upload, view, delete, rename) |
| `server.js`  | Receives HTTP requests, orchestrates processing, returns responses |
| `multer`     | Handles multipart file uploads, saves files to disk              |
| `mysql2`     | Manages database connections and queries                         |
| `fs`         | Node.js module for file operations (unlink, rename)             |
| `uploads/`   | Directory where uploaded files are physically stored            |

---

## 3. Folder Structure Explanation

```
/mnt/Learning/College/NodeJs/Project/
├── server.js       # All backend logic (routes, DB, file handling)
├── package.json    # Project metadata and npm dependencies
├── index.html      # Frontend user interface
├── uploads/        # Directory where uploaded files are stored
└── README.md       # This documentation
```

| File/Folder    | Purpose                                                                            |
|----------------|------------------------------------------------------------------------------------|
| `server.js`    | Express server that handles all API routes and file operations                     |
| `package.json` | Defines project name, version, and lists dependencies (express, multer, mysql2)   |
| `index.html`   | Single-page frontend with file input, buttons, and JavaScript for API calls       |
| `uploads/`     | Auto-created directory where uploaded files are stored on disk                     |
| `README.md`    | Documentation explaining the system internals                                       |

---

## 4. Backend Explanation

### Server Setup

```javascript
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;
```

The Express application is created and set to listen on the port specified in your environment variables, defaulting to 3000. Using `dotenv` allows you to change the port without modifying the code.

### Express Initialization

```javascript
app.use(express.json());
app.use('/uploads', express.static('uploads'));
```

- `express.json()` — parses JSON request bodies (used by PUT endpoint)
- `express.static('uploads')` — serves files in `/uploads` folder as static files

### Database Connection

```javascript
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'file_upload_db',
  socketPath: process.env.DB_SOCKET
});
```

The connection pool is configured using environment variables. This makes it easy to move the project between different machines (e.g., from a Linux machine using a Unix socket to a Windows machine using host/port) by just changing a `.env` file.

### Multer Configuration

```javascript
const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });
```

| Property       | Value                                          |
|----------------|------------------------------------------------|
| `destination`  | Files saved to `./uploads` folder             |
| `filename`    | Format `{timestamp}_{originalname}`            |
| Example        | `1745059200000_document.pdf`                   |

### Directory Creation

```javascript
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads', { recursive: true });
}
```

Ensures the uploads folder exists before server starts. `recursive: true` creates parent directories if needed.

---

### API Routes

#### POST /upload — File Upload

**Endpoint:** `/upload`
**Method:** POST
**Input:** `FormData` with field name `file` containing the file

**Process step-by-step:**

```
1. Client sends: POST /upload with FormData (field: "file")
2. Multer intercepts the request
3. Multer generates unique filename: {timestamp}_{originalname}
4. Multer saves file to: ./uploads/{timestamp}_{originalname}
5. Multer passes file info to request handler via req.file:
   - req.file.originalname → original filename from user's computer
   - req.file.filename → stored filename (with timestamp prefix)
6. Server executes SQL:
   INSERT INTO files (filename, filepath) VALUES (?, ?)
   - filename = original name (e.g., "report.pdf")
   - filepath = stored name (e.g., "1745059200000_report.pdf")
7. Server returns: { "message": "File uploaded successfully" }
```

**Response:**
```json
{ "message": "File uploaded successfully" }
```

---

#### GET /files — List All Files

**Endpoint:** `/files`
**Method:** GET
**Input:** None

**Process step-by-step:**

```
1. Client sends: GET /files
2. Server executes SQL:
   SELECT * FROM files ORDER BY upload_date DESC
3. Returns all rows from database, newest first
```

**Response:**
```json
[
  { "id": 1, "filename": "report.pdf", "filepath": "1745059200000_report.pdf", "upload_date": "2026-04-18T10:00:00.000Z" },
  { "id": 2, "filename": "image.png", "filepath": "1745059500000_image.png", "upload_date": "2026-04-18T10:05:00.000Z" }
]
```

---

#### DELETE /files/:id — Delete a File

**Endpoint:** `/files/:id`
**Method:** DELETE
**Input:** URL parameter `id` (file ID in database)

**Process step-by-step:**

```
1. Client sends: DELETE /files/1
2. Server executes SQL:
   SELECT filepath FROM files WHERE id = 1
3. If no row found → return 404 error
4. Server has filepath = "1745059200000_report.pdf"
5. Server checks if file exists: fs.existsSync('./uploads/1745059200000_report.pdf')
6. If exists → fs.unlinkSync('./uploads/1745059200000_report.pdf') (deletes from disk)
7. Server executes SQL:
   DELETE FROM files WHERE id = 1
8. Server returns: { "message": "File deleted successfully" }
```

**Response:**
```json
{ "message": "File deleted successfully" }
```

**Error cases:**
- File not found in DB → 404 response
- Database error → 500 response

---

#### PUT /files/:id — Rename a File

**Endpoint:** `/files/:id`
**Method:** PUT
**Input:** URL parameter `id` + JSON body `{ "filename": "newName.ext" }`

**Process step-by-step:**

```
1. Client sends: PUT /files/1 with body { "filename": "final_report.pdf" }
2. Server extracts: id = 1, newFilename = "final_report.pdf"
3. Server executes SQL:
   SELECT filepath FROM files WHERE id = 1
4. If no row found → return 404 error
5. Old filepath = "1745059200000_report.pdf"
   - Extract timestamp: "1745059200000"
   - Build new filepath: "1745059200000_final_report.pdf"
6. Server executes: fs.renameSync('./uploads/old', './uploads/new')
   - From: ./uploads/1745059200000_report.pdf
   - To: ./uploads/1745059200000_final_report.pdf
7. Server executes SQL:
   UPDATE files SET filename = ?, filepath = ? WHERE id = ?
   - filename = "final_report.pdf" (new display name)
   - filepath = "1745059200000_final_report.pdf" (new stored name)
8. Server returns: { "message": "File renamed successfully" }
```

**Request:**
```json
{ "filename": "final_report.pdf" }
```

**Response:**
```json
{ "message": "File renamed successfully" }
```

---

## 5. File Handling Logic

### Why timestamp is added

```
User uploads: document.pdf
Stored as:    1745059200000_document.pdf
```

**Problem without timestamp:**
- Alice uploads `report.pdf`
- Bob uploads `report.pdf`
- Second file overwrites first file
- Both see only Bob's file

**Solution with timestamp:**
- Alice uploads `report.pdf` → stored as `1745059100000_report.pdf`
- Bob uploads `report.pdf` → stored as `1745059200000_report.pdf`
- Both files exist separately

### Difference between filename and filepath

| Field     | Value                        | Used For                          |
|-----------|------------------------------|-----------------------------------|
| `filename`| `report.pdf`                 | Display in UI, user-facing name   |
| `filepath`| `1745059200000_report.pdf`   | Actual file on disk, DB queries   |

**filename** — the original name when user uploaded it. This is what the user sees in the browser. Stored in DB for display purposes.

**filepath** — the actual name on disk. Includes timestamp prefix. Used to locate and manipulate the actual file using Node.js `fs` module.

---

## 6. Database Explanation

### Table Structure

```sql
CREATE TABLE files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255),
  filepath VARCHAR(255),
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Column meanings

| Column       | Type         | Description                                                   |
|--------------|--------------|---------------------------------------------------------------|
| `id`         | INT          | Auto-incrementing primary key, unique identifier             |
| `filename`   | VARCHAR(255) | Original filename (user-facing display name)                  |
| `filepath`   | VARCHAR(255) | Actual filename on disk (with timestamp prefix)               |
| `upload_date`| TIMESTAMP    | When the file was uploaded, defaults to current timestamp      |

### Why store metadata instead of file?

**Database stores reference, not file:**

```
files table row:
├── id: 1
├── filename: "report.pdf"        ← user uploaded this
├── filepath: "1745059200000_report.pdf" ← actual file at ./uploads/1745059200000_report.pdf
└── upload_date: "2026-04-18..."
```

**Benefits:**
- Database is small and fast
- Actual files stored in filesystem (efficient for large files)
- Can query, sort, filter files easily
- File content stays in filesystem where OS handles it well

---

## 7. Frontend Explanation

### File Upload with FormData

```javascript
const input = document.getElementById('fileInput');
const formData = new FormData();
formData.append('file', input.files[0]);

fetch('/upload', {
  method: 'POST',
  body: formData
});
```

**Why FormData?**
- Standard way to send files via HTTP
- `multipart/form-data` encoding
- Multer expects this format on server side

### Fetch API Calls

| Function       | Method | URL              | Body                    |
|----------------|--------|------------------|-------------------------|
| `uploadFile()` | POST   | `/upload`        | `FormData` with file    |
| `loadFiles()`  | GET    | `/files`         | None                    |
| `deleteFile()` | DELETE | `/files/:id`     | None                    |
| `renameFile()` | PUT    | `/files/:id`     | JSON `{ filename }`     |

### Dynamic UI Updates

```javascript
function loadFiles() {
  fetch('/files')
    .then(res => res.json())
    .then(files => {
      const list = document.getElementById('fileList');
      list.innerHTML = '';
      files.forEach(file => {
        const li = document.createElement('li');
        li.innerHTML = `${file.filename} <button>Delete</button>`;
        list.appendChild(li);
      });
    });
}
```

**Flow:**
1. `loadFiles()` called on page load
2. Fetches `/files` → receives JSON array
3. Clears current list (`innerHTML = ''`)
4. Creates `<li>` for each file with buttons
5. Buttons have `onclick` handlers with file ID

---

## 8. Workflow — Step-by-Step Execution

### Upload Flow

```
Step 1: User opens index.html in browser

Step 2: User clicks "Choose File" → selects "report.pdf" from computer

Step 3: User clicks "Upload" button
        → uploadFile() function called

Step 4: JavaScript creates FormData:
        FormData = { "file": [File object: report.pdf] }

Step 5: fetch() sends:
        POST /upload
        Headers: Content-Type: multipart/form-data
        Body: FormData

Step 6: Express server receives request

Step 7: Multer middleware:
        - Generates unique name: "1745059200000_report.pdf"
        - Saves file to: ./uploads/1745059200000_report.pdf
        - Attaches info to req.file

Step 8: Route handler executes:
        INSERT INTO files (filename, filepath) 
        VALUES ('report.pdf', '1745059200000_report.pdf')

Step 9: Response returned: { "message": "File uploaded successfully" }

Step 10: JavaScript receives response
         → calls loadFiles() to refresh the list
```

### Delete Flow

```
Step 1: User sees file "report.pdf" in the list

Step 2: User clicks "Delete" button
        → deleteFile(1) called (id = 1)

Step 3: confirm() dialog appears:
        "Delete this file?"
        User clicks "OK"

Step 4: fetch() sends:
        DELETE /files/1

Step 5: Express server receives request

Step 6: Route handler:
        SELECT filepath FROM files WHERE id = 1
        → gets "1745059200000_report.pdf"

Step 7: Route handler:
        fs.unlinkSync('./uploads/1745059200000_report.pdf')
        → physical file deleted from disk

Step 8: Route handler:
        DELETE FROM files WHERE id = 1
        → database record removed

Step 9: Response returned: { "message": "File deleted successfully" }

Step 10: JavaScript receives response
         → calls loadFiles() to refresh the list
         → file no longer appears in list
```

### Rename Flow

```
Step 1: User sees file "report.pdf" in the list

Step 2: User clicks "Rename" button
        → renameFile(1, 'report.pdf') called

Step 3: prompt() dialog appears:
        "Enter new filename:"
        [report.pdf]
        User changes to "final_report.pdf" and clicks OK

Step 4: fetch() sends:
        PUT /files/1
        Headers: Content-Type: application/json
        Body: { "filename": "final_report.pdf" }

Step 5: Express server receives request
        → parses JSON body

Step 6: Route handler:
        SELECT filepath FROM files WHERE id = 1
        → gets "1745059200000_report.pdf"
        → extracts timestamp: "1745059200000"

Step 7: Route handler:
        New filepath = "1745059200000_final_report.pdf"

Step 8: Route handler:
        fs.renameSync(
          './uploads/1745059200000_report.pdf',
          './uploads/1745059200000_final_report.pdf'
        )
        → physical file renamed on disk

Step 9: Route handler:
        UPDATE files 
        SET filename = 'final_report.pdf', 
            filepath = '1745059200000_final_report.pdf' 
        WHERE id = 1

Step 10: Response returned: { "message": "File renamed successfully" }

Step 11: JavaScript receives response
         → calls loadFiles() to refresh the list
         → file now shows as "final_report.pdf"
```

---

## 9. Error Handling

### Database Connection Failure

```javascript
// If connection fails, server logs error and process exits
pool.execute('SELECT ...')
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error' });
  });
```

**What happens:**
- Server console shows: `Database error: ...`
- Client receives: `{ "error": "Database error" }`
- Server continues running (doesn't crash)

### File Not Found (DELETE)

```javascript
const [rows] = await pool.execute('SELECT filepath FROM files WHERE id = ?', [id]);

if (rows.length === 0) {
  return res.status(404).json({ error: 'File not found' });
}
```

**What happens:**
- If no file with that ID exists in DB
- Returns HTTP 404 with `{ "error": "File not found" }`
- No attempt to delete from disk (nothing to delete)

### File Not Found (PUT)

Same as DELETE — returns 404 if file ID doesn't exist.

### Multer Upload Failure

```javascript
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // ... continue
});
```

**What happens:**
- If client sends POST without file
- Returns HTTP 400 with `{ "error": "No file uploaded" }`

---

## 10. How to Run the Project

### Prerequisites

- Node.js installed
- MySQL installed and running

### Step 1: Create Database

Open MySQL CLI or GUI tool and run:

```sql
CREATE DATABASE file_upload_db;

USE file_upload_db;

CREATE TABLE files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255),
  filepath VARCHAR(255),
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Step 2: Configure Environment Variables

Create a file named `.env` in the project root directory. This tells the app how to connect to your database and what port to use.

**Example for a standard setup:**
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=file_upload_db
```

**Example if you are using a Unix Socket (like on many Linux systems):**
```env
DB_SOCKET=/path/to/mysql.sock
DB_USER=root
DB_NAME=file_upload_db
```

Using a `.env` file is a best practice because it keeps your personal database credentials out of the main code, allowing you to share the project without sharing your secrets.

### Step 3: Install Dependencies

```bash
npm install
```

This creates `node_modules/` and installs `express`, `multer`, `mysql2`.

### Step 4: Start Server

```bash
node server.js
```

Expected output:
```
Server running on http://localhost:3000
```

### Step 5: Access the Application

**Option A:** Open file directly
- Navigate to `/mnt/Learning/College/NodeJs/Project/index.html` in your file browser
- Double-click to open in browser

**Option B:** Via Express static serve
- Visit `http://localhost:3000` (server already serves index.html)

**Option C:** For file viewing
- Uploaded files accessible at: `http://localhost:3000/uploads/{filename}`

### Testing the System

1. **Upload:** Select a file and click Upload → file appears in list
2. **View:** List shows all uploaded files with original filenames
3. **Delete:** Click Delete → file removed from list and disk
4. **Rename:** Click Rename → enter new name → file renamed in list and on disk

---

## Quick Reference

| Action     | Command                            |
|------------|------------------------------------|
| Start      | `node server.js`                   |
| Database   | `file_upload_db`                   |
| Table      | `files`                            |
| Port       | `3000`                             |
| Upload dir | `./uploads`                        |
| Endpoint   | `http://localhost:3000`             |
