# Project Functionality Guide: File Upload System

This document explains the overall architecture and features of the File Upload System.

## 1. System Overview
This is a Full-Stack web application that allows users to manage files. It uses a **Client-Server** architecture:
- **Frontend (Client)**: A single webpage (`index.html`) where the user interacts.
- **Backend (Server)**: A Node.js application (`server.js`) that handles logic and data.
- **Database**: MySQL stores information about the files (not the files themselves).
- **Storage**: The physical files are saved in a folder named `uploads/` on the server.

## 2. Dynamic Features
The system supports four main actions:

### A. File Uploading
1. User selects a file and clicks **Upload**.
2. The server receives the file and adds a **Timestamp** (like `1713420000_`) to the beginning of the name.
   - *Why?* To prevent files from overwriting each other if two users upload a file named `report.pdf`.
3. The server saves the file to the `uploads/` folder.
4. The server adds a record to the MySQL database.

### B. File Listing
1. When the page loads, it asks the server for a list of files.
2. The server queries the MySQL database and returns a list of all files, sorted by the newest first.
3. The frontend displays these files in a bulleted list.

### C. File Renaming (Inline)
1. User clicks **Rename**. A text prompt appear showing the current name.
2. User enters a new name.
3. The server renames the actual file in the `uploads/` folder and updates the record in the database.

### D. File Deletion
1. User clicks **Delete** and confirms the action.
2. The server deletes the physical file from the `uploads/` folder.
3. The server deletes the record from the MySQL database.

## 3. Technology Stack
- **Node.js**: The environment that runs our JavaScript on the computer.
- **Express**: A framework for building the web server easily.
- **Multer**: A tool (middleware) specifically for handling file uploads.
- **MySQL2**: A driver that allows Node.js to "talk" to the MySQL database.
- **HTML/JS**: The basic languages used to create the user interface in the browser.
