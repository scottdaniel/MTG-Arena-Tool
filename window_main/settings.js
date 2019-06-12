const { ipcRenderer: ipc, remote, shell } = require("electron");

const {
  CARD_TILE_ARENA,
  CARD_TILE_FLAT,
  OVERLAY_FULL,
  OVERLAY_LEFT,
  OVERLAY_ODDS,
  OVERLAY_SEEN,
  OVERLAY_DRAFT,
  OVERLAY_LOG,
  COLORS_ALL
} = require("../shared/constants");
const db = require("../shared/database");
const pd = require("../shared/player-data");
const deckDrawer = require("../shared/deck-drawer");
const { createSelect } = require("../shared/select");
const { get_card_image } = require("../shared/util");
const byId = id => document.getElementById(id);

const {
  setLocalState,
  getLocalState,
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
function openSettingsTab(openSection = lastSettingsSection, scrollTop = 0) {
  const ls = getLocalState();
  if (openSection !== -1) {
    lastSettingsSection = openSection;
  } else {
    openSection = lastSettingsSection;
  }
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

  const jCont = wrap_r;
  if (scrollTop) {
    jCont.scrollTop(ls.lastScrollTop);
  }
  jCont.on("scroll", () => {
    setLocalState({ lastScrollTop: jCont.scrollTop() });
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
      <i>Possible variables: $Name, $Count, $SetName, $SetCode, $Collector, $Rarity, $Type, $Cmc</i>
      </div>`);

  export_input.on("keyup", e => {
    if (e.keyCode === 13) {
      updateUserSettings();
    }
  });

  export_input.on("focusout", () => {
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
  section.append('<div class="settings_title">Overlays</div>');

  let topCont = $('<div class="overlay_section_selector_cont"></div>');
  let topPrev = $('<div class="overlay_prev"></div>');
  let topIcon = $(
    `<div class="overlay_icon" style="background-color:var(--color-${
      COLORS_ALL[currentOverlay]
    });"></div>`
  );
  let topIndex = $(
    `<div class="overlay_current">Current overlay settings: ${currentOverlay +
      1}</div>`
  );
  let topNext = $('<div class="overlay_next"></div>');

  topCont.append(topPrev);
  topCont.append(topIcon);
  topCont.append(topIndex);
  topCont.append(topNext);
  section.append(
    '<div style="margin: 0px 64px 0px 16px;" class="settings_note">You can have up to 5 overlay windows active, and each window has its own settings.</br>Draft overlay will only show in a draft, while the others will work during any match.</div>'
  );
  section.append(topCont);

  pd.settings.overlays.forEach((settings, index) => {
    let overlaySection = $(
      `<div class="overlay_section overlay_section_${index}"></div>`
    );

    if (currentOverlay !== index) {
      overlaySection.css("display", "none");
    }

    let label = $('<label class="but_container_label">Mode:</label>');
    label.appendTo(overlaySection);

    const modeOptions = [];
    modeOptions[OVERLAY_FULL] = "Full Deck";
    modeOptions[OVERLAY_LEFT] = "Cards Left";
    modeOptions[OVERLAY_ODDS] = "Cards Odds";
    modeOptions[OVERLAY_SEEN] = "Cards Seen";
    modeOptions[OVERLAY_DRAFT] = "Draft";
    modeOptions[OVERLAY_LOG] = "Action Log";

    const modeSelect = createSelect(
      label[0],
      modeOptions,
      modeOptions[settings.mode],
      function(filter) {
        pd.settings.overlays[index].mode = modeOptions.indexOf(filter);
        updateUserSettingsBlend();
      },
      `overlay_${index}_mode`
    );
    modeSelect.style.width = "180px";
    modeSelect.style.marginLeft = "32px";

    addCheckbox(
      overlaySection,
      "Always on top",
      `overlay_${index}_ontop`,
      settings.ontop,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Show overlay",
      `overlay_${index}_show`,
      settings.show,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Persistent overlay&nbsp;<i>(useful for OBS setup)</i>",
      `overlay_${index}_show_always`,
      settings.show_always,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      `Enable Alt+${index + 1} keyboard shortcut`,
      `overlay_${index}_keyboard_shortcut`,
      settings.keyboard_shortcut,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Show top bar",
      `overlay_${index}_top`,
      settings.top,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Show title",
      `overlay_${index}_title`,
      settings.title,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Show deck/lists",
      `overlay_${index}_deck`,
      settings.deck,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Show clock",
      `overlay_${index}_clock`,
      settings.clock,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Show sideboard",
      `overlay_${index}_sideboard`,
      settings.sideboard,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Compact lands",
      `overlay_${index}_lands`,
      settings.lands,
      updateUserSettings
    );

    //
    //
    const sliderOpacity = $('<div class="slidecontainer_settings"></div>');
    sliderOpacity.appendTo(overlaySection);
    const sliderOpacityLabel = $(
      '<label style="width: 400px; !important" class="card_size_container">Elements transparency: ' +
        transparencyFromAlpha(settings.alpha) +
        "%</label>"
    );
    sliderOpacityLabel.appendTo(sliderOpacity);
    const sliderOpacityInput = $(
      `<input type="range" min="0" max="100" step="5" value="${transparencyFromAlpha(
        settings.alpha
      )}" class="slider" id="opacityRange${index}">`
    );
    sliderOpacityInput.appendTo(sliderOpacity);

    sliderOpacityInput.off();

    sliderOpacityInput.on("click mousemove", function() {
      const overlayAlpha = alphaFromTransparency(parseInt(this.value));
      sliderOpacityLabel.html(
        "Elements transparency: " + transparencyFromAlpha(overlayAlpha) + "%"
      );
    });

    sliderOpacityInput.on("click mouseup", function() {
      pd.settings.overlays[index].alpha = alphaFromTransparency(
        parseInt(this.value)
      );
      updateUserSettingsBlend();
    });

    //
    //
    const sliderOpacityBack = $('<div class="slidecontainer_settings"></div>');
    sliderOpacityBack.appendTo(overlaySection);
    const sliderOpacityBackLabel = $(
      '<label style="width: 400px; !important" class="card_size_container">Background transparency: ' +
        transparencyFromAlpha(settings.alpha_back) +
        "%</label>"
    );
    sliderOpacityBackLabel.appendTo(sliderOpacityBack);
    const sliderOpacityBackInput = $(
      '<input type="range" min="0" max="100" step="5" value="' +
        transparencyFromAlpha(settings.alpha_back) +
        '" class="slider" id="opacityBackRange">'
    );
    sliderOpacityBackInput.appendTo(sliderOpacityBack);

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
      pd.settings.overlays[index].alpha_back = alphaFromTransparency(
        parseInt(this.value)
      );
      updateUserSettingsBlend();
    });

    //
    //
    const sliderScale = $('<div class="slidecontainer_settings"></div>');
    sliderScale.appendTo(overlaySection);
    const sliderScaleLabel = $(
      '<label style="width: 400px; !important" class="card_size_container">Scale: ' +
        settings.scale +
        "%</label>"
    );
    sliderScaleLabel.appendTo(sliderScale);
    const sliderScaleInput = $(
      '<input type="range" min="10" max="200" step="10" value="' +
        settings.scale +
        '" class="slider" id="scaleRange">'
    );
    sliderScaleInput.appendTo(sliderScale);

    sliderScaleInput.off();

    sliderScaleInput.on("click mousemove", function() {
      sliderScaleLabel.html("Scale: " + parseInt(this.value) + "%");
    });

    sliderScaleInput.on("click mouseup", function() {
      pd.settings.overlays[index].scale = parseInt(this.value);
      updateUserSettingsBlend();
    });

    //
    //
    $(
      '<div class="button_simple centered resetOverlayPos">Reset Position</div>'
    ).appendTo(overlaySection);

    section.append(overlaySection);
  });

  topPrev.on("click", () => {
    currentOverlay -= 1;
    if (currentOverlay < 0) {
      currentOverlay = pd.settings.overlays.length - 1;
    }
    $(".overlay_section").css("display", "none");
    $(".overlay_section_" + currentOverlay).css("display", "block");
    $(".overlay_current").html(
      `Current overlay settings: ${currentOverlay + 1}`
    );
    $(".overlay_icon").css(
      "background-color",
      `var(--color-${COLORS_ALL[currentOverlay]})`
    );
  });

  topNext.on("click", () => {
    currentOverlay += 1;
    if (currentOverlay >= pd.settings.overlays.length) {
      currentOverlay = 0;
    }
    $(".overlay_section").css("display", "none");
    $(".overlay_section_" + currentOverlay).css("display", "block");
    $(".overlay_current").html(
      `Current overlay settings: ${currentOverlay + 1}`
    );
    $(".overlay_icon").css(
      "background-color",
      `var(--color-${COLORS_ALL[currentOverlay]})`
    );
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

  url_input.on("focusout", function() {
    updateUserSettings();
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
  const auto_login = byId("settings_autologin").checked;
  const launch_to_tray = byId("settings_launchtotray").checked;
  const beta_channel = byId("settings_betachannel").checked;
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
  const startup = byId("settings_startup").checked;
  const readonlogin = byId("settings_readlogonlogin").checked;

  const soundPriority = byId("settings_soundpriority").checked;

  const backColor = $(".color_picker")
    .spectrum("get")
    .toRgbString();

  const backUrl = byId("query_image").value;
  if (backUrl === "") changeBackground("default");
  else changeBackground(backUrl);

  pd.settings.overlays.forEach((overlaySettings, index) => {
    const showOverlay = byId(`overlay_${index}_show`).checked;
    const showOverlayAlways = byId(`overlay_${index}_show_always`).checked;
    const enableShortcut = byId(`overlay_${index}_keyboard_shortcut`).checked;
    const overlayOnTop = byId(`overlay_${index}_ontop`).checked;
    const overlayTop = byId(`overlay_${index}_top`).checked;
    const overlayTitle = byId(`overlay_${index}_title`).checked;
    const overlayDeck = byId(`overlay_${index}_deck`).checked;
    const overlayClock = byId(`overlay_${index}_clock`).checked;
    const overlaySideboard = byId(`overlay_${index}_sideboard`).checked;
    const overlayLands = byId(`overlay_${index}_lands`).checked;

    overlaySettings.show = showOverlay;
    overlaySettings.show_always = showOverlayAlways;
    overlaySettings.keyboard_shortcut = enableShortcut;
    overlaySettings.top = overlayTop;
    overlaySettings.title = overlayTitle;
    overlaySettings.deck = overlayDeck;
    overlaySettings.clock = overlayClock;
    overlaySettings.sideboard = overlaySideboard;
    overlaySettings.ontop = overlayOnTop;
    overlaySettings.lands = overlayLands;
  });

  const closeOnMatch = byId("settings_closeonmatch").checked;
  const exportFormat = byId("settings_export_format").value;
  const closeToTray = byId("settings_closetotray").checked;
  const sendData = byId("settings_senddata").checked;
  const anonExplore = byId("settings_anon_explore").checked;

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
    overlays: [...pd.settings.overlays],
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

function setCurrentOverlaySettings(index) {
  currentOverlay = index;
}

module.exports = { setCurrentOverlaySettings, openSettingsTab };
