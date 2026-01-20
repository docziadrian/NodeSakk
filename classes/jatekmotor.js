// Játékmotor: a tábla állapotának kezelése és lépések végrehajtása (ütés, en passant, promóció).

class JatekMotor {
  constructor(options = {}) {
    this.pieceClasses = options.pieceClasses || this._resolvePieceClasses();

    this.board = this._createEmptyBoard();
    this.currentTurn = "white"; // "white" | "black"
    this.lastMove = null; // en passant-hoz
    this.moveHistory = [];
    this.halfmoveClock = 0; // 50 lépés szabály (fél-lépésekben)
    this.positionCounts = new Map(); // háromszori ismétléshez
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
    this.halfmoveClock = 0;
    this.positionCounts = new Map();
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

    this._countPosition();
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

  // ===== Sakk / matt / patt =====

  _opponent(color) {
    return color === "white" ? "black" : "white";
  }

  _findKing(color) {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const p = this.board[y][x];
        if (p && p.type === "kiraly" && p.color === color) return { x, y };
      }
    }
    return null;
  }

  _isSquareAttacked(pos, byColor) {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const p = this.board[y][x];
        if (!p || p.color !== byColor) continue;
        if (typeof p.getPossibleMoves !== "function") continue;

        const possible = p.getPossibleMoves(this.board, this.lastMove);
        const attacks = possible.attacks || [];
        const eps = possible.enPassant || [];

        if (attacks.some((a) => a.x === pos.x && a.y === pos.y)) return true;
        if (eps.some((e) => e.x === pos.x && e.y === pos.y)) return true;
      }
    }
    return false;
  }

  isInCheck(color) {
    const kingPos = this._findKing(color);
    if (!kingPos) return false;
    return this._isSquareAttacked(kingPos, this._opponent(color));
  }

  _cloneBoardShallow() {
    return this.board.map((row) => row.slice());
  }

  _simulateMove(from, to, extra = null) {
    const snapshot = {
      board: this._cloneBoardShallow(),
      lastMove: this.lastMove
        ? { ...this.lastMove, from: { ...this.lastMove.from }, to: { ...this.lastMove.to } }
        : null,
    };

    const piece = this.getPieceAt(from);

    if (extra && extra.enPassantCapture) {
      this.board[extra.enPassantCapture.y][extra.enPassantCapture.x] = null;
    }

    this.board[from.y][from.x] = null;
    this.board[to.y][to.x] = piece;
    if (piece) piece.position = { x: to.x, y: to.y };

    if (extra && extra.promotionTo && piece) {
      piece.type = extra.promotionTo;
    }

    return snapshot;
  }

  _restoreSnapshot(snapshot) {
    this.board = snapshot.board;
    this.lastMove = snapshot.lastMove;
  }

  getLegalMovesFor(pos) {
    const piece = this.getPieceAt(pos);
    if (!piece || typeof piece.getPossibleMoves !== "function") {
      return { moves: [], attacks: [], enPassant: [], promotesToRank: false };
    }

    const possible = piece.getPossibleMoves(this.board, this.lastMove);
    const legal = {
      moves: [],
      attacks: [],
      enPassant: [],
      promotesToRank: possible.promotesToRank || false,
    };

    const tryTo = (to, extra) => {
      const snapshot = this._simulateMove(pos, to, extra);
      const inCheck = this.isInCheck(piece.color);
      this._restoreSnapshot(snapshot);
      return !inCheck;
    };

    for (const m of possible.moves || []) {
      if (tryTo(m)) legal.moves.push(m);
    }
    for (const a of possible.attacks || []) {
      if (tryTo(a)) legal.attacks.push(a);
    }
    for (const ep of possible.enPassant || []) {
      const extra = ep.capture ? { enPassantCapture: ep.capture } : null;
      if (tryTo({ x: ep.x, y: ep.y }, extra)) legal.enPassant.push(ep);
    }

    return legal;
  }

  hasAnyLegalMove(color) {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const p = this.board[y][x];
        if (!p || p.color !== color) continue;
        const legal = this.getLegalMovesFor({ x, y });
        if ((legal.moves || []).length) return true;
        if ((legal.attacks || []).length) return true;
        if ((legal.enPassant || []).length) return true;
      }
    }
    return false;
  }

  _insufficientMaterial() {
    const pieces = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const p = this.board[y][x];
        if (p) pieces.push(p);
      }
    }

    const nonKings = pieces.filter((p) => p.type !== "kiraly");
    if (nonKings.length === 0) return true; // K vs K

    if (nonKings.length === 1) {
      const t = nonKings[0].type;
      if (t === "futo" || t === "huszar") return true; // K+F vs K, K+H vs K
    }

    return false;
  }

  _positionKey() {
    const parts = [this.currentTurn];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const p = this.board[y][x];
        if (!p) continue;
        parts.push(`${p.type[0]}${p.color[0]}${x}${y}`);
      }
    }
    parts.sort();

    let ep = "";
    if (this.lastMove && this.lastMove.pieceType === "gyalog") {
      const movedTwo = Math.abs(this.lastMove.to.y - this.lastMove.from.y) === 2;
      if (movedTwo) ep = `ep${this.lastMove.to.x}${this.lastMove.to.y}`;
    }
    return `${parts.join("|")}|${ep}`;
  }

  _countPosition() {
    const key = this._positionKey();
    const n = (this.positionCounts.get(key) || 0) + 1;
    this.positionCounts.set(key, n);
    return n;
  }

  _evaluateGameEnd(justMovedColor) {
    const sideToMove = this.currentTurn;

    if (this.halfmoveClock >= 100) {
      return { isOver: true, winner: null, reason: "Döntetlen (50 lépés szabálya)." };
    }

    const rep = this._countPosition();
    if (rep >= 3) {
      return { isOver: true, winner: null, reason: "Döntetlen (háromszori ismétlés)." };
    }

    if (this._insufficientMaterial()) {
      return { isOver: true, winner: null, reason: "Döntetlen (nincs elegendő mattadó erő)." };
    }

    const inCheck = this.isInCheck(sideToMove);
    const hasMove = this.hasAnyLegalMove(sideToMove);
    if (!hasMove) {
      if (inCheck) return { isOver: true, winner: justMovedColor, reason: "Sakk-matt." };
      return { isOver: true, winner: null, reason: "Döntetlen (patt)." };
    }

    return { isOver: false, winner: null, reason: "" };
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

    const possible = this.getLegalMovesFor(from);
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

    // 50 lépés szabály: ha ütés vagy gyaloglépés történt, nulláz
    const pawnMove = piece.type === "gyalog";
    const anyCapture = Boolean(captured || enPassantCaptured);
    this.halfmoveClock = pawnMove || anyCapture ? 0 : this.halfmoveClock + 1;

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

    const justMovedColor = piece.color;
    this._switchTurn();

    const end = this._evaluateGameEnd(justMovedColor);

    return {
      ok: true,
      move: moveRecord,
      gameState: this.getGameState(),
      gameOver: end.isOver ? { winner: end.winner, reason: end.reason } : null,
    };
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

