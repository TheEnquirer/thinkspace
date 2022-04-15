import THREE = require("three");
import { Text2D } from "./Text2D";
export declare class SpriteText2D extends Text2D {
    sprite: THREE.Sprite;
    raycast(): any;
    updateText(): void;
    updateAlign(): void;
    get align(): THREE.Vector2;
    set align(value: THREE.Vector2);
}
