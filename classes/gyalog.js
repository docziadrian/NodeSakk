/*Ide jön a gyalog/paraszt osztály, lépések, ütések, stb. */

class Gyalog {
  isFirstMove = true;
  canMoveForward = true;
  canMoveBackward = false;
  canMoveSideways = false;
  canAttack = true;
  canEnPassant = false;
  canPromote = false;
  color = "white"; // "white" | "black"
  faIcon = "fa-regular fa-chess-pawn"; // white: fa-regular, black: fa-solid

  position = {
    x: 0,
    y: 0,
  };

  /**
   * @param {"white"|"black"} color
   * @param {{x:number,y:number}} position
   */
  constructor(color, position) {
    this.color = color;
    this.position = position;
    this.faIcon =
      color === "white"
        ? "fa-regular fa-chess-pawn"
        : "fa-solid fa-chess-pawn";
  }

  // UI: kijelölés színezése (ha van DOM)
  selectedPawn() {
    const selectedPawnField = document?.getElementById?.(
      `${this.position.x}${this.position.y}`
    );
    if (selectedPawnField) selectedPawnField.style.backgroundColor = "yellow";

    const moveableFields = document?.getElementsByClassName?.("moveableField");
    if (moveableFields) {
      for (let i = 0; i < moveableFields.length; i++) {
        moveableFields[i].style.backgroundColor = "green";
      }
    }

    const attackableFields =
      document?.getElementsByClassName?.("attackableField");
    if (attackableFields) {
      for (let i = 0; i < attackableFields.length; i++) {
        attackableFields[i].style.backgroundColor = "red";
      }
    }
  }

  deselectedPawn() {
    const selectedPawnField = document?.getElementById?.(
      `${this.position.x}${this.position.y}`
    );
    if (selectedPawnField) selectedPawnField.style.backgroundColor = "white";

    const moveableFields = document?.getElementsByClassName?.("moveableField");
    if (moveableFields) {
      for (let i = 0; i < moveableFields.length; i++) {
        moveableFields[i].style.backgroundColor = "white";
      }
    }

    const attackableFields =
      document?.getElementsByClassName?.("attackableField");
    if (attackableFields) {
      for (let i = 0; i < attackableFields.length; i++) {
        attackableFields[i].style.backgroundColor = "white";
      }
    }
  }

  _dir() {
    // Fehérnél az y nő, feketénél csökken
    return this.color === "white" ? 1 : -1;
  }

  _startRank() {
    // Ha y nő “felfelé”: white indul y=1-ről, black y=6-ról.
    return this.color === "white" ? 1 : 6;
  }

  _promotionRank() {
    return this.color === "white" ? 7 : 0;
  }

  _inBounds(x, y) {
    return x >= 0 && x < 8 && y >= 0 && y < 8;
  }

  /**
   * board: 8x8 tömb (board[y][x]); üres: null; foglalt: pl. { type, color }.
   * lastMove: en passant-hoz: { pieceType:"gyalog", color, from:{x,y}, to:{x,y} }.
   */
  getPossibleMoves(board, lastMove = null) {
    const moves = [];
    const attacks = [];
    const enPassant = [];

    const { x, y } = this.position;
    const dir = this._dir();

    // 1 előre
    const oneY = y + dir;
    if (this._inBounds(x, oneY) && board?.[oneY]?.[x] == null) {
      moves.push({ x, y: oneY });

      // 2 előre (csak kezdő sorból, ha üres a köztes és a cél mező)
      const twoY = y + 2 * dir;
      const onStartRank = y === this._startRank();
      if (
        this.isFirstMove &&
        onStartRank &&
        this._inBounds(x, twoY) &&
        board?.[twoY]?.[x] == null
      ) {
        moves.push({ x, y: twoY });
      }
    }

    // Ütés átlóban (bal/jobb)
    for (const dx of [-1, 1]) {
      const tx = x + dx;
      const ty = y + dir;
      if (!this._inBounds(tx, ty)) continue;
      const target = board?.[ty]?.[tx];
      if (target && target.color && target.color !== this.color) {
        attacks.push({ x: tx, y: ty });
      }
    }

    // En passant: akkor, ha az ellenfél gyalogja az előző lépésben 2-t lépett,
    // és most mellettünk áll; mi átlóban a mögötte lévő mezőre lépünk, és a mellette állót ütjük.
    this.canEnPassant = false;
    if (
      lastMove &&
      lastMove.pieceType === "gyalog" &&
      lastMove.color &&
      lastMove.color !== this.color &&
      lastMove.from &&
      lastMove.to
    ) {
      const movedTwo = Math.abs(lastMove.to.y - lastMove.from.y) === 2;
      if (movedTwo && lastMove.to.y === y && Math.abs(lastMove.to.x - x) === 1) {
        const epX = lastMove.to.x;
        const epY = y + dir;
        if (this._inBounds(epX, epY) && board?.[epY]?.[epX] == null) {
          this.canEnPassant = true;
          enPassant.push({
            x: epX,
            y: epY,
            capture: { x: lastMove.to.x, y: lastMove.to.y },
          });
        }
      }
    }

    const promotesToRank =
      moves.some((m) => m.y === this._promotionRank()) ||
      attacks.some((a) => a.y === this._promotionRank()) ||
      enPassant.some((e) => e.y === this._promotionRank());

    this.canPromote = promotesToRank;

    return { moves, attacks, enPassant, promotesToRank };
  }

  /**
   * Lépés végrehajtása (normál vagy ütés). En passant-ot a returned info alapján kezeljük.
   * @param {{x:number,y:number}} to
   */
  moveTo(to) {
    // Itt csak a pozíciót állítjuk; a “tábla” frissítése játékmotor feladata.
    this.position = { x: to.x, y: to.y };
    this.isFirstMove = false;
    this.canPromote = this.position.y === this._promotionRank();
    return this.canPromote;
  }

  /**
   * Promótáció: visszaadja, mivé lett (alapértelmezés vezér).
   * A konkrét bábu-objektum létrehozását (Vezer/Bastya/Futo/Huszar) a játékmotor csinálja.
   * @param {"vezer"|"bastya"|"futo"|"huszar"} to
   */
  promote(to = "vezer") {
    if (this.position.y !== this._promotionRank()) return null;
    const allowed = new Set(["vezer", "bastya", "futo", "huszar"]);
    return allowed.has(to) ? to : "vezer";
  }
}

// Node (szerver) kompatibilitás
if (typeof module !== "undefined" && module.exports) {
  module.exports = Gyalog;
}