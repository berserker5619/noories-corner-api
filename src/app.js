import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import winston from 'winston';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import './db/mongoose.js';

import userRouter from './routers/user.js';
import amazonRouter from './routers/amazon.js';
import meeshoRouter from './routers/meesho.js';
import offerRouter from './routers/offer.js';

//Create logs folder , access.log,error.log,combined.log files
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, 'logs');
const ACCESS_LOG_PATH = path.join(LOG_DIR, 'access.log');
const ERROR_LOG_PATH = path.join(LOG_DIR, 'error.log');
const COMBINED_LOG_PATH = path.join(LOG_DIR, 'combined.log');

// Create the log directory if it doesn't exist
fs.mkdirSync(LOG_DIR, { recursive: true });

// Create a writable stream to write the morgan logs to a file {flag:a} -> append mode
const accessLogStream = fs.createWriteStream(ACCESS_LOG_PATH, { flags: 'a' });

// Create a Winston logger instance
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'noories-corner-api' },
    transports: [
        new winston.transports.File({ filename: ERROR_LOG_PATH, level: 'error' }),
        new winston.transports.File({ filename: COMBINED_LOG_PATH })
    ]
});

//create an express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(compression());
// Use the Winston logger with Morgan
app.use(morgan('combined', { stream: accessLogStream }));

// Routes
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}`, userRouter);
app.use(`/api/${apiVersion}`, amazonRouter);
app.use(`/api/${apiVersion}`, meeshoRouter);
app.use(`/api/${apiVersion}`, offerRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        status: statusCode,
        message: err.message || 'Internal Server Error'
    });
});

// Logging middleware
app.use((req, res, next) => {
    // Add a timestamp to the Winston logs
    logger.log('info', `${req.method} ${req.url}`, { timestamp: Date.now() });
    next();
});

export default app;
