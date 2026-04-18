# Code Details: Technical Explanation

This document explains the technical concepts and specific JavaScript functions used in this project, written for someone learning for the first time.

---

## 0. The Big Picture (For Beginners)

If you are new to programming, think of a website like building a **Restaurant**:

1.  **HTML (`index.html`) - The Menu and the Tables**: 
    - This is the **structure**. It defines what text, buttons, and input boxes appear on the screen. If it's not in the HTML, the customer (user) can't see it.
2.  **JavaScript (`index.html` <script> and `server.js`) - The Waiter and the Chef**: 
    - This is the **logic**.
    - The **Frontend JS** is like a waiter who takes your order (clicks) and brings it to the kitchen.
    - The **Backend JS (Node.js)** is like the chef who decides how to process the order (saving a file, talking to the database).
3.  **MySQL - The Pantry (Storage)**: 
    - This is the **memory**. Just like a pantry stores ingredients for the next day, MySQL stores the names of the files even if you turn off the computer.

---

### `fetch()` - Making HTTP Requests
In the frontend, we use the `fetch()` function to "talk" to the server.
- **Example**: `fetch('/upload', { method: 'POST', body: formData })`
- **What it does**: It tells the browser to send a request to the server at the `/upload` endpoint.
- **Parameters**: 
  - The first parameter is the **URL** (e.g., `/files`).
  - The second is an **Options object** where we specify the method (`POST`, `PUT`, `DELETE`) and the data we are sending (`body`).

### `.then()` - Handling Responses (Asynchronous)
JavaScript is "non-blocking," meaning it doesn't wait for the server to finish. `fetch()` returns a **Promise**.
- **What it does**: `.then()` says "Wait for the server to respond, AND THEN do this."
- **Example**: `.then(res => res.json())` converts the server's raw response into a usable JavaScript object (JSON).

### `innerHTML` vs `textContent`
We use these to update the webpage dynamically:
- **`innerHTML`**: Used to insert HTML tags. 
  - Example: `li.innerHTML = "... <button>Delete</button>";`
  - *Note*: It's used here for simplicity, but avoid it with user-input for better security.
- **`textContent`**: Used to insert plain text. It's safer because it treats everything as text, not code.

### `document.createElement()`
Instead of just writing text, we create "objects" that represent HTML tags.
- **Example**: `var li = document.createElement('li');`
- **Benefit**: It allows us to build the UI piece-by-piece and attach complex logic (like `onclick` handlers) directly to the element.

---

## 1.5 The Secret to `async` and `await`

Imagine you are at a coffee shop:

- **Without `async/await` (Blocking)**: The cashier takes your order, then stands still and ignores everyone else until your coffee is ready. The line stores growing. This is bad.
- **With Callbacks (Messy)**: The cashier gives you a buzzer and says "When this beeps, come back." It works, but if you have a complex order (coffee, then cake, then water), you end up with 3 buzzers and a lot of confusion.
- **With `async/await` (Modern)**: 
  - **`async`**: This keyword tells JavaScript: "This function is going to involve waiting for something (like a database)."
  - **`await`**: This keyword is the actual "wait" command. It says: "Pause right here until the database gives us the data. Once it's ready, move to the next line."

The magic is that while one "waiter" is waiting for your coffee, other waiters can still take other orders. The server stays fast!

---

## 2. Backend: server.js Explained

### `multer` - File Handling Middleware
Handling files is different from handling text.
- **Role**: It parses the incoming "multi-part form data" (the file) and saves it to the disk.
- **`Date.now()`**: We use this to get a unique number (milliseconds since 1970) to prefix our filenames.

### `mysql2/promise` - Database Connection
We use the "promise" version of the MySQL library so we can use `async/await`.
- **`pool.execute(sql, [values])`**: 
  - `sql` is the raw SQL command (e.g., `INSERT INTO...`).
  - `[values]` are the variables we want to insert. We use **`?`** in the SQL as placeholders to prevent "SQL Injection" (a type of hacking).

### `app.use(express.json())`
This is a "middleware" that tells our server how to read JSON data sent in a request body (like when we send the new name during a rename operation).

### `app.static('uploads')`
This tells Express that any files inside the `uploads` folder should be accessible directly via a URL. 
- Example: If you have `123_test.txt`, you can visit `http://localhost:3000/uploads/123_test.txt` to see it.

### `path.join(__dirname, ...)`
- **`__dirname`**: A global variable in Node.js that points to the folder where the `server.js` file is located.
- **`path.join`**: A safe way to combine folders and file names together, regardless of whether you are on Windows, Mac, or Linux.

---

## 3. Step-by-Step: The Life of an Upload

If you had to explain how a file gets saved, follow these 5 steps:

1.  **Step 1 (The Trigger)**: The user clicks "Upload" in `index.html`. JavaScript captures the file from the `<input>` box.
2.  **Step 2 (The Request)**: JavaScript uses `fetch()` to send that file over the internet (or local network) to the server.
3.  **Step 3 (The Arrival)**: The server (`server.js`) receives the file. `multer` kicks in and gives the file a new name with a timestamp (to prevent name clashes) and saves it into the `uploads/` folder.
4.  **Step 4 (The Record)**: The server uses `await pool.execute()` to tell MySQL: "Hey, we just saved a file named 'X'. Please remember this for later!"
5.  **Step 5 (The Feedback)**: Once MySQL says "OK," the server sends a message back to the browser saying "Success!" The browser then refreshes the list so you see your new file.
