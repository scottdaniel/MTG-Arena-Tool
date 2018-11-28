/*
global
    setsList,
    cardsDb,
    makeId,
    ConicGradient,
    daysPast,
    timeSince,
    toMMSS,
    toHHMM,
    selectAdd,
    addCardHover,
    get_set_scryfall,
    get_colation_set,
    getEventId,
    addCardSeparator,
    addCardTile,
    getReadableEvent,
    get_collection_export,
    get_collection_stats,
    get_deck_colors,
    get_deck_types_ammount,
    get_deck_curve,
    get_deck_colors_ammount,
    get_deck_lands_ammount,
    get_deck_missing,
    get_deck_export,
    get_deck_export_txt,
    get_rank_index_16,
    get_rank_index,
    draftRanks
    get_card_type_sort,
    collectionSortSet,
    collectionSortName,
    collectionSortCmc,
    collectionSortRarity,
    compare_colors,
    compare_cards,
    timestamp
*/



function open_deck(deck, type) {
    /*
        type is either 1 or 2.
        1 = event deck
        2 = normal deck
    */

    $("#ux_1").html('');

    let top = $('<div class="decklist_top"><div class="button back"></div><div class="deck_name">'+deck.name+'</div></div>');
    let flr = $('<div class="deck_top_colors" style="align-self: center;"></div>');

    deck.colors.forEach(function(color) {
        let m = $('<div class="mana_s20 mana_'+mana[color]+'"></div>');
        flr.append(m);
    });
    top.append(flr);

    let tileGrpid = deck.deckTileId;
    if (cardsDb.get(tileGrpid)) {
        change_background("", tileGrpid);
    }
    let fld = $('<div class="flex_item"></div>');

    let dl = $('<div class="decklist"></div>');
    drawDeck(dl, deck);
    let stats = $('<div class="stats"></div>');


    $('<div class="button_simple visualView">Visual View</div>').appendTo(stats);
    $('<div class="button_simple openHistory">History of changes</div>').appendTo(stats);
    $('<div class="button_simple exportDeck">Export to Arena</div>').appendTo(stats);
    $('<div class="button_simple exportDeckStandard">Export to .txt</div>').appendTo(stats);

    let types = get_deck_types_ammount(deck);
    let typesdiv = $('<div class="types_container"></div>');
    $('<div class="type_icon_cont"><div title="Creatures"       class="type_icon type_cre"></div><span>'+types.cre+'</span></div>').appendTo(typesdiv);
    $('<div class="type_icon_cont"><div title="Lands"           class="type_icon type_lan"></div><span>'+types.lan+'</span></div>').appendTo(typesdiv);
    $('<div class="type_icon_cont"><div title="Instants"        class="type_icon type_ins"></div><span>'+types.ins+'</span></div>').appendTo(typesdiv);
    $('<div class="type_icon_cont"><div title="Sorceries"       class="type_icon type_sor"></div><span>'+types.sor+'</span></div>').appendTo(typesdiv);
    $('<div class="type_icon_cont"><div title="Enchantments"    class="type_icon type_enc"></div><span>'+types.enc+'</span></div>').appendTo(typesdiv);
    $('<div class="type_icon_cont"><div title="Artifacts"       class="type_icon type_art"></div><span>'+types.art+'</span></div>').appendTo(typesdiv);
    $('<div class="type_icon_cont"><div title="Planeswalkers"   class="type_icon type_pla"></div><span>'+types.pla+'</span></div>').appendTo(typesdiv);
    typesdiv.appendTo(stats);

    let curvediv = $('<div class="mana_curve"></div>');
    let curve = get_deck_curve(deck);

    let curveMax = 0;
    for (let i=0; i<curve.length; i++) {
        if (curve[i] == undefined) {
            curve[i] = 0;
        }
        if (curve[i] > curveMax) {
            curveMax = curve[i];
        }
    }

    for (let i=0; i<curve.length; i++) {
        curvediv.append($('<div class="mana_curve_column" style="height: '+(curve[i]/curveMax*100)+'%"></div>'))
    }
    curvediv.appendTo(stats);
    curvediv = $('<div class="mana_curve_numbers"></div>');
    for (let i=0; i<curve.length; i++) {
        curvediv.append($('<div class="mana_curve_column_number"><div style="margin: 0 auto !important" class="mana_s16 mana_'+i+'"></div></div>'))
    }
    curvediv.appendTo(stats);

    //let missing = get_deck_missing(deck);
    let cont = $('<div class="pie_container_outer"></div>');

    // Deck colors
    let colorspie = get_deck_colors_ammount(deck);
    let wp = colorspie.w / colorspie.total * 100;
    let up = wp+colorspie.u / colorspie.total * 100;
    let bp = up+colorspie.b / colorspie.total * 100;
    let rp = bp+colorspie.r / colorspie.total * 100;
    let gp = rp+colorspie.g / colorspie.total * 100;
    let cp = gp+colorspie.c / colorspie.total * 100;

    let gradient = new ConicGradient({
        stops: '#E7CA8E '+wp+'%, #AABEDF 0 '+up+'%, #A18E87 0 '+bp+'%, #DD8263 0 '+rp+'%, #B7C89E 0 '+gp+'%, #E3E3E3 0 '+cp+'%', // required
        size: 400 // Default: Math.max(innerWidth, innerHeight)
    });
    let piechart = $('<div class="pie_container"><span>Mana Symbols</span><svg class="pie">'+gradient.svg+'</svg></div>');
    piechart.appendTo(cont);

    // Lands colors
    colorspie = get_deck_lands_ammount(deck);
    wp = colorspie.w / colorspie.total * 100;
    up = wp+colorspie.u / colorspie.total * 100;
    bp = up+colorspie.b / colorspie.total * 100;
    rp = bp+colorspie.r / colorspie.total * 100;
    gp = rp+colorspie.g / colorspie.total * 100;
    cp = gp+colorspie.c / colorspie.total * 100;

    gradient = new ConicGradient({
        stops: '#E7CA8E '+wp+'%, #AABEDF 0 '+up+'%, #A18E87 0 '+bp+'%, #DD8263 0 '+rp+'%, #B7C89E 0 '+gp+'%, #E3E3E3 0 '+cp+'%', // required
        size: 400 // Default: Math.max(innerWidth, innerHeight)
    });
    piechart = $('<div class="pie_container"><span>Mana Sources</span><svg class="pie">'+gradient.svg+'</svg></div>');
    piechart.appendTo(cont);

    cont.appendTo(stats);

    if (type == 0 || type == 2) {
        let wr = getDeckWinrate(deck.id, deck.lastUpdated);
        if (wr != 0) {
            //$('<span>w/l vs Color combinations</span>').appendTo(stats);
            curvediv = $('<div class="mana_curve"></div>');
            // curve = get_deck_curve(deck);

            curveMax = 0;
            for (let i=0; i<wr.colors.length; i++) {
                if (wr.colors[i].wins > curveMax) {
                    curveMax = wr.colors[i].wins;
                }
                if (wr.colors[i].losses > curveMax) {
                    curveMax = wr.colors[i].losses;
                }
            }

            for (let i=0; i<wr.colors.length; i++) {
                if (wr.colors[i].wins + wr.colors[i].losses > 2) {
                    curvediv.append($('<div class="mana_curve_column back_green" style="height: '+(wr.colors[i].wins/curveMax*100)+'%"></div>'))
                    curvediv.append($('<div class="mana_curve_column back_red" style="height: '+(wr.colors[i].losses/curveMax*100)+'%"></div>'))
                }
            }

            curvediv.appendTo(stats);
            curvediv = $('<div class="mana_curve_costs"></div>');
            for (let i=0; i<wr.colors.length; i++) {
                if (wr.colors[i].wins + wr.colors[i].losses > 2) {
                    let cn = $('<div class="mana_curve_column_number">'+wr.colors[i].wins+'/'+wr.colors[i].losses+'</div>');
                    cn.append($('<div style="margin: 0 auto !important" class=""></div>'));

                    let colors = wr.colors[i].colors;
                    colors.forEach(function(color) {
                        cn.append($('<div style="margin: 0 auto !important" class="mana_s16 mana_'+mana[color]+'"></div>'));
                    })
                    curvediv.append(cn);
                }
            }
            curvediv.appendTo(stats);
        }
    }

    let missingWildcards = get_deck_missing(deck);

    let cost = $('<div class="wildcards_cost"><span>Wildcards Needed</span></div>');

    let _c = $('<div class="wc_cost wc_common">'+missingWildcards.common+'</div>');
    _c.attr("title", "Common");
    _c.appendTo(cost);
    let _u = $('<div class="wc_cost wc_uncommon">'+missingWildcards.uncommon+'</div>');
    _u.appendTo(cost);
    _u.attr("title", "Uncommon");
    let _r = $('<div class="wc_cost wc_rare">'+missingWildcards.rare+'</div>');
    _r.appendTo(cost);
    _r.attr("title", "Rare");
    let _m = $('<div class="wc_cost wc_mythic">'+missingWildcards.mythic+'</div>');
    _m.appendTo(cost);
    _m.attr("title", "Mythic Rare");

    cost.appendTo(stats);

    dl.appendTo(fld);
    stats.appendTo(fld);
    $("#ux_1").append(top);
    $("#ux_1").append(fld);

    $(".visualView").click(function () {
        drawDeckVisual(dl, stats, deck);
    });

    $(".openHistory").click(function () {
        ipc_send('get_deck_changes', deck.id);
    });

    $(".exportDeck").click(function () {
        let list = get_deck_export(deck);
        ipc_send('set_clipboard', list);
    });

    $(".exportDeckStandard").click(function () {
        let list = get_deck_export_txt(deck);
        ipc_send('export_txt', {str: list, name: deck.name});
    });

    $(".back").click(function () {
        change_background("default");
        $('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 
    });
}

module.exports = {
    open_deck: open_deck
}