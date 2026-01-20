/*Ide jön a király osztály, lépések, ütések, stb. */

class Kiraly {
    canMoveOneSquare = true; // Can move one square in any direction
    canAttack = true; // Can attack on the one square squares
    isBlocked = false; // If the király is blocked by another piece
    isInCheck = false; // If the király is in check
    isInCheckmate = false; // If the király is in checkmate
    color = "white" | "black";
    faIcon = "fa-regular fa-chess-king" | "fa-solid fa-chess-king"; // Font Awesome icon for the király, white and black
    position = {
        x: 0,
        y: 0,
    };

    constructor(color, position) {
        this.color = color;
        this.position = position;
    }
}