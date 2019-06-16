const electron = require("electron");
const { globalShortcut } = require("electron");

const {
  ARENA_MODE_IDLE,
  ARENA_MODE_MATCH,
  ARENA_MODE_DRAFT,
  OVERLAY_DRAFT,
  COLORS_ALL
} = require("../shared/constants");

var arenaState = ARENA_MODE_IDLE;
var background = null;

function setArenaState(state) {
  arenaState = state;
}

function setBackground(renderer) {
  background = renderer;
}

class OverlayProcess {
  constructor(settings, index) {
    this.index = index;

    this.createWindow = this.createWindow.bind(this);
    this.destroy = this.destroy.bind(this);
    this.handlePositionChange = this.handlePositionChange.bind(this);
    this.updateSettings = this.updateSettings.bind(this);
    this.updateVisible = this.updateVisible.bind(this);

    this.createWindow(settings);
  }

  createWindow(settings) {
    const { index } = this;

    const alphaEnabled = settings.alpha_back < 1;
    this.alphaEnabled = alphaEnabled;

    console.log(`OVERLAY ${index + 1}:  Create process`);
    const overlay = new electron.BrowserWindow({
      transparent: alphaEnabled,
      frame: false,
      show: false,
      title: "MTG Arena Tool",
      icon: `../resources/icon-overlay-${COLORS_ALL[index]}.png`,
      webPreferences: {
        nodeIntegration: true
      }
    });
    overlay.loadURL(`file://${__dirname}/index.html`);

    this.window = overlay;

    overlay.on("resize", this.handlePositionChange);
    overlay.on("move", this.handlePositionChange);

    overlay.webContents.once("dom-ready", function() {
      //We need to wait for the overlay to be initialized before we interact with it
      //console.log(`OVERLAY ${index + 1}:  Init updateSettings`);
      overlay.webContents.send("settings_updated", index);
    });
  }

  destroy() {
    console.log(`OVERLAY ${this.index + 1}:  Clean up`);
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = null;
    if (this.window) this.window.destroy();
    this.window = null;
  }

  handlePositionChange() {
    const { index, settings, window: overlay } = this;
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      const bounds = overlay.getBounds();
      settings.bounds = bounds;
      background.webContents.send("overlayBounds", index, bounds);
      console.log(`OVERLAY ${index + 1}:  Save position`);
      /*
      console.log(
        `${index} moved to x: ${bounds.x} y: ${bounds.y} w: ${bounds.width} h: ${
          bounds.height
        } `
      );
      */
      this.timeout = null;
    }, 500);
  }

  updateSettings(settings) {
    const { index } = this;
    //console.log(`OVERLAY ${index + 1}:  Update settings`);

    const alphaEnabled = settings.alpha_back < 1;
    if (this.alphaEnabled !== alphaEnabled) {
      console.log(`OVERLAY ${index + 1}:  Transparency changed`);
      this.destroy();
      this.createWindow(settings);
    }
    this.settings = settings;

    const { window: overlay } = this;
    overlay.webContents.send("settings_updated", index);
    overlay.setBounds(settings.bounds);
    overlay.setAlwaysOnTop(settings.ontop, "floating");

    globalShortcut.unregister("Alt+" + (index + 1));
    if (settings.keyboard_shortcut) {
      globalShortcut.register("Alt+" + (index + 1), () => {
        overlay.webContents.send("close", -1);
      });
    }

    this.updateVisible();
  }

  updateVisible() {
    const { settings, window: overlay } = this;

    const currentModeApplies =
      (settings.mode === OVERLAY_DRAFT && arenaState === ARENA_MODE_DRAFT) ||
      (settings.mode !== OVERLAY_DRAFT && arenaState === ARENA_MODE_MATCH);

    const shouldShow =
      settings.show && (currentModeApplies || settings.show_always);

    if (shouldShow && !overlay.isVisible()) {
      overlay.showInactive();
    } else if (!shouldShow && overlay.isVisible()) {
      overlay.hide();
    }
  }
}

module.exports = {
  setBackground: setBackground,
  OverlayProcess: OverlayProcess,
  setArenaState: setArenaState
};
