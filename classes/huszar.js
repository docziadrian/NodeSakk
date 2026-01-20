/*Ide jön a huszár osztály, lépések, ütések, stb. */

class Huszar {
    canMoveInLShape = true; // L alakban tud lépni
    canAttack = true; // L alakban tud ütni
    isBlocked = false; // A huszár átugrik bábukat, ezért ez jellemzően nem használt
    color = "white"; // "white" | "black"
    faIcon = "fa-regular fa-chess-knight"; // fehér: fa-regular, fekete: fa-solid

    position = {
        x: 0,
        y: 0,
    };

    constructor(color, position) {
        this.color = color;
        this.position = position;
        this.faIcon =
          color === "white"
            ? "fa-regular fa-chess-knight"
            : "fa-solid fa-chess-knight";
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

        // 8 lehetséges huszár ugrás (2+1)
        const jumps = [
            { dx: 2, dy: 1 },
            { dx: 2, dy: -1 },
            { dx: -2, dy: 1 },
            { dx: -2, dy: -1 },
            { dx: 1, dy: 2 },
            { dx: 1, dy: -2 },
            { dx: -1, dy: 2 },
            { dx: -1, dy: -2 },
        ];

        for (const { dx, dy } of jumps) {
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