/*Ide jön a bástya osztály, lépések, ütések, stb. */

class Bastya {
    canMoveHorizontally = true; // Vízszintesen tud lépni
    canMoveVertically = true; // Függőlegesen tud lépni
    canAttack = true; // Vízszintesen és függőlegesen tud ütni
    isBlocked = false; // Akkor igaz, ha egy bábu “blokkolja” az útját
    color = "white"; // "white" | "black"
    faIcon = "fa-regular fa-chess-rook"; // fehér: fa-regular, fekete: fa-solid

    position = {
        x: 0,
        y: 0,
    };

    constructor(color, position) {
        this.color = color;
        this.position = position;
        this.faIcon =
          color === "white"
            ? "fa-regular fa-chess-rook"
            : "fa-solid fa-chess-rook";
    }

    _inBounds(x, y) {
        return x >= 0 && x < 8 && y >= 0 && y < 8;
    }

    /**
     * board: 8x8 tömb (board[y][x]); üres: null; foglalt: pl. { type, color }.
     * @param {Array<Array<any>>} board
     * @returns {{moves:{x:number,y:number}[], attacks:{x:number,y:number}[]}}
     */
    getPossibleMoves(board) {
        const moves = [];
        const attacks = [];

        const { x, y } = this.position;

        // 4 irány: jobbra, balra, fel, le (akadályig)
        const directions = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 },
        ];

        for (const { dx, dy } of directions) {
            let cx = x + dx;
            let cy = y + dy;

            while (this._inBounds(cx, cy)) {
                const cell = board?.[cy]?.[cx];

                if (cell == null) {
                    moves.push({ x: cx, y: cy });
                } else {
                    // Saját bábu megállítja, ellenfélre lehet ütni és megáll
                    if (cell.color && cell.color !== this.color) {
                        attacks.push({ x: cx, y: cy });
                    }
                    break;
                }

                cx += dx;
                cy += dy;
            }
        }

        return { moves, attacks };
    }

    /**
     * @param {{x:number,y:number}} to
     */
    moveTo(to) {
        this.position = { x: to.x, y: to.y };
    }
}

// Node (szerver) kompatibilitás
if (typeof module !== "undefined" && module.exports) {
  module.exports = Bastya;
}