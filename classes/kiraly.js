/*Ide jön a király osztály, lépések, ütések, stb. */

class Kiraly {
    canMoveOneSquare = true; // 1 mezőt tud lépni bármelyik irányba
    canAttack = true; // 1 mezőre tud ütni bármelyik irányba
    isBlocked = false; // Akkor igaz, ha egy bábu “blokkolja” (gyakorlatban ritkán használt a királynál)
    isInCheck = false; // Akkor igaz, ha sakkban van
    isInCheckmate = false; // Akkor igaz, ha sakk-mattban van
    color = "white"; // "white" | "black"
    faIcon = "fa-regular fa-chess-king"; // fehér: fa-regular, fekete: fa-solid
    position = {
        x: 0,
        y: 0,
    };

    constructor(color, position) {
        this.color = color;
        this.position = position;
        this.faIcon =
          color === "white"
            ? "fa-regular fa-chess-king"
            : "fa-solid fa-chess-king";
    }

    _inBounds(x, y) {
        return x >= 0 && x < 8 && y >= 0 && y < 8;
    }

    /**
     * board: 8x8 tömb (board[y][x]); üres: null; foglalt: pl. { type, color }.
     * Megjegyzés: itt még NEM vizsgáljuk, hogy a lépés után sakkban marad-e a király (az külön logika).
     * @param {Array<Array<any>>} board
     * @returns {{moves:{x:number,y:number}[], attacks:{x:number,y:number}[]}}
     */
    getPossibleMoves(board) {
        const moves = [];
        const attacks = [];

        const { x, y } = this.position;

        // 8 szomszédos mező
        const deltas = [
            { dx: -1, dy: -1 },
            { dx: 0, dy: -1 },
            { dx: 1, dy: -1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: -1, dy: 1 },
            { dx: 0, dy: 1 },
            { dx: 1, dy: 1 },
        ];

        for (const { dx, dy } of deltas) {
            const tx = x + dx;
            const ty = y + dy;
            if (!this._inBounds(tx, ty)) continue;

            const cell = board?.[ty]?.[tx];
            if (cell == null) {
                moves.push({ x: tx, y: ty });
            } else if (cell.color && cell.color !== this.color) {
                attacks.push({ x: tx, y: ty });
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