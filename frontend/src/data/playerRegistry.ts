import type { ClassicalGame } from './classicalGames';
import { parsePgn } from '../utils/pgnParser';

// ── Raw PGN imports (Vite ?raw — bundled as strings) ──────────────────────
import carlsenRaw        from './carlsen_games.pgn?raw';
import kasparovRaw       from './kasparov_games.pgn?raw';
import fischerRaw        from './fischer_games.pgn?raw';
import capablancaRaw     from './capablanca_games.pgn?raw';
import talRaw            from './tal_games.pgn?raw';
import karpovRaw         from './karpov_games.pgn?raw';
import ananRaw           from './anand_games.pgn?raw';
import kramnikRaw        from './kramnik_games.pgn?raw';
import morphyRaw         from './morphy_games.pgn?raw';
import nakamuraRaw       from './nakamura_games.pgn?raw';
import caruana           from './caruana_games.pgn?raw';
import alekhinRaw        from './alekhine_games.pgn?raw';
import botvinnikRaw      from './botvinnik_games.pgn?raw';
import smyslovRaw        from './smyslov_games.pgn?raw';
import spasskyRaw        from './spassky_games.pgn?raw';
import petrosianRaw      from './petrosian_games.pgn?raw';
// World Champions
import steinitzRaw       from './steinitz_games.pgn?raw';
import laskerRaw         from './lasker_games.pgn?raw';
import euweRaw           from './euwe_games.pgn?raw';
import dingRaw           from './ding_games.pgn?raw';
import gukeshRaw         from './gukesh_games.pgn?raw';
// Top modern GMs
import topalovRaw        from './topalov_games.pgn?raw';
import shirovRaw         from './shirov_games.pgn?raw';
import lekoRaw           from './leko_games.pgn?raw';
import morozevichRaw     from './morozevich_games.pgn?raw';
import ivanchukRaw       from './ivanchuk_games.pgn?raw';
import grischukRaw       from './grischuk_games.pgn?raw';
import aroianRaw         from './aronian_games.pgn?raw';
import gelfandRaw        from './gelfand_games.pgn?raw';
import karjakinRaw       from './karjakin_games.pgn?raw';
import mamedyarovRaw     from './mamedyarov_games.pgn?raw';
import radjabovRaw       from './radjabov_games.pgn?raw';
import mvlRaw            from './mvl_games.pgn?raw';
import soRaw             from './so_games.pgn?raw';
import giriRaw           from './giri_games.pgn?raw';
import nepoRaw           from './nepomniachtchi_games.pgn?raw';
import firouzjaRaw       from './firouzja_games.pgn?raw';
import praggRaw          from './praggnanandhaa_games.pgn?raw';
import dudaRaw           from './duda_games.pgn?raw';
import rapportRaw        from './rapport_games.pgn?raw';
import abdusattorovRaw   from './abdusattorov_games.pgn?raw';
// Classic legends
import rubinsteinRaw     from './rubinstein_games.pgn?raw';
import nimzowitschRaw    from './nimzowitsch_games.pgn?raw';
import keresRaw          from './keres_games.pgn?raw';
import bronsteinRaw      from './bronstein_games.pgn?raw';
import gellerRaw         from './geller_games.pgn?raw';
import korchnoisRaw      from './korchnoi_games.pgn?raw';
import larsenRaw         from './larsen_games.pgn?raw';
import timmanRaw         from './timman_games.pgn?raw';
import portischRaw       from './portisch_games.pgn?raw';
import polgarjRaw        from './polgarj_games.pgn?raw';
import shortRaw          from './short_games.pgn?raw';
import nunnRaw           from './nunn_games.pgn?raw';
import svidlerRaw        from './svidler_games.pgn?raw';
import adamsRaw          from './adams_games.pgn?raw';

export interface PlayerEntry {
  id:         string;
  name:       string;
  mainPlayer: string;
  gameCount:  number;
  getGames:   () => ClassicalGame[];
  findGame:   (id: string) => ClassicalGame | undefined;
}

function countGames(raw: string): number {
  return (raw.match(/^\[Event\s/gm) ?? []).length;
}

function makeLoader(raw: string, id: string): () => ClassicalGame[] {
  let cache: ClassicalGame[] | null = null;
  return () => {
    if (!cache) cache = parsePgn(raw, id);
    return cache;
  };
}

function makeEntry(
  id: string, name: string, mainPlayer: string, raw: string,
): PlayerEntry {
  const getGames = makeLoader(raw, id);
  return {
    id, name, mainPlayer,
    gameCount: countGames(raw),
    getGames,
    findGame: (gid) => getGames().find(g => g.id === gid),
  };
}

export const PLAYER_REGISTRY: PlayerEntry[] = [
  // World Champions (chronological)
  makeEntry('morphy',          'Paul Morphy',                  'morphy',          morphyRaw),
  makeEntry('steinitz',        'William Steinitz',             'steinitz',        steinitzRaw),
  makeEntry('lasker',          'Emanuel Lasker',               'lasker',          laskerRaw),
  makeEntry('capablanca',      'José Raúl Capablanca',         'capablanca',      capablancaRaw),
  makeEntry('alekhine',        'Alexander Alekhine',           'alekhine',        alekhinRaw),
  makeEntry('euwe',            'Max Euwe',                     'euwe',            euweRaw),
  makeEntry('botvinnik',       'Mikhail Botvinnik',            'botvinnik',       botvinnikRaw),
  makeEntry('smyslov',         'Vasily Smyslov',               'smyslov',         smyslovRaw),
  makeEntry('tal',             'Mikhail Tal',                  'tal',             talRaw),
  makeEntry('petrosian',       'Tigran Petrosian',             'petrosian',       petrosianRaw),
  makeEntry('spassky',         'Boris Spassky',               'spassky',         spasskyRaw),
  makeEntry('fischer',         'Robert James Fischer',         'fischer',         fischerRaw),
  makeEntry('karpov',          'Anatoly Karpov',               'karpov',          karpovRaw),
  makeEntry('kasparov',        'Garry Kasparov',               'kasparov',        kasparovRaw),
  makeEntry('kramnik',         'Vladimir Kramnik',             'kramnik',         kramnikRaw),
  makeEntry('anand',           'Viswanathan Anand',            'anand',           ananRaw),
  makeEntry('topalov',         'Veselin Topalov',              'topalov',         topalovRaw),
  makeEntry('carlsen',         'Magnus Carlsen',               'carlsen',         carlsenRaw),
  makeEntry('ding',            'Ding Liren',                   'ding',            dingRaw),
  makeEntry('gukesh',          'Dommaraju Gukesh',             'gukesh',          gukeshRaw),
  // Top modern GMs
  makeEntry('nakamura',        'Hikaru Nakamura',              'nakamura',        nakamuraRaw),
  makeEntry('caruana',         'Fabiano Caruana',              'caruana',         caruana),
  makeEntry('firouzja',        'Alireza Firouzja',             'firouzja',        firouzjaRaw),
  makeEntry('nepomniachtchi',  'Ian Nepomniachtchi',           'nepomniachtchi',  nepoRaw),
  makeEntry('giri',            'Anish Giri',                   'giri',            giriRaw),
  makeEntry('mvl',             'Maxime Vachier-Lagrave',       'vachier',         mvlRaw),
  makeEntry('so',              'Wesley So',                    'so',              soRaw),
  makeEntry('aronian',         'Levon Aronian',                'aronian',         aroianRaw),
  makeEntry('grischuk',        'Alexander Grischuk',           'grischuk',        grischukRaw),
  makeEntry('mamedyarov',      'Shakhriyar Mamedyarov',        'mamedyarov',      mamedyarovRaw),
  makeEntry('karjakin',        'Sergey Karjakin',              'karjakin',        karjakinRaw),
  makeEntry('radjabov',        'Teimour Radjabov',             'radjabov',        radjabovRaw),
  makeEntry('gelfand',         'Boris Gelfand',                'gelfand',         gelfandRaw),
  makeEntry('ivanchuk',        'Vassily Ivanchuk',             'ivanchuk',        ivanchukRaw),
  makeEntry('svidler',         'Peter Svidler',                'svidler',         svidlerRaw),
  makeEntry('leko',            'Peter Leko',                   'leko',            lekoRaw),
  makeEntry('shirov',          'Alexei Shirov',                'shirov',          shirovRaw),
  makeEntry('morozevich',      'Alexander Morozevich',         'morozevich',      morozevichRaw),
  makeEntry('praggnanandhaa',  'Rameshbabu Praggnanandhaa',    'praggnanandhaa',  praggRaw),
  makeEntry('duda',            'Jan-Krzysztof Duda',           'duda',            dudaRaw),
  makeEntry('rapport',         'Richard Rapport',              'rapport',         rapportRaw),
  makeEntry('abdusattorov',    'Nodirbek Abdusattorov',        'abdusattorov',    abdusattorovRaw),
  makeEntry('adams',           'Michael Adams',                'adams',           adamsRaw),
  // Classic legends
  makeEntry('rubinstein',      'Akiba Rubinstein',             'rubinstein',      rubinsteinRaw),
  makeEntry('nimzowitsch',     'Aron Nimzowitsch',             'nimzowitsch',     nimzowitschRaw),
  makeEntry('keres',           'Paul Keres',                   'keres',           keresRaw),
  makeEntry('bronstein',       'David Bronstein',              'bronstein',       bronsteinRaw),
  makeEntry('geller',          'Efim Geller',                  'geller',          gellerRaw),
  makeEntry('korchnoi',        'Viktor Korchnoi',              'korchnoi',        korchnoisRaw),
  makeEntry('larsen',          'Bent Larsen',                  'larsen',          larsenRaw),
  makeEntry('portisch',        'Lajos Portisch',               'portisch',        portischRaw),
  makeEntry('timman',          'Jan Timman',                   'timman',          timmanRaw),
  makeEntry('polgarj',         'Judit Polgar',                 'polgar',          polgarjRaw),
  makeEntry('short',           'Nigel Short',                  'short',           shortRaw),
  makeEntry('nunn',            'John Nunn',                    'nunn',            nunnRaw),
];

export const TOTAL_GAME_COUNT = PLAYER_REGISTRY.reduce((s, p) => s + p.gameCount, 0);

export function findPlayerEntry(playerId: string): PlayerEntry | undefined {
  return PLAYER_REGISTRY.find(p => p.id === playerId);
}

export function findGameAcrossPlayers(gameId: string): ClassicalGame | undefined {
  for (const entry of PLAYER_REGISTRY) {
    if (gameId.startsWith(entry.id + '-')) {
      return entry.findGame(gameId);
    }
  }
  return undefined;
}
