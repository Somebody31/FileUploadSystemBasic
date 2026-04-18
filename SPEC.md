# File Upload System — Specification

## 1. Project Structure

```
/mnt/Learning/College/NodeJs/Project/
├── server.js       # Express backend
├── package.json    # Dependencies
├── index.html      # Frontend UI
├── uploads/        # Uploaded files directory
└── SPEC.md         # This file
```

## 2. Dependencies

- `express` ^4.18.2
- `multer` ^1.4.5-lts.1
- `mysql2` ^3.6.5

## 3. Database Setup

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

## 4. API Endpoints

| Method | Endpoint    | Description                                          |
|--------|-------------|------------------------------------------------------|
| POST   | `/upload`   | Upload file (multipart form, field name: `file`)     |
| GET    | `/files`    | List all files (JSON array)                          |
| DELETE | `/files/:id`| Delete file from DB and disk                         |
| PUT    | `/files/:id`| Rename file in DB and on disk                        |

### PUT /files/:id Request Body
```json
{ "filename": "newName.ext" }
```

## 5. Filename Handling

- **Storage format:** `{timestamp}_{originalname}` (e.g., `1745059200000_image.png`)
- **Purpose:** Prevents overwrites when uploading files with same name
- **DB `filename`:** Original display name
- **DB `filepath`:** On-disk stored name (with timestamp prefix)

## 6. DELETE Flow

1. `SELECT filepath FROM files WHERE id = ?`
2. `fs.unlink('./uploads/' + filepath)`
3. `DELETE FROM files WHERE id = ?`

## 7. RENAME Flow

1. `SELECT filepath FROM files WHERE id = ?`
2. `fs.rename('./uploads/' + oldPath, './uploads/' + newPath)` where newPath = `{timestamp}_{newFilename}`
3. `UPDATE files SET filename = ?, filepath = ? WHERE id = ?`

## 8. How to Run

1. Create MySQL database and table (section 3)
2. Configure MySQL credentials in `server.js` if needed (defaults: root/root)
3. `npm install`
4. `node server.js`
5. Open `index.html` in browser or visit `http://localhost:3000/uploads` for static files

## 9. MySQL Credentials

```javascript
host: 'localhost',
user: 'root',
password: 'root',
database: 'file_upload_db'
```

Update in `server.js` if your MySQL credentials differ.