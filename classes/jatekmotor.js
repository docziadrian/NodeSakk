// Játékmotor: a tábla állapotának kezelése és lépések végrehajtása (ütés, en passant, promóció).

class JatekMotor {
  constructor(options = {}) {
    this.pieceClasses = options.pieceClasses || this._resolvePieceClasses();

    this.board = this._createEmptyBoard();
    this.currentTurn = "white"; // "white" | "black"
    this.lastMove = null; // en passant-hoz
    this.moveHistory = [];
  }

  _createEmptyBoard() {
    return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
  }

  _inBounds(x, y) {
    return x >= 0 && x < 8 && y >= 0 && y < 8;
  }

  _resolvePieceClasses() {
    // Böngészőben a class-ok globálisan lehetnek elérhetőek (script tag).
    const fromWindow =
      typeof window !== "undefined"
        ? {
            Gyalog: window.Gyalog,
            Bastya: window.Bastya,
            Futo: window.Futo,
            Huszar: window.Huszar,
            Kiraly: window.Kiraly,
            Vezer: window.Vezer,
          }
        : {};

    // Node-ban megpróbáljuk betölteni (ha a fájlok később kapnak module.exports-t).
    const fromRequire = {};
    if (typeof require !== "undefined") {
      try {
        // eslint-disable-next-line global-require
        fromRequire.Gyalog = require("./gyalog");
      } catch {}
      try {
        // eslint-disable-next-line global-require
        fromRequire.Bastya = require("./bastya");
      } catch {}
      try {
        // eslint-disable-next-line global-require
        fromRequire.Futo = require("./futo");
      } catch {}
      try {
        // eslint-disable-next-line global-require
        fromRequire.Huszar = require("./huszar");
      } catch {}
      try {
        // eslint-disable-next-line global-require
        fromRequire.Kiraly = require("./kiraly");
      } catch {}
      try {
        // eslint-disable-next-line global-require
        fromRequire.Vezer = require("./vezer");
      } catch {}
    }

    return { ...fromWindow, ...fromRequire };
  }

  reset() {
    this.board = this._createEmptyBoard();
    this.currentTurn = "white";
    this.lastMove = null;
    this.moveHistory = [];
  }

  /**
   * Alap (klasszikus) kezdőfelállás.
   * Fontos: a koordináta rendszer az eddigi bábuk szerint: board[y][x], és a fehér “előre” y+1 irány.
   */
  initClassicSetup() {
    const { Gyalog, Bastya, Futo, Huszar, Kiraly, Vezer } = this.pieceClasses;
    if (!Gyalog || !Bastya || !Futo || !Huszar || !Kiraly || !Vezer) {
      throw new Error(
        "Hiányzó bábu osztály(ok). Add át a pieceClasses-t a JatekMotor konstruktorban."
      );
    }

    this.reset();

    // Fehér fő sor: y=0, gyalogok y=1
    this._placePiece(new Bastya("white", { x: 0, y: 0 }), "bastya");
    this._placePiece(new Huszar("white", { x: 1, y: 0 }), "huszar");
    this._placePiece(new Futo("white", { x: 2, y: 0 }), "futo");
    this._placePiece(new Vezer("white", { x: 3, y: 0 }), "vezer");
    this._placePiece(new Kiraly("white", { x: 4, y: 0 }), "kiraly");
    this._placePiece(new Futo("white", { x: 5, y: 0 }), "futo");
    this._placePiece(new Huszar("white", { x: 6, y: 0 }), "huszar");
    this._placePiece(new Bastya("white", { x: 7, y: 0 }), "bastya");
    for (let x = 0; x < 8; x++) {
      this._placePiece(new Gyalog("white", { x, y: 1 }), "gyalog");
    }

    // Fekete fő sor: y=7, gyalogok y=6
    this._placePiece(new Bastya("black", { x: 0, y: 7 }), "bastya");
    this._placePiece(new Huszar("black", { x: 1, y: 7 }), "huszar");
    this._placePiece(new Futo("black", { x: 2, y: 7 }), "futo");
    this._placePiece(new Vezer("black", { x: 3, y: 7 }), "vezer");
    this._placePiece(new Kiraly("black", { x: 4, y: 7 }), "kiraly");
    this._placePiece(new Futo("black", { x: 5, y: 7 }), "futo");
    this._placePiece(new Huszar("black", { x: 6, y: 7 }), "huszar");
    this._placePiece(new Bastya("black", { x: 7, y: 7 }), "bastya");
    for (let x = 0; x < 8; x++) {
      this._placePiece(new Gyalog("black", { x, y: 6 }), "gyalog");
    }

    return this.getGameState();
  }

  _placePiece(piece, type) {
    if (!piece || !piece.position) return;
    const { x, y } = piece.position;
    if (!this._inBounds(x, y)) return;

    // A bábuk mozgásgenerálása cell.color-t néz, ezért a bábu példányt tesszük a táblára.
    piece.type = type; // pl. "gyalog"
    this.board[y][x] = piece;
  }

  getPieceAt(pos) {
    if (!pos) return null;
    const { x, y } = pos;
    if (!this._inBounds(x, y)) return null;
    return this.board[y][x];
  }

  /**
   * Visszaadja egy bábu lehetséges lépéseit (a bábu saját logikája alapján).
   * Megjegyzés: itt még nem szűrünk “sakkban marad” jellegű szabályokra.
   */
  getMovesFor(pos) {
    const piece = this.getPieceAt(pos);
    if (!piece || typeof piece.getPossibleMoves !== "function") {
      return { moves: [], attacks: [], enPassant: [], promotesToRank: false };
    }
    return piece.getPossibleMoves(this.board, this.lastMove);
  }

  _switchTurn() {
    this.currentTurn = this.currentTurn === "white" ? "black" : "white";
  }

  /**
   * Lépés végrehajtása.
   * @param {{x:number,y:number}} from
   * @param {{x:number,y:number}} to
   * @param {("vezer"|"bastya"|"futo"|"huszar")?} promotionChoice
   */
  makeMove(from, to, promotionChoice = "vezer") {
    const piece = this.getPieceAt(from);
    if (!piece) return { ok: false, error: "Nincs bábu a kiinduló mezőn." };
    if (piece.color !== this.currentTurn)
      return { ok: false, error: "Nem te jössz." };

    const possible = this.getMovesFor(from);
    const isNormalMove = possible.moves.some((m) => m.x === to.x && m.y === to.y);
    const isAttack = possible.attacks.some((a) => a.x === to.x && a.y === to.y);
    const ep = (possible.enPassant || []).find((e) => e.x === to.x && e.y === to.y);

    if (!isNormalMove && !isAttack && !ep) {
      return { ok: false, error: "Szabálytalan lépés." };
    }

    // Ütés (normál)
    let captured = null;
    if (isAttack) {
      captured = this.getPieceAt(to);
    }

    // En passant ütés
    let enPassantCaptured = null;
    if (ep && ep.capture) {
      enPassantCaptured = this.getPieceAt(ep.capture);
      if (enPassantCaptured) {
        this.board[ep.capture.y][ep.capture.x] = null;
      }
    }

    // Kiinduló mező ürítése
    this.board[from.y][from.x] = null;

    // Célmezőn levő bábu törlése (ha ütés volt)
    if (captured) {
      this.board[to.y][to.x] = null;
    }

    // Bábu mozgatása
    if (typeof piece.moveTo === "function") {
      piece.moveTo(to);
    } else {
      piece.position = { x: to.x, y: to.y };
    }
    this.board[to.y][to.x] = piece;

    // Promóció (csak gyalognál)
    let promotion = null;
    if (piece.type === "gyalog" && typeof piece.promote === "function") {
      const promoteTo = piece.promote(promotionChoice);
      if (promoteTo) {
        promotion = promoteTo;
        const promotedPiece = this._createPromotedPiece(promoteTo, piece.color, to);
        if (promotedPiece) {
          this._placePiece(promotedPiece, promoteTo);
        }
      }
    }

    // lastMove frissítése (en passant-hoz)
    this.lastMove = {
      pieceType: piece.type,
      color: piece.color,
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
    };

    const moveRecord = {
      pieceType: piece.type,
      color: piece.color,
      from,
      to,
      captured: captured ? { type: captured.type, color: captured.color } : null,
      enPassantCaptured: enPassantCaptured
        ? { type: enPassantCaptured.type, color: enPassantCaptured.color }
        : null,
      promotion,
    };
    this.moveHistory.push(moveRecord);

    this._switchTurn();

    return { ok: true, move: moveRecord, gameState: this.getGameState() };
  }

  _createPromotedPiece(to, color, position) {
    const { Vezer, Bastya, Futo, Huszar } = this.pieceClasses;
    const map = {
      vezer: Vezer,
      bastya: Bastya,
      futo: Futo,
      huszar: Huszar,
    };
    const Ctor = map[to];
    if (!Ctor) return null;
    return new Ctor(color, position);
  }

  /**
   * Jelenlegi állapot egyszerű (küldhető) formában.
   * A board-ot “sorosítható” darabokra alakítjuk.
   */
  getGameState() {
    const pieces = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const p = this.board[y][x];
        if (!p) continue;
        pieces.push({
          type: p.type,
          color: p.color,
          position: { x, y },
          faIcon: p.faIcon,
        });
      }
    }

    return {
      currentTurn: this.currentTurn,
      lastMove: this.lastMove,
      pieces,
      moveHistory: this.moveHistory,
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = JatekMotor;
}

