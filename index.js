const cluster = require('cluster');
const os = require('os');
const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Load environment variables from .env file

const PORT = 3005;
const MAX_CPUS = parseInt(process.env.MAX_CPUS, 10) || 2; // Default to 2 if MAX_CPUS is not set
const audioDirectory = path.join(require('os').homedir(), 'Downloads');

if (cluster.isMaster) {
    // Master process
    const numCPUs = Math.min(os.cpus().length, MAX_CPUS); // Limit to MAX_CPUS
    console.log(`Master process is running. Forking for ${numCPUs} CPUs.`);

    // Fork workers for each CPU core, up to the limit
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // Log when a worker exits and fork a new one
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Starting a new worker...`);
        cluster.fork();
    });
} else {
    // Worker processes will execute the server code
    const app = express();

    // Middleware to list available audio files
    app.get('/', (req, res) => {
        fs.readdir(audioDirectory, (err, files) => {
            if (err) {
                return res.status(500).send('Could not list files');
            }
            const audioFiles = files.filter(file => file.endsWith('.wav'));
            res.send(`
                <h1>Available Audio Files</h1>
                <ul>
                    ${audioFiles.map(file => {
                        const filenameWithoutExt = file.slice(0, -4); // Remove ".wav"
                        return `<li><a href="/audio/${filenameWithoutExt}">${filenameWithoutExt}</a></li>`;
                    }).join('')}
                </ul>
            `);
        });
    });

    // Route to serve a specific audio file by name without extension  Untitled notebookAUDIO_20241104181028_05rb
    app.get('/audio/:filename', (req, res) => {
        const filename = req.params.filename;
    
        // Define the possible prefixes
        const prefix = 'Untitled notebook';
        const defaultFilePath = path.join(audioDirectory, `${filename}.wav`);
        const prefixedFilePath = path.join(audioDirectory, `${prefix} ${filename}.wav`);
        console.log(defaultFilePath);
        console.log(prefixedFilePath);
    
        // Check if the file exists with or without the prefix
        if (fs.existsSync(defaultFilePath)) {
            res.sendFile(defaultFilePath);
        } else if (fs.existsSync(prefixedFilePath)) {
            res.sendFile(prefixedFilePath);
        } else {
            res.status(404).send('File not found');
        }
    });

    app.listen(PORT, () => {
        console.log(`Worker ${process.pid} is running on http://localhost:${PORT}`);
    });
}
