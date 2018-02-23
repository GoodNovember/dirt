export default class Coreography{
    constructor(){

        const self = this

        self.controllerDetectedCallback = null
        self.controllerAxisChangedCallback = null
        self.controllerButtonPressedCallback = null

        const controllers = {}

        self.controllers = controllers

        window.addEventListener("gamepaddisconnected", (event)=>{
            console.log("DISCONNECTED", event)
            if(self.controllerDisconnectedCallback){
                self.controllerDisconnectedCallback(event)
            }
        })

        window.addEventListener("gamepadconnected", (event)=>{
            const {gamepad} = event
            controllers[gamepad.index] = gamepad
            if(self.controllerDetectedCallback){
                self.controllerDetectedCallback(event)
            }
        })

        function activeGamepadsList(){
            const output = []

            const gamepadList = navigator.getGamepads()

            for(let index = 0; index < gamepadList.length; index++){
                let gamepad = gamepadList[index]
                if(gamepad){
                    output.push({index, gamepad})
                }
            }

            return output
        }

        function heartbeat(timestamp){

            var gps = activeGamepadsList()

            const allAxes = gps.map((gp)=>{
                return {
                    index:gp.index,
                    axes:gp.gamepad.axes
                }
            })
            const allButtons = gps.map((gp)=>{
                return {
                    index:gp.index,
                    buttons:gp.gamepad.buttons
                }
            })

            const activeAxes = allAxes.reduce((acc, item)=>{

                const controllerIndex = item.index

                item.axes.reduce((axisAcc, value, axisIndex)=>{
                    if(value !== 0){
                        axisAcc.push({
                            controllerIndex,
                            axisIndex,
                            value
                        })
                    }
                    return axisAcc
                },[]).map((activeAxis)=>{
                    acc.push(activeAxis)
                })

                return acc
            },[])

            const activeButtons = allButtons.reduce((acc, item)=>{
                const controllerIndex = item.index
                item.buttons.reduce((buttonAcc, btn, buttonIndex)=>{
                    const {value, pressed} = btn
                    if(value !== 0 || pressed){
                        buttonAcc.push({
                            controllerIndex,
                            buttonIndex,
                            pressed,
                            value
                        })
                    }
                    return buttonAcc
                },[]).map(activeButton => acc.push(activeButton))

                return acc
            },[])
            self.activeGamepads = gps
            self.activeAxes = activeAxes
            self.activeButtons = activeButtons

            requestAnimationFrame(heartbeat)
        }

        requestAnimationFrame(heartbeat)

    }
    getInputsForController(index){
        var output = {
            axes:[],
            buttons:[]
        }
        output.axes = this.activeAxes.reduce((acc, axis)=>{
            if(axis.controllerIndex === index){
                acc.push(axis)
            }
            return acc
        },[])
        output.buttons = this.activeButtons.reduce((acc, button)=>{
            if(button.controllerIndex === index){
                acc.push(button)
            }
            return acc
        },[])
        return output
    }
    controllerDetected(callback){
        if(typeof callback === "function"){
            this.controllerDetectedCallback = callback
        }else{
            this.controllerDetectedCallback = null
        }
    }
    controllerButtonPressed(callback){
        if(typeof callback === "function"){
            this.controllerButtonPressedCallback = callback
        }else{
            this.controllerButtonPressedCallback = null
        }
    }
    controllerAxisChanged(callback){
        if(typeof callback === "function"){
            this.controllerAxisChangedCallback = callback
        }else{
            this.controllerAxisChangedCallback = null
        }
    }
    controllerDisconnected(callback){

        console.log("DISCONNECT:", callback.gamepad)

        if(typeof callback === "function"){
            this.controllerDisconnectedCallback = callback
        }else{
            this.controllerDisconnectedCallback = null
        }
    }
}

//export default Mappings = new Map()

//Mappings.set("Xbox 360 Controller (STANDARD GAMEPAD Vendor: 045e Product: 028e)", new ControllerMapping("Xbox 360 Controller (STANDARD GAMEPAD Vendor: 045e Product: 028e)", ))

class ControllerMapping{
    constructor(name, map){
        const buttonMap = new Map()
    }
}