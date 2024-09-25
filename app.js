const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

// Initialize Express app
const app = express();

// Enable CORS
app.use(cors());

// Create an instance of the HTTP server
const httpServer = http.createServer(app);

// Create an instance of the Socket.io server attached to the HTTP server
const io = new socketIo.Server(httpServer, {
  cors: {
    origin: '*',
  },
});

// Multer setup to store files in the 'uploads' folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Ensure the 'uploads' directory exists or create it
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Route to handle file uploads
app.post('/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  console.log(`File uploaded: ${req.file.path}`);
  res.send('File uploaded successfully.');
});

// Route to download the uploads folder as a zip file
app.get('/download', (req, res) => {
  const output = fs.createWriteStream(path.join(__dirname, 'uploads.zip'));
  const archive = archiver('zip');

  output.on('close', () => {
    console.log(archive.pointer() + ' total bytes');
    console.log('Archiver has been finalized and the output file descriptor has closed.');
    res.download(path.join(__dirname, 'uploads.zip'), 'uploads.zip', (err) => {
      if (err) {
        console.error('Error sending the file:', err);
      }
      // Optionally delete the zip file after download
      fs.unlinkSync(path.join(__dirname, 'uploads.zip'));
    });
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory('uploads/', false);
  archive.finalize();
});

// Store connected users
let users = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('register', (userId) => {
    users[userId] = socket.id;
    socket.userId = userId;
    console.log('User registered:', userId);
  });

  socket.on('signal', (data) => {
    const recipientSocketId = users[data.to];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('signal', data);
      console.log(`Forwarded signal to: ${data.to}`);
    } else {
      console.log(`Recipient not found for: ${data.to}`);
    }
  });

  socket.on('message', (data) => {
    const recipientSocketId = users[data.to];
    io.to(recipientSocketId).emit('message', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.userId);
    delete users[socket.userId];
  });
});

// Start the server
httpServer.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
