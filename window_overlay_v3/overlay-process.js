const electron = require("electron");
const { globalShortcut, screen } = require("electron");

class OverlayProcess {
  constructor() {
    setTimeout(() => {
      this.createWindow();
      this.showWindow();
    }, 1000);

    this.show = false;
    this.editMode = false;
    return this;
  }

  createWindow() {
    console.log(`OVERLAY:  Create process`);

    const overlay = new electron.BrowserWindow({
      transparent: true,
      x: -10,
      y: -10,
      width: 5,
      height: 5,
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
      globalShortcut.register("Alt+Shift+E", () => {
        this.editMode = !this.editMode;
        overlay.webContents.send("edit", true);
      });
    });
  }

  showWindow() {
    const display = screen.getPrimaryDisplay();
    let area = display.workArea;
    console.log(
      "Overlay area:" +
        area.x +
        ", " +
        area.y +
        ", " +
        area.width +
        ", " +
        area.height
    );
    this.show = true;
    this.window.setSize(area.width, area.height);
    this.window.setPosition(area.x, area.y);
  }

  hideWindow() {
    this.show = false;
    this.window.setSize(5, 5);
    this.window.setPosition(-10, -10);
  }
}

module.exports = OverlayProcess;
