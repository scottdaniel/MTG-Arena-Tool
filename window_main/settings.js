const { ipcRenderer: ipc, remote, shell } = require("electron");

const { CARD_TILE_ARENA, CARD_TILE_FLAT } = require("../shared/constants");
const db = require("../shared/database");
const pd = require("../shared/player-data");
const deckDrawer = require("../shared/deck-drawer");
const { createSelect } = require("../shared/select");
const { get_card_image } = require("../shared/util");

const {
  addCheckbox,
  changeBackground,
  hideLoadingBars,
  ipcSend
} = require("./renderer-util");

let lastSettingsSection = 1;
let updateState = "";

function getCardStyleName(style) {
  if (style == CARD_TILE_FLAT) return "Flat";
  return "Arena";
}

let currentOverlay = 0;

//
function openSettingsTab(openSection = lastSettingsSection) {
  lastSettingsSection = openSection;
  changeBackground("default");
  hideLoadingBars();
  $("#ux_0").off();
  $("#history_column").off();
  $("#ux_0").html("");
  $("#ux_0").addClass("flex_item");

  const wrap_l = $('<div class="wrapper_column sidebar_column_r"></div>');
  $(
    '<div class="settings_nav sn1" style="margin-top: 28px;" >Behaviour</div>'
  ).appendTo(wrap_l);
  $('<div class="settings_nav sn2">Overlay</div>').appendTo(wrap_l);
  $('<div class="settings_nav sn3">Visual</div>').appendTo(wrap_l);
  $('<div class="settings_nav sn4">Privacy</div>').appendTo(wrap_l);
  $('<div class="settings_nav sn5">About</div>').appendTo(wrap_l);

  if (pd.offline) {
    $('<div class="settings_nav sn6">Login</div>').appendTo(wrap_l);
  } else {
    $('<div class="settings_nav sn6">Logout</div>').appendTo(wrap_l);
  }

  const wrap_r = $('<div class="wrapper_column"></div>');
  const div = $('<div class="settings_page"></div>');
  let section;

  // BEHAVIOR
  section = $('<div class="settings_section ss1"></div>');
  section.appendTo(div);
  appendBehaviour(section);

  // OVERLAY
  section = $('<div class="settings_section ss2"></div>');
  section.appendTo(div);
  appendOverlay(section);

  // VISUAL
  section = $('<div class="settings_section ss3"></div>');
  section.appendTo(div);
  appendVisual(section);

  // PRIVACY
  section = $('<div class="settings_section ss4"></div>');
  section.appendTo(div);
  appendPrivacy(section);

  // ABOUT
  section = $('<div class="settings_section ss5" style="height: 100%;"></div>');
  section.appendTo(div);
  appendAbout(section);

  // LOGIN
  section = $('<div class="settings_section ss6" style="height: 100%;"></div>');
  section.appendTo(div);
  appendLogin(section);

  div.appendTo(wrap_r);
  $("#ux_0").append(wrap_l);
  $("#ux_0").append(wrap_r);

  $(".ss" + openSection).show();
  $(".sn" + openSection).addClass("nav_selected");

  $(".resetOverlayPos").click(function() {
    ipcSend("reset_overlay_pos", true);
  });

  $(".top_logo_about").click(function() {
    shell.openExternal("https://mtgatool.com");
  });

  $(".twitter_link").click(function() {
    shell.openExternal("https://twitter.com/MEtchegaray7");
  });

  $(".discord_link").click(function() {
    shell.openExternal("https://discord.gg/K9bPkJy");
  });

  $(".git_link").click(function() {
    shell.openExternal("https://github.com/Manuel-777/MTG-Arena-Tool");
  });

  $(".release_notes_link").click(function() {
    shell.openExternal("https://mtgatool.com/release-notes/");
  });

  $(".donate_link").click(function() {
    shell.openExternal("https://www.paypal.me/ManuelEtchegaray/10");
  });

  $(".login_link_about").click(function() {
    const clearAppSettings = {
      remember_me: false,
      auto_login: false,
      launch_to_tray: false
    };
    ipcSend("save_app_settings", clearAppSettings);
    remote.app.relaunch();
    remote.app.exit(0);
  });

  $(".update_link_about").click(function() {
    ipcSend("updates_check", true);
  });

  $(".settings_nav").click(function() {
    if (!$(this).hasClass("nav_selected")) {
      $(".settings_nav").each(function() {
        $(this).removeClass("nav_selected");
      });
      $(".settings_section").each(function() {
        $(this).hide();
      });

      $(this).addClass("nav_selected");

      if ($(this).hasClass("sn1")) {
        lastSettingsSection = 1;
        $(".ss1").show();
      }
      if ($(this).hasClass("sn2")) {
        lastSettingsSection = 2;
        $(".ss2").show();
      }
      if ($(this).hasClass("sn3")) {
        lastSettingsSection = 3;
        $(".ss3").show();
      }
      if ($(this).hasClass("sn4")) {
        lastSettingsSection = 4;
        $(".ss4").show();
      }
      if ($(this).hasClass("sn5")) {
        lastSettingsSection = 5;
        $(".ss5").show();
      }
      if ($(this).hasClass("sn6")) {
        lastSettingsSection = 6;
        $(".ss6").show();
      }
    }
  });
}

function appendBehaviour(section) {
  section.append('<div class="settings_title">Behaviour</div>');

  addCheckbox(
    section,
    "Beta updates channel",
    "settings_betachannel",
    pd.settings.beta_channel,
    updateAppSettings
  );
  addCheckbox(
    section,
    "Login automatically",
    "settings_autologin",
    pd.settings.auto_login,
    updateAppSettings
  );
  addCheckbox(
    section,
    "Launch to tray",
    "settings_launchtotray",
    pd.settings.launch_to_tray,
    updateAppSettings
  );
  addCheckbox(
    section,
    "Launch on startup",
    "settings_startup",
    pd.settings.startup,
    updateUserSettings
  );
  addCheckbox(
    section,
    "Read log on login",
    "settings_readlogonlogin",
    !pd.settings.skip_firstpass,
    updateUserSettings
  );
  section.append(`
      <div class="settings_note">
      <i>Reading the log on startup can take a while, disabling this will make mtgatool load instantly, but you may have have to play with Arena to load some data, like Rank, wildcards and decklists. <b>This feature makes mtgatool read games when it was closed.</b></i>
      </div>`);
  addCheckbox(
    section,
    "Close main window on match found",
    "settings_closeonmatch",
    pd.settings.close_on_match,
    updateUserSettings
  );
  addCheckbox(
    section,
    "Close to tray",
    "settings_closetotray",
    pd.settings.close_to_tray,
    updateUserSettings
  );
  addCheckbox(
    section,
    "Sound when priority changes",
    "settings_soundpriority",
    pd.settings.sound_priority,
    updateUserSettings
  );

  const sliderSoundVolume = $('<div class="slidecontainer_settings"></div>');
  sliderSoundVolume.appendTo(section);
  const sliderSoundVolumeLabel = $(
    `<label style="width: 400px;">Volume: ${Math.round(
      pd.settings.sound_priority_volume * 100
    )}%</label>`
  );
  sliderSoundVolumeLabel.appendTo(sliderSoundVolume);
  const sliderSoundVolumeInput = $(
    '<input type="range" min="0" max="1" step=".001" value="' +
      pd.settings.sound_priority_volume +
      '" class="slider sliderSoundVolume" id="settings_soundpriorityvolume">'
  );
  sliderSoundVolumeInput.appendTo(sliderSoundVolume);

  let label = $('<label class="but_container_label">Export Format:</label>');
  label.appendTo(section);
  let icd = $('<div class="input_container"></div>');
  const export_input = $(
    '<input type="search" id="settings_export_format" autocomplete="off" value="' +
      pd.settings.export_format +
      '" />'
  );
  export_input.appendTo(icd);
  icd.appendTo(label);

  section.append(`<div class="settings_note">
      <i>Possible constiables: $Name, $Count, $SetName, $SetCode, $Collector, $Rarity, $Type, $Cmc</i>
      </div>`);

  export_input.on("keyup", function() {
    updateUserSettings();
  });

  sliderSoundVolumeInput.off();

  sliderSoundVolumeInput.on("click mousemove", function() {
    const volume = Math.round(this.value * 100);
    sliderSoundVolumeLabel.html("Volume: " + volume + "%");
  });

  sliderSoundVolumeInput.on("click mouseup", function() {
    let { Howl, Howler } = require("howler");
    let sound = new Howl({ src: ["../sounds/blip.mp3"] });
    Howler.volume(this.value);
    sound.play();
    updateUserSettingsBlend({
      sound_priority_volume: this.value
    });
  });
}

function appendOverlay(section) {
  let settings = pd.settings.overlays[currentOverlay];
  section.append('<div class="settings_title">Overlay</div>');

  addCheckbox(
    section,
    "Always on top",
    "settings_overlay_ontop",
    settings.ontop,
    updateUserSettings
  );
  addCheckbox(
    section,
    "Show overlay",
    "settings_showoverlay",
    settings.show,
    updateUserSettings
  );
  addCheckbox(
    section,
    "Persistent overlay&nbsp;<i>(useful for OBS setup)</i>",
    "settings_showoverlayalways",
    settings.show_always,
    updateUserSettings
  );

  addCheckbox(
    section,
    "Show top bar",
    "settings_overlay_top",
    settings.top,
    updateUserSettings
  );
  addCheckbox(
    section,
    "Show title",
    "settings_overlay_title",
    settings.title,
    updateUserSettings
  );
  addCheckbox(
    section,
    "Show deck/lists",
    "settings_overlay_deck",
    settings.deck,
    updateUserSettings
  );
  addCheckbox(
    section,
    "Show clock",
    "settings_overlay_clock",
    settings.clock,
    updateUserSettings
  );
  addCheckbox(
    section,
    "Show sideboard",
    "settings_overlay_sideboard",
    settings.sideboard,
    updateUserSettings
  );
  addCheckbox(
    section,
    "Compact lands",
    "settings_overlay_lands",
    settings.lands,
    updateUserSettings
  );

  const sliderOpacity = $('<div class="slidecontainer_settings"></div>');
  sliderOpacity.appendTo(section);
  const sliderOpacityLabel = $(
    '<label style="width: 400px; !important" class="card_size_container">Elements transparency: ' +
      transparencyFromAlpha(settings.alpha) +
      "%</label>"
  );
  sliderOpacityLabel.appendTo(sliderOpacity);
  const sliderOpacityInput = $(
    '<input type="range" min="0" max="100" step="5" value="' +
      transparencyFromAlpha(settings.alpha) +
      '" class="slider sliderB" id="opacityRange">'
  );
  sliderOpacityInput.appendTo(sliderOpacity);

  const sliderOpacityBack = $('<div class="slidecontainer_settings"></div>');
  sliderOpacityBack.appendTo(section);
  const sliderOpacityBackLabel = $(
    '<label style="width: 400px; !important" class="card_size_container">Background transparency: ' +
      transparencyFromAlpha(settings.alpha_back) +
      "%</label>"
  );
  sliderOpacityBackLabel.appendTo(sliderOpacityBack);
  const sliderOpacityBackInput = $(
    '<input type="range" min="0" max="100" step="5" value="' +
      transparencyFromAlpha(settings.alpha_back) +
      '" class="slider sliderC" id="opacityBackRange">'
  );
  sliderOpacityBackInput.appendTo(sliderOpacityBack);

  const sliderScale = $('<div class="slidecontainer_settings"></div>');
  sliderScale.appendTo(section);
  const sliderScaleLabel = $(
    '<label style="width: 400px; !important" class="card_size_container">Scale: ' +
      settings.scale +
      "%</label>"
  );
  sliderScaleLabel.appendTo(sliderScale);
  const sliderScaleInput = $(
    '<input type="range" min="10" max="200" step="10" value="' +
      settings.scale +
      '" class="slider sliderD" id="scaleRange">'
  );
  sliderScaleInput.appendTo(sliderScale);

  $(
    '<div class="button_simple centered resetOverlayPos">Reset Position</div>'
  ).appendTo(section);

  sliderOpacityInput.off();

  sliderOpacityInput.on("click mousemove", function() {
    const overlayAlpha = alphaFromTransparency(parseInt(this.value));
    sliderOpacityLabel.html(
      "Elements transparency: " + transparencyFromAlpha(overlayAlpha) + "%"
    );
  });

  sliderOpacityInput.on("click mouseup", function() {
    updateUserSettingsBlend({
      overlay_alpha: alphaFromTransparency(parseInt(this.value))
    });
  });

  sliderOpacityBackInput.off();

  sliderOpacityBackInput.on("click mousemove", function() {
    const overlayAlphaBack = alphaFromTransparency(parseInt(this.value));
    sliderOpacityBackLabel.html(
      "Background transparency: " +
        transparencyFromAlpha(overlayAlphaBack) +
        "%"
    );
  });

  sliderOpacityBackInput.on("click mouseup", function() {
    updateUserSettingsBlend({
      overlay_alpha_back: alphaFromTransparency(parseInt(this.value))
    });
  });

  sliderScaleInput.off();

  sliderScaleInput.on("click mousemove", function() {
    sliderScaleLabel.html("Scale: " + parseInt(this.value) + "%");
  });

  sliderScaleInput.on("click mouseup", function() {
    updateUserSettingsBlend({
      overlay_scale: parseInt(this.value)
    });
  });
}

function appendVisual(section) {
  section.append('<div class="settings_title">Visual</div>');

  let label = $('<label class="but_container_label">Background URL:</label>');
  label.appendTo(section);

  let icd = $('<div class="input_container"></div>');
  const url_input = $(
    '<input type="search" id="query_image" autocomplete="off" value="' +
      pd.settings.back_url +
      '" />'
  );
  url_input.appendTo(icd);
  icd.appendTo(label);

  label = $('<label class="but_container_label">Background shade:</label>');
  const colorPick = $('<input type="text" id="flat" class="color_picker" />');
  colorPick.appendTo(label);
  label.appendTo(section);
  colorPick.spectrum({
    showInitial: true,
    showAlpha: true,
    showButtons: false
  });
  colorPick.spectrum("set", pd.settings.back_color);

  colorPick.on("dragstop.spectrum", function(e, color) {
    $(".main_wrapper").css("background-color", color.toRgbString());
    updateUserSettings();
  });

  label = $('<label class="but_container_label">Cards quality:</label>');
  label.appendTo(section);

  const tagSelect = createSelect(
    label[0],
    ["small", "normal", "large"],
    pd.settings.cards_quality,
    filter => updateUserSettingsBlend({ cards_quality: filter }),
    "settings_cards_quality"
  );
  tagSelect.style.width = "180px";
  tagSelect.style.marginLeft = "32px";

  let cardsStyleCont = $(
    '<label class="but_container_label">Cards style:</label>'
  );

  const tagStyleSelect = createSelect(
    cardsStyleCont[0],
    [CARD_TILE_ARENA, CARD_TILE_FLAT],
    pd.settings.card_tile_style,
    filter => updateUserSettingsBlend({ card_tile_style: filter }),
    "settings_cards_style",
    getCardStyleName
  );
  tagStyleSelect.style.width = "180px";
  tagStyleSelect.style.marginLeft = "32px";

  let tile = deckDrawer.cardTile(pd.settings.card_tile_style, 67518, "a", 4);
  tile.style.width = "auto";
  cardsStyleCont.append(tile);
  section.append(cardsStyleCont);

  const slider = $('<div class="slidecontainer_settings"></div>');
  slider.appendTo(section);
  const sliderlabel = $(
    '<label style="width: 400px; !important" class="card_size_container">Cards size: ' +
      pd.cardsSize +
      "px</label>"
  );
  sliderlabel.appendTo(slider);
  const sliderInput = $(
    '<input type="range" min="0" max="20" value="' +
      pd.settings.cards_size +
      '" class="slider sliderA" id="myRange">'
  );
  sliderInput.appendTo(slider);

  const d = $(
    '<div style="width: ' +
      pd.cardsSize +
      'px; !important" class="inventory_card_settings"></div>'
  );
  const img = $(
    '<img style="width: ' +
      pd.cardsSize +
      'px; !important" class="inventory_card_settings_img"></img>'
  );

  const card = db.card(67518);
  img.attr("src", get_card_image(card));
  img.appendTo(d);

  d.appendTo(slider);

  url_input.on("keyup", function(e) {
    if (e.keyCode === 13) {
      updateUserSettings();
    }
  });

  sliderInput.off();

  sliderInput.on("click mousemove", function() {
    const cardSize = 100 + Math.round(parseInt(this.value)) * 10;
    sliderlabel.html("Cards size: " + cardSize + "px");

    $(".inventory_card_settings").css("width", "");
    let styles = $(".inventory_card_settings").attr("style");
    styles += "width: " + cardSize + "px !important;";
    $(".inventory_card_settings").attr("style", styles);

    $(".inventory_card_settings_img").css("width", "");
    styles = $(".inventory_card_settings_img").attr("style");
    styles += "width: " + cardSize + "px !important;";
    $(".inventory_card_settings_img").attr("style", styles);
  });

  sliderInput.on("click mouseup", function() {
    updateUserSettingsBlend({ cards_size: Math.round(parseInt(this.value)) });
  });
}

function appendPrivacy(section) {
  section.append('<div class="settings_title">Privacy</div>');
  addCheckbox(
    section,
    "Anonymous sharing&nbsp;<i>(makes your username anonymous on Explore)</i>",
    "settings_anon_explore",
    pd.settings.anon_explore,
    updateUserSettings
  );
  addCheckbox(
    section,
    "Online sharing&nbsp;<i>(when disabled, blocks any connections with our servers)</i>",
    "settings_senddata",
    pd.settings.send_data,
    updateUserSettings
  );

  let label = $('<label class="check_container_but"></label>');
  label.appendTo(section);
  let button = $(
    '<div class="button_simple button_long">Erase my shared data</div>'
  );
  button.on("click", eraseData);
  button.appendTo(label);
}

function appendAbout(section) {
  //section.append('<div class="settings_title">About</div>');

  const about = $('<div class="about"></div>');
  about.append('<div class="top_logo_about"></div>');
  about.append(
    '<div class="message_sub_15 white">By Manuel Etchegaray, 2019</div>'
  );
  about.append(
    '<div class="message_sub_15 white">Version ' +
      remote.app.getVersion() +
      "</div>"
  );

  about.append('<div class="message_updates green">' + updateState + ".</div>");
  let button = $(
    '<div class="button_simple centered update_link_about">Check for updates</div>'
  );
  button.appendTo(about);

  about.append(
    '<div class="flex_item" style="margin: 64px auto 0px auto;"><div class="discord_link"></div><div class="twitter_link"></div><div class="git_link"></div></div>'
  );
  about.append(
    '<div class="message_sub_15 white" style="margin: 24px 0 12px 0;">Support my work!</div><div class="donate_link"><img src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_100x26.png" alt="PayPal" /></div>'
  );
  about.appendTo(section);
}

function appendLogin(section) {
  const login = $('<div class="about"></div>');
  let button;
  if (pd.offline) {
    button = $(
      '<div class="button_simple centered login_link_about">Login</div>'
    );
  } else {
    button = $(
      '<div class="button_simple centered login_link_about">Logout</div>'
    );
  }
  button.appendTo(login);
  login.appendTo(section);
}

//
function updateAppSettings() {
  const auto_login = document.getElementById("settings_autologin").checked;
  const launch_to_tray = document.getElementById("settings_launchtotray")
    .checked;
  const beta_channel = document.getElementById("settings_betachannel").checked;
  const rSettings = {
    auto_login,
    launch_to_tray,
    beta_channel
  };
  ipcSend("save_app_settings", rSettings);
}

//
function alphaFromTransparency(transparency) {
  return 1 - transparency / 100;
}

//
function transparencyFromAlpha(alpha) {
  return Math.round((1 - alpha) * 100);
}

// only purpose is to strip paramaters for use with addCheckbox
function updateUserSettings() {
  updateUserSettingsBlend();
}

//
function updateUserSettingsBlend(_settings = {}) {
  const startup = document.getElementById("settings_startup").checked;
  const readonlogin = document.getElementById("settings_readlogonlogin")
    .checked;
  const showOverlay = document.getElementById("settings_showoverlay").checked;
  const showOverlayAlways = document.getElementById(
    "settings_showoverlayalways"
  ).checked;
  const soundPriority = document.getElementById("settings_soundpriority")
    .checked;

  const backColor = $(".color_picker")
    .spectrum("get")
    .toRgbString();
  const backUrl = document.getElementById("query_image").value;
  if (backUrl === "") changeBackground("default");
  else changeBackground(backUrl);

  const overlayOnTop = document.getElementById("settings_overlay_ontop")
    .checked;
  const closeToTray = document.getElementById("settings_closetotray").checked;
  const sendData = document.getElementById("settings_senddata").checked;
  const anonExplore = document.getElementById("settings_anon_explore").checked;

  const closeOnMatch = document.getElementById("settings_closeonmatch").checked;

  const overlayTop = document.getElementById("settings_overlay_top").checked;
  const overlayTitle = document.getElementById("settings_overlay_title")
    .checked;
  const overlayDeck = document.getElementById("settings_overlay_deck").checked;
  const overlayClock = document.getElementById("settings_overlay_clock")
    .checked;
  const overlaySideboard = document.getElementById("settings_overlay_sideboard")
    .checked;
  const overlayLands = document.getElementById("settings_overlay_lands")
    .checked;

  const exportFormat = document.getElementById("settings_export_format").value;

  _settings.overlays[currentOverlay].show = showOverlay;
  _settings.overlays[currentOverlay].show_always = showOverlayAlways;
  _settings.overlays[currentOverlay].top = overlayTop;
  _settings.overlays[currentOverlay].title = overlayTitle;
  _settings.overlays[currentOverlay].deck = overlayDeck;
  _settings.overlays[currentOverlay].clock = overlayClock;
  _settings.overlays[currentOverlay].sideboard = overlaySideboard;
  _settings.overlays[currentOverlay].ontop = overlayOnTop;
  _settings.overlays[currentOverlay].lands = overlayLands;

  ipcSend("save_user_settings", {
    sound_priority: soundPriority,
    startup: startup,
    close_to_tray: closeToTray,
    send_data: sendData,
    close_on_match: closeOnMatch,
    anon_explore: anonExplore,
    back_color: backColor,
    back_url: backUrl,
    export_format: exportFormat,
    skip_firstpass: !readonlogin,
    ..._settings
  });
}

//
ipc.on("set_update_state", function(event, arg) {
  updateState = arg;
});

//
function eraseData() {
  if (
    confirm(
      "This will erase all of your decks and events shared online, are you sure?"
    )
  ) {
    ipcSend("delete_data", true);
  } else {
    return;
  }
}

module.exports = { openSettingsTab };
