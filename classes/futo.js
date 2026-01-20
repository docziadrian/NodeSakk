/*Ide jön a futó osztály, lépések, ütések, stb. */

class Futo {
    canMoveDiagonally = true; // Only on the diagonal squares
    canAttack = true; // Can attack on the diagonal squares
    isBlocked = false; // If the futó is blocked by another piece
    color = "white" | "black";
    faIcon = "fa-regular fa-chess-bishop" | "fa-solid fa-chess-bishop"; // Font Awesome icon for the gyalog, white and black

    position = {
        x: 0,
        y: 0,
    };

    constructor(color, position) {
        this.color = color;
        this.position = position;
    }
}