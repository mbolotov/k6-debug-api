// src/file.js
import fs from 'fs';
import {Buffer} from 'buffer';

export default {
    writeString(path, s) {
        try {
            fs.writeFileSync(path, s, {mode: 0o644});
            return null;
        } catch (err) {
            throw err;
        }
    },

    appendString(path, s) {
        try {
            fs.appendFileSync(path, s, {mode: 0o644});
            return null;
        } catch (err) {
            throw err;
        }
    },

    writeBytes(path, b) {
        try {
            const buffer = Buffer.from(b);
            fs.writeFileSync(path, buffer, {mode: 0o644});
            return null;
        } catch (err) {
            throw err;
        }
    },

    clearFile(path) {
        try {
            fs.truncateSync(path, 0);
            return null;
        } catch (err) {
            throw err;
        }
    },

    renameFile(oldPath, newPath) {
        try {
            fs.renameSync(oldPath, newPath);
            return null;
        } catch (err) {
            throw err;
        }
    },

    deleteFile(path) {
        try {
            fs.unlinkSync(path);
            return null;
        } catch (err) {
            throw err;
        }
    },

    removeRowsBetweenValues(path, start, end) {
        try {
            const content = fs.readFileSync(path, 'utf8');
            const lines = content.split('\n');
            const filteredLines = [];
            for (let i = 0; i < lines.length; i++) {
                const lineNumber = i + 1;
                if (lineNumber < start || lineNumber > end) {
                    filteredLines.push(lines[i]);
                }
            }
            fs.writeFileSync(path, filteredLines.join('\n'), {mode: 0o644});
            return null;
        } catch (err) {
            throw err;
        }
    },

    readFile(path) {
        try {
            const content = fs.readFileSync(path, 'utf8');
            return content;
        } catch (err) {
            throw err;
        }
    },

    createDirectory(path) {
        try {
            fs.mkdirSync(path, {recursive: true, mode: 0o755});
            return null;
        } catch (err) {
            throw err;
        }
    },

    deleteDirectory(path) {
        try {
            fs.rmSync(path, {recursive: true, force: true});
            return null;
        } catch (err) {
            throw err;
        }
    }
};