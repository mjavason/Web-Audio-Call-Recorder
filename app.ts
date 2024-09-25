import express, { NextFunction, Request, Response } from 'express';
import 'express-async-errors';
import archiver from 'archiver';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import http from 'http';
import morgan from 'morgan';
import path from 'path';
import { Server as SocketIoServer } from 'socket.io';
import { setupSwagger } from './swagger.config';
import { setupSocket } from './socket.config';
import {upload} from './multer.config'

//#region App Setup
const app = express();
// Create an instance of the HTTP server
const httpServer = http.createServer(app);

// Create an instance of the Socket.io server attached to the HTTP server
const io = new SocketIoServer(httpServer, {
  cors: {
    origin: '*',
  },
});
setupSocket(io);

dotenv.config({ path: './.env' });
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));
setupSwagger(app, BASE_URL);

//#endregion App Setup

//#region Code here

// Route to handle file uploads
app.post('/upload', upload.single('audio'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  console.log(`File uploaded: ${req.file.path}`);
  res.send('File uploaded successfully.');
});

// Route to download the uploads folder as a zip file
app.get('/download', (req: Request, res: Response) => {
  const output = fs.createWriteStream(path.join(__dirname, 'uploads.zip'));
  const archive = archiver('zip');

  output.on('close', () => {
    console.log(`${archive.pointer()} total bytes`);
    console.log(
      'Archiver has been finalized and the output file descriptor has closed.'
    );
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

//#endregion

//#region Server Setup

/**
 * @swagger
 * /api:
 *   get:
 *     summary: Call a demo external API (httpbin.org)
 *     description: Returns an object containing demo content
 *     tags: [Default]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.get('/api', async (req: Request, res: Response) => {
  try {
    const result = await axios.get('https://httpbin.org');
    return res.send({
      message: 'Demo API called (httpbin.org)',
      data: result.status,
    });
  } catch (error: any) {
    console.error('Error calling external API:', error.message);
    return res.status(500).send({ error: 'Failed to call external API' });
  }
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Health check
 *     description: Returns an object containing demo content
 *     tags: [Default]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.get('/', (req: Request, res: Response) => {
  return res.send({ message: 'API is Live!' });
});

/**
 * @swagger
 * /obviously/this/route/cant/exist:
 *   get:
 *     summary: API 404 Response
 *     description: Returns a non-crashing result when you try to run a route that doesn't exist
 *     tags: [Default]
 *     responses:
 *       '404':
 *         description: Route not found
 */
app.use((req: Request, res: Response) => {
  return res
    .status(404)
    .json({ success: false, message: 'API route does not exist' });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // throw Error('This is a sample error');
  console.log(`${'\x1b[31m'}`); // start color red
  console.log(`${err.message}`);
  console.log(`${'\x1b][0m]'}`); //stop color

  return res
    .status(500)
    .send({ success: false, status: 500, message: err.message });
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// (for render services) Keep the API awake by pinging it periodically
// setInterval(pingSelf(BASE_URL), 600000);

//#endregion
