/*Ide jön a bástya osztály, lépések, ütések, stb. */

class Bastya {
    canMoveHorizontally = true; // Only on the horizontal squares
    canMoveVertically = true; // Only on the vertical squares
    canAttack = true; // Can attack on the horizontal and vertical squares
    isBlocked = false; // If the bástya is blocked by another piece
    color = "white" | "black";
    faIcon = "fa-regular fa-chess-rook" | "fa-solid fa-chess-rook"; // Font Awesome icon for the bástya, white and black

    position = {
        x: 0,
        y: 0,
    };

    constructor(color, position) {
        this.color = color;
        this.position = position;
    }
}