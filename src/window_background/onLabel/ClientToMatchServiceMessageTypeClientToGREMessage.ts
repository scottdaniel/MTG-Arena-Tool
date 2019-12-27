/* eslint-disable @typescript-eslint/no-var-requires */
import CardsList from "../../shared/cardsList";
import globals from "../globals";
import LogEntry from "../../types/logDecoder";

interface Payload {
  submitdeckresp: {
    deck: {
      deckcardsList: number[];
      sideboardcardsList: number[];
    };
  };
  type: string;
}

interface Entry extends LogEntry {
  json: () => Payload;
}

function decodePayload(payload: any, msgType: string): any {
  const messages = require("../messages_pb");
  const binaryMsg = new Buffer.from(payload, "base64");

  try {
    let msgDeserialiser;
    if (
      msgType === "ClientToGREMessage" ||
      msgType === "ClientToGREUIMessage"
    ) {
      msgDeserialiser = messages.ClientToGREMessage;
    } else if (msgType === "ClientToMatchDoorConnectRequest") {
      msgDeserialiser = messages.ClientToMatchDoorConnectRequest;
    } else if (msgType === "AuthenticateRequest") {
      msgDeserialiser = messages.AuthenticateRequest;
    } else if (msgType === "CreateMatchGameRoomRequest") {
      msgDeserialiser = messages.CreateMatchGameRoomRequest;
    } else if (msgType === "EchoRequest") {
      msgDeserialiser = messages.EchoRequest;
    } else {
      console.warn(`${msgType} - unknown message type`);
      return;
    }
    const msg = msgDeserialiser.deserializeBinary(binaryMsg);
    return msg.toObject();
  } catch (e) {
    console.log(e.message);
  }

  return;
}

export default function ClientToMatchServiceMessageTypeClientToGREMessage(
  entry: Entry
): void {
  const json = entry.json();
  if (!json) return;
  //if (skipMatch) return;
  let payload: Payload = json;
  /*
  if (json.Payload) {
    payload = json.Payload;
  }
  */

  if (typeof payload == "string") {
    const msgType = entry.label.split("_")[1];
    payload = decodePayload(payload, msgType);
    //console.log("Client To GRE: ", payload);
  }

  if (payload.submitdeckresp) {
    // Get sideboard changes
    const deckResp = payload.submitdeckresp.deck;

    const tempMain = new CardsList([]);
    deckResp.deckcardsList.map(id => tempMain.add(id));
    const tempSide = new CardsList([]);
    deckResp.sideboardcardsList.map(id => tempSide.add(id));

    const newDeck = globals.currentMatch.player.deck.clone();
    newDeck.setMainboard(tempMain);
    newDeck.setSideboard(tempSide);
  }
}
