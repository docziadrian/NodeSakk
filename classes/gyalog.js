/*Ide jön a gyalog/paraszt osztály, lépések, ütések, stb. */

class Gyalog {
    isFirstMove = true;
    canMoveForward = true;
    canMoveBackward = false;
    canMoveSideways = false;
    canAttack = false;
    canEnPassant = false;
    canPromote = false;
    color = "white" | "black";
    faIcon = "fa-regular fa-chess-pawn" | "fa-solid fa-chess-pawn"; // Font Awesome icon for the gyalog, white and black

    position = {
        x: 0,
        y: 0,
    };

    constructor(color, position) {
        this.color = color;
        this.position = position;
    }

    move(stepCount){
        if(canMoveForward){
            if(isFirstMove && stepCount === 2){
                if(this.color === "white"){
                    this.position.y += stepCount;
                }else{
                    this.position.y -= stepCount;
                }
                this.isFirstMove = false;
            }
            if(isFirstMove && stepCount === 1){
                if(this.color === "white"){
                    this.position.y += stepCount;
                }else{
                    this.position.y -= stepCount;
                }
                this.isFirstMove = false;
            }
            if(!isFirstMove && stepCount === 1){
                if(this.color === "white"){
                    this.position.y += stepCount;
                }else{
                    this.position.y -= stepCount;
                }
            }
            else{
                alert("Ismeretlen lépés!");
            }
        }else{
            alert("Nem lehet előre lépni!");
        }
    }
}