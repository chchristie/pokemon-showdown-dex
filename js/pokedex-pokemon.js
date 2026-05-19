var PokedexPokemonPanel = PokedexResultPanel.extend({
	events: {
		'click .tabbar button': 'selectTab',
		'input input[name=level]': 'updateLevel',
		'keyup input[name=level]': 'updateLevel',
		'change input[name=level]': 'updateLevel',
		'change .dexsource-toggle input[type=checkbox]': 'changeDexSource',
	},
	changeDexSource: function (e) {
		this.dexMode = e.currentTarget.checked ? 'base' : 'digipen';
		this.renderPokemonDex();
	},
	initialize: function (id) {
		this.id = toID(id);
		if (!this.dexMode) this.dexMode = 'digipen';
		this.renderPokemonDex();
	},
	renderPokemonDex: function () {
		var id = this.id;
		var dex = pokedexModDex(this, 'pokemon');
		var pokemon = dex.species.get(id);
		this.shortTitle = pokemon.baseSpecies;

		var buf = '<div class="pfx-body dexentry">';

		buf += '<a href="/" class="pfx-backbutton" data-target="back"><i class="fa fa-chevron-left"></i> Pok&eacute;dex</a>';
		buf += '<div class="dexentry-head">';
		buf += pokedexDexBaseGameToggleHtml(this, id, 'pokemon');
		buf += '<div class="dexentry-title-row">';
		buf += '<a href="/tiers/'+toID(pokemon.tier)+'" data-target="push" class="tier">'+pokemon.tier+'</a>';
		buf += '<h1>';
		if (pokemon.forme) {
			buf += '<a href="/pokemon/'+id+'" data-target="push" class="subtle">'+pokemon.baseSpecies+'<small>-'+pokemon.forme+'</small></a>';
		} else {
			buf += '<a href="/pokemon/'+id+'" data-target="push" class="subtle">'+pokemon.name+'</a>';
		}
		if (pokemon.num > 0) buf += ' <code>#'+pokemon.num+'</code>';
		buf += '</h1>';
		buf += '</div>';
		if (pokedexShowDigiPenDexMetadata(this, 'pokemon') && pokemon.title) {
			buf += '<p class="dexentry-subtitle">' + Dex.escapeHTML(pokemon.title) + ' Pok&eacute;mon</p>';
		}
		buf += '</div>';

		if (pokemon.isNonstandard) {
			if (id === 'missingno') {
				buf += '<div class="warning">A <strong>glitch Pok&eacute;mon</strong> from Red/Blue/Yellow.</div>';
			} else if (id.substr(0, 8) === 'pokestar') {
				buf += '<div class="warning">A Pok&eacute;mon from <a href="https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9star_Studios" target="_blank"><strong>Pok&eacute;star Studios</strong> in Black 2 and White 2</a>.</div>';
			} else if (pokemon.isNonstandard === 'Past') {
				buf += '<div class="warning">Only usable in <strong>past generations</strong> and National Dex formats.</div>';
			} else if (pokemon.isNonstandard === 'LGPE') {
				buf += '<div class="warning">Pok&eacute;mon <strong>Let\'s Go, Pikachu! and Let\'s Go, Eevee!</strong> only.</div>';
			} else if (pokemon.isNonstandard === 'Gigantamax') {
				buf += '<div class="warning"><strong>Not obtainable</strong> in the games, even via hacking.</div>';
			} else if (typeof pokemon.isNonstandard === 'string' && pokemon.isNonstandard.startsWith('DigiPen')) {
				buf += '<div class="warning">A Pok&eacute;mon by the DigiPen Pok&eacute;mon Club.</div>';
			} else if (pokemon.num > 0) {
				buf += '<div class="warning"><strong>Unreleased</strong>.</div>';
			} else {
				buf += '<div class="warning">A Pok&eacute;mon by <a href="http://www.smogon.com/cap/" target="_blank">Smogon <strong>CAP</strong></a>.</div>';
			}
		}

		buf += '<img src="'+Dex.getSpriteData(pokemon, true, { gen: 5, noScale: true }).url+'" alt="" width="96" height="96" class="sprite" />';

		buf += '<dl class="typeentry">';
		buf += '<dt>Types:</dt> <dd>';
		for (var i=0; i<pokemon.types.length; i++) {
			buf += '<a class="type '+toID(pokemon.types[i])+'" href="/types/'+toID(pokemon.types[i])+'" data-target="push">'+pokemon.types[i]+'</a> ';
		}
		buf += '</dd>';
		buf += '</dl>';

		buf += '<dl class="sizeentry">';
		buf += '<dt>Size:</dt> <dd>';
		var gkPower = (function(weightkg) {
			if (weightkg >= 200) return 120;
			if (weightkg >= 100) return 100;
			if (weightkg >= 50) return 80;
			if (weightkg >= 25) return 60;
			if (weightkg >= 10) return 40;
			return 20;
		})(pokemon.weightkg);
		buf += ''+pokemon.heightm+' m, '+pokemon.weightkg+' kg<br /><small><a class="subtle" href="/moves/grassknot" data-target="push">Grass Knot</a>: '+gkPower+'</small>';
		buf += '</dd>';
		buf += '</dl>';

		buf += '<dl class="abilityentry">';
		buf += '<dt><br>Abilities:</dt> <dd class="imgentry">';
		for (var i in pokemon.abilities) {
			var ability = pokemon.abilities[i];
			if (!ability) continue;

			if (i !== '0') buf += ' | ';
			var aid = toID(pokemon.abilities[i]);
			var abMod = BattleAbilities[aid] && (BattleAbilities[aid].modified === 'DigiPen' || BattleAbilities[aid].isNonstandard === 'DigiPen');
			if (i === 'H') {
				buf += (abMod ? '<strong>' : '') + '<a href="/abilities/' + aid + '" data-target="push"><em>' + pokemon.abilities[i] + '</em></a>' + (abMod ? '</strong>' : '');
			} else {
				if (abMod) buf += '<strong>';
				buf += '<a href="/abilities/' + aid + '" data-target="push">' + ability + '</a>';
				if (abMod) buf += '</strong>';
			}
			if (i === 'H') buf += '<small> (H)</small>';
			if (i === 'S') buf += '<small> (special)</small>';
		}
		buf += '</dd>';
		buf += '</dl>';

		buf += '<dl>';
		buf += '<dt style="clear:left">Base stats:</dt><dd><table class="stats">';

		var StatTitles = {
			hp: "HP",
			atk: "Attack",
			def: "Defense",
			spa: "Sp. Atk",
			spd: "Sp. Def",
			spe: "Speed"
		};
		buf += '<tr><td></td><td></td><td style="width:200px"></td><th class="ministat"><abbr title="0 IVs, 0 EVs, negative nature">min&minus;</a></th><th class="ministat"><abbr title="31 IVs, 0 EVs, neutral nature">min</abbr></th><th class="ministat"><abbr title="31 IVs, 252 EVs, neutral nature">max</abbr></th><th class="ministat"><abbr title="31 IVs, 252 EVs, positive nature">max+</abbr></th>';
		var bst = 0;
		for (var stat in BattleStatNames) {
			var baseStat = pokemon.baseStats[stat];
			bst += baseStat;
			var width = Math.floor(baseStat*200/200);
			if (width > 200) width = 200;
			var color = Math.floor(baseStat*180/255);
			if (color > 360) color = 360;
			buf += '<tr><th>'+StatTitles[stat]+':</th><td class="stat">'+baseStat+'</td>';
			buf += '<td class="statbar"><span style="width:'+Math.floor(width)+'px;background:hsl('+color+',85%,45%);border-color:hsl('+color+',75%,35%)"></span></td>';
			buf += '<td class="ministat"><small>'+(stat==='hp'?'':this.getStat(baseStat, false, 100, 0, 0, 0.9))+'</small></td><td class="ministat"><small>'+this.getStat(baseStat, stat==='hp', 100, 31, 0, 1.0)+'</small></td>';
			buf += '<td class="ministat"><small>'+this.getStat(baseStat, stat==='hp', 100, 31, 255, 1.0)+'</small></td><td class="ministat"><small>'+(stat==='hp'?'':this.getStat(baseStat, false, 100, 31, 255, 1.1))+'</small></td></tr>';
		}
		buf += '<tr><th class="bst">Total:</th><td class="bst">'+bst+'</td><td></td><td class="ministat" colspan="4">at level <input type="text" class="textbox" name="level" placeholder="100" size="5" /></td>';

		buf += '</table></dd>';

		buf += '<dt>Evolution:</dt> <dd>';
		var basic = pokemon;
		while (basic.prevo) basic = dex.species.get(basic.prevo);
		if (basic.evos) {
			buf += '<table class="evos"><tr><td>';
			var evos = [basic.name];
			var template = basic;
			while (evos) {
				if (evos[0] === 'Dustox') evos = ['Beautifly','Dustox'];
				if (evos[0] === 'Goodra-Hisui') evos = ['Goodra','Goodra-Hisui'];
				for (var i=0; i<evos.length; i++) {
					template = dex.species.get(evos[i]);
					if (i <= 0 && evos[0] !== basic.name) {
						if (evos[0] === 'Dustox' || evos[0] === 'Goodra') {
							buf += '</td><td class="arrow"><span>&rarr;<br />&rarr;</span></td><td>';
						} else if (template.prevo) {
							buf += '</td><td class="arrow"><span><abbr title="' + this.getEvoMethod(template) + '">&rarr;</abbr></span></td><td>';
						} else {
							buf += '</td><td class="arrow"><span>&rarr;</span></td><td>';
						}
					}
					var name = (template.forme ? template.baseSpecies+'<small>-'+template.forme+'</small>' : template.name);
					name = '<span class="picon" style="'+Dex.getPokemonIcon(template)+'"></span>'+name;
					if (template === pokemon) {
						buf += '<div><strong>'+name+'</strong></div>';
					} else {
						buf += '<div><a href="/pokemon/'+template.id+'" data-target="replace">'+name+'</a></div>';
					}
				}
				evos = template.evos;
			}
			buf += '</td></tr></table>';
			if (pokemon.prevo) {
				buf += '<div><small>Evolves from ' + dex.species.get(pokemon.prevo).name + ' (' + this.getEvoMethod(pokemon) + ')</small></div>';
			}
		} else {
			buf += '<em>Does not evolve</em>';
		}

		if (pokemon.otherFormes || pokemon.forme) {
			buf += '</dd><dt>Formes:</dt> <dd>';
			template = (pokemon.forme ? dex.species.get(pokemon.baseSpecies) : pokemon);
			var name = template.baseForme || 'Base';
			name = '<span class="picon" style="'+Dex.getPokemonIcon(template)+'"></span>'+name;
			if (template === pokemon) {
				buf += '<strong>'+name+'</strong>';
			} else {
				buf += '<a href="/pokemon/'+template.id+'" data-target="replace">'+name+'</a>';
			}
			var otherFormes = template.otherFormes;
			if (otherFormes) for (var i=0; i<otherFormes.length; i++) {
				template = dex.species.get(otherFormes[i]);
				var name = template.forme;
				name = '<span class="picon" style="'+Dex.getPokemonIcon(template)+'"></span>'+name;
				if (template === pokemon) {
					buf += ', <strong>'+name+'</strong>';
				} else {
					buf += ', <a href="/pokemon/'+template.id+'" data-target="replace">'+name+'</a>';
				}
			}
			if (template.requiredItem) {
				buf += '<div><small>Must hold <a href="/items/' + toID(template.requiredItem) + '" data-target="push">' + template.requiredItem + '</a></small></div>';
			}
		}
		if (pokemon.cosmeticFormes) {
			buf += '</dd><dt>Cosmetic formes:</dt> <dd>';
			var name = pokemon.baseForme || 'Base';
			name = '<span class="picon" style="'+Dex.getPokemonIcon(pokemon)+'"></span>'+name;
			buf += ''+name;

			for (var i=0; i<pokemon.cosmeticFormes.length; i++) {
				template = dex.species.get(pokemon.cosmeticFormes[i]);
				var name = template.forme;
				name = '<span class="picon" style="'+Dex.getPokemonIcon(template)+'"></span>'+name;
				buf += ', '+name;
			}
		}
		buf += '</dd></dl>';

		if (pokemon.eggGroups) {
			buf += '<dl class="colentry"><dt>Egg groups:</dt><dd><span class="picon" style="margin-top:-12px;'+Dex.getPokemonIcon('egg')+'"></span><a href="/egggroups/'+pokemon.eggGroups.map(toID).join('+')+'" data-target="push">'+pokemon.eggGroups.join(', ')+'</a></dd></dl>';
			buf += '<dl class="colentry"><dt>Gender ratio:</dt><dd>';
			if (pokemon.gender) switch (pokemon.gender) {
			case 'M':
				buf += '100% male';
				break;
			case 'F':
				buf += '100% female';
				break;
			case 'N':
				buf += '100% genderless';
				break;
			} else if (pokemon.genderRatio) {
				buf += ''+(pokemon.genderRatio.M*100)+'% male, '+(pokemon.genderRatio.F*100)+'% female';
			} else {
				buf += '50% male, 50% female';
			}
			buf += '</dd></dl>';
			buf += '<div style="clear:left"></div>';
		}

		if (pokedexShowDigiPenDexMetadata(this, 'pokemon')) {
			buf += pokedexFormatPokemonStyleDexEntryHtml(pokemon.dexEntry);
		}

		// past gens
		var pastGenChanges = false;
		for (var genNum = Dex.gen - 1; genNum >= pokemon.gen; genNum--) {
			var nextGenSpecies = Dex.forGen(genNum + 1).species.get(id);
			var curGenSpecies = Dex.forGen(genNum).species.get(id);
			var changes = '';

			var nextGenTypes = nextGenSpecies.types.join('/');
			var curGenTypes = curGenSpecies.types.join('/');
			if (curGenTypes !== nextGenTypes) {
				changes += 'Type: ' + curGenTypes + ' <i class="fa fa-long-arrow-right"></i> ' + nextGenTypes + '<br />';
			}

			var nextGenAbility = nextGenSpecies.abilities['0'];
			var curGenAbility = curGenSpecies.abilities['0'];
			if (curGenAbility !== nextGenAbility && curGenAbility !== 'No Ability') {
				changes += 'Ability: ' + curGenAbility + ' <i class="fa fa-long-arrow-right"></i> ' + nextGenAbility + '<br />';
			}

			for (var i in BattleStatNames) {
				if (genNum === 1 && (i === 'spa' || i === 'spd')) continue;
				var nextGenStat = nextGenSpecies.baseStats[i];
				var curGenStat = curGenSpecies.baseStats[i];
				if (curGenStat !== nextGenStat) {
					changes += BattleStatNames[i] + ': ' + curGenStat + ' <i class="fa fa-long-arrow-right"></i> ' + nextGenStat + '<br />';
				}
			}

			if (genNum === 1 && pokemon.num > 0 && pokemon.num <= 151 && !pokemon.forme) {
				var nextGenSpA = nextGenSpecies.baseStats['spa'];
				var nextGenSpD = nextGenSpecies.baseStats['spd'];
				var curGenSpc = curGenSpecies.baseStats['spa'];
				changes += '' + curGenSpc + ' Spc <i class="fa fa-long-arrow-right"></i> ' + nextGenSpA + ' SpA, ' + nextGenSpD + ' SpD<br />';
			}

			if (changes) {
				if (!pastGenChanges) buf += '<h3>Past gens</h3><dl>';
				buf += '<dt>Gen ' + genNum + ' <i class="fa fa-arrow-right"></i> ' + (genNum + 1) + ':</dt>';
				buf += '<dd>' + changes + '</dd>';
				pastGenChanges = true;
			}
		}
		if (pastGenChanges) buf += '</dl>';

		// learnset (preview strip under Moves tab)
		if (window.BattleLearnsets && BattleLearnsets[id] && BattleLearnsets[id].eventData) {
			buf += '<ul class="tabbar"><li><button class="button nav-first cur" value="move">Moves</button></li><li><button class="button" value="details">Miscellaneous</button></li><li><button class="button nav-last" value="events">Events</button></li></ul>';
		} else {
			buf += '<ul class="tabbar"><li><button class="button nav-first cur" value="move">Moves</button></li><li><button class="button nav-last" value="details">Miscellaneous</button></li></ul>';
		}
		buf += '<ul class="utilichart nokbd">';
		var builtPreview = pokedexBuildLearnsetEncodedMoves(pokemon);
		var encAll = builtPreview.moves;
		var prevo1p = builtPreview.prevo1;
		var prevo2p = builtPreview.prevo2;
		var splitP = pokedexSplitLearnsetByModAdditions(id, pokemon, encAll, this.dexMode === 'digipen');
		var boldDigiPenMoves = pokedexIsDigiPenExclusive('pokemon', id) || this.dexMode === 'digipen';
		if (splitP.addMoves.length) {
			buf += '<li class="resultheader"><h3>Movepool additions</h3></li>';
			buf += pokedexRenderLearnsetEncodedList(splitP.addMoves, prevo1p, prevo2p, true, dex, boldDigiPenMoves);
		}
		buf += '<li class="resultheader"><h3>Level-up</h3></li>';
		var lvPreview = [];
		for (var vi = 0; vi < splitP.mainMoves.length; vi++) {
			if (splitP.mainMoves[vi].charAt(0) === 'a') lvPreview.push(splitP.mainMoves[vi]);
		}
		lvPreview.sort();
		for (var k = 0, klen = lvPreview.length; k < klen; k++) {
			var encLv = lvPreview[k];
			var move2 = pokedexGetMoveForLearnsetRow(dex, pokedexLearnsetEncMoveid(encLv));
			if (move2) {
				var desc2 = encLv.substr(1, 3) === '001' || encLv.substr(1, 3) === '000' ? '&ndash;' : '<small>L</small>' + (parseInt(encLv.substr(1, 3), 10) || '?');
				buf += pokedexMoveRowHtml(move2, desc2, move2.id, boldDigiPenMoves);
			}
		}
		buf += '</ul>';

		buf += '</div>';

		this.html(buf);

		setTimeout(this.renderFullLearnset.bind(this));
	},
	updateLevel: function(e) {
		var dex = pokedexModDex(this, 'pokemon');
		var val = this.$('input[name=level]').val();
		var level = val === '' ? 100 : parseInt(val, 10);
		var lowIV = 31, highIV = 31;
		var lowEV = 0, highEV = 255;
		if (val.slice(-1) === ':') {
			lowIV = 0;
			highEV = 0;
		}
		var i = 0;
		var $entries = this.$('table.stats td.ministat small');
		var pokemon = dex.species.get(this.id);
		for (var stat in BattleStatNames) {
			var baseStat = pokemon.baseStats[stat];

			$entries.eq(4 * i + 0).text(stat==='hp'?'':this.getStat(baseStat, false, level, 0, 0, 0.9));
			$entries.eq(4 * i + 1).text(this.getStat(baseStat, stat==='hp', level, lowIV, lowEV, 1.0));
			$entries.eq(4 * i + 2).text(this.getStat(baseStat, stat==='hp', level, highIV, highEV, 1.0));
			$entries.eq(4 * i + 3).text(stat==='hp'?'':this.getStat(baseStat, false, level, highIV, highEV, 1.1));
			i++;
		}
	},
	getEvoMethod: function(evo) {
		var condition = evo.evoCondition ? ` ${evo.evoCondition}` : ``;
		switch (evo.evoType) {
		case 'levelExtra':
			return 'level-up' + condition;
		case 'levelFriendship':
			return 'level-up with high Friendship' + condition;
		case 'levelHold':
			return 'level-up holding ' + evo.evoItem + condition;
		case 'useItem':
			return evo.evoItem + condition;
		case 'levelMove':
			return 'level-up with ' + evo.evoMove + condition;
		case 'trade':
			return 'trade' + condition;
		case 'other':
			return evo.evoCondition;
		default:
			return 'level ' + evo.evoLevel + condition;
		}
	},
	selectTab: function(e) {
		this.$('.tabbar button').removeClass('cur');
		$(e.currentTarget).addClass('cur');
		switch (e.currentTarget.value) {
		case 'move':
			this.renderFullLearnset();
			break;
		case 'details':
			this.renderDetails();
			break;
		case 'events':
			this.renderEvents();
			break;
		}
	},
	renderFullLearnset: function() {
		var dex = pokedexModDex(this, 'pokemon');
		var pokemon = dex.species.get(this.id);

		var buf = '';
		var built = pokedexBuildLearnsetEncodedMoves(pokemon);
		var moves = built.moves;
		var prevo1 = built.prevo1;
		var prevo2 = built.prevo2;
		var split = pokedexSplitLearnsetByModAdditions(this.id, pokemon, moves, this.dexMode === 'digipen');
		var boldDigiPenMoves = pokedexIsDigiPenExclusive('pokemon', this.id) || this.dexMode === 'digipen';
		if (split.addMoves.length) {
			buf += '<li class="resultheader"><h3>Movepool additions</h3></li>';
			buf += pokedexRenderLearnsetEncodedList(split.addMoves, prevo1, prevo2, true, dex, boldDigiPenMoves);
		}
		if (split.mainMoves.length) {
			buf += pokedexRenderLearnsetEncodedList(split.mainMoves, prevo1, prevo2, false, dex, boldDigiPenMoves);
		} else if (!buf) {
			buf += '<li class="content"><em>No learnset data.</em></li>';
		}
		this.$('.utilichart').html(buf);
	},
	renderDetails: function() {
		var dex = pokedexModDex(this, 'pokemon');
		var pokemon = dex.species.get(this.id);
		var buf = '';

		// miscellaneous (sprites, color, habitat, DigiPen notes)
		buf += '<li class="resultheader"><h3>Miscellaneous</h3></li>';
		buf += '<li><dl class="colentry"><dt>Color:</dt><dd>' + Dex.escapeHTML(String(pokemon.color || '')) + '</dd></dl>';
		if (pokedexShowDigiPenDexMetadata(this, 'pokemon') && pokemon.habitat && String(pokemon.habitat).trim()) {
			buf += '<dl class="colentry"><dt>Habitat:</dt><dd>' + Dex.escapeHTML(String(pokemon.habitat).trim()) + '</dd></dl>';
		}
		buf += '<div style="clear:left"></div></li>';

		// animated gen 6
		if (pokemon.num > 0 && pokemon.gen < 10 && this.id !== 'missingno' && this.id !== 'pichuspikyeared' && !pokemon.digipenSprite) {
			buf += '<li class="resultheader"><h3>Animated Gen 6-9 sprites</h3></li>';

			buf += '<li class="content"><table class="sprites"><tr><td><img src="' + Dex.resourcePrefix + 'sprites/ani/' + pokemon.spriteid + '.gif" /></td>';
			buf += '<td><img src="' + Dex.resourcePrefix + 'sprites/ani-shiny/' + pokemon.spriteid + '.gif" /></td></table>';
			buf += '<table class="sprites"><tr><td><img src="' + Dex.resourcePrefix + 'sprites/ani-back/' + pokemon.spriteid + '.gif" /></td>';
			buf += '<td><img src="' + Dex.resourcePrefix + 'sprites/ani-back-shiny/' + pokemon.spriteid + '.gif" /></td></table>';

			buf += '<div style="clear:left"></div></li>';
		}

		// cry
		buf += '<li class="resultheader"><h3>Cry</h3></li>';

		buf += '<li class="content"><audio src="' + Dex.resourcePrefix + 'audio/cries/' + pokemon.spriteid + '.mp3" controls="controls"><a href="' + Dex.resourcePrefix + 'audio/cries/' + pokemon.spriteid + '.mp3">Play</a></audio></li>';

		// still gen 5
		if (this.id !== 'pichuspikyeared') {
			buf += '<li class="resultheader"><h3>Gen 5 Sprites</h3></li>';
			buf += '<li class="content"><table class="sprites"><tr><td><img src="' + Dex.getSpriteData(pokemon, true, { gen: 5, shiny: false, noScale: true }).url + '" /></td>';
			buf += '<td><img src="' + Dex.getSpriteData(pokemon, true, { gen: 5, shiny: true, noScale: true }).url + '" /></td></table>';
			buf += '<table class="sprites"><tr><td><img src="' + Dex.getSpriteData(pokemon, false, { gen: 5, shiny: false, noScale: true }).url + '" /></td>';
			buf += '<td><img src="' + Dex.getSpriteData(pokemon, false, { gen: 5, shiny: true, noScale: true }).url + '" /></td></table>';

			buf += '<div style="clear:left"></div></li>';

			// animated gen 5
			if (pokemon.gen < 6 && this.id !== 'missingno') {
				buf += '<li class="resultheader"><h3>Animated Gen 5 sprites</h3></li>';

				buf += '<li class="content"><table class="sprites"><tr><td><img src="' + Dex.resourcePrefix + 'sprites/gen5ani/' + pokemon.spriteid + '.gif" /></td>';
				buf += '<td><img src="' + Dex.resourcePrefix + 'sprites/gen5ani-shiny/' + pokemon.spriteid + '.gif" /></td></table>';
				buf += '<table class="sprites"><tr><td><img src="' + Dex.resourcePrefix + 'sprites/gen5ani-back/' + pokemon.spriteid + '.gif" /></td>';
				buf += '<td><img src="' + Dex.resourcePrefix + 'sprites/gen5ani-back-shiny/' + pokemon.spriteid + '.gif" /></td></table>';

				buf += '<div style="clear:left"></div></li>';
			}
		}

		if (pokemon.gen < 5) {
			buf += '<li class="resultheader"><h3>Gen 4 Sprites</h3></li>';
			buf += '<li class="content"><table class="sprites"><tr><td><img src="' + Dex.resourcePrefix + 'sprites/gen4/' + pokemon.spriteid + '.png" /></td>';
			buf += '<td><img src="' + Dex.resourcePrefix + 'sprites/gen4-shiny/' + pokemon.spriteid + '.png" /></td></table>';
			buf += '<table class="sprites"><tr><td><img src="' + Dex.resourcePrefix + 'sprites/gen4-back/' + pokemon.spriteid + '.png" /></td>';
			buf += '<td><img src="' + Dex.resourcePrefix + 'sprites/gen4-back-shiny/' + pokemon.spriteid + '.png" /></td></table>';
		}

		if (pokemon.gen < 4) {
			buf += '<li class="resultheader"><h3>Gen 3 Sprites</h3></li>';
			buf += '<li class="content"><table class="sprites"><tr><td><img src="' + Dex.resourcePrefix + 'sprites/gen3/' + pokemon.spriteid + '.png" /></td>';
			buf += '<td><img src="' + Dex.resourcePrefix + 'sprites/gen3-shiny/' + pokemon.spriteid + '.png" /></td></table>';
			buf += '<table class="sprites"><tr><td><img src="' + Dex.resourcePrefix + 'sprites/gen3-back/' + pokemon.spriteid + '.png" /></td>';
			buf += '<td><img src="' + Dex.resourcePrefix + 'sprites/gen3-back-shiny/' + pokemon.spriteid + '.png" /></td></table>';
		}

		if (pokemon.gen < 3) {
			buf += '<li class="resultheader"><h3>Gen 2 Sprites</h3></li>';
			buf += '<li class="content"><table class="sprites"><tr><td><img src="' + Dex.resourcePrefix + 'sprites/gen2/' + pokemon.spriteid + '.png" /></td>';
			buf += '<td><img src="' + Dex.resourcePrefix + 'sprites/gen2-shiny/' + pokemon.spriteid + '.png" /></td></table>';
			buf += '<table class="sprites"><tr><td><img src="' + Dex.resourcePrefix + 'sprites/gen2-back/' + pokemon.spriteid + '.png" /></td>';
			buf += '<td><img src="' + Dex.resourcePrefix + 'sprites/gen2-back-shiny/' + pokemon.spriteid + '.png" /></td></table>';
		}

		if (pokemon.gen < 2) {
			buf += '<li class="resultheader"><h3>Gen 1 Sprites</h3></li>';
			buf += '<li class="content"><table class="sprites"><tr><td><img src="' + Dex.resourcePrefix + 'sprites/gen1/' + pokemon.spriteid + '.png" /></td>';
			buf += '<table class="sprites"><tr><td><img src="' + Dex.resourcePrefix + 'sprites/gen1-back/' + pokemon.spriteid + '.png" /></td>';
		}

		if (pokedexShowDigiPenDexMetadata(this, 'pokemon')) {
			var extraNotes = pokedexFormatNotesSectionHtml(pokemon.notes);
			if (extraNotes) buf += '<li class="content">' + extraNotes + '</li>';
			var extraAck = pokedexFormatAcknowledgementsSectionHtml(pokemon.artSource, pokemon.contributors);
			if (extraAck) buf += '<li class="content">' + extraAck + '</li>';
		}

		this.$('.utilichart').html(buf);
	},
	renderEvents: function() {
		var dex = pokedexModDex(this, 'pokemon');
		var pokemon = dex.species.get(this.id);
		var events = BattleLearnsets[this.id].eventData;
		var buf = '';

		buf += '<li class="resultheader"><h3>Events</h3></li>';
		for (var i = 0; i < events.length; i++) {
			var event = events[i];
			buf += '<li><dl><dt>Gen ' + event.generation + ' event:</dt><dd><small>';
			buf += pokemon.name;
			if (event.gender) buf += ' (' + event.gender + ')';
			buf += '<br />';
			if (event.abilities) {
				buf += 'Ability: ' + event.abilities.map(function (ability) {
					return '<a href="/abilities/' + ability + '" class="subtle" data-target="push">' + dex.abilities.get(ability).name + '</a>';
				}).join(' or ') + '<br />';
			} else if (event.isHidden && pokemon.abilities['H']) {
				buf += 'Ability: <a href="/abilities/' + toID(pokemon.abilities['H']) + '" class="subtle" data-target="push">' + pokemon.abilities['H'] + '</a><br />';
			}
			if (event.level) buf += 'Level: ' + event.level + '<br />';
			if (event.shiny === true) buf += 'Shiny: Yes<br />';
			if (event.nature) buf += event.nature + ' Nature<br />';
			if (event.ivs) {
				buf += 'IVs: ';
				var firstIV = true;
				for (var iv in event.ivs) {
					if (!firstIV) buf += ' / ';
					buf += '' + event.ivs[iv] + ' ' + BattleStatNames[iv];
					firstIV = false;
				}
				buf += '<br />';
			}
			if (event.moves) {
				for (var j = 0; j < event.moves.length; j++) {
					var move = dex.moves.get(event.moves[j]);
					buf += '- <a href="/moves/' + move.id + '" class="subtle" data-target="push">' + move.name + '</a><br />';
				}
			}
			if (event.perfectIVs) {
				buf += '(at least ' + event.perfectIVs + ' perfect IVs)<br />';
			}
			if (event.shiny === 1) {
				buf += '(this event can be Shiny)<br />';
			}
			if (!event.shiny) {
				buf += '(this event cannot be Shiny)<br />';
			}
			buf += '</small></dd></dl></li>';
		}

		this.$('.utilichart').html(buf);
	},
	getStat: function(baseStat, isHP, level, iv, ev, natureMult) {
		if (isHP) {
			if (baseStat === 1) return 1;
			return Math.floor(Math.floor(2*baseStat+(iv||0)+Math.floor((ev||0)/4)+100)*level / 100 + 10);
		}
		var val = Math.floor(Math.floor(2*baseStat+(iv||0)+Math.floor((ev||0)/4))*level / 100 + 5);
		if (natureMult && !isHP) val *= natureMult;
		return Math.floor(val);
	}
});
