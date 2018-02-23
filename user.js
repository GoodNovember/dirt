import Dirt from "./dirt.js"
import Coreography from "./choreography.js";

const MediaResolutionMultiplier = 3

let MEDIA_W = 400
let MEDIA_H = 300
let MEDIA_D = -360

const MEDIA_STATE = {
    isPlayable:false,
    isPlaying:false,
    isPaused:false,
    isValid:false,
    isLoaded:false,
}

let MediaController = null

const STANDARD_FORMAT = {
    w:400,
    h:300
}

const WIDESCREEN_FORMAT = {
    w:1600,
    h:900
}

const SELECTED_FORMAT = STANDARD_FORMAT

let activeMedia = null

let rectangleSetter = null

const speed = 10

let fullScreenCallback = null

const movement = {
    z:1,
    x:1,
    y:1,
    rx:0,
    ry:0,
    rz:0,
}

function resetMovement(){
    movement.z = 1
    movement.x = 1
    movement.y = 1
    movement.rx = 0
    movement.ry = 0
    movement.rz = 0
}

// document.addEventListener("keydown", (event)=>{
//     console.log("K", event.code)
//     if(event.code === "ArrowRight"){
//         movement.x += speed
//     }
//     if(event.code === "ArrowUp"){
//         movement.z += speed
//     }
//     if(event.code === "ArrowLeft"){
//         movement.x -= speed
//     }
//     if(event.code === "ArrowDown"){
//         movement.z -= speed
//     }
// })

if(Dirt.BrowserSupportsWebgl()){
    var D = new Dirt()

    const vertex = "./shader/regular.vertex.glsl"
    const fragment = "./shader/regular.fragment.glsl"

    D.createProgram({vertex,fragment}).then((dirtInterface)=>{
        console.log("INTERFACE:", dirtInterface)
        const {gl, program, attributes, uniforms, choreography} = dirtInterface

        document.addEventListener('keydown', (event)=>{

            var mod = 1;
            let isRotateMode = event.altKey

            if(event.shiftKey){
                mod = 10
            }

            let rotAmmount = dirtInterface.degreesToRadians(0.25)

            switch(event.code){
                case 'KeyF':{
                    Dirt.ToggleFullscreen()
                    break;
                }
                case 'KeyM':{
                    dirtInterface.marker.toggle()
                    break;
                }
                case 'KeyQ':{
                    movement.z += 1 * mod
                    break;
                }
                case 'KeyZ':{
                    movement.z -= 1 * mod
                    break;
                }
                case 'ArrowUp':
                case 'KeyW':{
                    if(isRotateMode){
                        movement.rx -= rotAmmount * mod
                    }else{
                        movement.y -= 1 * mod
                    }
                    break;
                }
                case 'ArrowLeft':
                case 'KeyA':{
                    if(isRotateMode){
                        movement.ry -= rotAmmount * mod
                    }else if(event.metaKey){
                        movement.rz -= rotAmmount * mod
                    }else{
                        movement.x += 1 * mod
                    }

                    break;
                }
                case 'ArrowDown':
                case 'KeyS':{
                    if(isRotateMode){
                        movement.rx += rotAmmount * mod
                    }else{
                        movement.y += 1 * mod
                    }
                    break;
                }
                case 'ArrowRight':
                case 'KeyD':{
                    if(isRotateMode){
                        movement.ry += rotAmmount * mod
                    }else if(event.metaKey){
                        movement.rz += rotAmmount * mod
                    }else{
                        movement.x -= 1 * mod
                    }
                    break;
                }
                case 'Space':{
                    if(MediaController){
                        MediaController.toggle()
                    }else{
                        console.log(MediaController)
                    }
                }
                case 'Enter':{
                    if(event.metaKey){
                        resetMovement()
                    }
                }
                default:{
                    console.log(event.code)
                }
            }
        })

        dirtInterface.dirtyCanvas.size(SELECTED_FORMAT.w * MediaResolutionMultiplier, SELECTED_FORMAT.h * MediaResolutionMultiplier)

        gl.useProgram(program)

        document.body.appendChild(dirtInterface.gl.canvas)

        const textureCoordinateBuffer = dirtInterface.createArrayBuffer()

        attributes.textureCoordinates.watchBuffer(textureCoordinateBuffer, false, 2, 0, 0)

        dirtInterface.pushFloatDataToBuffer(textureCoordinateBuffer, [
            1,1,0,1,
            1,0,1,0,
            0,1,0,0
        ])

        const standardTexture = dirtInterface.createStandardTexture()

        const positionBuffer = dirtInterface.createArrayBuffer()
        attributes.position.watchActiveBuffer(false, 0, 0)

        dirtInterface.loadVideo("./media/jelly.m4v").then((video)=>{
            activeMedia = video
            MediaController = MediaControl(video)
        })

        function heartbeat(timestamp){

            var bip = timestamp/1000

            dirtInterface.updateResolution()

            var inputs = choreography.getInputsForController(0)

            inputs.axes.map((axis)=>{
                if(axis.axisIndex === 0){
                    movement.x -= axis.value * 10
                }
                if(axis.axisIndex === 1){
                    movement.y += axis.value * 10
                }
                if(axis.axisIndex === 2){
                    movement.ry += axis.value / 10
                }
                if(axis.axisIndex === 3){
                    movement.rx += axis.value / 10
                }
            })

            inputs.buttons.map((button)=>{
                switch(button.buttonIndex){
                    case 6:{ // trigger L
                        movement.z += button.value * 10 // trigger
                        break;
                    }
                    case 7:{ // trigger R
                        movement.z -= button.value * 10
                        break;
                    }
                    case 16:{ // xbox button
                        resetMovement()
                        break;
                    }
                    case 3:{ // Y button
                        dirtInterface.marker.enable()
                        break;
                    }
                    case 1:{ // B button
                        dirtInterface.marker.disable()
                        break;
                    }
                    case 0:{ // A button

                    }
                    case 2:{ // X button

                    }
                    case 4:{ // L1

                    }
                    case 5:{ // L2

                    }
                    case 9:{ // start button

                    }
                    case 8:{ // back button

                    }
                    case 10:{ // Left Click

                    }
                    case 11:{ // right click

                    }
                    case 13:{ // dDown

                    }
                    case 12:{ // dUp

                    }
                    case 14:{ // dLeft

                    }
                    case 15:{ // dRight

                    }
                    default:{
                        console.log(button)
                    }
                }
            })

            dirtInterface.drawRectangle(positionBuffer, 
                {x:SELECTED_FORMAT.w, y:0, z:MEDIA_D}, // top right point
                {x:0, y:0, z:MEDIA_D}, // top left point
                {x:SELECTED_FORMAT.w, y:SELECTED_FORMAT.h, z:MEDIA_D}, // bottom right point.
                {x:0, y:SELECTED_FORMAT.h, z:MEDIA_D}, // bottom left point.
            )

            uniforms.matrix.matrix
                .fov(dirtInterface.degreesToRadians(60), gl.canvas.clientWidth / gl.canvas.clientHeight, 1, 2000)
                .translate(movement.x, movement.y, movement.z)
                .rotateX(movement.rx)
                .rotateY(movement.ry)
                .rotateZ(movement.rz)
                .translate(-(SELECTED_FORMAT.w/2), -(SELECTED_FORMAT.h/2), 0)
                .bake()

            if(activeMedia){
                dirtInterface.dirtyCanvas.draw(activeMedia)
                dirtInterface.uploadToTexture(standardTexture, dirtInterface.dirtyCanvas.element)
            }else{
                dirtInterface.dirtyCanvas.testPattern()
            }

            dirtInterface.drawTriangles(2)

            requestAnimationFrame(heartbeat)

        }

        requestAnimationFrame(heartbeat)

        function playMedia(media){
            
        }

        function MediaControl(media){

            function play(){
                if(isPlayable() && media.paused){
                    media.play()
                }
            }

            function pause(){
                if(isPlayable() && ! media.paused){
                    media.pause()
                }
            }

            function stop(){
                if(isPlayable() && ! media.paused){
                    if(media.paused){
                        media.pause()
                    }
                    media.currentTime = 0
                }
            }

            function seekTo(newTime){
                if(isPlayable()){
                    media.currentTime = newTime
                }
            }

            function toggle(){
                if(isPlayable()){
                    if(media.paused){
                        play()
                    }else{
                        pause()
                    }
                }
            }

            function isPlayable(){
                return (media instanceof HTMLAudioElement || media instanceof HTMLVideoElement) && isLoadedEnough()
            }

            function isVisible(){
                return media instanceof HTMLVideoElement || media instanceof HTMLCanvasElement || media instanceof HTMLImageElement
            }

            function isLoadedEnough(){
                return media.readyState >= 3
            }

            return {
                play,
                pause,
                stop,
                seekTo,
                toggle,
            }
        }

    }).catch((error)=>{

        console.error("Oh no!", error)

    })

}else{
    console.log("Hmmm. This browser does not support webgl.")
    console.log("If in chrome, try to go to: chrome://gpu to see what's up.")
}