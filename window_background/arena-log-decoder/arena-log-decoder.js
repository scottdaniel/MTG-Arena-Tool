const nthLastIndexOf = require('./nth-last-index-of');
const jsonText = require('./json-text');

const CONNECTION_JSON_PATTERN =
	'\\[(?:UnityCrossThreadLogger|Client GRE)\\]WebSocketClient (.*) WebSocketSharp\\.WebSocket connecting to .*: (.*)\\r\\n';

const LABELED_JSON_PATTERNS = [
	'\\[Client GRE\\].*: .*: (.*)\\r\\n',
	'\\[UnityCrossThreadLogger\\].* \\(.*\\) Incoming (.*) ',
	'\\[UnityCrossThreadLogger\\]Received unhandled GREMessageType: (.*)\\r\\n',
	'\\[UnityCrossThreadLogger\\].*\\r\\n[<=]=[=>] (.*)\\(.*\\):?\\r\\n',
];

const ALL_PATTERNS = [
	CONNECTION_JSON_PATTERN,
	...LABELED_JSON_PATTERNS,
];

const maxLinesOfAnyPattern = Math.max(...ALL_PATTERNS.map(text => occurrences(text, /\\n/g)));

const cachedRegExps = {};
const createRegExp = pattern => cachedRegExps[pattern] || (cachedRegExps[pattern] = new RegExp(pattern));

function ArenaLogDecoder() {
	let buffer = "";
	let bufferDiscarded = 0;
	return { append };

	function append(newText, callback) {
		const logEntryPattern = new RegExp(`(${ALL_PATTERNS.join('|')})`, 'g');

		buffer = buffer.length ? buffer.concat(newText) : newText;
		let bufferUsed = false;
		let match;
		while (match = logEntryPattern.exec(buffer)) {
			const [type, length, entry] = parseLogEntry(buffer, match[0], match.index);
			switch (type) {
				case "invalid":
					bufferUsed = match.index + length;
					break;
				case "partial":
					bufferUsed = match.index;
					break;
				case "full":
					bufferUsed = match.index + length;
					callback({ position: bufferDiscarded + match.index, entry });
					break;
			}
		}

		if (bufferUsed === false) {
			const i = nthLastIndexOf(buffer, "\n", maxLinesOfAnyPattern);
			bufferUsed = (i === -1) ? 0 : i;
		}

		if (bufferUsed > 0) {
			bufferDiscarded += bufferUsed;
			buffer = buffer.substr(bufferUsed);
		}
	}
}

function parseLogEntry(text, matchText, position) {
	let rematches = matchText.match(createRegExp(CONNECTION_JSON_PATTERN));
	if (rematches) {
		return ['full', matchText.length, {
			type: 'connection',
			client: JSON.parse(rematches[1]),
			socket: JSON.parse(rematches[2])
		}];
	}

	for (let pattern of LABELED_JSON_PATTERNS) {
		rematches = matchText.match(createRegExp(pattern));
		if (!rematches) continue;

		const jsonStart = position + matchText.length;
		if (jsonStart >= text.length) {
			return ['partial'];
		}
		if (!jsonText.starts(text, jsonStart)) {
			return ['invalid', matchText.length];
		}

		const jsonLen = jsonText.length(text, jsonStart);
		if (jsonLen === -1) {
			return ['partial'];
		}

		const textAfterJson = text.substr(jsonStart + jsonLen, 2);
		if (textAfterJson !== '\r\n') {
			return ['partial'];
		}

		return ['full', matchText.length + jsonLen + textAfterJson.length, {
			type: 'labeled_json',
			label: rematches[1],
			json: () => JSON.parse(text.substr(jsonStart, jsonLen)),
		}];
	}

	// we should never get here. instead, we should
	// have returned a 'partial' or 'invalid' result
	throw new Error('Could not parse an entry');
}

function occurrences(text, re) {
	const matches = text.match(re);
	return matches ? matches.length : 0;
}

module.exports = ArenaLogDecoder;
