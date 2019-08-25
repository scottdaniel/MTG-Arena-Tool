const { clipboard } = require("electron");
const path = require("path");
const fs = require("fs");
const {
  APPDATA,
  SETS_DATA,
  SET_NAMES,
  COLORS,
  RARITY,
  NO_DUPES_ART_SETS,
  EVENT_TO_NAME,
  EVENT_TO_FORMAT,
  RANKED_EVENTS
} = require("./metadata-constants");

exports.generateMetadata = function(
  ScryfallCards,
  ranksData,
  metagameData,
  version,
  languages
) {
  return new Promise(resolve => {
    console.log("Reading JSON files");
    let cards = readExternalJson("cards.json");
    let abilitiesRead = readExternalJson("abilities.json");
    let locRead = readExternalJson("loc.json");
    let enumsRead = readExternalJson("enums.json");

    //clipboard.writeText(JSON.stringify(ScryfallCards));

    const regex = new RegExp("/o(?=[^{]*})/");
    let loc = {};
    locRead.forEach(lang => {
      loc[lang.langkey] = {};
      lang.keys.forEach(item => {
        loc[lang.langkey][item.id] = item.text.replace(regex, "");
      });
    });
    locRead = null;

    var getText = function(id, language) {
      return loc[language][id];
    };

    // Altrough enums must be in other languages ill write them in english
    // This is because Tool currently relies and expects data to be in english
    // for things like creature types. And it would break.
    let enums = {};
    enumsRead.forEach(_enum => {
      enums[_enum.name] = {};
      _enum.values.forEach(value => {
        enums[_enum.name][value.id] = getText(value.text, "EN");
      });
    });

    languages.forEach(lang => {
      let abilities = {};
      abilitiesRead.forEach(ab => {
        let abid = ab.id;
        abilities[abid] = getText(ab.text, lang);
      });
      // main loop
      console.log("Generating " + lang);
      let cardsFinal = {};
      cards.forEach(card => {
        if (card.set == "ArenaSUP") return;

        let typeLine = "";
        card.supertypes.forEach(type => {
          typeLine += enums["SuperType"][type] + " ";
        });
        card.types.forEach(type => {
          typeLine += enums["CardType"][type] + " ";
        });
        card.subtypes.forEach(type => {
          typeLine += enums["SubType"][type] + " ";
        });

        let manaCost = [];
        card.castingcost.split("o").forEach(mana => {
          if (mana !== "" && mana !== "0") {
            mana = mana
              .toLowerCase()
              .replace("(", "")
              .replace("/", "")
              .replace(")", "");
            manaCost.push(mana);
          }
        });

        let set = SET_NAMES[card.set];

        let colllector = card.CollectorNumber;
        if (colllector.includes("GR")) {
          set = "Mythic Edition";
        }
        if (colllector.includes("GP")) {
          set = "M19 Gift Pack";
        }

        let cardObj = {};
        let cardId = card.grpid;
        let cardName = getText(card.titleId, lang);
        cardObj.id = cardId;
        cardObj.name = cardName;
        cardObj.set = set;
        cardObj.artid = card.artId;
        cardObj.type = typeLine;
        cardObj.cost = manaCost;
        cardObj.cmc = card.cmc;
        cardObj.rarity = RARITY[card.rarity];
        cardObj.cid = colllector;
        cardObj.frame = card.frameColors;
        cardObj.artist = card.artistCredit;
        cardObj.dfc = card.linkedFaceType;
        cardObj.collectible = card.isCollectible;
        cardObj.craftable = card.isCraftable;

        let scryfallObject = undefined;
        let scryfallSet = SETS_DATA[set].scryfall;
        if (!card.isToken) {
          // Unhingued lands
          if (cardId == 70501) scryfallSet = "unh";
          if (cardId == 70502) scryfallSet = "unh";
          if (cardId == 70503) scryfallSet = "unh";
          if (cardId == 70504) scryfallSet = "unh";
          if (cardId == 70505) scryfallSet = "unh";
          // Commander 2016 lands
          if (cardId == 70506) scryfallSet = "c16";
          if (cardId == 70507) scryfallSet = "c16";
          if (cardId == 70508) scryfallSet = "c16";
          if (cardId == 70509) scryfallSet = "c16";
          if (cardId == 70510) scryfallSet = "c16";
          // Promo Llanowar Elves
          if (cardId == 69781) scryfallSet = "pdom";
          // Promo Firemind's Research
          if (cardId == 69780) scryfallSet = "pgrn";
          // Promo Ghalta
          if (cardId == 70140) scryfallSet = "prix";
          // Promo Duress
          if (cardId == 70141) scryfallSet = "f05";

          //console.log(cardName + " - " + scryfallSet + " - " + colllector);
          try {
            if (NO_DUPES_ART_SETS.includes(scryfallSet)) {
              scryfallObject = ScryfallCards[lang][scryfallSet][cardName];
            } else {
              scryfallObject =
                ScryfallCards[lang][scryfallSet][cardName][colllector];
            }
          } catch (e) {
            //
          }
        } else {
          try {
            scryfallObject =
              ScryfallCards[lang]["t" + scryfallSet][cardName][colllector];
          } catch (e) {
            //
          }
        }

        if (card.linkedFaces.length > 0) {
          cardObj.dfcId = card.linkedFaces[0];
        } else {
          cardObj.dfcId = 0;
        }

        if (ranksData[set]) {
          cardObj.rank = ranksData[set].rank;
          cardObj.cont = ranksData[set].cont;
        } else {
          cardObj.rank = 0;
          cardObj.cont = 0;
        }

        if (scryfallObject == undefined) {
          console.log(
            `No images found for ${cardObj.name} - ${cardObj.set} (${
              cardObj.cid
            })`
          );
        } else {
          delete scryfallObject.image_uris.png;
          delete scryfallObject.image_uris.border_crop;
          cardObj.images = scryfallObject.image_uris;
        }

        cardsFinal[cardObj.id] = cardObj;
        //console.log(JSON.stringify(cardObj));
      });

      let date = new Date();
      let jsonOutput = {
        cards: cardsFinal,
        ok: true,
        version: version,
        updated: date.getTime(),
        events: EVENT_TO_NAME,
        events_format: EVENT_TO_FORMAT,
        sets: SETS_DATA,
        abilities: abilities,
        ranked_events: RANKED_EVENTS,
        archetypes: metagameData
      };

      let str = JSON.stringify(jsonOutput);
      let jsonOut = path.join(
        APPDATA,
        "external",
        `database-${version}-${lang}.json`
      );
      fs.writeFile(jsonOut, str, function(err) {
        if (err) {
          return console.log(err);
        }
        console.log(`${jsonOut} generated.`);
      });
      //
    });

    resolve();
  });
};

function readExternalJson(filename) {
  let file = path.join(APPDATA, "external", filename);
  //JSON.parse(fs.readFileSync(file));
  let json = JSON.parse(`{"value": ${fs.readFileSync(file)}}`);
  return json.value;
}
