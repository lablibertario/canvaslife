/*
 * Canvas Life
 *
 * Author:  Alex C.
 * Updated: 2017-04-02
 * Version: 0.1
 *
 * An HTML5/CSS3/ECMAScript 2016 (JavaScript) implementation of Conway's Game
 * of Life.
 *
 * - Different "drawing modes".
 *   - Draw
 *   - Erase
 *   - Line?
 *   - Basic shapes?
 * - Scale/zoom functions, or stick to static size/view? Maybe only allow
 *   panning?
 *   - Perhaps just have a base scale (farthest zoom), and then use some sort
 *     of multiplier to scale.
 *   - Perhaps allow click and drag panning.
 *
 */


//==============================================================================
// Contants
//==============================================================================

//------------------------------------------------------------------------------
// Element IDs
//------------------------------------------------------------------------------

const ID_CANVAS_WORLD        = 'canvas-world';

const ID_BUTTON_RUN          = 'button-run';
// const ID_BUTTON_CANVAS_SAVE  = 'button-canvas-save';
const ID_BUTTON_CLEAR        = 'button-clear';
const ID_BUTTON_STEP         = 'button-step';
const ID_BUTTON_GRID         = 'button-grid';
const ID_BUTTON_RLE_LOAD     = 'button-rle-load';
const ID_BUTTON_RLE_SAVE     = 'button-rle-save';
const ID_INPUT_RULES         = 'input-rules';
const ID_RANGE_FPS           = 'range-fps';
const ID_TEXTAREA_RLE        = 'textarea-rle';

const ID_SPAN_FPS            = 'span-fps';
const ID_SPAN_GEN            = 'span-gen';
const ID_SPAN_LIVING         = 'span-living';
const ID_SPAN_LIVING_MAX     = 'span-living-max';
const ID_SPAN_LIVING_MAX_GEN = 'span-living-max-gen';
const ID_SPAN_LIVING_START   = 'span-living-start';
const ID_SPAN_POS            = 'span-pos';

//------------------------------------------------------------------------------
// DOM Event Names
//------------------------------------------------------------------------------

const EVENT_ON         = 'on';
const EVENT_CLICK      = 'click';
const EVENT_FOCUS      = 'focus';
const EVENT_BLUR       = 'blur';
const EVENT_INPUT      = 'input';
const EVENT_MOUSEUP    = 'mouseup';
const EVENT_MOUSEDOWN  = 'mousedown';
const EVENT_MOUSEMOVE  = 'mousemove';
const EVENT_MOUSELEAVE = 'mouseleave';

//------------------------------------------------------------------------------
// Min and Max FPS
//------------------------------------------------------------------------------

const MIN_FPS = 1;
const MAX_FPS = 1000;


//------------------------------------------------------------------------------
// Min and Max FPS
//------------------------------------------------------------------------------

const BUTTON_TEXT_RUN      = 'Run';
const BUTTON_TEXT_STOP     = 'Stop';
const BUTTON_TEXT_GRID_ON  = 'Grid On';
const BUTTON_TEXT_GRID_OFF = 'Grid Off';


//------------------------------------------------------------------------------
// Canvas Display Scales
//------------------------------------------------------------------------------

const SCALES = {
    1: {
        columns: 480,
        rows: 269,
        cellSize: 2
    },
    2: {
        columns: 240,
        rows: 135,
        cellSize: 4
    },
    3: {
        columns: 120,
        rows: 67,
        cellSize: 8
    },
    4: {
        columns: 60,
        rows: 33,
        cellSize: 16
    }
}


//==============================================================================
// CanvasLife Class
//==============================================================================

class CanvasLife {
    constructor(scaleData={}) {
        // Scale (zoom) data.
        this._scales = scaleData.scales || SCALES;
        this._scale = scaleData.scale || 1;
        this._curScale = this._scales[this._scale];

        // Canvas data.
        this.columns = this._curScale.columns;
        this.rows = this._curScale.rows;
        this.cellSize = this._curScale.cellSize;
        this.width = (this.cellSize * this.columns);
        this.height = (this.cellSize * this.rows);
        // this.viewX = 0;
        // this.viewY = 0;
        this._canvas_ctx = null;
        this._tempCanvas = null;
        this._tempCanvas_ctx = null;
        this._grid = null;
        this._grid_ctx = null;
        // this._viewX = 0;
        // this._viewY = 0;
        this._gridOn = true;

        // CanvasLife control and information DOM elements.
        this.elements = {}

        // Colours used for drawing the world.
        this.colours = {
            background: '#050505',
            grid: '#333333',
            cell: '#22dd22',
            // dead: '#050505'
        }

        // Animation state data. Not meant to be modified, but a few of the
        // properties have getters, such as `this._animating`, and `this._paused`
        // because the info may be useful to a user.
        this._fps = 10;
        this._animating = false;
        this._paused = false;
        this._fpsInterval = null;
        this._timeThen = null;
        this._timeStart = null;
        this._now = null;
        this._elapsed = null;
        this._totalElapsed = 0;

        // Mouse state data.
        this._mousedown = false;
        this._rmb = false;
        this._erasing = false;
        this._lastPos = {x: 0, y: 0};

        // Initialize new Life instance.
        this.life = new Life();

        // Do some final initialization.
        this._initElements();
        this._initCanvas();
        this._initHandlers();
        if (this.elements.controls.fpsRange) {
            this._handlerFPS();
            // this.updateElements();
        }
    }

    get animating() {
        return this._animating;
    }

    get canvas() {
        return this.elements.canvas;
    }

    get paused() {
        return this._paused;
    }

    _animate() {
        if (!this.animating) {
            return;
        }

        requestAnimationFrame(this._animate.bind(this));

        this._now = Date.now();
        this._elapsed = this._now - this._timeThen;
        this._totalElapsed += this._elapsed;

        if (this._elapsed > this._fpsInterval) {
            this._timeThen = this._now - (this._elapsed % this._fpsInterval);
            this.life.nextGeneration();
            this.drawCells();
            this.updateElements();
        }
    }

    _handlerClear() {
        if (this.animating) {
            this.setButtonText('run', BUTTON_TEXT_RUN);
            this.stopAnimation();
        }
        this.clear();
        this.updateElements();
    }

    _handlerFPS(event=null) {
        if (event && event.type == EVENT_MOUSEUP) {
            if (this.animating) {
                this.stopAnimation();
                this.startAnimation();
            }
        }
        else {
            switch (parseInt(this.elements.controls.fpsRange.value)) {
                case 1:
                    this._fps = 1;
                    break;
                case 2:
                    this._fps = 5;
                    break;
                case 3:
                    this._fps = 10;
                    break;
                case 4:
                    this._fps = 25;
                    break;
                case 5:
                    this._fps = 100;
                    break;
                case 6:
                    this._fps = 1000;
                    break;
                default:
                    this._fps = 1;
            }
        }
        this.updateElements();
    }

    _handlerGrid() {
        if (this._gridOn) {
            this.setButtonText('grid', BUTTON_TEXT_GRID_ON);
            this._gridOn = false;
        }
        else {
            this.setButtonText('grid', BUTTON_TEXT_GRID_OFF);
            this._gridOn = true;
        }

        this.drawCells();
    }

    _handlerCanvasMousedown(event) {
        const curPos = this.getCursorPosition(event);

        if ('which' in event) {  // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
            this._rmb = (event.which == 3);
        }
        else if ('button' in event) {  // IE, Opera
            this._rmb = (event.button == 2);
        }

        this._mousedown = true;

        if (!this._rmb) {
            if ((curPos.y in this.life.cells) &&
                    (curPos.x in this.life.cells[curPos.y])) {
                this._erasing = true;
                this.life.killCell(curPos.x, curPos.y);
            }
            else {
                this._erasing = false;
                this.life.setCell(curPos.x, curPos.y);
            }

            this.drawCells();
            this.updateElements();
        }
    }

    _handlerCanvasMousemove(event) {
        const curPos = this.getCursorPosition(event);
        if (this._mousedown && !this._rmb) {
            if (!this._erasing) {
                if ((curPos.x != this._lastPos.x) ||
                        (curPos.y != this._lastPos.y)) {
                    this.life.setCell(curPos.x, curPos.y);
                }
            }
            else if ((curPos.y in this.life.cells) &&
                    (curPos.x in this.life.cells[curPos.y])) {
                this.life.killCell(curPos.x, curPos.y);
            }
            this.drawCells();
            this.updateElements();
        }
        this._lastPos = curPos;
        this.setDataInnerHTML('pos', `${ curPos.x }, ${ curPos.y }`);
    }

    _handlerCanvasMouseup(event) {
        this._mousedown = false;
        this._rmb = false;
    }

    _handlerRLEInput() {
        this.elements.controls.rleInput.select();
    }

    _handlerRLELoad() {
        if (this.animating) {
            this.setButtonText('run', BUTTON_TEXT_RUN);
            this.stopAnimation();
        }
        this.life.readRLEString(this.elements.controls.rleInput.value, false);
        this.setControlValue('rules', this.life._ruleString);
        this.drawCells();
        this.updateElements();
    }

    _handlerRLESave() {
        this.elements.controls.rleInput.value = this.rleString();
    }

    _handlerRules() {
        let rulesString = this.elements.controls.rules.value;
        let wasAnimating = this.animating;
        if (wasAnimating) {
            this.pauseAnimation();
        }
        this.life.setRules(rulesString);
        if (wasAnimating) {
            this.startAnimation();
        }
    }

    _handlerRun() {
        if (!this.animating) {
            this.setButtonText('run', BUTTON_TEXT_STOP);
            this.startAnimation();
        }
        else {
            this.setButtonText('run', BUTTON_TEXT_RUN);
            this.stopAnimation();
        }
    }

    _handlerStep() {
        if (this.animating) {
            this.setButtonText('run', BUTTON_TEXT_RUN);
        }
        this.stepAnimation();
    }

    _handlerWindow(event) {
        if (event.type == EVENT_BLUR && this.animating) {
            this.pauseAnimation();
        }
        else if (event.type == EVENT_FOCUS && this.paused) {
            this.startAnimation();
        }
    }

    _initCanvas() {
        let width = this.width;
        let height = this.height;

        this._canvas_ctx = this.elements.canvas.getContext('2d');
        this.elements.canvas.width = width;
        this.elements.canvas.height = height;

        this._tempCanvas = document.createElement('canvas');
        this._tempCanvas_ctx = this._tempCanvas.getContext('2d');
        this._tempCanvas.width = width;
        this._tempCanvas.height = height;

        this._grid = document.createElement('canvas');
        this._grid_ctx = this._grid.getContext('2d');
        this._grid.width = width;
        this._grid.height = height;

        this.newGrid();

        this.clear();
    }

    _initElements() {
        this.elements = {
            canvas: (
                document.getElementById(ID_CANVAS_WORLD) ||
                newElement(
                    'canvas',
                    {
                        id: ID_CANVAS_WORLD
                    }
                )
            ),
            controls: {
                run: (
                    document.getElementById(ID_BUTTON_RUN) ||
                    newButton(ID_BUTTON_RUN)
                ),
                clear: (
                    document.getElementById(ID_BUTTON_CLEAR) ||
                    newButton(ID_BUTTON_CLEAR)
                ),
                step: (
                    document.getElementById(ID_BUTTON_STEP) ||
                    newButton(ID_BUTTON_STEP)
                ),
                fpsRange: (
                    document.getElementById(ID_RANGE_FPS) ||
                    newElement(
                        'input',
                        {
                            type: 'range',
                            value: this._fps,
                            id: ID_RANGE_FPS
                        }
                    )
                ),
                grid: (
                    document.getElementById(ID_BUTTON_GRID) ||
                    newButton(ID_BUTTON_GRID)
                ),
                rules: (
                    document.getElementById(ID_INPUT_RULES) ||
                    newElement(
                        'input',
                        {
                            type: 'text',
                            id: ID_INPUT_RULES
                        }
                )
                ),
                rleInput: (
                    document.getElementById(ID_TEXTAREA_RLE) ||
                    newElement(
                        'textarea',
                        {
                            id: ID_TEXTAREA_RLE
                        }
                    )
                ),
                rleLoad: (
                    document.getElementById(ID_BUTTON_RLE_LOAD) ||
                    newButton(ID_BUTTON_RLE_LOAD)
                ),
                rleSave: (
                    document.getElementById(ID_BUTTON_RLE_SAVE) ||
                    newButton(ID_BUTTON_RLE_SAVE)
                )
            },
            data: {
                gens: (
                    document.getElementById(ID_SPAN_GEN) ||
                    newElement(
                        'span',
                        {
                            id: ID_SPAN_GEN
                        }
                    )
                ),
                living: (
                    document.getElementById(ID_SPAN_LIVING) ||
                    newElement(
                        'span',
                        {
                            id: ID_SPAN_LIVING
                        }
                    )
                ),
                livingStart: (
                    document.getElementById(ID_SPAN_LIVING_START) ||
                    newElement(
                        'span',
                        {
                            id: ID_SPAN_LIVING_START
                        }
                    )
                ),
                livingMax: (
                    document.getElementById(ID_SPAN_LIVING_MAX) ||
                    newElement(
                        'span',
                        {
                            id: ID_SPAN_LIVING_MAX
                        }
                    )
                ),
                livingMaxGen: (
                    document.getElementById(ID_SPAN_LIVING_MAX_GEN) ||
                    newElement(
                        'span',
                        {
                            id: ID_SPAN_LIVING_MAX_GEN
                        }
                    )
                ),
                fps: (
                    document.getElementById(ID_SPAN_FPS) ||
                    newElement(
                        'span',
                        {
                            id: ID_SPAN_FPS
                        }
                    )
                ),
                pos: (
                    document.getElementById(ID_SPAN_POS) ||
                    newElement(
                        'span',
                        {
                            id: ID_SPAN_POS
                        }
                    )
                )
            }
        };
    }

    _initHandlers() {
        let handlerRun = this._handlerRun.bind(this);
        let handlerStep = this._handlerStep.bind(this);
        let handlerClear = this._handlerClear.bind(this);
        let handlerFPS = this._handlerFPS.bind(this);
        let handlerGrid = this._handlerGrid.bind(this);
        let handlerRLEInput = this._handlerRLEInput.bind(this);
        let handlerRLELoad = this._handlerRLELoad.bind(this);
        let handlerRLESave = this._handlerRLESave.bind(this);
        let handlerRules = this._handlerRules.bind(this);
        let handlerCanvasMousedown = this._handlerCanvasMousedown.bind(this);
        let handlerCanvasMousemove = this._handlerCanvasMousemove.bind(this);
        let handlerCanvasMouseup = this._handlerCanvasMouseup.bind(this);
        let handlerWindow = this._handlerWindow.bind(this);

        if (window.attachEvent) {
            this.elements.controls.run.attachEvent(
                EVENT_ON + EVENT_CLICK,
                handlerRun
            );
            this.elements.controls.step.attachEvent(
                EVENT_ON + EVENT_CLICK,
                handlerStep
            );
            this.elements.controls.clear.attachEvent(
                EVENT_ON + EVENT_CLICK,
                handlerClear
            );
            this.elements.controls.fpsRange.attachEvent(
                EVENT_ON + EVENT_INPUT,
                handlerFPS
            );
            this.elements.controls.fpsRange.attachEvent(
                EVENT_ON + EVENT_MOUSEUP,
                handlerFPS
            );
            this.elements.controls.grid.attachEvent(
                EVENT_ON + EVENT_CLICK,
                handlerGrid
            );
            this.elements.controls.rleInput.attachEvent(
                EVENT_ON + EVENT_CLICK,
                handlerRLEInput
            );
            this.elements.controls.rleLoad.attachEvent(
                EVENT_ON + EVENT_CLICK,
                handlerRLELoad
            );
            this.elements.controls.rleSave.attachEvent(
                EVENT_ON + EVENT_CLICK,
                handlerRLESave
            );
            this.elements.controls.rules.attachEvent(
                EVENT_ON + EVENT_BLUR,
                handlerRules
            );
            this.elements.canvas.attachEvent(
                EVENT_ON + EVENT_MOUSEDOWN,
                handlerCanvasMousedown
            );
            this.elements.canvas.attachEvent(
                EVENT_ON + EVENT_MOUSEMOVE,
                handlerCanvasMousemove
            );
            this.elements.canvas.attachEvent(
                EVENT_ON + EVENT_MOUSEUP,
                handlerCanvasMouseup
            );
            this.elements.canvas.attachEvent(
                EVENT_ON + EVENT_MOUSELEAVE,
                handlerCanvasMouseup
            );
            window.attachEvent(
                EVENT_ON + EVENT_FOCUS,
                handlerWindow
            );
            window.attachEvent(
                EVENT_ON + EVENT_BLUR,
                handlerWindow
            );
        }
        else {
            this.elements.controls.run.addEventListener(
                EVENT_CLICK,
                handlerRun
            );
            this.elements.controls.step.addEventListener(
                EVENT_CLICK,
                handlerStep
            );
            this.elements.controls.clear.addEventListener(
                EVENT_CLICK,
                handlerClear
            );
            this.elements.controls.fpsRange.addEventListener(
                EVENT_INPUT,
                handlerFPS
            );
            this.elements.controls.fpsRange.addEventListener(
                EVENT_MOUSEUP,
                handlerFPS
            );
            this.elements.controls.grid.addEventListener(
                EVENT_CLICK,
                handlerGrid
            );
            this.elements.controls.rleInput.addEventListener(
                EVENT_CLICK,
                handlerRLEInput
            );
            this.elements.controls.rleLoad.addEventListener(
                EVENT_CLICK,
                handlerRLELoad
            );
            this.elements.controls.rleSave.addEventListener(
                EVENT_CLICK,
                handlerRLESave
            );
            this.elements.controls.rules.addEventListener(
                EVENT_BLUR,
                handlerRules
            );
            this.elements.canvas.addEventListener(
                EVENT_MOUSEDOWN,
                handlerCanvasMousedown
            );
            this.elements.canvas.addEventListener(
                EVENT_MOUSEMOVE,
                handlerCanvasMousemove
            );
            this.elements.canvas.addEventListener(
                EVENT_MOUSEUP,
                handlerCanvasMouseup
            );
            this.elements.canvas.addEventListener(
                EVENT_MOUSELEAVE,
                handlerCanvasMouseup
            );
            window.addEventListener(
                EVENT_FOCUS,
                handlerWindow
            );
            window.addEventListener(
                EVENT_BLUR,
                handlerWindow
            );
        }
    }

    clear(redraw=true) {
        this.life.clear(true);
        this.clearCanvas();
        this._totalElapsed = 0;
    }

    clearCell(x, y) {
        this.fillCell(x, y, this.colours.background);
    }

    clearCanvas(redraw=true) {
        this._tempCanvas_ctx.fillStyle = this.colours.background;
        this._tempCanvas_ctx.fillRect(0, 0, this.width, this.height);
        if (this._gridOn) {
            this.drawGrid();
        }
        if (redraw) {
            this.draw();
        }
    }

    draw() {
        this._canvas_ctx.drawImage(this._tempCanvas, 0, 0);
    }

    drawCells() {
        let x, y;

        this.clearCanvas(false);

        for (y in this.life.cells) {
            for (x in this.life.cells[y]) {
                this.fillCell(x, y);
            }
        }

        if (this._gridOn) {
            this.drawGrid();
        }

        this.draw();
    }

    drawGrid() {
        this._tempCanvas_ctx.drawImage(this._grid, 0, 0);
    }

    fillCell(x, y, colour=null) {
        const cellSize = this.cellSize;
        this._tempCanvas_ctx.fillStyle = colour || this.colours.cell;
        this._tempCanvas_ctx.fillRect(
            (cellSize * x),
            (cellSize * y),
            cellSize,
            cellSize
        );
    }

    fillCellAtCursor(event) {
        this.fillCell(...this.getCursorPosition(event));
    }

    getCursorPosition(event) {
        const rect = this.elements.canvas.getBoundingClientRect();
        let x = Math.floor((event.clientX - rect.left) / this.cellSize);
        let y = Math.floor((event.clientY - rect.top) / this.cellSize);

        if (x < 0) {
            x = 0;
        }
        else if (x >= this.columns) {
            x = this.columns - 1;
        }

        if (y < 0) {
            y = 0;
        }
        else if (y >= this.rows) {
            y = this.rows - 1;
        }

        return {x, y};
    }

    newGrid(colour=null) {
        let colLines = this.columns - 1;
        let rowLines = this.rows - 1;
        let posX = this.cellSize;
        let posY = this.cellSize;
        let n, posXMod, posYMod;

        this._grid_ctx.clearRect(0, 0, this.width, this.height);

        this._grid_ctx.strokeStyle = colour || this.colours.grid;

        for (n = 0; n < colLines; n++) {
            posXMod = posX + 0.5;
            this._grid_ctx.beginPath();
            this._grid_ctx.moveTo(posXMod, 0);
            this._grid_ctx.lineTo(posXMod, this.height);
            this._grid_ctx.closePath();
            this._grid_ctx.stroke();
            posX += this.cellSize;
        }

        for (n = 0; n < rowLines; n++) {
            posYMod = posY + 0.5;
            this._grid_ctx.beginPath();
            this._grid_ctx.moveTo(0, posYMod);
            this._grid_ctx.lineTo(this.width, posYMod);
            this._grid_ctx.closePath();
            this._grid_ctx.stroke();
            posY += this.cellSize;
        }
    }

    nextGeneration() {
        this.life.nextGeneration();
    }

    pauseAnimation() {
        this._animating = false;
        this._paused = true;
    }

    readRLEString(RLEString, update=true) {
        this.life.readRLEString(RLEString);
        if (update) {
            this.drawCells();
            this.setControlValue('rleInput', RLEString);
            this.updateElements();
        }
    }

    rleString() {
        return this.life.rleString();
    }

    canvasImage() {
        return this.elements.canvas.toDataURL("image/png");
    }

    setDataInnerHTML(name, value) {
        this.elements.data[name].innerHTML = value;
    }

    setElementProp(group, name, prop, value) {
        this.elements[group][name][prop] = value;
    }

    setControlProp(name, prop, value) {
        this.setElementProp('controls', name, prop, value);
    }

    setControlValue(name, val) {
        this.setControlProp(name, 'value', val);
    }

    setButtonText(buttonName, text) {
        this.setControlProp(buttonName, 'innerHTML', text);
    }

    setCells(cells) {
        this.life.setCells(cells);
    }

    setCellsArray(cells) {
        this.life.setCellsArray(cells);
    }

    setCursorCell(event) {
        this.life.setCell(...this.getCursorPosition(event));
    }

    setFPS(fps, restart=true) {
        this._fps = fps;
        if (!this._paused && this._animating && restart) {
            this.stopAnimation();
            this.startAnimation();
        }
    }

    startAnimation(fps=0) {
        this._animating = true;
        this._paused = false;
        this._fpsInterval = 1000 / (fps || this._fps);
        this._timeThen = Date.now();
        this._timeStart = this._timeThen;
        if (this.life.generation == 0) {
            this._totalElapsed = 0;
            this.life.livingStart = this.life.living;
        }
        this._animate();
    }

    stepAnimation() {
        if (this.life.generation == 0) {
            this.life.livingStart = this.life.living;
        }
        if (this._animating) {
            this.stopAnimation();
        }
        else {
            this.nextGeneration();
            this.drawCells();
            this.updateElements();
        }
    }

    stopAnimation() {
        this._animating = false;
        this._paused = false;
    }

    updateElements() {
        this.setDataInnerHTML('gens', this.life.generation);
        this.setDataInnerHTML('living', this.life.living);
        this.setDataInnerHTML('livingStart', this.life.livingStart);
        this.setDataInnerHTML('livingMax', this.life.livingMax);
        this.setDataInnerHTML('livingMaxGen', this.life.livingMaxGen);
        this.setDataInnerHTML('fps', this._fps);
        this.setDataInnerHTML('pos', `${ this._lastPos.x }, ${ this._lastPos.y }`);
    }
}


//==============================================================================
// Utility Functions
//==============================================================================

function newElement(name, data={}) {
    let el = document.createElement(name || 'div');
    for (let k in data) {
        el[k] = data[k];
    }
    return el;
}


function newButton(id) {
    return newElement('button', {id: id});
}
