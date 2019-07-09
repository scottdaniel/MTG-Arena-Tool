const electron = require("electron");
const { globalShortcut, screen } = require("electron");

class OverlayProcess {
  constructor() {
    this.createWindow();
    return this;
  }

  createWindow() {
    console.log(`OVERLAY:  Create process`);
    const display = screen.getPrimaryDisplay();
    let area = display.workArea;

    const overlay = new electron.BrowserWindow({
      transparent: true,
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      frame: false,
      show: true,
      skipTaskbar: true,
      focusable: false,
      title: "MTG Arena Tool",
      webPreferences: {
        nodeIntegration: true
      }
    });
    overlay.loadURL(`file://${__dirname}/index.html`);
    overlay.setIgnoreMouseEvents(true, { forward: true });

    this.window = overlay;

    overlay.webContents.once("dom-ready", function() {
      //We need to wait for the overlay to be initialized before we interact with it
      overlay.webContents.send("settings_updated");

      // Toggle edit mode
      // This should have its own setting to turn on / off or change the key maybe
      globalShortcut.register("Alt+E", () => {
        overlay.webContents.send("edit", true);
      });
    });
  }
}

module.exports = OverlayProcess;
