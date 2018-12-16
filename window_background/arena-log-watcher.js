const fs = require('fs');
const { promisify } = require('util');
const { StringDecoder } = require('string_decoder');
const queue = require('queue');
const ArenaLogDecoder = require('./arena-log-decoder');

const fsAsync = {
	close: promisify(fs.close),
	open: promisify(fs.open),
	read: promisify(fs.read),
	stat: promisify(fs.stat),
};

function start({ path, chunkSize, onLogEntry, onError, onFinish }) {
	const q = queue({ concurrency: 1 });
	let position = 0;
	let stringDecoder = new StringDecoder();
	let logDecoder = new ArenaLogDecoder();

	schedule();
	//const watcher = fs.watch(path, schedule);
	return stop;

	function stop() {
		//watcher.close();
		q.end();
	}

	function schedule() {
		q.push(attempt);
		q.start();
	}

	async function attempt() {
		try {
			await read();
		} catch (err) {
			onError(err);
		}
	}

	async function read() {
		const { size } = await fsAsync.stat(path);
		//console.log("position", position, "size", size, "chunkSize", chunkSize);
		if (position > size) {
			// the file has been recreated, we must reset our state
			stringDecoder = new StringDecoder();
			logDecoder = new ArenaLogDecoder();
			position = 0;
		}
		while (position < size) {
			const buffer = await readChunk(path, position, Math.min(size - position, chunkSize));
			const text = stringDecoder.write(buffer);
			logDecoder.append(text, entry => onLogEntry({ ...entry, size }));
			position += buffer.length;
		}
		if (position >= size) {
			onFinish();
		}

		setTimeout(schedule, 250);
	}
}

async function readChunk(path, position, length) {
	const buffer = new Buffer(length);
	const fd = await fsAsync.open(path, 'r');
	try {
		await fsAsync.read(fd, buffer, 0, length, position);
	} finally {
		await fsAsync.close(fd);
	}
	return buffer;
}

module.exports = { start };
