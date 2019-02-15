const electron = require('electron');
const json = require('./database.json');

// Made a singleton class for this
// Makes it simpler to update ;)
// Some other things should go here later, like updating from MTGA Servers themselves.
class Database {
	constructor() {
		this.cards = json;
		this.fblthp = {
			"name":"Totally Lost",
			"set":"gtc",
			"images":{"small":"","normal":"","large":"","art_crop":""},
			"type":"",
			"cost":[],
			"cmc":0,
			"rarity":"common",
			"cid":"54",
			"frame":[1],
			"artist":"David Palumbo",
			"dfc":"None",
			"collectible":false,
			"craftable":false,
			"dfcId":0,
			"rank":5,
			"reprints":false
		}
	}

	set(arg) {
		try {
			this.cards = JSON.parse(arg);
		} catch(e) {
			this.cards = arg;
		}
		
		return true;
	}

	get(grpId) {
		let ret = this.cards[grpId];
		if (ret == undefined) {
			//console.error("card not found: "+grpId);
			return this.fblthp;
		}
		return ret;
	}

	getAbility(abId) {
		let ret = this.cards["abilities"][abId];
		if (ret == undefined) {
			return "";
		}
		return ret;
	}

	getAll() {
		let ret = this.cards;
		return ret;
	}
}

module.exports = Database;