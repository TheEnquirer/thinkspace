import { TextOptions } from "./Text2D";
export declare class CanvasText {
    textWidth: number;
    textHeight: number;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    constructor();
    get width(): number;
    get height(): number;
    drawText(text: string, ctxOptions: TextOptions): HTMLCanvasElement;
}
