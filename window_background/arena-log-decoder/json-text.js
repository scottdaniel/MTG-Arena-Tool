function starts(text, position) {
	return ["{", "["].includes(text.charAt(position));
}

function length(text, position) {
	switch (text.charAt(position)) {
		case '{':
		case '[': {
			let openedObjects = 0;
			let openedArrays = 0;
			for (let i = position; i < text.length; i++) {
				switch (text.charAt(i)) {
					case '{':
						openedObjects++;
						break;
					case '}':
						openedObjects--;
						break;
					case '[':
						openedArrays++;
						break;
					case ']':
						openedArrays--;
						break;
				}
				if (openedArrays === 0 && openedObjects === 0) {
					return i - position + 1;
				}
			}
			return -1;
		}
		default:
			throw new Error('Not valid start of JSON: ' + text.substr(position, 10));
	}
}

module.exports = { starts, length };
