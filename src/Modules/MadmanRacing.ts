import utils from "../../node_modules/decentraland-ecs-utils/index"

let games = []
let x = new Vector3(1, 0, 0)
let y = new Vector3(0, 1, 0)
let z = new Vector3(0, 0, 1)

enum State {
    StartScreen,
    InGame
}

enum FieldLocation{
    Left,
    Right
}

function createCube(x: number, y: number, z: number) {
    const cube = new Entity()

    cube.addComponent(new Transform({ position: new Vector3(x, y, z) }))
    cube.addComponent(new BoxShape())
    engine.addEntity(cube)

    return cube
}


function createPlane(x: number, y: number, z: number) {
    const plane = new Entity()

    plane.addComponent(new Transform({ position: new Vector3(x, y, z) }))
    plane.addComponent(new PlaneShape())
    engine.addEntity(plane)

    return plane
}

function sumVec3(v1: Vector3, v2: Vector3){
    return new Vector3(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z)
}

function getPositionFromPivotRotation(angle: number, radius: number){
    return[
        parseFloat((radius * Math.cos(angle * Math.PI / 180)).toFixed(3)), 
        parseFloat((radius * Math.sin(angle * Math.PI / 180)).toFixed(3))
    ]
}

class GameObject{
    entity: Entity
    scale: Vector3
    parentPosition: Vector3
    initialPositionOffset: Vector3
    positionOffset: Vector3
    position: Vector3
    rotation: Vector3

    constructor (parentPosition: Vector3, positionOffset: Vector3, scale: Vector3){
        this.parentPosition = parentPosition
        this.positionOffset = positionOffset
        this.position = sumVec3(this.parentPosition, this.positionOffset)
        this.scale = scale
    }

    getTransform(){
        return this.entity.getComponent(Transform)
    }

    rotate(rotation: Vector3){
        let transform = this.entity.getComponent(Transform)
        let correctedOffsets

        correctedOffsets = getPositionFromPivotRotation(rotation.y, this.positionOffset.z)
        transform.rotate(y, rotation.y)
        transform.position.x = this.parentPosition.x + correctedOffsets[1]
        transform.position.z = this.parentPosition.z + correctedOffsets[0]

        this.positionOffset.x = correctedOffsets[1]
        this.positionOffset.z = correctedOffsets[0]
    }

    move(movement: number){
        let points = getPositionFromPivotRotation(this.rotation.y, this.initialPositionOffset.z)
        let x1 = this.parentPosition.x
        let y1 = this.parentPosition.z
        let x2 = this.parentPosition.x + points[1]
        let y2 = this.parentPosition.z + points[0]

        if(x2 - x1 == 0){
            this.entity.getComponent(Transform).position.x = this.parentPosition.x + points[1] + movement
            return
        }

        if(y2 - y1 == 0){
            this.entity.getComponent(Transform).position.z = this.parentPosition.z + points[0] + movement
            return
        }

        let m1 = (y2 - y1) / (x2 - x1)
        let m2 = -1 / m1
        let x3 = x2 + movement * Math.sqrt(1 / (1 + Math.pow(m2, 2)))
        let y3 = y2 + m2 * movement * Math.sqrt(1 / (1 + Math.pow(m2, 2)))

        this.entity.getComponent(Transform).position.x = x3
        this.entity.getComponent(Transform).position.z = y3
    }
}

export class MadmanRacingEnemy extends GameObject{
    static instanceCount: number = 0
    static texture = new Texture("Materials/MadmanRacing/BlueCar.png")
    static material = null

    id: number
    difficulty: number = 1
    difficultyThreshold: number = 10
    maxDifficulty: number = 5
    isMoving: boolean = false
    rotation: Vector3
    initialPositionOffset: Vector3 = new Vector3(-0.5, 2.5, 0.72)
    defaultTime: number = 2

    constructor (position: Vector3, rotation: Vector3) {
        super(position, new Vector3(-0.5, 2.5, 0.72), new Vector3(0.5, 0.5, 0.2))

        this.rotation = rotation

        this.id = MadmanRacingEnemy.instanceCount
        MadmanRacingEnemy.instanceCount = MadmanRacingEnemy.instanceCount + 1

        this.createEntity()
    }

    createEntity(){
        let pos = sumVec3(this.parentPosition, this.positionOffset)

        this.entity = createPlane(pos.x, pos.y, pos.z)
        this.entity.getComponent(Transform).scale = this.scale
        this.entity.addComponent(new utils.TriggerComponent(new utils.TriggerBoxShape(this.scale, Vector3.Zero()), 0))

        this.rotate(this.rotation)
        this.entity.getComponent(Transform).rotate(z, 180)

        if(MadmanRacingEnemy.material == null){
            MadmanRacingEnemy.material = new BasicMaterial()
            MadmanRacingEnemy.material.hasAlpha = true
            MadmanRacingEnemy.material.texture = MadmanRacingEnemy.texture
        }

        this.entity.addComponent(MadmanRacingEnemy.material)
    }

    animate(){
        if(Math.random() <= 0.4){
            this.move(-0.5)
        } else {
            this.move(0.5)
        }
        
        let origin = this.entity.getComponent(Transform).position
        let destination = new Vector3(origin.x, origin.y - 3, origin.z)
        let time = this.defaultTime / this.difficulty

        this.entity.addComponentOrReplace(
            new utils.MoveTransformComponent(
                origin, 
                destination, 
                time, 
                () => {
                    this.onMoveFinished()
                }
            )
        )
    }

    onMoveFinished(){
        this.resetPosition()

        this.difficultyThreshold -= 1

        if(this.difficultyThreshold <= 0){
            if(this.difficulty < this.maxDifficulty){
                this.difficulty += 0.5
            }

            this.difficultyThreshold = 10
        }

        if (this.isMoving == true){
            this.animate()
        }
    }

    start(){
        this.difficulty = 1
        this.difficultyThreshold = 10
        this.entity.getComponent(PlaneShape).visible = true
        this.isMoving = true
        this.animate()
    }

    stop(){
        this.entity.getComponent(PlaneShape).visible = false
        this.entity.removeComponent(utils.MoveTransformComponent)
        this.resetPosition()
        this.isMoving = false
    }

    resetPosition(){
        this.entity.getComponent(Transform).position = sumVec3(this.parentPosition, this.positionOffset)
    }
}

class PlayerObject extends GameObject{
    static texture = new Texture("Materials/MadmanRacing/OrangeCar.png")
    static material = null

    gameId: number
    fieldLocation: FieldLocation = FieldLocation.Left
    initialPositionOffset: Vector3 = new Vector3(-0.5, 0.4, 0.8)

    constructor (position: Vector3, gameId: number, rotation: Vector3){
        super(position, new Vector3(-0.5, 0.4, 0.8), new Vector3(0.5, 0.5, 1))

        this.rotation = rotation

        this.gameId = gameId
        this.entity = createPlane(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = this.scale
        this.rotate(rotation)
        this.entity.getComponent(Transform).rotate(z, 180)
        this.move(-0.5)

        if(PlayerObject.material == null){
            PlayerObject.material = new BasicMaterial()
            PlayerObject.material.hasAlpha = true
            PlayerObject.material.texture = PlayerObject.texture
        }

        this.entity.addComponent(PlayerObject.material)

        this.entity.addComponent(new utils.TriggerComponent(
            new utils.TriggerBoxShape(this.scale, Vector3.Zero()), //shape
            0, //layer
            0, //triggeredByLayer
            () => { //onTriggerEnter
                games[this.gameId].onGameOver()
            },
            null, //onTriggerExit
            null, // onCameraEnter 
            null, //onCameraExit
            false //enableDebug
        ))
    }

    show(){
        this.entity.getComponent(PlaneShape).visible = true
    }

    hide(){
        this.entity.getComponent(PlaneShape).visible = false
    }
}

class Background extends GameObject{
    static material
    color: Color3 = Color3.FromHexString("#555555")

    constructor (position: Vector3, rotation: Vector3){
        super(position, new Vector3(0, 1, 0.6), new Vector3(2, 2, 0.1))

        this.entity = createCube(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = this.scale

        this.rotate(rotation)

        if(Background.material == null){
            Background.material = new Material()
            Background.material.albedoColor = this.color
        }
        
        this.entity.addComponent(Background.material)
    }
}

class MidLine extends GameObject{
    static instanceCount: number = 0
    static material = null

    id: number
    color: Color3 = Color3.Yellow()
    isMoving: boolean

    constructor (position: Vector3, rotation: Vector3){
        super(position, new Vector3(0, 2.25, 0.72), new Vector3(0.1, 0.5, 0.01))

        this.id = MadmanRacingEnemy.instanceCount
        MidLine.instanceCount = MidLine.instanceCount + 1

        this.entity = createCube(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = this.scale
        this.rotate(rotation)

        if(MidLine.material == null){
            MidLine.material = new Material()
            MidLine.material.albedoColor = this.color
        }
        
        this.entity.addComponent(MidLine.material)
    }

    show(){
        this.entity.getComponent(BoxShape).visible = true
        this.isMoving = true
        this.move()
    }

    hide(){
        this.entity.getComponent(BoxShape).visible = false
        this.entity.removeComponent(utils.MoveTransformComponent)
        this.resetPosition()
        this.isMoving = false
    }

    move(){
        let origin = this.entity.getComponent(Transform).position
        let destination = new Vector3(origin.x, origin.y - 3, origin.z)

        this.entity.addComponentOrReplace(
            new utils.MoveTransformComponent(
                origin, destination, 
                0.5, 
                () => {
                    this.onMoveFinished()
                }
            )
        )
    }

    onMoveFinished(){
        this.resetPosition()

        if (this.isMoving == true){
            this.move()
        }
    }

    resetPosition(){
        this.entity.getComponent(Transform).position = sumVec3(this.parentPosition, this.positionOffset)
    }
}

class PlayFieldLimit extends GameObject{
    constructor (position: Vector3, rotation: Vector3){
        super(position, new Vector3(0, 0, 0), new Vector3(2, 0.1, 0.1))

        this.entity = createCube(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = this.scale
        this.rotate(rotation)
    }

    show(){
        this.entity.getComponent(BoxShape).visible = false
    }

    hide(){
        this.entity.getComponent(BoxShape).visible = false
    }
}

class GameScreen{
    parentPosition: Vector3

    constructor (position: Vector3){
        this.parentPosition = position
    }

    show(){}
    hide(){}
}

class StartText extends GameObject{
    static texture = new Texture("Materials/MadmanRacing/Start.png")
    static material = null

    constructor (position: Vector3, rotation: Vector3){
        super(position, new Vector3(0, 1, 0.8), new Vector3(1, 1, 1))

        this.rotation = rotation

        this.entity = createPlane(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = this.scale
        this.rotate(rotation)
        this.entity.getComponent(Transform).rotate(x, 180)

        if(StartText.material == null){
            StartText.material = new Material()
            StartText.material.hasAlpha = true
            StartText.material.albedoTexture = StartText.texture
            StartText.material.emissiveTexture = StartText.texture
            StartText.material.emissiveColor = Color3.Yellow()
            StartText.material.emissiveIntensity = 5
        }

        this.entity.addComponent(StartText.material)
    }

    show(){
        this.entity.getComponent(PlaneShape).visible = true
    }

    hide(){
        this.entity.getComponent(PlaneShape).visible = false
    }
}

class StartScreen extends GameScreen{
    startText: StartText

    constructor (position: Vector3, rotation: Vector3){
        super(position)
        this.startText = new StartText(position, rotation)
    }

    show(){
        this.startText.show()
    }

    hide(){
        this.startText.hide()
    }
}

class InGameScreen extends GameScreen{
    gameId: number
    player: PlayerObject
    playFieldLimit: PlayFieldLimit
    midLine: MidLine
    enemy: MadmanRacingEnemy

    constructor (position: Vector3, gameId: number, rotation: Vector3){
        super(position)
        this.gameId = gameId

        this.player = new PlayerObject(position, gameId, rotation)
        this.playFieldLimit = new PlayFieldLimit(position, rotation)
        this.midLine = new MidLine(position, rotation)
        this.enemy = new MadmanRacingEnemy(position, rotation)

        this.hide()
    }

    handleInput(){
        let movement

        if(this.player.fieldLocation == FieldLocation.Right){
            movement = -0.5
            this.player.fieldLocation = FieldLocation.Left
        } else {
            movement = 0.5
            this.player.fieldLocation = FieldLocation.Right
        }

        this.player.move(movement)
    }

    show(){
        this.player.show()
        this.playFieldLimit.show()
        this.midLine.show()
        this.enemy.start()
    }

    hide(){
        this.player.hide()
        this.playFieldLimit.hide()
        this.midLine.hide()
        this.enemy.stop()
    }
}

class SoundHandler{
    static audioClips = []
    parent: MadmanRacing
    soundEntities = []
    soundSources = []
    initialRotation: Vector3 = new Vector3(0, 90, 0)
    rotation: Vector3

    constructor (parent: MadmanRacing, rotation: Vector3){
        this.parent = parent

        let entity
        let parentTransform = parent.getTransform()
        let position = parent.getTransform().position
        let transform = new Transform()

        this.rotation = sumVec3(this.initialRotation, rotation)

        transform.position = new Vector3(position.x, position.y + 2, position.z - 1.5)
        transform.rotate(new Vector3(0, 1, 0), this.rotation.y)

        if (SoundHandler.audioClips.length <= 0){
            SoundHandler.init_clips()
        }

        for (let key in SoundHandler.audioClips){
            this.soundSources[key] = new AudioSource(SoundHandler.audioClips[key])

            entity = new Entity()
            entity.addComponent(transform)
            entity.addComponent(this.soundSources[key])

            engine.addEntity(entity)

            this.soundEntities[key] = entity
        }
    }

    static init_clips(){
        SoundHandler.audioClips["explosion"] = new AudioClip('Sounds/Explosion.wav')
        SoundHandler.audioClips["MadmanRacing"] = new AudioClip('Sounds/MadmanRacing.mp3')
    }

    playOnce(soundId: string){
        this.soundSources[soundId].playOnce()
    }

    loopPlay(soundId: string){
        let source = this.soundSources[soundId]

        source.playing = true
        source.loop = true
    }

    stop(soundId: string){
        this.soundSources[soundId].playing = false
    }
}

export class MadmanRacing {
    // General info
    static instanceCount: number = 0

    id: number
    position: Vector3
    initialRotation: Vector3 = new Vector3(0, 0, 0)
    rotation: Vector3
    defaultScale: Vector3 = new Vector3(0.6, 0.6, 0.7)
    gameState: State = State.StartScreen
    background: Background
    arcade: Entity
    soundHandler: SoundHandler

    // Screens
    startScreen: StartScreen
    inGameScreen: InGameScreen

    // InputHandler
    static inputHandlerTexture = new Texture("Materials/TransparentTexture.png")
    inputHandler: Entity
    inputHandlerScale: Vector3 = new Vector3(2, 2, 0.1)
    inputHandlerPositionOffset: Vector3 = new Vector3(0, 1, -0.3)

    constructor (position: Vector3, rotation: Vector3 = new Vector3(0, 0, 0), scale: Vector3 = new Vector3(0.6, 0.6, 0.7)) {
        let transform = new Transform()
        this.rotation = sumVec3(this.initialRotation, rotation)

        this.position = position

        transform.position = new Vector3(this.position.x, this.position.y, this.position.z)
        transform.position.y -= 1.35
        transform.scale = scale
        transform.rotation = Quaternion.Euler(this.rotation.x, this.rotation.y, this.rotation.z)

        this.position.y -= 0.1

        this.arcade = new Entity()
        this.arcade.addComponent(transform)
        this.arcade.addComponent(new GLTFShape("Models/Arcade.glb"))

        engine.addEntity(this.arcade)
        this.createGame(rotation)

        this.soundHandler = new SoundHandler(this, rotation)

        games[this.id] = this
    }

    getTransform(){
        return this.arcade.getComponent(Transform)
    }

    createGame(rotation: Vector3){
        this.id = MadmanRacing.instanceCount
        MadmanRacing.instanceCount = MadmanRacing.instanceCount + 1

        this.background = new Background(this.position, rotation)
        this.inGameScreen = new InGameScreen(this.position, this.id, rotation)
        this.createInputHandler()
        this.startScreen = new StartScreen(this.position, rotation)

        this.startScreen.show()
        this.changeState(State.StartScreen)
    }

    createInputHandler(){
        let pos = sumVec3(this.position, this.inputHandlerPositionOffset)

        this.inputHandler = createCube(pos.x, pos.y, pos.z)
        this.inputHandler.getComponent(Transform).scale = this.inputHandlerScale

        let material = new Material()
        material.hasAlpha = true
        material.albedoTexture = MadmanRacing.inputHandlerTexture

        this.inputHandler.addComponent(material)

        this.inputHandler.addComponent(
            new OnPointerUp(e => {
                this.handleInput(e)
            })
        )
    }

    handleInput(e: Event){
        if (this.gameState == State.StartScreen){
            this.handleStartScreenInput(e)
        } else{
            this.handleInGameInput(e)
        }
    }

    handleStartScreenInput(e: Event){
        this.soundHandler.loopPlay("MadmanRacing")
        this.startScreen.hide()
        this.inGameScreen.show()
        this.changeState(State.InGame)
    }

    handleInGameInput(e: Event){
        this.inGameScreen.handleInput()
    }

    changeState(state: State){
        this.gameState = state
    }

    onGameOver(){
        this.soundHandler.stop("MadmanRacing")
        this.soundHandler.playOnce("explosion")
        this.inGameScreen.hide()
        this.startScreen.show()
        this.changeState(State.StartScreen)
    }

    updateGame(){
        if(this.gameState != State.InGame) {
            return
        }
    }
}