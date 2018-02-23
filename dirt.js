import Choreography from "./choreography.js"

// this is designed for a screen that is 
// 67.3 in by 50.39 in
// format: 4:3 regularly but could also be 16:9

class Dirt{
    constructor(){

        const self = this

        self.element = document.createElement("canvas")
        self.gl = self.element.getContext("webgl")

    }
    createProgram(ingredients){

        const self = this

        const gl = self.gl

        return new Promise((resolve, reject)=>{
            const vertexFilePath = ingredients.vertex
            const fragmentFilePath = ingredients.fragment
            if(vertexFilePath && fragmentFilePath){
                var getBothFiles = [getFileAsString(vertexFilePath), getFileAsString(fragmentFilePath)]
                Promise.all(getBothFiles)
                .then((filesAsStrings)=>Promise.all([createShaderPart(gl.VERTEX_SHADER, filesAsStrings[0], vertexFilePath), createShaderPart(gl.FRAGMENT_SHADER, filesAsStrings[1], fragmentFilePath)]))
                .then((shaderParts)=>createShaderProgram(shaderParts[0], shaderParts[1]))
                .then((program)=>{
                    return new DirtyInterface(gl, program)
                })
                .then(resolve)
                .catch(reject)
            }else{
                reject("Please provide both a vertex and fragment path in the ingredints object.")
            }
        })

        function createShaderPart(type, source, filePath){
            return new Promise((resolve, reject)=>{
                const shader = gl.createShader(type)
                var isFragment = type === gl.FRAGMENT_SHADER
                var humanType = isFragment ? "fragment" : "vertex"
                gl.shaderSource(shader, source)
                gl.compileShader(shader)
                var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
                if(success){
                    resolve(shader)
                }else{
                    let error = gl.getShaderInfoLog(shader)
                    gl.deleteShader(shader)
                    reject({error, humanType, filePath})
                }
            })
        }

        function createShaderProgram(vertexShader, fragmentShader){
            return new Promise((resolve, reject)=>{
                const program = gl.createProgram()
                gl.attachShader(program, vertexShader)
                gl.attachShader(program, fragmentShader)
                gl.linkProgram(program)
                var success = gl.getProgramParameter(program, gl.LINK_STATUS)
                if(success){
                    resolve(program)
                }else{
                    var error = gl.getProgramInfoLog(program)
                    gl.deleteProgram(program)
                    reject(error)
                }
            })
        }

        function getFileAsString(path){
            return fetch(path).then(response=>response.text())
        }
    }
    static BrowserSupportsWebgl(){
        return window.WebGLRenderingContext ? true : false
    }
    static ToggleFullscreen(){
        if (!document.webkitFullscreenElement) {
            document.documentElement.webkitRequestFullscreen()
        } else {
          if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen()
          }
        }
    }
}

class DirtyInterface{
    constructor(gl, program){
        const attributeCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)
        const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
        const uniforms = {}
        const attributes = {}
        for(let i = 0; i < attributeCount; i++){
            let meta = gl.getActiveAttrib(program, i)
            let name = meta.name
            let location = gl.getAttribLocation(program, meta.name)
            let size = meta.size
            let ingredients = {name, meta, location, size}
            attributes[name] = new DirtyAttribute(gl, ingredients)
        }
        for(let i = 0; i < uniformCount; i++){
            let meta = gl.getActiveUniform(program, i)
            let name = meta.name
            let location = gl.getUniformLocation(program, meta.name)
            let size = meta.size
            let ingredients = {name, meta, location, size}
            uniforms[name] = new DirtyUniform(gl, ingredients)
        }
        this.gl = gl
        this.attributes = attributes
        this.uniforms = uniforms
        this.program = program
        this.dirtyCanvas = new DirtyCanvas(screen.width, screen.height)
        this.choreography = new Choreography()
        this.marker = new DirtyMarker()
    }
    pushFloatDataToActiveBuffer(dataArray){
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(dataArray), this.gl.STATIC_DRAW)
    }
    pushIntDataToActiveBuffer(dataArray){
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Int32Array(dataArray), this.gl.STATIC_DRAW)
    }
    createArrayBuffer(dontBindBuffer){
        const buffer = this.gl.createBuffer()
        if( ! dontBindBuffer){
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer)
        }
        return buffer
    }
    pushFloatDataToBuffer(buffer, dataArray){
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(dataArray), this.gl.STATIC_DRAW)
    }
    pushIntDataToBuffer(buffer, dataArray){
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Int32Array(dataArray), this.gl.STATIC_DRAW)
    }
    createStandardTexture(dontBindTexture){
        const texture = this.gl.createTexture()
        const gl = this.gl
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        return texture
    }
    isPowerOf2(value){
        return (value & (value - 1)) == 0
    }
    loadImage(path){
        return new Promise((resolve, reject)=>{
            var img = document.createElement("img")
            img.onload = (event)=>{
                resolve(img)
            }
            img.onerror = (event)=>{
                reject(event)
            }
            img.src = path
        })
    }
    loadVideo(path){
        return new Promise((resolve,reject)=>{
            var video = document.createElement("video")
            var interval = setInterval(()=>{
                if(video.readyState >= 3){
                    resolve(video)
                    clearInterval(interval)
                }
            }, 500)
            video.onerror = (error)=>{
                reject(error)
            }
            // video.oncanplay = (event)=>{
            //     resolve(video)
            // }
            video.src = path
        })
    }
    uploadToTexture(texture, somethingToRender){
          // Check if the image is a power of 2 in both dimensions.
        const gl = this.gl
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, somethingToRender)
        // if(somethingToRender instanceof HTMLImageElement){
        //     if(this.isPowerOf2(somethingToRender.width) && this.isPowerOf2(somethingToRender.height)){
        //         gl.generateMipmap(gl.TEXTURE_2D)
        //         console.log("IS POWER OF 2!")
        //     }else{
        //         console.log("Image Not Power of 2 in dimensions.")
        //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        //     }
        // }else if (somethingToRender instanceof HTMLVideoElement){
        //     if(this.isPowerOf2(somethingToRender.videoHeight) && this.isPowerOf2(somethingToRender.videoWidth)){
        //         gl.generateMipmap(gl.TEXTURE_2D)
        //     }else{
        //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        //     }
        // }else if (somethingToRender instanceof HTMLCanvasElement){
        //     if(this.isPowerOf2(somethingToRender.width) && this.isPowerOf2(somethingToRender.height)){
        //         gl.generateMipmap(gl.TEXTURE_2D)
        //     }else{
        //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        //     }
        // }
    }
    uploadToActiveTexture(somethingToRender){
        const gl = this.gl
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, somethingToRender);
    }
    sizeCanvasToCss(){
        const dpr = window.devicePixelRatio || 1
        const targetWidth = this.gl.canvas.clientWidth * dpr
        const targetHeight = this.gl.canvas.clientHeight * dpr
        if(this.gl.canvas.width !== targetWidth || this.gl.canvas.height !== targetHeight){
            this.gl.canvas.width = targetWidth
            this.gl.canvas.height = targetHeight
        }
    }
    degreesToRadians(degrees){
        return degrees * Math.PI / 180
    }
    radiansToDegrees(radians){
        return radians * 180 / Math.PI
    }
    clear(){
        this.gl.clear(this.gl.DEPTH_BUFFER_BIT | this.gl.COLOR_BUFFER_BIT)
    }
    drawTriangles(count){
        this.gl.drawArrays(this.gl.TRIANGLES, 0, count * 3)
    }
    updateResolution(){
        this.sizeCanvasToCss()
        var w = this.gl.canvas.width
        var h = this.gl.canvas.height
        this.gl.viewport(0,0,w,h)
    }
    drawRectangle(buffer, pointA, pointB, pointC, pointD){
        var pointOrder = [
            pointA, 
            pointB, 
            pointC, 

            pointC, 
            pointB, 
            pointD
        ]

        var pointData = pointOrder.reduce((acc, point)=>{
            acc.push(point.x)
            acc.push(point.y)
            if(typeof point.z === "number"){
                acc.push(point.z)
            }
            return acc
        },[])

        this.pushFloatDataToBuffer(buffer, pointData)
    }
}

class DirtyCanvas{
    constructor(width, height){
        const self = this
        self.element = document.createElement("canvas")
        self.ctx = self.element.getContext("2d")
    }
    size(newWidth, newHeight){
        const dpr = window.devicePixelRatio || 1

        const targetWidth = newWidth * dpr
        const targetHeight = newHeight * dpr

        if(this.element.width !== targetWidth || this.element.height !== targetHeight){
            this.element.width = targetWidth
            this.element.height = targetHeight
        }
    }
    clear(){
        this.ctx.clearRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height)
    }
    drawx(whatToDraw){
        const ctx = this.ctx

        ctx.beginPath()
        ctx.drawImage(whatToDraw, 0,0, 200, 200)
        ctx.fillText("WOOSH! HEY CANVAS!",32, 32)
        ctx.fill()
    }
    testPattern(whichTestPattern){
        const ctx = this.ctx

        ctx.beginPath()
        ctx.arc(ctx.canvas.width/2, ctx.canvas.height/2, ctx.canvas.height/2, 0, Math.PI * 2)
        ctx.moveTo(0,0)
        ctx.lineTo(ctx.canvas.width-1, 0.5)
        ctx.lineTo(ctx.canvas.width-1, ctx.canvas.height - 1)
        ctx.lineTo(0.5, ctx.canvas.height-1)
        ctx.lineTo(0,0)
        ctx.stroke()
    }
    draw(whatToDraw){
        // this.clear()
        const dpr = window.devicePixelRatio || 1.0

        const context = this.ctx

        let cvsW = context.canvas.width * dpr
        let cvsH = context.canvas.height * dpr

        let contentW = 0
        let contentH = 0

        let w = 0
        let h = 0
        let x = 0
        let y = 0

        let contentRatio = 1.0
        let canvasRatio = cvsW / cvsH
        
        let isSupportedElement = false

        if(whatToDraw){
            if(whatToDraw instanceof HTMLVideoElement){
                isSupportedElement = true
                contentW = whatToDraw.videoWidth
                contentH = whatToDraw.videoHeight
            }else if (whatToDraw instanceof HTMLImageElement){
                isSupportedElement = true
                contentW = whatToDraw.naturalWidth
                contentH = whatToDraw.naturalHeight
            }else if (whatToDraw instanceof HTMLCanvasElement){
                isSupportedElement = true
                contentW = whatToDraw.width
                contentH = whatToDraw.height
            }else{
                isSupportedElement = false
                console.log("Unhandled Element Type.", whatToDraw)
            }
            if(isSupportedElement){
                contentRatio = contentW / contentH
                if(contentRatio >= canvasRatio){
                    w = cvsW
                    h = w / contentRatio
                    y = (cvsH - h) / 2
                }else{
                    h = cvsH
                    w = h * contentRatio
                    x = (cvsW - w) / 2
                }
                context.drawImage(whatToDraw, x, y, w, h)
            }
        }
    }
}

class DirtyMarker{
    constructor(){
        const self = this
        this.element = document.createElement("canvas")
        this.element.classList.add("marker")
        this.ctx = this.element.getContext("2d")
        this.element.addEventListener("mousedown", (event)=>{
            self.markAt(event.x, event.y)
        })
        this.isEnabled = false
    }
    size(){
        const dpr = window.devicePixelRatio || 1
        const targetWidth = this.element.clientWidth * dpr
        const targetHeight = this.element.clientHeight * dpr
        if(this.element.width!== targetWidth || this.element.height !== targetHeight){
            this.element.width = targetWidth
            this.element.height = targetHeight
        }
    }
    toggle(){
        if(! this.isEnabled){
            this.enable()
        }else{
            this.disable()
        }
    }
    enable(){
        if(! this.isEnabled){
            this.isEnabled = true
            document.body.appendChild(this.element)
            this.size()
        }
    }
    disable(){
        if(this.isEnabled){
            this.isEnabled = false
            document.body.removeChild(this.element)
            this.size()
        }
    }
    clear(){
        if(this.isEnabled){
            this.ctx.clearRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height)
        }
    }
    markAt(x,y){
        const ctx = this.ctx
        ctx.beginPath()
        ctx.fillStyle = "rgba(255,0,255,.75)"
        ctx.arc(x,y,10,0,Math.PI*2)
        ctx.fill()
    }
}

class DirtyPart{
    constructor(gl, ingredients, major){

        const floatType = "f"
        const intType = "i"
        this.major = major
        this.name = ingredients.name
        this.size = ingredients.size
        this.location = ingredients.location

        const _labels_and_types = {
            "FLOAT":{
                type:floatType,
                size:1
            },
            "SAMPLER_2D":{
                type:"i",
                size:1,
            },
            "FLOAT_MAT2":{
                type:floatType,
                size:2,
                isMatrix:true,
            },
            "FLOAT_MAT3":{
                type:floatType,
                size:3,
                isMatrix:true
            },
            "FLOAT_MAT4":{
                type:floatType,
                size:4,
                isMatrix:true
            },
            "FLOAT_VEC2":{
                type:floatType,
                size:2
            },
            "FLOAT_VEC3":{
                type:floatType,
                size:3
            },
            "FLOAT_VEC4":{
                type:floatType,
                size:4
            },
            "HIGH_FLOAT":{
                type:floatType,
                size:1
            },
            "HIGH_INT":{
                type:intType,
                size:1,
            },
            "INT":{
                type:intType,
                size:1
            },
            "INT_VEC2":{
                type:intType,
                size:2
            },
            "INT_VEC3":{
                type:intType,
                size:3
            },
            "INT_VEC4":{
                type:intType,
                size:4
            },
            "LOW_FLOAT":{
                type:floatType,
                size:1
            },
            "LOW_INT":{
                type:intType,
                size:1
            },
            "MEDIUM_FLOAT":{
                type:floatType,
                size:1
            },
            "MEDIUM_INT":{
                type:intType,
                size:1
            }
        }
        const _reverseLookup = Object.keys(_labels_and_types).reduce((acc, label)=>{
            acc[gl[label]] = label
            return acc
        },{})
        this.gl = gl
        this.rawType = ingredients.meta.type
        this.type = _reverseLookup[this.rawType]
        // console.log("TYPE:", this.type, this.rawType, this, gl)
        
        var typeInfo = _labels_and_types[this.type]
        
        // console.log(`${this.major}:${this.location}[${this.name}] [${this.type}:${this.rawType}] [${typeInfo.size}]`)
        this.size = typeInfo.size
        this.isMatrix = typeInfo.isMatrix ? true : false
        this.location = ingredients.location
        this.simpleType = _labels_and_types[this.type].type
        if( ! this.simpleType){
            console.error("NO! Cannot do!")
        }
    }
}

class DirtyUniform extends DirtyPart{
    constructor(gl, ingredients){
        super(gl, ingredients, "uniform")
        if(this.isMatrix){
            if(this.size === 3){
                this.matrix = new DirtyMatrix2D(gl, this)
            }else if(this.size === 4){
                this.matrix = new DirtyMatrix3D(gl, this)
            }
        }
    }
    update(newData){

        const self = this
        const gl = this.gl

        if(self.isMatrix){
            return matrixMode(newData)
        }else{
            return standardMode(newData)
        }

        function standardMode(data){
            var theSize = self.size >= 1 ? self.size : ""
            var functionName = `uniform${theSize}${self.simpleType}v`
            if(typeof gl[functionName] === "function"){
                let outData = data
                if(Array.isArray(outData) === false){
                    outData = [data]
                }
                gl[functionName](self.location, outData)
            }else{
                console.error("Don't know how to perform this action:", functionName)
            }
        }

        function matrixMode(data){
            if(self.size && self.size > 2 && self.isMatrix){
                var shouldTranspose = false //must always be false... weird, i know.
                var functionString = `uniformMatrix${self.size}${self.simpleType}v`
                if(typeof gl[functionString] === "function"){
                    let typedArray = (self.simpleType === 'f') ? new Float32Array(data) : new Int32Array(data)
                    gl[functionString](self.location, shouldTranspose, typedArray)
                }else{
                    console.error("Don't know how to perform this action:", functionString)
                }
            }else{
                console.log("Cannot use the uniform matrix operation on a uniform with this many values.")
            }
        }

    }
}

class DirtyMatrix2D{
    constructor(gl, dirtyUniform){
        this.gl = gl
        this.dirtyUniform = dirtyUniform
        this.m = new Matrix3()
    }
    projection(width, height){
        this.m = this.m.projection(width, height)
        return this
    }
    scale(x,y){
        this.m = this.m.scale(x,y)
        return this
    }
    rotateDegrees(angleInDegrees){
        this.m = this.m.rotateDegrees(angleInDegrees)
        return this
    }
    rotateRadius(angleInRadians){
        this.m = this.m.rotateRadians(angleInRadians)
        return this
    }
    translate(x,y){
        this.m = this.m.translate(x,y)
        return this
    }
    bake(){
        this.dirtyUniform.update(this.m.data)
    }
}

class DirtyMatrix3D{
    constructor(gl, dirtyUniform){
        this.gl = gl
        this.dirtyUniform = dirtyUniform
        this.m = new Matrix4()
    }
    makeZtoWMatrix(fudgeFactor){
        this.m = new Matrix4([

        ])
    }
    scale(x,y,z){
        this.m = this.m.scale(x,y)
        return this
    }
    rotateX(angleInRadians){
        this.m = this.m.rotateX(angleInRadians)
        return this
    }
    rotateY(angleInRadians){
        this.m = this.m.rotateY(angleInRadians)
        return this
    }
    rotateZ(angleInRadians){
        this.m = this.m.rotateZ(angleInRadians)
        return this
    }
    translate(x,y,z){
        this.m = this.m.translate(x,y,z)
        return this
    }
    bake(){
        this.dirtyUniform.update(this.m.data)
    }
    orthographic(left, right, bottom, top, near, far, fudge){
        this.m = this.m.orthographic(left, right, bottom, top, near, far, fudge)
        return this
    }
    fov(fovRadians, aspect, near, far){
        this.m = this.m.fov(fovRadians, aspect, near, far)
        return this
    }
    projection(width, height, depth){
        this.m = this.m.projection(width, height, depth)
        return this
    }
}

class MathMatrix{
    constructor(depth){
        var identity = []
        for(let i = 0; i < depth; i++){
            identity.push(1)
            if(i+1 < depth){
                for(let j = 0; j < depth; j++){
                    identity.push(0)
                }
            }
        }
        this._identity = identity
        // console.log(identity)
    }
    get identity(){
        return this._identity
    }
}

class Matrix4 extends MathMatrix{
    constructor(dataArray){
        super(4)
        this.data = dataArray || this.identity
    }
    
    projection(width, height, depth, fudge){
        var w = 2/width
        var h = -2/height
        var d = 2/depth
        var f = fudge
        var data = [
            w,0,0,0,
            0,h,0,0,
            0,0,d,f,
           -1,1,1,1
        ]
        return new Matrix4(data)
    }
    fov(fovRadians, aspect, near, far){
        const fa = Math.tan(Math.PI * 0.5 - 0.5 * fovRadians)
        const rangeInverted = 1.0 / ( near - far )

        const w = fa / aspect
        const h = fa
        const d = (near + far) * rangeInverted
        const f = -1

        const x = 0
        const y = 0
        const z = (near * far * rangeInverted * 2)

        const data = [
            w,0,0,0,
            0,h,0,0,
            0,0,d,f,
            x,y,z,1
        ]
        return new Matrix4(data)
    }
    orthographic(left, right, bottom, top, near, far, fudge){

        const w = 2 / (right - left)
        const h = 2 / (top - bottom)
        const d = 2 / (near - far)

        const x = (left + right) / (left - right)
        const y = (bottom + top) / (bottom - top)
        const z = (near + far) / (near - far)

        const f = fudge

        const data = [
            w, 0, 0, 0,
            0, h, 0, 0,
            0, 0, d, f,
            x, y, z, 1
        ]

        return new Matrix4(data)
    }
    scale(x,y,z){
        return this.multiply([
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1
        ])
    }
    translate(x,y,z){
        return this.multiply([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            x, y, z, 1,
        ])
    }
    rotateX(radians){
        const c = Math.cos(radians)
        const s = Math.sin(radians)
        return this.multiply([
            1, 0, 0, 0,
            0, c, s, 0,
            0,-s, c, 0,
            0, 0, 0, 1,
        ])
    }
    rotateY(radians){
        const c = Math.cos(radians)
        const s = Math.sin(radians)
        return this.multiply([
            c, 0,-s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1,
        ])
    }
    rotateZ(radians){
        const c = Math.cos(radians)
        const s = Math.sin(radians)
        return this.multiply([
            c, s, 0, 0,
           -s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ])
    }
    cross(a,b){
        const a = this.data
        const b = otherData
        return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
        ]
    }
    subtractVectors(a,b){
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
    }
    normalize(v){
        var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        // make sure we don't divide by 0.
        if (length > 0.00001) {
          return [v[0] / length, v[1] / length, v[2] / length];
        } else {
          return [0, 0, 0];
        }
    }
    lookAt(target, up){

        var cameraPosition = [
            this.data[12],
            this.data[13],
            this.data[14]
        ]

        var zAxis = this.normalize(this.subtractVectors(cameraPosition, target))
        var xAxis = this.cross(up, zAxis)
        var yAxis = this.cross(zAxis, xAxis)
     
        return new Matrix4([
           xAxis[0], xAxis[1], xAxis[2], 0,
           yAxis[0], yAxis[1], yAxis[2], 0,
           zAxis[0], zAxis[1], zAxis[2], 0,
           cameraPosition[0],
           cameraPosition[1],
           cameraPosition[2],
           1,
        ])
    }
    inverse() {

        const m = this.data

        var m00 = m[0 * 4 + 0]
        var m01 = m[0 * 4 + 1]
        var m02 = m[0 * 4 + 2]
        var m03 = m[0 * 4 + 3]
        var m10 = m[1 * 4 + 0]
        var m11 = m[1 * 4 + 1]
        var m12 = m[1 * 4 + 2]
        var m13 = m[1 * 4 + 3]
        var m20 = m[2 * 4 + 0]
        var m21 = m[2 * 4 + 1]
        var m22 = m[2 * 4 + 2]
        var m23 = m[2 * 4 + 3]
        var m30 = m[3 * 4 + 0]
        var m31 = m[3 * 4 + 1]
        var m32 = m[3 * 4 + 2]
        var m33 = m[3 * 4 + 3]
        var tmp_0  = m22 * m33
        var tmp_1  = m32 * m23
        var tmp_2  = m12 * m33
        var tmp_3  = m32 * m13
        var tmp_4  = m12 * m23
        var tmp_5  = m22 * m13
        var tmp_6  = m02 * m33
        var tmp_7  = m32 * m03
        var tmp_8  = m02 * m23
        var tmp_9  = m22 * m03
        var tmp_10 = m02 * m13
        var tmp_11 = m12 * m03
        var tmp_12 = m20 * m31
        var tmp_13 = m30 * m21
        var tmp_14 = m10 * m31
        var tmp_15 = m30 * m11
        var tmp_16 = m10 * m21
        var tmp_17 = m20 * m11
        var tmp_18 = m00 * m31
        var tmp_19 = m30 * m01
        var tmp_20 = m00 * m21
        var tmp_21 = m20 * m01
        var tmp_22 = m00 * m11
        var tmp_23 = m10 * m01
    
        var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) - (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
        var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) - (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
        var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) - (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
        var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) - (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);
    
        var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);
    
        return new Matrix4([
          d * t0,
          d * t1,
          d * t2,
          d * t3,
          d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) - (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
          d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) - (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
          d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) - (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
          d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) - (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
          d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) - (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
          d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) - (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
          d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) - (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
          d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) - (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
          d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) - (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
          d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) - (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
          d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) - (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
          d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) - (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
        ])
    }
    get cameraPosition(){
        return [
            this.data[12],
            this.data[13],
            this.data[14]
        ]
    }
    multiply(otherData){
        const a = this.data
        const b = otherData
        return new Matrix4([
            (b[ 0] * a[0]) + (b[ 1] * a[4]) + (b[ 2] * a[ 8]) + (b[ 3] * a[12]),
            (b[ 0] * a[1]) + (b[ 1] * a[5]) + (b[ 2] * a[ 9]) + (b[ 3] * a[13]),
            (b[ 0] * a[2]) + (b[ 1] * a[6]) + (b[ 2] * a[10]) + (b[ 3] * a[14]),
            (b[ 0] * a[3]) + (b[ 1] * a[7]) + (b[ 2] * a[11]) + (b[ 3] * a[15]),
            (b[ 4] * a[0]) + (b[ 5] * a[4]) + (b[ 6] * a[ 8]) + (b[ 7] * a[12]),
            (b[ 4] * a[1]) + (b[ 5] * a[5]) + (b[ 6] * a[ 9]) + (b[ 7] * a[13]),
            (b[ 4] * a[2]) + (b[ 5] * a[6]) + (b[ 6] * a[10]) + (b[ 7] * a[14]),
            (b[ 4] * a[3]) + (b[ 5] * a[7]) + (b[ 6] * a[11]) + (b[ 7] * a[15]),
            (b[ 8] * a[0]) + (b[ 9] * a[4]) + (b[10] * a[ 8]) + (b[11] * a[12]),
            (b[ 8] * a[1]) + (b[ 9] * a[5]) + (b[10] * a[ 9]) + (b[11] * a[13]),
            (b[ 8] * a[2]) + (b[ 9] * a[6]) + (b[10] * a[10]) + (b[11] * a[14]),
            (b[ 8] * a[3]) + (b[ 9] * a[7]) + (b[10] * a[11]) + (b[11] * a[15]),
            (b[12] * a[0]) + (b[13] * a[4]) + (b[14] * a[ 8]) + (b[15] * a[12]),
            (b[12] * a[1]) + (b[13] * a[5]) + (b[14] * a[ 9]) + (b[15] * a[13]),
            (b[12] * a[2]) + (b[13] * a[6]) + (b[14] * a[10]) + (b[15] * a[14]),
            (b[12] * a[3]) + (b[13] * a[7]) + (b[14] * a[11]) + (b[15] * a[15])
        ])
    }
}

class Matrix3 extends MathMatrix{
    constructor(dataArray){
        super(3)
        this._data = dataArray || this.identity
    }
    projection(width, height){
        var w = 2/width
        var h = -2/height
        var data = [
            w,0,0,
            0,h,0,
           -1,1,1
        ]
        return new Matrix3(data)
    }
    scale(x, y){
        return this.multiply([
            x, 0, 0,
            0, y, 0,
            0, 0, 1
        ])
    }
    rotateRadians(angleInRadians){
        const c = Math.cos(angleInRadians)
        const s = Math.sin(angleInRadians)
        return this.multiply([
            c, -s,  0,
            s,  c,  0,
            0,  0,  1
        ])
    }
    rotateDegrees(angleInDegrees){
        return this.rotateRadians(angleInDegrees * (Math.PI / 180))
    }
    translate(x, y){
        return this.multiply([
            1, 0, 0,
            0, 1, 0,
            x, y, 1,
        ])
    }
    multiply(rawData){
        const a = this._data
        const b = rawData
        return new Matrix3([
            (b[0] * a[0]) + (b[1] * a[3]) + (b[2] * a[6]),
            (b[0] * a[1]) + (b[1] * a[4]) + (b[2] * a[7]),
            (b[0] * a[2]) + (b[1] * a[5]) + (b[2] * a[8]),
            (b[3] * a[0]) + (b[4] * a[3]) + (b[5] * a[6]),
            (b[3] * a[1]) + (b[4] * a[4]) + (b[5] * a[7]),
            (b[3] * a[2]) + (b[4] * a[5]) + (b[5] * a[8]),
            (b[6] * a[0]) + (b[7] * a[3]) + (b[8] * a[6]),
            (b[6] * a[1]) + (b[7] * a[4]) + (b[8] * a[7]),
            (b[6] * a[2]) + (b[7] * a[5]) + (b[8] * a[8])
        ])
    }
    get data(){
        return this._data
    }
}

class DirtyAttribute extends DirtyPart{
    constructor(gl, ingredients){
        super(gl, ingredients, "attribute")
    }
    update(newData){
        this.gl[`vertexAttrib${this.size}${this.simpleType}v`](this.location, newData)
    }
    watchBuffer(buffer, shouldNormalize, perNode, stride, offset){
        const gl = this.gl

        var varSize = this.size === "" ? 1 : this.size
        var type = null
        if(this.simpleType === "f"){
            type = gl.FLOAT
        }else if(this.simpleType === "i"){
            type = gl.INT
        }

        const ELEMENTS_PER_NODE = perNode
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.vertexAttribPointer(this.location, ELEMENTS_PER_NODE, type, shouldNormalize, stride, offset)
        gl.enableVertexAttribArray(this.location)
    }
    watchActiveBuffer(shouldNormalize, stride, offset){
        var varSize = this.size === "" ? 1 : this.size
        var type = null
        if(this.simpleType === "f"){
            type = this.gl.FLOAT
        }else if (this.simpleType === "i"){
            type = this.gl.INT
        }

        var ELEMENTS_PER_NODE = 3 

        this.gl.vertexAttribPointer(this.location, ELEMENTS_PER_NODE, type, shouldNormalize, stride, offset)
        this.gl.enableVertexAttribArray(this.location)
    }
    ignoreActiveBuffer(){
        this.gl.disableVertexAttribArray(this.location)
    }
}

class DirtyMedia{
    constructor(mediaElement){
        const self = this
        self.element = mediaElement

        self.setup(mediaElement)
        self.isPlaying = false
        self.isPaused = false
        self.isStopped = false

        self.element.addEventListener("play", (event)=>{
            self.isPlaying = true
            self.isPaused = false
            self.isStopped = false
        })

        self.element.addEventListener("pause", (event)=>{
            self.isPlaying = false
            self.isPaused = true
            self.isStopped = true
        })

        self.element.addEventListener("stop", (event)=>{
            self.isPlaying = false
            self.isStopped = true
        })

    }

    setup(mediaElement){
        const self = this
        self.isVideo = mediaElement instanceof HTMLVideoElement
        self.isImage = mediaElement instanceof HTMLImageElement
        self.isAudio = mediaElement instanceof HTMLAudioElement
        self.isCanvas = mediaElement instanceof HTMLCanvasElement
        self.isVisual = self.isVideo || self.isImage || self.isCanvas
        self.isTimeBased = self.isVideo || self.isAudio
    }

    get width(){
        if(this.isVideo){
            return this.element.videoWidth
        }
        if(this.isImage){
            return this.element.naturalWidth
        }
        if(this.isAudio){
            return null
        }
        if(this.isCanvas){
            return this.element.width
        }
    }
    get height(){
        if(this.isVideo){
            return this.element.videoHeight
        }
        if(this.isImage){
            return this.element.naturalHeight
        }
        if(this.isAudio){
            return null
        }
        if(this.isCanvas){
            return this.element.height
        }
    }
    play(){
        if(this.isTimeBased && ( ! this.isPlaying )){
            this.element.play()
        }
    }

}

export default Dirt