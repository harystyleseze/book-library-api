const http = require("http");
const fs = require("fs");
const url = require("url");

// Function to read data from the storage file
function readData(callback) {
  fs.readFile("data.json", (err, data) => {
    if (err || data.length === 0) {
      console.log("No data found or error, initializing default data.");
      callback({ users: [], books: [] }); // Return default data
    } else {
      callback(JSON.parse(data)); // Parse and return the data
    }
  });
}

// Function to save data to the storage file
function saveData(data, callback) {
  fs.writeFile("data.json", JSON.stringify(data, null, 2), callback); // Using null, 2 for better formatting
}

// The request handler function that processes incoming requests
const requestHandler = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // User routes
  handleUserRoutes(req, res, parsedUrl, path);

  // Book routes
  handleBookRoutes(req, res, parsedUrl, path);
};

// Handles all user-related routes
function handleUserRoutes(req, res, parsedUrl, path) {
  if (path === "/users" && req.method === "GET") {
    // Get all users
    readData((data) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data.users));
    });
  } else if (path === "/users" && req.method === "POST") {
    // Create a user
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      readData((data) => {
        const user = JSON.parse(body);
        user.id = data.users.length + 1; // Assign an ID to the new user
        data.users.push(user);
        saveData(data, () => {
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify(user)); // Respond with the details of the newly created user
        });
      });
    });
  } else if (path === "/authenticate" && req.method === "POST") {
    // Authenticate a user
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      readData((data) => {
        const credentials = JSON.parse(body);
        const user = data.users.find(
          (u) =>
            u.username === credentials.username &&
            u.password === credentials.password
        );
        if (user) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              message: "Authentication successful",
              user: user,
            })
          );
        } else {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "Authentication failed" }));
        }
      });
    });
  }
}

// Handles all book-related routes
function handleBookRoutes(req, res, parsedUrl, path) {
  let body = "";
  if (path === "/books" && req.method === "GET") {
    // Get all books
    readData((data) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data.books));
    });
  } else if (
    path.startsWith("/books") &&
    (req.method === "POST" || req.method === "PUT" || req.method === "DELETE")
  ) {
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      readData((data) => {
        if (req.method === "POST" && path === "/books") {
          // Create a new book
          const book = JSON.parse(body);
          book.id = data.books.length + 1; // Assign an ID to the new book
          book.status = "available"; // Set initial status to available
          data.books.push(book);
          saveData(data, () => {
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify(book));
          });
        } else if (req.method === "DELETE" && path.startsWith("/books/")) {
          // Delete a book
          const bookId = parseInt(path.split("/")[2]);
          if (isNaN(bookId)) {
            res.writeHead(400); // Bad Request
            res.end("Invalid book ID");
            return;
          }

          const bookIndex = data.books.findIndex((book) => book.id === bookId);
          if (bookIndex === -1) {
            res.writeHead(404); // Not Found
            res.end("No book found with the given ID");
          } else {
            data.books.splice(bookIndex, 1); // Remove the book at the found index
            saveData(data, (err) => {
              if (err) {
                res.writeHead(500); // Internal Server Error
                res.end("Failed to save data");
              } else {
                res.end("Book deleted successfully");
                res.writeHead(204); // No Content
              }
            });
          }
        } else if (
          (req.method === "POST" || req.method === "PUT") &&
          path.startsWith("/books/loan/")
        ) {
          // Loan out a book
          const bookId = parseInt(path.split("/")[3]);
          const book = data.books.find((book) => book.id === bookId);
          if (book) {
            book.status = "loaned"; // Simple status update to demonstrate loaning a book
            saveData(data, () => {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(book));
            });
          } else {
            res.writeHead(404);
            res.end("Book not found");
          }
        } else if (req.method === "PUT" && path.startsWith("/books/return/")) {
          // Return a book
          const bookId = parseInt(path.split("/")[3]);
          const book = data.books.find((book) => book.id === bookId);
          if (book) {
            book.status = "available"; // Update book status to available
            saveData(data, () => {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(book));
            });
          } else {
            res.writeHead(404);
            res.end("Book not found");
          }
        } else if (req.method === "PUT" && path.startsWith("/books/update/")) {
          // Update a book
          const bookId = parseInt(path.split("/")[3]);
          const updates = JSON.parse(body);
          const bookIndex = data.books.findIndex((book) => book.id === bookId);
          if (bookIndex !== -1) {
            const updatedBook = { ...data.books[bookIndex], ...updates };
            data.books[bookIndex] = updatedBook;
            saveData(data, () => {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(updatedBook));
            });
          } else {
            res.writeHead(404);
            res.end("Book not found");
          }
        }
      });
    });
  }
}

// Create the HTTP server
const server = http.createServer(requestHandler);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
