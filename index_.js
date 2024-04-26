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

  if (path === "/users" && req.method === "GET") {
    // Get all users
    readData((data) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data.users));
    });
  } else if (path === "/users" && req.method === "POST") {
    // Create a user
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      readData((data) => {
        const user = JSON.parse(body);
        user.id = data.users.length + 1; // Simple ID assignment (incremental)
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
              userId: user.id,
            })
          );
        } else {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "Authentication failed" }));
        }
      });
    });
  }
  // Implement other routes and methods
  //handle book request
  if (path === "/books" && req.method === "GET") {
    // Get all books
    readData((data) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data.books));
    });
  } else if (path === "/books" && req.method === "POST") {
    // Create a new book
    let body = "";
    req.on("data", (chunk) => {
      //listening for incoming data chunk in the request and saving it to the body variable
      body += chunk.toString(); //data chunk means the data that is being sent and its converted to string
    });
    req.on("end", () => {
      readData((data) => {
        const book = JSON.parse(body);
        book.id = data.books.length + 1; // Simple ID assignment (incremental)
        data.books.push(book);
        saveData(data, () => {
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify(book)); // Respond with the details of the newly created user
        });
      });
    });
  }
};

// Create the HTTP server
const server = http.createServer(requestHandler);

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
