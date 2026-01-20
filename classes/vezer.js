/*Ide jön a királynő/vezér osztály, lépések, ütések, stb. */

class Vezer {
    canMoveDiagonally = true; // Can move diagonally
    canAttack = true; // Can attack on the diagonal and horizontal and vertical squares
    canMoveHorizontally = true; // Can move horizontally
    canMoveVertically = true; // Can move vertically
    isBlocked = false; // If the vezér is blocked by another piece
    color = "white" | "black";
    faIcon = "fa-regular fa-chess-queen" | "fa-solid fa-chess-queen"; // Font Awesome icon for the vezér, white and black
    position = {
        x: 0,
        y: 0,
    };

    constructor(color, position) {
        this.color = color;
        this.position = position;
    }
}