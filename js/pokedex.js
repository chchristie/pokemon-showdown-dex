BattleSearch.urlRoot = '/';

/**
 * DigiPen-original entries (`isNonstandard` like `DigiPen`, `DigiPen CAP`, …) have no vanilla
 * counterpart, so the dex hides the base/DigiPen version control and always uses mod data.
 * @param {'pokemon' | 'move' | 'ability' | 'item'} kind
 */
function pokedexIsDigiPenExclusive(kind, id) {
	id = toID(id);
	var row;
	if (kind === 'pokemon') row = BattlePokedex[id];
	else if (kind === 'move') row = BattleMovedex[id];
	else if (kind === 'ability') row = BattleAbilities[id];
	else if (kind === 'item') row = BattleItems[id];
	else return false;
	return !!(row && typeof row.isNonstandard === 'string' && row.isNonstandard.startsWith('DigiPen'));
}

/** @param {'pokemon' | 'move' | 'ability' | 'item'} kind */
function pokedexShowVersionToggle(kind, id) {
	if (pokedexIsDigiPenExclusive(kind, id)) return false;
	return kind === 'pokemon' || kind === 'move' || kind === 'ability' || kind === 'item';
}

/** @param {'pokemon' | 'move' | 'ability' | 'item'} kind */
function pokedexModDex(panel, kind) {
	if (pokedexIsDigiPenExclusive(kind, panel.id)) return Dex.mod('gen9digipen');
	if (panel.dexMode !== 'digipen') return Dex;
	return Dex.mod('gen9digipen');
}

/** HTML `name` on the base-game checkbox — unique per panel. */
function pokedexDexSourceRadioName(panel) {
	return 'dexsource-' + (panel && panel.cid ? panel.cid : 'anon');
}

/** Version control: one checkbox, checked = vanilla dex data */
function pokedexDexBaseGameToggleHtml(panel, id, kind) {
	if (!pokedexShowVersionToggle(kind, id)) return '';
	var name = pokedexDexSourceRadioName(panel);
	var checked = panel.dexMode === 'base' ? ' checked' : '';
	return '<div class="dexsource-toggle dexentry-basegame-row"><label class="dexentry-basegame-label">' +
		'<input type="checkbox" name="' + name + '" class="dexentry-basegame-cb"' + checked + ' /> Show base game data</label></div>';
}

/** When to show DigiPen dex metadata: DigiPen version, or always for DigiPen-exclusive entries. */
function pokedexShowDigiPenDexMetadata(panel, kind) {
	return pokedexIsDigiPenExclusive(kind, panel.id) || panel.dexMode === 'digipen';
}

/**
 * Comma-separated escaped contributor names. Supports string[]; objects with `name` and optional `href` for future internal dex links.
 */
function pokedexFormatContributorsHtml(contributors) {
	if (!contributors || !contributors.length) return '';
	var parts = [];
	for (var i = 0; i < contributors.length; i++) {
		var c = contributors[i];
		if (typeof c === 'string') {
			parts.push(Dex.escapeHTML(c));
		} else if (c && typeof c === 'object' && c.name) {
			var nameEsc = Dex.escapeHTML(String(c.name));
			if (c.href) {
				parts.push('<a href="' + Dex.escapeHTML(String(c.href)) + '" rel="noopener noreferrer" target="_blank">' + nameEsc + '</a>');
			} else {
				parts.push(nameEsc);
			}
		}
	}
	return parts.join(', ');
}

function pokedexFormatContributorBlockHtml(contributors) {
	var inner = pokedexFormatContributorsHtml(contributors);
	if (!inner) return '';
	return '<div class="dexentry-contributor-block"><h3>Acknowledgements</h3><p>Contributor: ' + inner + '</p></div>';
}

/** Same Pokédex entry layout as the Pokémon species page (`<dl>` + dt/dd). */
function pokedexFormatPokemonStyleDexEntryHtml(text) {
	if (!text || !String(text).trim()) return '';
	return '<dl style="clear:left"><dt>Pok&eacute;dex entry:</dt> <dd>' + Dex.escapeHTML(String(text).trim()) + '</dd></dl>';
}
function pokedexFormatArtCreditHtml(artSource) {
	if (!artSource) return '';
	var artist = artSource.artist;
	var url = artSource.url;
	if (!artist && !url) return '';
	var line = 'Based on art by ';
	if (url && artist) {
		line += '<a href="' + Dex.escapeHTML(String(url)) + '" rel="noopener noreferrer" target="_blank">' + Dex.escapeHTML(String(artist)) + '</a>';
	} else if (url) {
		line += '<a href="' + Dex.escapeHTML(String(url)) + '" rel="noopener noreferrer" target="_blank">Art</a>';
	} else {
		line += Dex.escapeHTML(String(artist));
	}
	return line;
}

function pokedexFormatNotesSectionHtml(notes) {
	if (notes == null || notes === '') return '';
	var text = '';
	if (typeof notes === 'string') {
		text = notes.trim();
	} else if (Array.isArray(notes) && notes.length) {
		text = notes.filter(Boolean).map(function (x) { return String(x).trim(); }).join('\n').trim();
	}
	if (!text) return '';
	return '<h3>Notes</h3><p class="dexentry-notes-text">' + Dex.escapeHTML(text) + '</p>';
}

function pokedexFormatAcknowledgementsSectionHtml(artSource, contributors) {
	var artLine = pokedexFormatArtCreditHtml(artSource);
	var contInner = pokedexFormatContributorsHtml(contributors);
	var buf = '';
	if (artLine) buf += '<p>' + artLine + '</p>';
	if (contInner) buf += '<p>Contributor: ' + contInner + '</p>';
	if (!buf) return '';
	return '<h3>Acknowledgements</h3>' + buf;
}

/** Merged BattleLearnsets entry (species id, base species, changesFrom). */
function pokedexResolveLearnset(id, pokemon) {
	var learnset = BattleLearnsets[id] && BattleLearnsets[id].learnset;
	if (!learnset && BattleLearnsets[toID(pokemon.baseSpecies)]) {
		learnset = BattleLearnsets[toID(pokemon.baseSpecies)].learnset;
	}
	if (!learnset) learnset = {};
	if (pokemon.changesFrom && BattleLearnsets[toID(pokemon.changesFrom)]) {
		learnset = $.extend({}, learnset, BattleLearnsets[toID(pokemon.changesFrom)].learnset);
	}
	return learnset;
}

/**
 * True if `moveid` exists for this species only because of the gen9digipen learnset layer
 * (vanilla dist learnset had no entry for that move on that species id).
 * Populated at build time as `BattleLearnsetsDigiPenAdditions` in learnsets.js.
 */
function pokedexLearnsetMoveDigipenOnlyVsVanilla(pokemonid, moveid) {
	var add = window.BattleLearnsetsDigiPenAdditions;
	if (!add) return false;
	var sp = Dex.species.get(pokemonid);
	var baseId = toID(sp.baseSpecies);
	var ids = pokemonid === baseId ? [pokemonid] : [pokemonid, baseId];
	for (var i = 0; i < ids.length; i++) {
		var row = add[ids[i]];
		if (row && row[moveid]) return true;
	}
	return false;
}

function pokedexPokemonGainedMoveInDigipen(moveid, pokemonid) {
	if (pokedexIsDigiPenExclusive('pokemon', pokemonid)) return false;
	return pokedexLearnsetMoveDigipenOnlyVsVanilla(pokemonid, moveid);
}

/**
 * Move IDs added only in the DigiPen mod (vs vanilla learnsets), for this species / base.
 * Used by the Pokémon page learnset split.
 */
function pokedexDigiPenAdditionMoveIds(id, pokemon) {
	var add = window.BattleLearnsetsDigiPenAdditions;
	if (!add) return {};
	var baseId = toID(pokemon.baseSpecies);
	var set = {};
	function mergeFrom(specId) {
		var row = add[specId];
		if (!row) return;
		for (var moveid in row) set[moveid] = 1;
	}
	mergeFrom(id);
	if (id !== baseId) mergeFrom(baseId);
	return set;
}

function pokedexPokemonShowsAbilityName(species, abilityName) {
	return species.abilities['0'] === abilityName || species.abilities['1'] === abilityName ||
		species.abilities['H'] === abilityName || species.abilities['S'] === abilityName;
}

function pokedexSpeciesPokedexRow(dexMod, pokemonId) {
	try {
		var table = dexMod && dexMod.data && dexMod.data.Pokedex;
		var row = table && table[pokemonId];
		if (row && row.abilities) return row;
	} catch (e) {}
	return null;
}

function pokedexPokemonGainedAbilityInDigipen(abilityId, pokemonId) {
	var abilityName = Dex.abilities.get(abilityId).name;
	var digiSp = Dex.mod('gen9digipen').species.get(pokemonId);
	if (!pokedexPokemonShowsAbilityName(digiSp, abilityName)) return false;
	var baseRow = pokedexSpeciesPokedexRow(Dex, pokemonId);
	var digiRow = pokedexSpeciesPokedexRow(Dex.mod('gen9digipen'), pokemonId);
	if (baseRow && digiRow) {
		return JSON.stringify(baseRow.abilities) !== JSON.stringify(digiRow.abilities);
	}
	var baseSp = Dex.species.get(pokemonId);
	return !pokedexPokemonShowsAbilityName(baseSp, abilityName);
}

/** True when move/ability lists should bold species that gained the entry in the DigiPen mod (non-exclusive pages only). */
function pokedexPanelHighlightsDigipenDistribution(panel, kind) {
	if (pokedexIsDigiPenExclusive(kind, panel.id)) return false;
	return panel.dexMode === 'digipen';
}

function pokedexWrapPokemonRowIfGained(html, gained) {
	if (!gained) return html;
	if (html.indexOf('pokedex-modified-pokemon') >= 0) return html;
	return html.replace(/<li class="result">/i, '<li class="result pokedex-modified-pokemon">');
}

/** Split encoded learnset rows into mod additions vs rest (DigiPen view, non–DigiPen-exclusive species only). */
function pokedexSplitLearnsetByModAdditions(speciesId, pokemon, encodedMoves, dexModeDigipen) {
	if (pokedexIsDigiPenExclusive('pokemon', speciesId) || !dexModeDigipen) {
		return { addMoves: [], mainMoves: encodedMoves };
	}
	var addIds = pokedexDigiPenAdditionMoveIds(speciesId, pokemon);
	if (!addIds || !Object.keys(addIds).length) {
		return { addMoves: [], mainMoves: encodedMoves };
	}
	var addMoves = [];
	var mainMoves = [];
	for (var mi = 0; mi < encodedMoves.length; mi++) {
		var mid = pokedexLearnsetEncMoveid(encodedMoves[mi]);
		if (addIds[mid]) addMoves.push(encodedMoves[mi]);
		else mainMoves.push(encodedMoves[mi]);
	}
	// If the patch table lists the whole learnset (merged learnset in teambuilder data),
	// every row lands in additions and main is empty — treat as no split.
	if (addMoves.length && !mainMoves.length && addMoves.length === encodedMoves.length) {
		return { addMoves: [], mainMoves: encodedMoves };
	}
	return { addMoves: addMoves, mainMoves: mainMoves };
}

function pokedexLearnsetEncMoveid(enc) {
	var sp = enc.indexOf(' ');
	return sp === -1 ? '' : enc.slice(sp + 1);
}

/**
 * Full learnset as encoded strings (same scheme as the moves tab), including prevo chains.
 */
function pokedexBuildLearnsetEncodedMoves(pokemon) {
	var learnset = pokedexResolveLearnset(pokemon.id, pokemon);
	var moves = [];
	var shownMoves = {};
	var mostRecentGen = Dex.gen;
	var pastGenPoke = pokemon;
	for (; mostRecentGen > 7; mostRecentGen--) {
		if (pastGenPoke.isNonstandard !== 'Past') break;
		pastGenPoke = Dex.forGen(mostRecentGen - 1).species.get(pastGenPoke.id);
	}
	mostRecentGen = '' + mostRecentGen;
	for (var moveid in learnset) {
		var sources = learnset[moveid];
		if (typeof sources === 'string') sources = [sources];
		for (var i = 0, len = sources.length; i < len; i++) {
			var source = sources[i];
			var sourceType = source.charAt(1);
			if (source.charAt(0) === mostRecentGen) {
				switch (sourceType) {
				case 'L':
					moves.push('a' + source.substr(2).padStart(3, '0') + ' ' + moveid);
					shownMoves[moveid] = (shownMoves[moveid] | 2);
					break;
				case 'M':
					moves.push('d000 ' + moveid);
					shownMoves[moveid] = (shownMoves[moveid] | 1);
					break;
				case 'T':
					moves.push('e000 ' + moveid);
					shownMoves[moveid] = (shownMoves[moveid] | 1);
					break;
				case 'E':
					moves.push('f000 ' + moveid);
					shownMoves[moveid] = (shownMoves[moveid] | 4);
					break;
				}
			}
			if (sourceType === 'S') {
				if (shownMoves[moveid] & 8) continue;
				moves.push('i000 ' + moveid);
				shownMoves[moveid] = (shownMoves[moveid] | 8);
			}
		}
	}
	var prevo1;
	var prevo2;
	if (pokemon.prevo) {
		prevo1 = toID(pokemon.prevo);
		var prevoLearnset = BattleLearnsets[prevo1] && BattleLearnsets[prevo1].learnset;
		if (!prevoLearnset) prevoLearnset = {};
		for (var moveid in prevoLearnset) {
			var sources = prevoLearnset[moveid];
			if (typeof sources === 'string') sources = [sources];
			for (var i = 0, len = sources.length; i < len; i++) {
				var source = sources[i];
				if (source.substr(0, 2) === '' + mostRecentGen + 'L') {
					if (shownMoves[moveid] & 2) continue;
					moves.push('b' + source.substr(2).padStart(3, '0') + ' ' + moveid);
					shownMoves[moveid] = (shownMoves[moveid] | 2);
				} else if (source === '' + mostRecentGen + 'E') {
					if (shownMoves[moveid] & 4) continue;
					moves.push('g000 ' + moveid);
					shownMoves[moveid] = (shownMoves[moveid] | 4);
				} else if (source.charAt(1) === 'S') {
					if (shownMoves[moveid] & 8) continue;
					moves.push('i000 ' + moveid);
					shownMoves[moveid] = (shownMoves[moveid] | 8);
				}
			}
		}

		if (BattlePokedex[prevo1] && BattlePokedex[prevo1].prevo) {
			prevo2 = toID(BattlePokedex[prevo1].prevo);
			prevoLearnset = BattleLearnsets[prevo2] && BattleLearnsets[prevo2].learnset;
			if (!prevoLearnset) prevoLearnset = {};
			for (var moveid in prevoLearnset) {
				var sources = prevoLearnset[moveid];
				if (typeof sources === 'string') sources = [sources];
				for (var i = 0, len = sources.length; i < len; i++) {
					var source = sources[i];
					if (source.substr(0, 2) === mostRecentGen + 'L') {
						if (shownMoves[moveid] & 2) continue;
						moves.push('b' + source.substr(2).padStart(3, '0') + ' ' + moveid);
						shownMoves[moveid] = (shownMoves[moveid] | 2);
					} else if (source === mostRecentGen + 'E') {
						if (shownMoves[moveid] & 4) continue;
						moves.push('h000 ' + moveid);
						shownMoves[moveid] = (shownMoves[moveid] | 4);
					} else if (source.charAt(1) === 'S') {
						if (shownMoves[moveid] & 8) continue;
						moves.push('i000 ' + moveid);
						shownMoves[moveid] = (shownMoves[moveid] | 8);
					}
				}
			}
		}
	}
	for (var moveid in learnset) {
		if (moveid in shownMoves) continue;
		moves.push('j000 ' + moveid);
		shownMoves[moveid] = (shownMoves[moveid] | 1);
	}
	moves.sort();
	return { moves: moves, prevo1: prevo1, prevo2: prevo2 };
}

/** Move row data for learnset lists: mod dex when provided, else bundled table. */
function pokedexGetMoveForLearnsetRow(moveDex, moveid) {
	if (moveDex && moveDex.moves) {
		var m = moveDex.moves.get(moveid);
		if (m && m.exists !== false) return m;
	}
	return BattleMovedex[moveid];
}

function pokedexMoveRowHtml(move, desc, moveid, boldDigiPenModified) {
	var row = BattleSearch.renderTaggedMoveRow(move, desc);
	if (boldDigiPenModified) {
		// DigiPen-only moves use isNonstandard: "DigiPen" in moves.js; overlays may use modified.
		var mod =
			(move && move.modified === 'DigiPen') ||
			(BattleMovedex[moveid] && BattleMovedex[moveid].modified === 'DigiPen') ||
			pokedexIsDigiPenExclusive('move', moveid);
		if (mod) {
			return row.replace(/<li class="result">/i, '<li class="result pokedex-modified-move">');
		}
	}
	return row;
}

function pokedexRenderLearnsetEncodedList(moves, prevo1, prevo2, omitSectionHeaders, moveDex, boldDigiPenModified) {
	var buf = '';
	var last = '';
	var lastChanged = false;
	for (var i = 0, len = moves.length; i < len; i++) {
		var enc = moves[i];
		var moveid = pokedexLearnsetEncMoveid(enc);
		var move = pokedexGetMoveForLearnsetRow(moveDex, moveid);
		if (!move) {
			buf += '<li><pre>error: "' + enc + '"</pre></li>';
			continue;
		}
		lastChanged = enc.substr(0, 1) !== last;
		if (lastChanged) last = enc.substr(0, 1);
		var desc = '';
		switch (last) {
		case 'a':
			if (lastChanged && !omitSectionHeaders) buf += '<li class="resultheader"><h3>Level-up</h3></li>';
			desc = enc.substr(1, 3) === '001' || enc.substr(1, 3) === '000' ? '&ndash;' : '<small>L</small>' + (Number(enc.substr(1, 3)) || '?');
			break;
		case 'b':
			if (lastChanged && !omitSectionHeaders) buf += '<li class="resultheader"><h3>Level-up from ' + BattlePokedex[prevo1].name + '</h3></li>';
			desc = enc.substr(1, 3) === '001' || enc.substr(1, 3) === '000' ? '&ndash;' : '<small>L</small>' + (Number(enc.substr(1, 3)) || '?');
			break;
		case 'c':
			if (lastChanged && !omitSectionHeaders) buf += '<li class="resultheader"><h3>Level-up from ' + BattlePokedex[prevo2].name + '</h3></li>';
			desc = enc.substr(1, 3) === '001' || enc.substr(1, 3) === '000' ? '&ndash;' : '<small>L</small>' + (Number(enc.substr(1, 3)) || '?');
			break;
		case 'd':
			if (lastChanged && !omitSectionHeaders) buf += '<li class="resultheader"><h3>TM/HM</h3></li>';
			desc = '<span class="itemicon" style="margin-top:-3px;' + Dex.getItemIcon({ spritenum: 508 }) + '"></span>';
			break;
		case 'e':
			if (lastChanged && !omitSectionHeaders) buf += '<li class="resultheader"><h3>Tutor</h3></li>';
			desc = '<img src="' + Dex.resourcePrefix + 'sprites/tutor.png" style="margin-top:-4px;opacity:.7" width="27" height="26" alt="T" />';
			break;
		case 'f':
			if (lastChanged && !omitSectionHeaders) buf += '<li class="resultheader"><h3>Egg</h3></li>';
			desc = '<span class="picon" style="margin-top:-12px;' + Dex.getPokemonIcon('egg') + '"></span>';
			break;
		case 'g':
			if (lastChanged && !omitSectionHeaders) buf += '<li class="resultheader"><h3>Egg from ' + BattlePokedex[prevo1].name + '</h3></li>';
			desc = '<span class="picon" style="margin-top:-12px;' + Dex.getPokemonIcon('egg') + '"></span>';
			break;
		case 'h':
			if (lastChanged && !omitSectionHeaders) buf += '<li class="resultheader"><h3>Egg from ' + BattlePokedex[prevo2].name + '</h3></li>';
			desc = '<span class="picon" style="margin-top:-12px;' + Dex.getPokemonIcon('egg') + '"></span>';
			break;
		case 'i':
			if (lastChanged && !omitSectionHeaders) buf += '<li class="resultheader"><h3>Event</h3></li>';
			desc = '!';
			break;
		case 'j':
			if (lastChanged && !omitSectionHeaders) buf += '<li class="resultheader"><h3>Past generation only</h3></li>';
			desc = '...';
			break;
		default:
			desc = '';
		}
		buf += pokedexMoveRowHtml(move, desc, moveid, boldDigiPenModified);
	}
	return buf;
}

Dex.escapeHTML = function (str, jsEscapeToo) {
	str = String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	if (jsEscapeToo) str = str.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
	return str;
};

var Topbar = Panels.Topbar.extend({
	height: 51
});

var PokedexResultPanel = Panels.Panel.extend({
	minWidth: 639,
	maxWidth: 639,
	initialize: function() {
		this.html('not found: '+Array.prototype.join.call(arguments,' || '));
	}
});

var PokedexItemPanel = PokedexResultPanel.extend({
	events: {
		'change .dexsource-toggle input[type=checkbox]': 'changeDexSource',
	},
	changeDexSource: function (e) {
		this.dexMode = e.currentTarget.checked ? 'base' : 'digipen';
		this.renderItemDex();
	},
	initialize: function (id) {
		this.id = toID(id);
		if (pokedexShowVersionToggle('item', this.id)) {
			if (!this.dexMode) this.dexMode = 'digipen';
		} else {
			this.dexMode = null;
		}
		this.renderItemDex();
	},
	renderItemDex: function () {
		var id = this.id;
		var dex = pokedexModDex(this, 'item');
		var item = dex.items.get(id);
		this.shortTitle = item.name;

		var buf = '<div class="pfx-body dexentry">';
		buf += '<a href="/" class="pfx-backbutton" data-target="back"><i class="fa fa-chevron-left"></i> Pok&eacute;dex</a>';
		buf += '<div class="dexentry-head">';
		buf += pokedexDexBaseGameToggleHtml(this, id, 'item');
		buf += '<h1><span class="itemicon" style="'+Dex.getItemIcon(item)+'"></span> <a href="/items/'+id+'" data-target="push" class="subtle">'+item.name+'</a></h1>';
		buf += '</div>';
		if (typeof item.isNonstandard === 'string' && item.isNonstandard.startsWith('DigiPen')) {
			buf += '<div class="warning">An item by the DigiPen Pok&eacute;mon Club.</div>';
		}
		buf += '<p>'+Dex.escapeHTML(item.desc||item.shortDesc)+'</p>';

		// past gens
		var pastGenChanges = false;
		for (var genNum = Dex.gen - 1; genNum >= item.gen; genNum--) {
			var nextGenItem = Dex.forGen(genNum + 1).items.get(id);
			var curGenItem = Dex.forGen(genNum).items.get(id);
			var changes = '';

			if (curGenItem.shortDesc !== nextGenItem.shortDesc) {
				changes += curGenItem.shortDesc + ' <i class="fa fa-long-arrow-right"></i> ' + nextGenItem.shortDesc + '<br />';
			}

			if (changes) {
				if (!pastGenChanges) buf += '<h3>Past gens</h3><dl>';
				buf += '<dt>Gen ' + genNum + ' <i class="fa fa-arrow-right"></i> ' + (genNum + 1) + ':</dt>';
				buf += '<dd>' + changes + '</dd>';
				pastGenChanges = true;
			}
		}
		if (pastGenChanges) buf += '</dl>';

		if (pokedexShowDigiPenDexMetadata(this, 'item')) {
			var itemRow = window.BattleItems && BattleItems[id];
			var contributors = item.contributors || (itemRow && itemRow.contributors);
			buf += pokedexFormatContributorBlockHtml(contributors);
		}

		buf += '</div>';

		this.html(buf);
	}
});
var PokedexAbilityPanel = PokedexResultPanel.extend({
	events: {
		'change .dexsource-toggle input[type=checkbox]': 'changeDexSource',
	},
	changeDexSource: function (e) {
		this.dexMode = e.currentTarget.checked ? 'base' : 'digipen';
		this.renderAbilityDex();
	},
	initialize: function (id) {
		this.id = toID(id);
		if (!this.dexMode) this.dexMode = 'digipen';
		this.renderAbilityDex();
	},
	renderAbilityDex: function () {
		var id = this.id;
		var dex = pokedexModDex(this, 'ability');
		var ability = dex.abilities.get(id);
		this.shortTitle = ability.name;

		var buf = '<div class="pfx-body dexentry">';
		buf += '<a href="/" class="pfx-backbutton" data-target="back"><i class="fa fa-chevron-left"></i> Pok&eacute;dex</a>';
		buf += '<div class="dexentry-head">';
		buf += pokedexDexBaseGameToggleHtml(this, id, 'ability');
		buf += '<h1><a href="/abilities/'+id+'" data-target="push" class="subtle">'+ability.name+'</a></h1>';
		buf += '</div>';

		if (ability.isNonstandard && ability.id !== 'noability') {
			if (typeof ability.isNonstandard === 'string' && ability.isNonstandard.startsWith('DigiPen')) {
				buf += '<div class="warning">An ability by the DigiPen Pok&eacute;mon Club.</div>';
			} else {
				buf += '<div class="warning">An ability by <a href="http://www.smogon.com/cap/" target="_blank">Smogon <strong>CAP</strong></a>.</div>';
			}
		}

		buf += '<p>'+Dex.escapeHTML(ability.desc)+'</p>';

		// past gens
		var pastGenChanges = false;
		for (var genNum = Dex.gen - 1; genNum >= ability.gen; genNum--) {
			var nextGenAbility = Dex.forGen(genNum + 1).abilities.get(id);
			var curGenAbility = Dex.forGen(genNum).abilities.get(id);
			var changes = '';

			if (curGenAbility.shortDesc !== nextGenAbility.shortDesc) {
				changes += curGenAbility.shortDesc + ' <i class="fa fa-long-arrow-right"></i> ' + nextGenAbility.shortDesc + '<br />';
			}

			if (changes) {
				if (!pastGenChanges) buf += '<h3>Past gens</h3><dl>';
				buf += '<dt>Gen ' + genNum + ' <i class="fa fa-arrow-right"></i> ' + (genNum + 1) + ':</dt>';
				buf += '<dd>' + changes + '</dd>';
				pastGenChanges = true;
			}
		}
		if (pastGenChanges) buf += '</dl>';

		// pokemon
		buf += '<h3>Pok&eacute;mon with this ability</h3>';
		buf += '<ul class="utilichart nokbd">';
		buf += '<li>Loading...</li>';
		buf += '</ul>';

		buf += '</div>';

		this.html(buf);

		setTimeout(this.renderPokemonList.bind(this));
	},
	renderPokemonList: function(list) {
		var dex = pokedexModDex(this, 'ability');
		var ability = dex.abilities.get(this.id);
		var buf = '';
		var highlightDigiPen = pokedexPanelHighlightsDigipenDistribution(this, 'ability');
		for (var pokemonid in BattlePokedex) {
			var sp = dex.species.get(pokemonid);
			if (!sp.abilities) continue;
			if (sp.isNonstandard && !ability.isNonstandard) {
				var ns = sp.isNonstandard;
				var allowDigiPenMon = highlightDigiPen && typeof ns === 'string' && ns.startsWith('DigiPen');
				if (!allowDigiPenMon) continue;
			}
			if (pokedexPokemonShowsAbilityName(sp, ability.name)) {
				var row = BattleSearch.renderPokemonRow(sp);
				if ((highlightDigiPen && pokedexPokemonGainedAbilityInDigipen(this.id, pokemonid)) || pokedexIsDigiPenExclusive('pokemon', pokemonid)) {
					row = pokedexWrapPokemonRowIfGained(row, true);
				}
				buf += row;
			}
		}

		var hasNonstandard = false;
		for (var pokemonid in BattlePokedex) {
			var sp = dex.species.get(pokemonid);
			if (!sp.abilities) continue;
			if (!(sp.isNonstandard && !ability.isNonstandard)) continue;
			var ns2 = sp.isNonstandard;
			if (highlightDigiPen && typeof ns2 === 'string' && ns2.startsWith('DigiPen')) continue;
			if (pokedexPokemonShowsAbilityName(sp, ability.name)) {
				if (!hasNonstandard) {
					buf += '<li class="resultheader"><h3>Unavailable Pok&eacute;mon with this ability</h3></li>';
					hasNonstandard = true;
				}
				var row2 = BattleSearch.renderPokemonRow(sp);
				if ((highlightDigiPen && pokedexPokemonGainedAbilityInDigipen(this.id, pokemonid)) || pokedexIsDigiPenExclusive('pokemon', pokemonid)) {
					row2 = pokedexWrapPokemonRowIfGained(row2, true);
				}
				buf += row2;
			}
		}

		this.$('.utilichart').html(buf);

		this.$('.dexentry .dexentry-contributor-block').remove();
		if (pokedexShowDigiPenDexMetadata(this, 'ability')) {
			var abRow = window.BattleAbilities && BattleAbilities[this.id];
			var contributors = ability.contributors || (abRow && abRow.contributors);
			var foot = pokedexFormatContributorBlockHtml(contributors);
			if (foot) this.$('.dexentry').append(foot);
		}
	}
});
var PokedexTypePanel = PokedexResultPanel.extend({
	initialize: function(id) {
		id = toID(id);
		this.type = id[0].toUpperCase()+id.substr(1);
		var type = Dex.types.get(this.type);
		this.shortTitle = this.type;

		var buf = '<div class="pfx-body dexentry">';
		buf += '<a href="/" class="pfx-backbutton" data-target="back"><i class="fa fa-chevron-left"></i> Pok&eacute;dex</a>';
		buf += '<h1><a href="/types/'+id+'" data-target="push" class="subtle">'+this.type+'</a></h1>';
		buf += '<dl>';
		var atLeastOne = false;

		buf += '<dt>Weaknesses:</dt> <dd>';
		for (var attackType in type.damageTaken) {
			if (type.damageTaken[attackType] == 1) {
				buf += '<a href="/types/'+toID(attackType)+'" data-target="push">'+Dex.getTypeIcon(attackType)+'</a> ';
				atLeastOne = true;
			}
		}
		if (!atLeastOne) {
			buf += '<em>No weaknesses</em>';
		}
		buf += '</dd>';

		buf += '<dt>Resistances:</dt> <dd>';
		atLeastOne = false;
		for (var attackType in type.damageTaken) {
			if (type.damageTaken[attackType] == 2) {
				buf += '<a href="/types/'+toID(attackType)+'" data-target="push">'+Dex.getTypeIcon(attackType)+'</a> ';
				atLeastOne = true;
			}
		}
		if (!atLeastOne) {
			buf += '<em>No resistances</em>';
		}
		buf += '</dd>';

		buf += '<dt>Immunities:</dt> <dd>';
		atLeastOne = false;
		for (var attackType in type.damageTaken) {
			if (type.damageTaken[attackType] == 3) {
				if (attackType === attackType.toLowerCase()) {
					switch (attackType) {
					case 'hail':
						buf += '<div><small><a href="/moves/hail" data-target="push">Hail</a> damage</small></div>';
						break;
					case 'sandstorm':
						buf += '<div><small><a href="/moves/sandstorm" data-target="push">Sandstorm</a> damage</small></div>';
						break;
					case 'powder':
						buf += '<div><small><a href="/tags/powder" data-target="push">Powder moves</a></small></div>';
						break;
					case 'frz':
						buf += '<div><small>FRZ status</small></div>';
						break;
					case 'brn':
						buf += '<div><small>BRN status</small></div>';
						break;
					case 'psn':
						buf += '<div><small>PSN status</small></div>';
						break;
					case 'par':
						buf += '<div><small>PAR status</small></div>';
						break;
					}
					if (!atLeastOne) atLeastOne = null;
					continue;
				}
				buf += '<a href="/types/'+toID(attackType)+'" data-target="push">'+Dex.getTypeIcon(attackType)+'</a> ';
				atLeastOne = true;
			}
		}
		if (!atLeastOne) {
			if (atLeastOne === null) {
				buf += '<div><em>No type immunities</em></div>';
			} else {
				buf += '<em>No immunities</em>';
			}
		}
		buf += '</dd>';

		buf += '</dl>';

		// move list
		buf += '<ul class="tabbar"><li><button class="button nav-first cur" value="move">Moves</button></li><li><button class="button nav-last" value="pokemon">Pokemon</button></li></ul>';
		buf += '<ul class="utilichart nokbd">';
		buf += '</ul>';

		buf += '</div>';

		this.html(buf);

		setTimeout(this.renderMoveList.bind(this));
	},
	events: {
		'click .tabbar button': 'selectTab'
	},
	selectTab: function(e) {
		this.$('.tabbar button').removeClass('cur');
		$(e.currentTarget).addClass('cur');
		switch (e.currentTarget.value) {
		case 'move':
			this.renderMoveList();
			break;
		case 'pokemon':
			this.renderPokemonList();
			break;
		}
	},
	renderMoveList: function() {
		var type = this.type;
		var buf = '<li class="resultheader"><h3>Physical '+type+' moves</h3></li>';
		for (var moveid in BattleMovedex) {
			var move = BattleMovedex[moveid];
			if (move.type === type && move.category === 'Physical') {
				buf += BattleSearch.renderMoveRow(move);
			}
		}
		this.$('.utilichart').html(buf)
			.css('min-height', 27*3 + 33*BattleSearchCountIndex[type+' move']);

		setTimeout(this.renderMoveList2.bind(this));
	},
	renderMoveList2: function() {
		var type = this.type;
		var bufs = ['<li class="resultheader"><h3>Physical '+type+' moves</h3></li>','<li class="resultheader"><h3>Special '+type+' moves</h3></li>','<li class="resultheader"><h3>Status '+type+' moves</h3></li>'];
		var bufChart = {Physical:0,Special:1,Status:2};
		for (var moveid in BattleMovedex) {
			var move = BattleMovedex[moveid];
			if (move.type === type) {
				bufs[bufChart[move.category]] += BattleSearch.renderMoveRow(move);
			}
		}
		this.$('.utilichart').html(bufs.join(''))
			.css('min-height', 27*3 + 33*BattleSearchCountIndex[type+' move']);
	},
	renderPokemonList: function() {
		var type = this.type;
		var pureBuf = '<li class="resultheader"><h3>Pure '+type+' Pok&eacute;mon</h3></li>';
		for (var templateid in BattlePokedex) {
			var template = BattlePokedex[templateid];
			if (!template.types) continue;
			if (template.types[0] === type && !template.types[1]) {
				pureBuf += BattleSearch.renderPokemonRow(template);
			}
		}
		this.$('.utilichart').html(pureBuf)
			.css('min-height', 27*3 + 33*BattleSearchCountIndex[type+' pokemon']);

		setTimeout(this.renderPokemonList2.bind(this));
	},
	renderPokemonList2: function() {
		var type = this.type;
		var primaryBuf = '<li class="resultheader"><h3>Primary '+type+' Pok&eacute;mon</h3></li>';
		var secondaryBuf = '<li class="resultheader"><h3>Secondary '+type+' Pok&eacute;mon</h3></li>';
		for (var templateid in BattlePokedex) {
			var template = BattlePokedex[templateid];
			if (template.types[0] === type) {
				if (template.types[1]) {
					primaryBuf += BattleSearch.renderPokemonRow(template);
				}
			} else if (template.types[1] === type) {
				secondaryBuf += BattleSearch.renderPokemonRow(template);
			}
		}
		this.$('.utilichart').append(primaryBuf + secondaryBuf);
	}
});
var PokedexTagPanel = PokedexResultPanel.extend({
	table: {
		contact: {
			name: 'Contact',
			tag: 'contact',
			desc: 'Affected by a variety of moves, abilities, and items.</p><p>Moves affected by contact moves include: Spiky Shield, King\'s Shield. Abilities affected by contact moves include: Iron Barbs, Rough Skin, Gooey, Flame Body, Static, Tough Claws. Items affected by contact moves include: Rocky Helmet, Sticky Barb.'
		},
		sound: {
			name: 'Sound',
			tag: 'sound',
			desc: 'Bypasses <a href="/moves/substitute" data-target="push">Substitute</a>. Doesn\'t affect <a href="/abilities/soundproof" data-target="push">Soundproof</a> Pok&eacute;mon.'
		},
		powder: {
			name: 'Powder',
			tag: 'powder',
			desc: 'Doesn\'t affect <a href="/types/grass" data-target="push">Grass-type</a> Pok&eacute;mon, <a href="/abilities/overcoat" data-target="push">Overcoat</a> Pok&eacute;mon, or <a href="/items/safetygoggles" data-target="push">Safety Goggles</a> holders.'
		},
		fist: {
			name: 'Fist',
			tag: 'punch',
			desc: 'Boosted 1.2x by <a href="/abilities/ironfist" data-target="push">Iron Fist</a>.'
		},
		pulse: {
			name: 'Pulse',
			tag: 'pulse',
			desc: 'Boosted 1.5x by <a href="/abilities/megalauncher" data-target="push">Mega Launcher</a>.'
		},
		bite: {
			name: 'Bite',
			tag: 'bite',
			desc: 'Boosted 1.5x by <a href="/abilities/strongjaw" data-target="push">Strong Jaw</a>.'
		},
		ballistic: {
			name: 'Ballistic',
			tag: 'bullet',
			desc: 'Doesn\'t affect <a href="/abilities/bulletproof" data-target="push">Bulletproof</a> Pok&eacute;mon.'
		},
		slicing: {
			name: 'Slicing',
			tag: 'slicing',
			desc: 'Boosted 1.5x by <a href="/abilities/sharpness" data-target="push">Sharpness</a>.'
		},
		wind: {
			name: 'Wind',
			tag: 'wind',
			desc: 'Pok&eacute;mon with <a href="/abilities/windpower" data-target="push">Wind Power</a> gain the charge effect after being hit. Pok&eacute;mon with <a href="/abilities/windrider" data-target="push">Wind Rider</a> have their Attack raised by 1 stage and are immune.'
		},
		bypassprotect: {
			name: 'Bypass Protect',
			tag: '',
			desc: 'Bypasses <a class="subtle" href="/moves/protect" data-target="push">Protect</a>, <a class="subtle" href="/moves/detect" data-target="push">Detect</a>, <a class="subtle" href="/moves/kingsshield" data-target="push">King\'s Shield</a>, and <a class="subtle" href="/moves/spikyshield" data-target="push">Spiky Shield</a>.'
		},
		nonreflectable: {
			name: 'Nonreflectable',
			tag: '',
			desc: 'Can\'t be bounced by <a class="subtle" href="/moves/magiccoat" data-target="push">Magic Coat</a> or <a class="subtle" href="/abilities/magicbounce" data-target="push">Magic Bounce</a>.'
		},
		nonmirror: {
			name: 'Nonmirror',
			tag: '',
			desc: 'Can\'t be copied by <a class="subtle" href="/moves/mirrormove" data-target="push">Mirror Move</a>.'
		},
		nonsnatchable: {
			name: 'Nonsnatchable',
			tag: '',
			desc: 'Can\'t be copied by <a class="subtle" href="/moves/snatch" data-target="push">Snatch</a>.'
		},
		bypasssub: {
			name: 'Bypass Substitute',
			tag: 'bypasssub',
			desc: 'Bypasses but does not break a <a class="subtle" href="/moves/substitute" data-target="push">Substitute</a>.'
		},
		zmove: {
			name: 'Z-Move',
			tag: '',
			desc: 'Is a <a class="subtle" href="/articles/zmoves" data-target="push">Z-Move</a>.'
		},
		maxmove: {
			name: 'Max Move',
			tag: '',
			desc: 'Is a <a class="subtle" href="/articles/maxmoves" data-target="push">Max Move</a>.'
		},
		gmaxmove: {
			name: 'G-Max Move',
			tag: '',
			desc: 'Is a <a class="subtle" href="/articles/gmaxmoves" data-target="push">G-Max Move</a>.'
		}
	},
	initialize: function(id) {
		var tag = this.table[id];
		var name = (tag ? tag.name : id);
		this.id = id;
		this.shortTitle = name;

		var buf = '<div class="pfx-body dexentry">';

		buf += '<a href="/" class="pfx-backbutton" data-target="back"><i class="fa fa-chevron-left"></i> Pok&eacute;dex</a>';
		buf += '<h1><a href="/tags/'+id+'" data-target="push" class="subtle">'+name+'</a></h1>';

		if (tag) buf += '<p>'+tag.desc+'</p>';

		// distribution
		buf += '<h3>'+name+' moves</h3>';
		buf += '<ul class="utilichart metricchart nokbd">';
		buf += '</ul>';

		buf += '</div>';

		this.html(buf);

		setTimeout(this.renderDistribution.bind(this));
	},
	getDistribution: function() {
		if (this.results) return this.results;
		var tag = (this.id in this.table ? this.table[this.id].tag : this.id);
		var results = [];
		if (tag) {
			for (var moveid in BattleMovedex) {
				if (BattleMovedex[moveid].flags && tag in BattleMovedex[moveid].flags) results.push(moveid);
			}
		} else if (this.id === 'bypassprotect') {
			for (var moveid in BattleMovedex) {
				if (BattleMovedex[moveid].target !== 'self' && BattleMovedex[moveid].flags && !('protect' in BattleMovedex[moveid].flags)) {
					results.push(moveid);
				}
			}
		} else if (this.id === 'nonreflectable') {
			for (var moveid in BattleMovedex) {
				if (BattleMovedex[moveid].target !== 'self' && BattleMovedex[moveid].category === 'Status' && BattleMovedex[moveid].flags && !('reflectable' in BattleMovedex[moveid].flags)) {
					results.push(moveid);
				}
			}
		} else if (this.id === 'zmove') {
			for (var moveid in BattleMovedex) {
				if (BattleMovedex[moveid].isZ) {
					results.push(moveid);
				}
			}
		} else if (this.id === 'nonmirror') {
			for (var moveid in BattleMovedex) {
				if (BattleMovedex[moveid].target !== 'self' && BattleMovedex[moveid].flags && !('mirror' in BattleMovedex[moveid].flags)) {
					results.push(moveid);
				}
			}
		} else if (this.id === 'nonsnatchable') {
			for (var moveid in BattleMovedex) {
				if ((BattleMovedex[moveid].target === 'allyTeam' || BattleMovedex[moveid].target === 'self' || BattleMovedex[moveid].target === 'adjacentAllyOrSelf') && BattleMovedex[moveid].flags && !('snatch' in BattleMovedex[moveid].flags)) {
					results.push(moveid);
				}
			}
		}
		return this.results = results;
	},
	renderDistribution: function() {
		var results = this.getDistribution();
		this.$chart = this.$('.utilichart');

		if (results.length > 1600/33) {
			this.streamLoading = true;
			this.$el.on('scroll', this.handleScroll.bind(this));

			var panelTop = this.$el.children().offset().top;
			var panelHeight = this.$el.outerHeight();
			var chartTop = this.$chart.offset().top;
			var scrollLoc = this.scrollLoc = this.$el.scrollTop();

			var start = Math.floor((scrollLoc - (chartTop-panelTop)) / 33 - 35);
			var end = Math.floor(start + 35 + panelHeight / 33 + 35);
			if (start < 0) start = 0;
			if (end > results.length-1) end = results.length-1;
			this.start = start, this.end = end;

			// distribution
			var buf = '';
			for (var i=0, len=results.length; i<len; i++) {
				buf += '<li class="result">'+this.renderRow(i, i < start || i > end)+'</li>';
			}
			this.$chart.html(buf);
		} else {
			var buf = '';
			for (var i=0, len=results.length; i<len; i++) {
				buf += '<li class="result">'+this.renderRow(i)+'</li>';
			}
			this.$chart.html(buf);
		}
	},
	renderRow: function(i, offscreen) {
		var results = this.results;
		var move = BattleMovedex[results[i]];
		if (offscreen) {
			return move.name;
		} else {
			return BattleSearch.renderMoveRowInner(move);
		}
	},
	handleScroll: function() {
		var scrollLoc = this.$el.scrollTop();
		if (Math.abs(scrollLoc - this.scrollLoc) > 20*33) {
			this.renderUpdateDistribution();
		}
	},
	debouncedPurgeTimer: null,
	renderUpdateDistribution: function(fullUpdate) {
		if (this.debouncedPurgeTimer) {
			clearTimeout(this.debouncedPurgeTimer);
			this.debouncedPurgeTimer = null;
		}

		var panelTop = this.$el.children().offset().top;
		var panelHeight = this.$el.outerHeight();
		var chartTop = this.$chart.offset().top;
		var scrollLoc = this.scrollLoc = this.$el.scrollTop();

		var results = this.results;

		var rowFit = Math.floor(panelHeight / 33);

		var start = Math.floor((scrollLoc - (chartTop-panelTop)) / 33 - 35);
		var end = start + 35 + rowFit + 35;
		if (start < 0) start = 0;
		if (end > results.length-1) end = results.length-1;

		var $rows = this.$chart.children();

		if (fullUpdate || start < this.start - rowFit - 30 || end > this.end + rowFit + 30) {
			var buf = '';
			for (var i=0, len=results.length; i<len; i++) {
				buf += '<li class="result">'+this.renderRow(i, (i < start || i > end))+'</li>';
			}
			this.$chart.html(buf);
			this.start = start, this.end = end;
			return;
		}

		if (start < this.start) {
			for (var i = start; i<this.start; i++) {
				$rows[i].innerHTML = this.renderRow(i);
			}
			this.start = start;
		}

		if (end > this.end) {
			for (var i = this.end+1; i<=end; i++) {
				$rows[i].innerHTML = this.renderRow(i);
			}
			this.end = end;
		}

		if (this.end - this.start > rowFit+90) {
			var self = this;
			this.debouncedPurgeTimer = setTimeout(function() {
				self.renderUpdateDistribution(true);
			}, 1000);
		}
	}
});
var PokedexEggGroupPanel = PokedexResultPanel.extend({
	table: {
		amorphous: {
			name: 'Amorphous',
			desc: ""
		},
		bug: {
			name: 'Bug',
			desc: ""
		},
		ditto: {
			name: 'Ditto',
			desc: "Can breed with anything."
		},
		dragon: {
			name: 'Dragon',
			desc: ""
		},
		fairy: {
			name: 'Fairy',
			desc: ""
		},
		field: {
			name: 'Field',
			desc: ""
		},
		flying: {
			name: 'Flying',
			desc: ""
		},
		grass: {
			name: 'Grass',
			desc: ""
		},
		humanlike: {
			name: 'Human-Like',
			desc: ""
		},
		mineral: {
			name: 'Mineral',
			desc: ""
		},
		monster: {
			name: 'Monster',
			desc: ""
		},
		plant: {
			name: 'Plant',
			desc: ""
		},
		undiscovered: {
			name: 'Undiscovered',
			desc: "Can't breed."
		},
		water1: {
			name: 'Water 1',
			desc: ""
		},
		water2: {
			name: 'Water 2',
			desc: ""
		},
		water3: {
			name: 'Water 3',
			desc: ""
		}
	},
	initialize: function(id) {
		var ids = id.split('+');
		for (var i = 0; i < ids.length; i++) ids[i] = toID(ids[i]);
		this.id = ids[0];
		var names = this.table[ids[0]].name;
		this.shortTitle = names;
		if (ids[1]) {
			this.id2 = ids[1];
			names += ' + '+this.table[ids[1]].name;
			this.shortTitle = "Egg groups";
		}

		var buf = '<div class="pfx-body dexentry">';

		buf += '<a href="/" class="pfx-backbutton" data-target="back"><i class="fa fa-chevron-left"></i> Pok&eacute;dex</a>';
		buf += '<h1><a href="/egggroups/'+id+'" data-target="push" class="subtle">'+names+'</a></h1>';

		if (this.id2) {
			buf += '<p>All Pok&eacute;mon in either the <a href="/egggroups/'+this.id+'" data-target="push">'+this.table[ids[0]].name+'</a> or <a href="/egggroups/'+this.id2+'" data-target="push">'+this.table[ids[1]].name+'</a> egg group.</p>';
		} else {
			buf += '<p>'+this.table[ids[0]].desc+'</p>';
		}

		// distribution
		buf += '<h3>Basic '+names+' pokemon</h3>';
		buf += '<ul class="utilichart metricchart nokbd">';
		buf += '</ul>';

		buf += '</div>';

		this.html(buf);

		setTimeout(this.renderDistribution.bind(this));
	},
	getDistribution: function() {
		var name = this.table[this.id].name;
		var name2 = '!';
		if (this.id2) name2 = this.table[this.id2].name;
		if (this.results) return this.results;
		var results = [];
		for (var pokemonid in BattlePokedex) {
			var pokemon = BattlePokedex[pokemonid];
			var eggGroups = pokemon.eggGroups;
			// var prevo = toID(pokemon.prevo);
			if (!eggGroups || pokemon.forme) continue;
			// || (prevo && BattlePokedex[prevo].eggGroups[0] !== "Undiscovered") - irrelevant in gen 9
			if (pokemon && pokemon.isNonstandard) continue;
			if (eggGroups[0] === name || eggGroups[1] === name ||
				eggGroups[0] === name2 || eggGroups[1] === name2) {
				results.push(pokemonid);
			}
		}
		results.sort();
		return this.results = results;
	},
	renderDistribution: function() {
		var results = this.getDistribution();
		this.$chart = this.$('.utilichart');

		if (results.length > 1600/33) {
			this.streamLoading = true;
			this.$el.on('scroll', this.handleScroll.bind(this));

			var panelTop = this.$el.children().offset().top;
			var panelHeight = this.$el.outerHeight();
			var chartTop = this.$chart.offset().top;
			var scrollLoc = this.scrollLoc = this.$el.scrollTop();

			var start = Math.floor((scrollLoc - (chartTop-panelTop)) / 33 - 35);
			var end = Math.floor(start + 35 + panelHeight / 33 + 35);
			if (start < 0) start = 0;
			if (end > results.length-1) end = results.length-1;
			this.start = start, this.end = end;

			// distribution
			var buf = '';
			for (var i=0, len=results.length; i<len; i++) {
				buf += '<li class="result">'+this.renderRow(i, i < start || i > end)+'</li>';
			}
			this.$chart.html(buf);
		} else {
			var buf = '';
			for (var i=0, len=results.length; i<len; i++) {
				buf += '<li class="result">'+this.renderRow(i)+'</li>';
			}
			this.$chart.html(buf);
		}
	},
	renderRow: function(i, offscreen) {
		var results = this.results;
		var template = BattlePokedex[results[i]];
		if (offscreen) {
			return ''+template.species+' '+template.abilities['0']+' '+(template.abilities['1']||'')+' '+(template.abilities['H']||'')+'';
		} else {
			return BattleSearch.renderTaggedPokemonRowInner(template, '<span class="picon" style="margin-top:-12px;'+Dex.getPokemonIcon('egg')+'"></span>');
		}
	},
	handleScroll: function() {
		var scrollLoc = this.$el.scrollTop();
		if (Math.abs(scrollLoc - this.scrollLoc) > 20*33) {
			this.renderUpdateDistribution();
		}
	},
	debouncedPurgeTimer: null,
	renderUpdateDistribution: function(fullUpdate) {
		if (this.debouncedPurgeTimer) {
			clearTimeout(this.debouncedPurgeTimer);
			this.debouncedPurgeTimer = null;
		}

		var panelTop = this.$el.children().offset().top;
		var panelHeight = this.$el.outerHeight();
		var chartTop = this.$chart.offset().top;
		var scrollLoc = this.scrollLoc = this.$el.scrollTop();

		var results = this.results;

		var rowFit = Math.floor(panelHeight / 33);

		var start = Math.floor((scrollLoc - (chartTop-panelTop)) / 33 - 35);
		var end = start + 35 + rowFit + 35;
		if (start < 0) start = 0;
		if (end > results.length-1) end = results.length-1;

		var $rows = this.$chart.children();

		if (fullUpdate || start < this.start - rowFit - 30 || end > this.end + rowFit + 30) {
			var buf = '';
			for (var i=0, len=results.length; i<len; i++) {
				buf += '<li class="result">'+this.renderRow(i, (i < start || i > end))+'</li>';
			}
			this.$chart.html(buf);
			this.start = start, this.end = end;
			return;
		}

		if (start < this.start) {
			for (var i = start; i<this.start; i++) {
				$rows[i].innerHTML = this.renderRow(i);
			}
			this.start = start;
		}

		if (end > this.end) {
			for (var i = this.end+1; i<=end; i++) {
				$rows[i].innerHTML = this.renderRow(i);
			}
			this.end = end;
		}

		if (this.end - this.start > rowFit+90) {
			var self = this;
			this.debouncedPurgeTimer = setTimeout(function() {
				self.renderUpdateDistribution(true);
			}, 1000);
		}
	}
});
var PokedexCategoryPanel = PokedexResultPanel.extend({
	initialize: function(id) {
		id = toID(id);
		var category = {
			id: id,
			name: id[0].toUpperCase()+id.substr(1)
		};
		this.shortTitle = category.name;

		var buf = '<div class="pfx-body dexentry">';
		buf += '<a href="/" class="pfx-backbutton" data-target="back"><i class="fa fa-chevron-left"></i> Pok&eacute;dex</a>';
		buf += '<h1><a href="/categories/'+id+'" data-target="push" class="subtle">'+category.name+'</a></h1>';
		switch (id) {
		case 'physical':
			buf += '<p>Physical moves are damaging moves generally calculated with the user\'s Attack stat and the target\'s Defense stat.</p>';
			break;
		case 'special':
			buf += '<p>Special moves are damaging moves generally calculated with the user\'s Special Attack stat and the target\'s Special Defense stat.</p>';
			break;
		case 'status':
			buf += '<p>Status moves are moves that don\'t deal damage directly.</p>';
			break;
		}
		buf += '</div>';

		this.html(buf);
	}
});
var PokedexTierPanel = PokedexResultPanel.extend({
	initialize: function(id) {
		var tierTable = {
			ag: "AG",
			uber: "Uber",
			ou: "OU",
			uu: "UU",
			ru: "RU",
			nu: "NU",
			pu: "PU",
			nfe: "NFE",
			lcuber: "LC Uber",
			lc: "LC",
			cap: "CAP",
			capnfe: "CAP NFE",
			caplc: "CAP LC",
			uubl: "UUBL",
			rubl: "RUBL",
			nubl: "NUBL",
			publ: "PUBL",
			unreleased: "Unreleased",
			illegal: "Illegal",
		};
		var name = tierTable[id] || id;
		this.id = id;
		this.shortTitle = name;

		var buf = '<div class="pfx-body dexentry">';
		buf += '<a href="/" class="pfx-backbutton" data-target="back"><i class="fa fa-chevron-left"></i> Pok&eacute;dex</a>';
		buf += '<h1><a href="/tiers/'+id+'" data-target="push" class="subtle">'+name+'</a></h1>';

		if (id === 'nfe') {
			buf += '<p>"NFE" (Not Fully Evolved) as a tier refers to NFE Pokémon that aren\'t legal in LC and don\'t make the usage cutoff for a tier such as PU.</p>';
		}

		if (id.startsWith('cap')) buf += '<div class="warning"><a href="http://www.smogon.com/cap/" target="_blank">Smogon CAP</a> is a project to make up Pok&eacute;mon.</div>';

		// buf += '<p></p>';

		// pokemon
		buf += '<h3>Pok&eacute;mon in this tier</h3>';
		buf += '<ul class="utilichart nokbd">';
		buf += '</ul>';

		buf += '</div>';

		this.html(buf);

		setTimeout(this.renderPokemonList.bind(this));
	},
	renderPokemonList: function(list) {
		var tierName = this.shortTitle;
		var tierName2 = '(' + tierName + ')';
		var buf = '';
		for (var pokemonid in BattlePokedex) {
			var template = BattlePokedex[pokemonid];
			if (template.tier === tierName || template.tier === tierName2) {
				buf += BattleSearch.renderPokemonRow(template);
			}
		}
		this.$('.utilichart').html(buf);
	}
});
var PokedexArticlePanel = PokedexResultPanel.extend({
	initialize: function(id) {
		id = toID(id);
		this.shortTitle = id;

		var buf = '<div class="pfx-body dexentry">';
		buf += '<a href="/" class="pfx-backbutton" data-target="back"><i class="fa fa-chevron-left"></i> Pok&eacute;dex</a>';
		buf += '<h1><a href="/articles/'+id+'" data-target="push" class="subtle">'+id+'</a></h1>';
		buf += '<div class="article-content"><em>Loading...</em></div>';
		buf += '</div>';

		this.html(buf);

		var self = this;
		$.get('/.articles-cached/' + id + '.html').done(function (html) {
			var html = html.replace(/<h1[^>]*>([^<]+)<\/h1>/, function (match, innerMatch) {
				self.shortTitle = innerMatch;
				self.$('h1').first().html('<a href="/articles/' + id + '" class="subtle" data-target="push">' + innerMatch + '</a>');
				return '';
			});
			self.$('.article-content').html(html);
		});
	}
});
