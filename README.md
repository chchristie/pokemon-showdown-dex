Pokémon Showdown Dex
========================================================================

Navigation: [Website][1] | [Server repository][2] | [Client repository][3] | **Dex repository**

  [1]: http://pokemonshowdown.com/
  [2]: https://github.com/Zarel/Pokemon-Showdown
  [3]: https://github.com/Zarel/Pokemon-Showdown-Client

Introduction
------------------------------------------------------------------------

This is a repository for [**Pokémon Showdown's Pokédex**][4].

This is what runs `dex.pokemonshowdown.com`.

  [4]: http://dex.pokemonshowdown.com/

Features
------------------------------------------------------------------------

Important features include:

- **Instant search** - start typing and search results will appear instantly

- **Filter search** - in the Pokémon search tab, type "prankster, twave" and press Enter to get a list of Pokémon with Prankster that can learn Thunder Wave

- **Panel UI** - clicking on anything will load it in a new panel to the right, for ease of navigation

- **Good layout** - get at important information with much less scrolling compared to most other Pokédexes

- **Basic inexact search** - type "pikaku" and Pikachu will still appear

- **Abbreviation search** - type "hjk" to match High Jump Kick

- **Nickname search** - type commonly-used community names like "pdon" to match Primal Groudon

Testing
------------------------------------------------------------------------

Edit **index.template.html** for layout/script changes, then regenerate entrypoints:

- `node build --dev` → **testclient.html** (local client URLs; routes live in `build`)
- `node build` → **index.html** (uses `config/config.js` `routes.client`)

Local dev uses **testclient.html** (not index.html):

1. `node build --dev` after changing the template
2. `npx serve -p 8081` in **pokemon-showdown-client** (after `node build` there)
3. `npx serve -p 8082 -c serve.json` in this repo
4. Open http://localhost:8082/

Or run `node start-dev` from **pokemon-showdown** to start server, client, dex, and SSL proxy together.

Deploy / production
------------------------------------------------------------------------

1. Copy `config/config-example.js` to `config/config.js` and set `routes.client` to your play host.
2. Run `node build` — writes **index.html** from **index.template.html**.
3. Serve **index.html** on the dex host (nginx `try_files` or static hosting). Do not deploy testclient.html to production.

License
------------------------------------------------------------------------

This dex is distributed under the terms of the [MIT license][5].

  [5]: https://github.com/smogon/pokemon-showdown/blob/master/LICENSE
