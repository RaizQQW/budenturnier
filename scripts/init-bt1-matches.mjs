import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const out = path.join(root, "data", "tournaments", "budenturnier-1-2026", "matches.json");

/** @typedef {{phase:'swiss'|'bracket', swissRound?:number, bracketRound?:'semis'|'third'|'finals', table:number, playerA:string, playerB:string|null, gamesA:number, gamesB:number, bye:boolean}} M */

/** @param {M[]} arr */
function write(arr) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ matches: arr }, null, 2), "utf8");
  console.log("Wrote", out, "matches:", arr.length);
}

const m = [];

function swiss(r, t, a, b, ga, gb) {
  m.push({
    phase: "swiss",
    swissRound: r,
    table: t,
    playerA: a,
    playerB: b,
    gamesA: ga,
    gamesB: gb,
    bye: false,
  });
}

function byeSwiss(r, t, player) {
  m.push({
    phase: "swiss",
    swissRound: r,
    table: t,
    playerA: player,
    playerB: null,
    gamesA: 2,
    gamesB: 0,
    bye: true,
  });
}

function bracket(round, t, a, b, ga, gb) {
  m.push({
    phase: "bracket",
    bracketRound: round,
    table: t,
    playerA: a,
    playerB: b,
    gamesA: ga,
    gamesB: gb,
    bye: false,
  });
}

// Round 1
swiss(1, 1, "Max Q.", "Andreas Hansen Meyer", 2, 1);
swiss(1, 2, "Teasy", "Tobias Erdmann", 2, 1);
swiss(1, 3, "Julian Gramatke", "Lei Gao", 1, 1);
swiss(1, 4, "Ricardo Rodrigues", "Niklas Meyer", 2, 0);
swiss(1, 5, "Simon Ranzau", "Lars-Erik Endlich", 2, 0);
swiss(1, 6, "Luc", "Darius Metz", 2, 0);
swiss(1, 7, "Andy Gast", "Fabian M", 2, 0);
swiss(1, 8, "Mombo", "Michael Hagemann", 1, 1);
swiss(1, 9, "Henning Lloyd Dünner", "Spook", 2, 0);
byeSwiss(1, 10, "Stefan Rather");

// Round 2
swiss(2, 1, "Stefan Rather", "Simon Ranzau", 1, 1);
swiss(2, 2, "Teasy", "Max Q.", 2, 0);
swiss(2, 3, "Luc", "Henning Lloyd Dünner", 1, 2);
swiss(2, 4, "Andy Gast", "Ricardo Rodrigues", 0, 2);
swiss(2, 5, "Lei Gao", "Michael Hagemann", 2, 0);
swiss(2, 6, "Julian Gramatke", "Mombo", 2, 0);
swiss(2, 7, "Darius Metz", "Spook", 0, 2);
swiss(2, 8, "Niklas Meyer", "Lars-Erik Endlich", 0, 2);
swiss(2, 9, "Andreas Hansen Meyer", "Tobias Erdmann", 1, 2);
byeSwiss(2, 10, "Fabian M");

// Round 3
swiss(3, 1, "Stefan Rather", "Max Q.", 0, 2);
swiss(3, 2, "Ricardo Rodrigues", "Lei Gao", 0, 2);
swiss(3, 3, "Simon Ranzau", "Julian Gramatke", 0, 2);
swiss(3, 4, "Teasy", "Henning Lloyd Dünner", 0, 2);
swiss(3, 5, "Andy Gast", "Tobias Erdmann", 2, 1);
swiss(3, 6, "Luc", "Fabian M", 1, 1);
swiss(3, 7, "Lars-Erik Endlich", "Spook", 1, 1);
swiss(3, 8, "Michael Hagemann", "Niklas Meyer", 0, 2);
swiss(3, 9, "Mombo", "Darius Metz", 2, 1);
byeSwiss(3, 10, "Andreas Hansen Meyer");

// Round 4
swiss(4, 1, "Stefan Rather", "Spook", 1, 1);
swiss(4, 2, "Lei Gao", "Teasy", 2, 0);
swiss(4, 3, "Max Q.", "Andy Gast", 2, 0);
swiss(4, 4, "Ricardo Rodrigues", "Mombo", 0, 2);
swiss(4, 5, "Lars-Erik Endlich", "Fabian M", 1, 2);
swiss(4, 6, "Simon Ranzau", "Luc", 2, 0);
swiss(4, 7, "Henning Lloyd Dünner", "Julian Gramatke", 1, 2);
swiss(4, 8, "Andreas Hansen Meyer", "Niklas Meyer", 2, 0);
swiss(4, 9, "Tobias Erdmann", "Michael Hagemann", 2, 0);
byeSwiss(4, 10, "Darius Metz");

// Round 5
swiss(5, 1, "Stefan Rather", "Lars-Erik Endlich", 1, 2);
swiss(5, 2, "Julian Gramatke", "Max Q.", 2, 1);
swiss(5, 3, "Simon Ranzau", "Mombo", 1, 2);
swiss(5, 4, "Fabian M", "Tobias Erdmann", 2, 0);
swiss(5, 5, "Teasy", "Andy Gast", 1, 2);
swiss(5, 6, "Andreas Hansen Meyer", "Ricardo Rodrigues", 0, 2);
swiss(5, 7, "Lei Gao", "Henning Lloyd Dünner", 2, 1);
swiss(5, 8, "Spook", "Luc", 0, 2);
swiss(5, 9, "Niklas Meyer", "Darius Metz", 1, 2);
byeSwiss(5, 10, "Michael Hagemann");

// Bracket
bracket("semis", 1, "Julian Gramatke", "Fabian M", 2, 1);
bracket("semis", 2, "Lei Gao", "Mombo", 2, 0);
bracket("third", 1, "Fabian M", "Mombo", 2, 0);
bracket("finals", 1, "Julian Gramatke", "Lei Gao", 0, 2);

write(m);
