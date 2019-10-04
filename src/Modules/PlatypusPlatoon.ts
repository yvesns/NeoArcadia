import utils from "../../node_modules/decentraland-ecs-utils/index"

let x = new Vector3(1, 0, 0)
let y = new Vector3(0, 1, 0)
let z = new Vector3(0, 0, 1)

function createCube(x: number, y: number, z: number) {
    const cube = new Entity()

    cube.addComponent(new Transform({ position: new Vector3(x, y, z) }))
    cube.addComponent(new BoxShape())
    engine.addEntity(cube)

    return cube
}

function createEmptyEntity(position: Vector3) {
    let pos = new Vector3(position.x, position.y, position.z)
    const entity = new Entity()

    entity.addComponent(new Transform({position: pos}))
    engine.addEntity(entity)

    return entity
}

function createPlane(x: number, y: number, z: number) {
    const plane = new Entity()

    plane.addComponent(new Transform({ position: new Vector3(x, y, z) }))
    plane.addComponent(new PlaneShape())
    engine.addEntity(plane)

    return plane
}

function createText(text: string, position: Vector3){
    let pos = new Vector3(position.x, position.y, position.z)
    let entity = new Entity()

    entity.addComponent(new Transform({ position: pos }))
    entity.addComponent(new TextShape(text))
    engine.addEntity(entity)

    return entity
}

function createGTLFShape(path: string, position: Vector3){
    let pos = new Vector3(position.x, position.y, position.z)
    let entity = new Entity()

    entity.addComponent(new Transform({position: pos}))
    entity.addComponent(new GLTFShape(path))
    engine.addEntity(entity)

    return entity
}

function sumVec3(v1: Vector3, v2: Vector3){
    return new Vector3(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z)
}

function mulVec3(v1: Vector3, v2: Vector3){
    return new Vector3(v1.x * v2.x, v1.y * v2.y, v1.z * v2.z)
}

function getPositionFromPivotRotation(angle: number, radius: number){
    return[
        parseFloat((radius * Math.cos(angle * Math.PI / 180)).toFixed(3)), 
        parseFloat((radius * Math.sin(angle * Math.PI / 180)).toFixed(3))
    ]
}

function getDistanceBetweenPoints(p1: Vector2, p2: Vector2){
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

class GameObject{
    parent: PlatypusPlatoon
    entity: Entity
    scale: Vector3
    initialPositionOffset: Vector3
    positionOffset: Vector3
    position: Vector3
    distanceFromOrigin: number
    messageBus: MessageBus = new MessageBus()
    shape

    constructor (parent: PlatypusPlatoon, positionOffset: Vector3){
        this.parent = parent
        this.initialPositionOffset = positionOffset
        this.positionOffset = positionOffset
        this.position = sumVec3(this.parent.getPosition(), this.positionOffset)
    }

    getCorrectedPoint(p: Vector2){
        let parentPosition = this.parent.getPosition()
        let center = new Vector2(parentPosition.x, parentPosition.z)
        let radius = getDistanceBetweenPoints(center, p)
        let pAngle = Math.atan2(p.y - center.y, p.x - center.x)
        pAngle = pAngle / (Math.PI / 180)

        return getPositionFromPivotRotation(-this.parent.getRotation().y + pAngle, radius)
    }

    pivotRotate(rotation: Vector3){
        let parentPosition = this.parent.getPosition()
        let transform = this.entity.getComponent(Transform)
        let correctedOffsets

        let p1 = new Vector2(parentPosition.x, parentPosition.z)
        let p2 = new Vector2(parentPosition.x + this.positionOffset.x, parentPosition.z + this.positionOffset.z)
        let radius = getDistanceBetweenPoints(p1, p2)
        let p2Angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)
        p2Angle = p2Angle / (Math.PI / 180)
        correctedOffsets = getPositionFromPivotRotation(-rotation.y + p2Angle, radius)

        //transform.rotate(y, rotation.y)
        transform.rotation = Quaternion.Euler(0, rotation.y, 0)
        transform.position.x = parentPosition.x + correctedOffsets[0]
        transform.position.z = parentPosition.z + correctedOffsets[1]
    }

    moveAlongTangent(movement: number){
        let parentPosition = this.parent.getPosition()

        let p1 = new Vector2(parentPosition.x, parentPosition.z)
        let p2 = new Vector2(parentPosition.x + this.positionOffset.x, parentPosition.z + this.positionOffset.z)
        let radius = getDistanceBetweenPoints(p1, p2)

        let points = getPositionFromPivotRotation(this.parent.getRotation().y, radius)

        //let points = getPositionFromPivotRotation(this.parent.getRotation().y, this.initialPositionOffset.z)
        let x1 = parentPosition.x
        let y1 = parentPosition.z
        let x2 = parentPosition.x + points[1]
        let y2 = parentPosition.z + points[0]

        if(x2 - x1 == 0){
            this.entity.getComponent(Transform).position.x = parentPosition.x + points[1] + movement
            return
        }

        if(y2 - y1 == 0){
            this.entity.getComponent(Transform).position.z = parentPosition.z + points[0] + movement
            return
        }

        let m1 = (y2 - y1) / (x2 - x1)
        let m2 = -1 / m1
        let x3 = x2 + movement * Math.sqrt(1 / (1 + Math.pow(m2, 2)))
        let y3 = y2 + m2 * movement * Math.sqrt(1 / (1 + Math.pow(m2, 2)))

        this.entity.getComponent(Transform).position.x = x3
        this.entity.getComponent(Transform).position.z = y3
    }

    getEntity(){
        return this.entity
    }

    getPosition(){
        return this.entity.getComponent(Transform).position
    }

    show(){
        this.entity.getComponent(this.shape).visible = true
    }

    hide(){
        this.entity.getComponent(this.shape).visible = false
    }

    isVisible(){
        return this.entity.getComponent(this.shape).visible
    }
}

class Arcade extends GameObject{
    static defaultPositionOffset: Vector3 = new Vector3(0, -1.35, 0)
    static defaultScale: Vector3 = new Vector3(0.6, 0.6, 0.7)
    background: Background

    constructor(parent: PlatypusPlatoon){
        super(parent, Arcade.defaultPositionOffset)

        this.shape = GLTFShape
        this.entity = createGTLFShape("Models/PlatypusArcade.glb", this.position)
        this.entity.getComponent(Transform).scale = mulVec3(this.parent.getScale(), Arcade.defaultScale)

        this.pivotRotate(parent.getRotation())

        this.background = new Background(parent)
    }
}

class Background extends GameObject{
    static defaultPositionOffset: Vector3 = new Vector3(0, 0.9, 0.66)
    static defaultScale: Vector3 = new Vector3(2, 2, 0.1)

    color: Color3 = Color3.FromHexString("#555555")

    constructor (parent: PlatypusPlatoon){
        super(parent, Background.defaultPositionOffset)

        this.entity = createCube(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = Background.defaultScale

        this.pivotRotate(parent.getRotation())

        let material = new Material()
        material.albedoColor = this.color
        
        this.entity.addComponent(material)
    }
}

class StartText extends GameObject{
    static defaultPositionOffset: Vector3 = new Vector3(0, 0.8, 0.8)
    static defaultScale: Vector3 = new Vector3(1, 1, 1)
    static texture = new Texture("Materials/PlatypusPlatoon/StartPlatypus.png")
    static material = null

    constructor (parent: PlatypusPlatoon){
        super(parent, StartText.defaultPositionOffset)

        if(StartText.material == null){
            StartText.material = new Material()
            StartText.material.hasAlpha = true
            StartText.material.albedoTexture = StartText.texture
            StartText.material.emissiveTexture = StartText.texture
            StartText.material.emissiveColor = Color3.Green()
            StartText.material.emissiveIntensity = 5
        }

        this.shape = PlaneShape
        this.entity = createPlane(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = StartText.defaultScale
        this.pivotRotate(parent.getRotation())
        this.entity.getComponent(Transform).rotate(x, 180)
        this.entity.addComponent(StartText.material)
    }
}

class ScreenInputHandler extends GameObject{
    static defaultPositionOffset: Vector3 = new Vector3(0, 0.9, 0.66)
    static defaultScale: Vector3 = new Vector3(2, 2, 0.1)
    static texture = new Texture("Materials/TransparentTexture.png")
    static material = null

    constructor(parent: PlatypusPlatoon){
        super(parent, ScreenInputHandler.defaultPositionOffset)

        if(ScreenInputHandler.material == null){
            ScreenInputHandler.material = new Material()
            ScreenInputHandler.material.hasAlpha = true
            ScreenInputHandler.material.albedoTexture = ScreenInputHandler.texture
        }

        this.shape = BoxShape
        this.entity = createCube(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = ScreenInputHandler.defaultScale
        this.pivotRotate(parent.getRotation())

        this.entity.addComponent(ScreenInputHandler.material)

        this.entity.addComponent(
            new OnPointerUp(e => {
                if(this.isVisible()){
                    parent.handleStartScreenInput()
                }
            })
        )
    }
}

class GameScreen{
    parent: PlatypusPlatoon

    constructor (parent: PlatypusPlatoon){
        this.parent = parent
    }

    show(){}
    hide(){}
}

class StartScreen extends GameScreen{
    inputHandler: ScreenInputHandler
    startText: StartText

    constructor(parent: PlatypusPlatoon){
        super(parent)

        this.inputHandler = new ScreenInputHandler(parent)

        this.startText = new StartText(parent)
    }

    show(){
        this.startText.show()
        this.inputHandler.show()
    }

    hide(){
        this.startText.hide()
        this.inputHandler.hide()
    }
}

class InGameBackground extends GameObject{
    static defaultPositionOffset: Vector3 = new Vector3(0, 0.9, 0.73)
    static defaultScale: Vector3 = new Vector3(2, 2, 0.1)
    static texture = new Texture("Materials/PlatypusPlatoon/PlatypusStage.png")
    static material = null

    constructor(parent: PlatypusPlatoon){
        super(parent, InGameBackground.defaultPositionOffset)

        if(InGameBackground.material == null){
            InGameBackground.material = new BasicMaterial()
            InGameBackground.material.hasAlpha = true
            InGameBackground.material.texture = InGameBackground.texture
        }

        this.entity = createPlane(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = InGameBackground.defaultScale
        this.pivotRotate(parent.getRotation())
        this.entity.getComponent(Transform).rotate(x, 180)
        this.entity.addComponent(InGameBackground.material)

        this.hide()
    }

    show(){
        this.entity.getComponent(PlaneShape).visible = true
    }

    hide(){
        this.entity.getComponent(PlaneShape).visible = false
    }
}

class Bush extends GameObject{
    static texture = new Texture("Materials/PlatypusPlatoon/Bush.png")
    static material = null

    constructor(parent: PlatypusPlatoon, positionOffset: Vector3, scale: Vector3){
        super(parent, positionOffset)

        if(Bush.material == null){
            Bush.material = new BasicMaterial()
            Bush.material.hasAlpha = true
            Bush.material.texture = Bush.texture
        }

        this.shape = PlaneShape
        this.entity = createPlane(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = scale
        this.pivotRotate(parent.getRotation())
        this.entity.getComponent(Transform).rotate(x, 180)
        this.entity.addComponent(Bush.material)

        this.hide()
    }
}

class Tree extends GameObject{
    static texture = new Texture("Materials/PlatypusPlatoon/Tree.png")
    static material = null

    constructor(parent: PlatypusPlatoon, positionOffset: Vector3, scale: Vector3){
        super(parent, positionOffset)

        if(Tree.material == null){
            Tree.material = new BasicMaterial()
            Tree.material.hasAlpha = true
            Tree.material.texture = Tree.texture
        }

        this.shape = PlaneShape
        this.entity = createPlane(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = scale
        this.pivotRotate(parent.getRotation())
        this.entity.getComponent(Transform).rotate(x, 180)
        this.entity.addComponent(Tree.material)

        this.hide()
    }
}

class LivesLabel extends GameObject{
    static defaultPositionOffset: Vector3 = new Vector3(0.7, 1.7, 0.8)
    static defaultScale: Vector3 = new Vector3(0.5, 0.5, 0.5)
    static texture = new Texture("Materials/PlatypusPlatoon/Lives.png")
    static material = null

    constructor(parent: PlatypusPlatoon){
        super(parent, LivesLabel.defaultPositionOffset)

        if(LivesLabel.material == null){
            LivesLabel.material = new BasicMaterial()
            LivesLabel.material.hasAlpha = true
            LivesLabel.material.texture = LivesLabel.texture
        }

        this.shape = PlaneShape
        this.entity = createPlane(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = LivesLabel.defaultScale
        this.pivotRotate(parent.getRotation())
        this.entity.getComponent(Transform).rotate(x, 180)
        this.entity.addComponent(LivesLabel.material)

        this.hide()
    }
}

class ScoreLabel extends GameObject{
    static defaultPositionOffset: Vector3 = new Vector3(-0.5, 1.7, 0.8)
    static defaultScale: Vector3 = new Vector3(0.5, 0.5, 0.5)
    static texture = new Texture("Materials/PlatypusPlatoon/Score.png")
    static material = null

    constructor(parent: PlatypusPlatoon){
        super(parent, ScoreLabel.defaultPositionOffset)

        if(ScoreLabel.material == null){
            ScoreLabel.material = new BasicMaterial()
            ScoreLabel.material.hasAlpha = true
            ScoreLabel.material.texture = ScoreLabel.texture
        }

        this.shape = PlaneShape
        this.entity = createPlane(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = ScoreLabel.defaultScale
        this.pivotRotate(parent.getRotation())
        this.entity.getComponent(Transform).rotate(x, 180)
        this.entity.addComponent(ScoreLabel.material)

        this.hide()
    }
}

class InGameScreenSystem {
    parentScreen: InGameScreen
    score: number = 0
    difficulty: number = 1
    maxDifficulty: number = 5
    maximumMisses: number = 5
    missCount: number = 0
    running: boolean = false
    difficultyThreshold: number = 1
    defaultTime: number = 5

    constructor(parentScreen: InGameScreen){
        this.parentScreen = parentScreen
    }

    start(){
        this.score = 0
        this.difficulty = 1
        this.missCount = 0
        this.parentScreen.setLives(this.maximumMisses)
        this.parentScreen.setScore(0)
        this.running = true

        this.animatePlatypus()
    }

    onPlatypusClicked(){
        if(!this.running){
            return
        }

        this.score += 1
        this.difficultyThreshold -= 1
        this.parentScreen.setScore(this.score)

        if(this.difficultyThreshold <= 0){
            if(this.difficulty < this.maxDifficulty){
                this.difficulty += 1
            }

            this.difficultyThreshold = 10
        }


        this.parentScreen.playGunSound()
        this.animatePlatypus()
    }

    onPlatypusMissed(){
        this.missCount += 1

        if (this.missCount >= this.maximumMisses){
            this.running = false
            this.parentScreen.onGameOver()
            return
        }

        this.parentScreen.setLives(this.maximumMisses - this.missCount)
        this.animatePlatypus()
    }

    animatePlatypus(){
        let time = this.defaultTime / this.difficulty
        this.parentScreen.platypuses[Math.floor(Math.random() * this.parentScreen.platypuses.length)].animate(time)
    }
}

class Platypus extends GameObject{
    originOffset: Vector3
    destinationOffset: Vector3
    gameSystem: InGameScreenSystem
    isClickable: boolean = false
    clicked: boolean = false
    isDebugging: boolean = false
    material: BasicMaterial = null
    origin: Vector3

    constructor(parentScreen: InGameScreen, origin: Vector3, scale: Vector3, destination: Vector3){
        super(parentScreen.parent, origin)

        this.origin = origin
        this.destinationOffset = destination

        this.shape = PlaneShape
        this.entity = createPlane(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = scale
        this.pivotRotate(this.parent.getRotation())
        this.entity.getComponent(Transform).rotate(x, 180)

        this.hide()

        this.gameSystem = parentScreen.getGameSystem()
        this.setUpClickListener()
    }

    setUpClickListener(){
        this.entity.addComponent(
            new OnPointerDown(e => {
                if(!this.clicked && this.isClickable){
                    this.isClickable = false
                    this.clicked = true
                    this.reset()
                    this.gameSystem.onPlatypusClicked()
                }
            })
        )          
    }
    
    animate(speed: number){
        this.clicked = false

        let origin = this.getPosition()
        let destination = sumVec3(this.parent.getPosition(), this.destinationOffset)
        let correctedPoint = this.getCorrectedPoint(new Vector2(destination.x, destination.z))
        destination.x = this.parent.getPosition().x + correctedPoint[0]
        destination.z = this.parent.getPosition().z + correctedPoint[1]

        let destinationComponent = new utils.MoveTransformComponent(
            destination, 
            origin, 
            speed,
            () => {
                if(!this.clicked){
                    this.isClickable = false
                    this.gameSystem.onPlatypusMissed()
                }
            }
        )

        let originComponent = new utils.MoveTransformComponent(
            origin, 
            destination,
            speed,
            () => {this.entity.addComponentOrReplace(destinationComponent)}
        )

        this.isClickable = true
        this.entity.addComponentOrReplace(originComponent)
    }

    reset(){
        this.entity.removeComponent(utils.MoveTransformComponent)

        let position = sumVec3(this.parent.getPosition(), this.positionOffset)
        let correctedPoint = this.getCorrectedPoint(new Vector2(position.x, position.z))
        position.x = this.parent.getPosition().x + correctedPoint[0]
        position.z = this.parent.getPosition().z + correctedPoint[1]

        this.entity.getComponent(Transform).position = position
    }

    setTexture(texture: Texture){
        this.getMaterial().texture = texture
    }

    setMaterial(material: BasicMaterial){
        this.material = material
        this.entity.addComponentOrReplace(this.material)
    }

    getMaterial(){
        return this.material
    }
}

class TreeTrunkPlatypus extends Platypus{
    static bottomTexture = new Texture("Materials/PlatypusPlatoon/PlatypusBottom.png")
    static topTexture = new Texture("Materials/PlatypusPlatoon/PlatypusTop.png")
    static material = null

    constructor(parentScreen: InGameScreen, origin: Vector3, scale: Vector3, destination: Vector3){
        super(parentScreen, origin, scale, destination)

        if(TreeTrunkPlatypus.material == null){
            TreeTrunkPlatypus.material = new BasicMaterial()
            TreeTrunkPlatypus.material.hasAlpha = true
        }

        this.entity.addComponent(TreeTrunkPlatypus.material)

        this.setTexture(TreeTrunkPlatypus.bottomTexture)
    }

    setTexture(texture: Texture){
        this.getMaterial().texture = texture
    }

    getMaterial(){
        return TreeTrunkPlatypus.material
    }

    animate(time: number){
        this.clicked = false

        let origin = this.getPosition()
        let destination = new Vector3(this.destinationOffset.x, this.destinationOffset.y, this.destinationOffset.z)
        destination = sumVec3(this.parent.getPosition(), destination)
        let correctedPoint = this.getCorrectedPoint(new Vector2(destination.x, destination.z))
        destination.x = this.parent.getPosition().x + correctedPoint[0]
        destination.z = this.parent.getPosition().z + correctedPoint[1]

        let topDestination = new Vector3(this.destinationOffset.x, this.destinationOffset.y, this.destinationOffset.z + 0.04)
        topDestination = sumVec3(this.parent.getPosition(), topDestination)
        correctedPoint = this.getCorrectedPoint(new Vector2(topDestination.x, topDestination.z))
        topDestination.x = this.parent.getPosition().x + correctedPoint[0]
        topDestination.z = this.parent.getPosition().z + correctedPoint[1]

        let invertedDestination = new Vector3(this.origin.x + 0.1, this.destinationOffset.y, this.destinationOffset.z + 0.04)
        invertedDestination = sumVec3(this.parent.getPosition(), invertedDestination)
        correctedPoint = this.getCorrectedPoint(new Vector2(invertedDestination.x, invertedDestination.z))
        invertedDestination.x = this.parent.getPosition().x + correctedPoint[0]
        invertedDestination.z = this.parent.getPosition().z + correctedPoint[1]

        let bottomInvertedDestination = new Vector3(this.origin.x + 0.1, this.destinationOffset.y, this.destinationOffset.z)
        bottomInvertedDestination = sumVec3(this.parent.getPosition(), bottomInvertedDestination)
        correctedPoint = this.getCorrectedPoint(new Vector2(bottomInvertedDestination.x, bottomInvertedDestination.z))
        bottomInvertedDestination.x = this.parent.getPosition().x + correctedPoint[0]
        bottomInvertedDestination.z = this.parent.getPosition().z + correctedPoint[1]

        let invertedDestinationComponent = new utils.MoveTransformComponent(
            bottomInvertedDestination, 
            origin, 
            time,
            () => {
                if(!this.clicked){
                    this.isClickable = false
                    this.gameSystem.onPlatypusMissed()
                }
            }
        )

        let destinationComponent = new utils.MoveTransformComponent(
            topDestination, 
            invertedDestination, 
            time,
            () => {
                this.getMaterial().texture = TreeTrunkPlatypus.bottomTexture
                this.entity.addComponentOrReplace(invertedDestinationComponent)
            }
        )

        let originComponent = new utils.MoveTransformComponent(
            origin, 
            destination,
            time,
            () => {
                this.getMaterial().texture = TreeTrunkPlatypus.topTexture
                this.entity.addComponentOrReplace(destinationComponent)
            }
        )

        this.isClickable = true
        this.entity.addComponentOrReplace(originComponent)
    }

    reset(){
        super.reset()
        this.setTexture(TreeTrunkPlatypus.bottomTexture)
    }
}

class PlatypusFactory{
    static FrontPlatypus = 1
    static TreeTrunkPlatypus = 2
    static SidePlatypus = 3

    static FrontPlatypusTexture = new Texture("Materials/PlatypusPlatoon/PlatypusFront.png")
    static SidePlatypusTexture = new Texture("Materials/PlatypusPlatoon/PlatypusSide.png")
    static FrontMaterial = null
    static SideMaterial = null

    static createPlatypus(type: number, params){
        let platypus

        if(PlatypusFactory.FrontMaterial == null){
            PlatypusFactory.FrontMaterial = new BasicMaterial()
            PlatypusFactory.FrontMaterial.hasAlpha = true
            PlatypusFactory.FrontMaterial.texture = PlatypusFactory.FrontPlatypusTexture

            PlatypusFactory.SideMaterial = new BasicMaterial()
            PlatypusFactory.SideMaterial.hasAlpha = true
            PlatypusFactory.SideMaterial.texture = PlatypusFactory.SidePlatypusTexture
        }

        if(type == PlatypusFactory.FrontPlatypus){
            platypus = new Platypus(params[0], params[1], params[2], params[3])
            platypus.setMaterial(PlatypusFactory.FrontMaterial)
        } else if(type == PlatypusFactory.TreeTrunkPlatypus){
            platypus = new TreeTrunkPlatypus(params[0], params[1], params[2], params[3])
        } else {
            platypus = new Platypus(params[0], params[1], params[2], params[3])
            platypus.setMaterial(PlatypusFactory.SideMaterial)
        }

        return platypus
    }
}

class Text extends GameObject{
    value: string

    constructor(parent: PlatypusPlatoon, positionOffset: Vector3){
        super(parent, positionOffset)

        this.shape = TextShape
        this.entity = createText("", this.position)
        this.pivotRotate(this.parent.getRotation())
        this.entity.getComponent(Transform).rotate(z, 180)
        this.entity.getComponent(Transform).rotate(x, 180)
        this.entity.getComponent(TextShape).color = Color3.Black()
    }

    show(){
        this.entity.getComponent(TextShape).value = this.value
    }

    hide(){
        this.entity.getComponent(TextShape).value = ""
    }

    setText(text: string){
        this.entity.getComponent(TextShape).value = text
    }
}

class LivesValueLabel extends Text{
    static defaultPositionOffset: Vector3 = new Vector3(0.45, 1.7, 0.8)
    static defaultScale: Vector3 = new Vector3(0.1, 0.1, 0.1)

    constructor(parent: PlatypusPlatoon, text: string){
        super(parent, LivesValueLabel.defaultPositionOffset)

        this.value = text
        this.entity.getComponent(TextShape).value = text
        this.entity.getComponent(Transform).scale = LivesValueLabel.defaultScale

        this.hide()
    }
}

class ScoreValueLabel extends Text{
    static defaultPositionOffset: Vector3 = new Vector3(-0.8, 1.7, 0.8)
    static defaultScale: Vector3 = new Vector3(0.1, 0.1, 0.1)

    constructor(parent: PlatypusPlatoon, text: string){
        super(parent, ScoreValueLabel.defaultPositionOffset)

        this.value = text
        this.entity.getComponent(TextShape).value = text
        this.entity.getComponent(Transform).scale = ScoreValueLabel.defaultScale

        this.hide()
    }
}

class InGameScreen extends GameScreen{
    layers = []
    layerOffset: number = 0.03
    layerCount: number = 5

    gameSystem: InGameScreenSystem

    static soundtrackClip = new AudioClip('Sounds/PlatypusPlatoon.mp3')
    static gunSoundClip = new AudioClip('Sounds/Shot.wav')
    soundtrack: AudioSource = new AudioSource(InGameScreen.soundtrackClip)
    gunSound: AudioSource = new AudioSource(InGameScreen.gunSoundClip)
    soundTrackEntity: Entity
    gunSoundEntity: Entity

    // Stage
    inGameBackground: InGameBackground
    livesLabel: LivesLabel
    scoreLabel: ScoreLabel
    livesValueLabel: LivesValueLabel
    scoreValueLabel: ScoreValueLabel

    frontBushScale: Vector3 = new Vector3(1, 1, 1)
    frontBushOffset: Vector3 = new Vector3(-0.5, 0.3, 0)
    frontBush: Bush

    backBushScale: Vector3 = new Vector3(0.4, 0.4, 0.4)
    backBushOffset: Vector3 = new Vector3(-0.2, 1, 0)
    backBush: Bush

    frontTreeScale: Vector3 = new Vector3(1.5, 1.5, 1.5)
    frontTreeOffset: Vector3 = new Vector3(0.4, 0.7, 0)
    frontTree: Tree

    backTreeScale: Vector3 = new Vector3(1, 1, 1)
    backTreeOffset: Vector3 = new Vector3(-0.67, 0.9, 0)
    backTree: Tree

    // Platypus
    platypusOrigins = [
        new Vector3(-0.5, 0.35, 0),
        new Vector3(0.5, 1.2, 0),
        new Vector3(-0.7, 1.1, 0),
        new Vector3(-0.25, 1, 0),
        new Vector3(0.4, 0.3, 0),
        new Vector3(-0.4, 0.15, 0)
    ]

    platypusDestinations = [
        new Vector3(-0.5, 0.65, 0),
        new Vector3(0.5, 1.5, 0),
        new Vector3(-0.7, 1.4, 0),
        new Vector3(-0.25, 1.2, 0),
        new Vector3(0.3, 0.3, 0),
        new Vector3(-0.1, 0.15, 0)
    ]

    platypusScales = [
        new Vector3(0.3, 0.3, 0.3),
        new Vector3(0.3, 0.3, 0.3),
        new Vector3(0.2, 0.2, 0.2),
        new Vector3(0.15, 0.15, 0.15),
        new Vector3(0.7, 0.7, 0.7),
        new Vector3(0.7, 0.7, 0.7)
    ]

    platypusLayers = [
        2,
        2,
        0,
        0,
        2,
        2
    ]

    platypusTypes = [
        PlatypusFactory.FrontPlatypus,
        PlatypusFactory.FrontPlatypus,
        PlatypusFactory.FrontPlatypus,
        PlatypusFactory.FrontPlatypus,
        PlatypusFactory.TreeTrunkPlatypus,
        PlatypusFactory.SidePlatypus
    ]
    
    platypuses = []

    constructor(parent: PlatypusPlatoon){
        super(parent)

        this.inGameBackground = new InGameBackground(parent)

        this.layers[0] = InGameBackground.defaultPositionOffset.z + this.layerOffset

        for(let i = 1; i < this.layerCount; i++){
            this.layers[i] = this.layers[i - 1] + this.layerOffset
        }

        this.gameSystem = new InGameScreenSystem(this)

        let transform = new Transform()
        let parentPosition = this.parent.getPosition()
        let parentRotation = this.parent.getRotation()
        transform.position = new Vector3(parentPosition.x, parentPosition.y, parentPosition.z)
        transform.rotation = Quaternion.Euler(parentRotation.x, parentRotation.y + 90, parentRotation.z)

        this.soundTrackEntity = new Entity()
        this.soundTrackEntity.addComponent(transform)
        this.soundTrackEntity.addComponent(this.soundtrack)
        engine.addEntity(this.soundTrackEntity)

        this.gunSoundEntity = new Entity()
        this.gunSoundEntity.addComponent(transform)
        this.gunSoundEntity.addComponent(this.gunSound)
        engine.addEntity(this.gunSoundEntity)

        this.createStage()
        this.createPlatypus()
    }

    createPlatypus(){
        let params = []
        let layerOffset

        for(let i = 0; i < this.platypusOrigins.length; i++){
            layerOffset = this.layers[this.platypusLayers[i]]

            this.platypusOrigins[i].z = layerOffset
            this.platypusDestinations[i].z = layerOffset

            params[0] = this
            params[1] = this.platypusOrigins[i]
            params[2] = this.platypusScales[i]
            params[3] = this.platypusDestinations[i]

            this.platypuses[i] = PlatypusFactory.createPlatypus(this.platypusTypes[i], params)
        }
    }

    createStage(){
        this.frontBushOffset.z = this.layers[3]
        this.frontBush = new Bush(this.parent, this.frontBushOffset, this.frontBushScale)

        this.backBushOffset.z = this.layers[1]
        this.backBush = new Bush(this.parent, this.backBushOffset, this.backBushScale)

        this.frontTreeOffset.z = this.layers[3]
        this.frontTree = new Tree(this.parent, this.frontTreeOffset, this.frontTreeScale)

        this.backTreeOffset.z = this.layers[1]
        this.backTree = new Tree(this.parent, this.backTreeOffset, this.backTreeScale)

        this.livesLabel = new LivesLabel(this.parent)
        this.scoreLabel = new ScoreLabel(this.parent)
        this.livesValueLabel = new LivesValueLabel(this.parent, "5")
        this.scoreValueLabel = new ScoreValueLabel(this.parent, "0")
    }

    show(){
        this.inGameBackground.show()
        this.frontBush.show()
        this.backBush.show()
        this.frontTree.show()
        this.backTree.show()
        this.livesLabel.show()
        this.scoreLabel.show()
        this.livesValueLabel.show()
        this.scoreValueLabel.show()

        for(let platypus of this.platypuses){
            platypus.show()
        }

        this.gameSystem.start()

        this.soundtrack.playing = true
        this.soundtrack.loop = true
    }

    hide(){
        this.inGameBackground.hide()
        this.frontBush.hide()
        this.backBush.hide()
        this.frontTree.hide()
        this.backTree.hide()
        this.livesLabel.hide()
        this.scoreLabel.hide()
        this.livesValueLabel.hide()
        this.scoreValueLabel.hide()

        for(let platypus of this.platypuses){
            platypus.hide()
        }

        this.soundtrack.playing = false
        this.soundtrack.loop = false
    }

    getGameSystem(){
        return this.gameSystem
    }

    setLives(lives: number){
        this.livesValueLabel.setText(lives.toString())
    }

    setScore(score: number){
        this.scoreValueLabel.setText(score.toString())
    }

    onGameOver(){
        this.parent.onGameOver()
    }

    playGunSound(){
        this.gunSound.playOnce()
    }
}

export class PlatypusPlatoon {
    // General info
    static instanceCount: number = 0
    id: number
    position: Vector3
    rotation: Vector3
    scale: Vector3
    arcade: Arcade
    startScreen: StartScreen
    inGameScreen: InGameScreen
    
    // Flags
    isDebugging: boolean = false

    constructor (position: Vector3, rotation: Vector3 = new Vector3(0, 0, 0), scale: Vector3 = new Vector3(1, 1, 1)) {
        this.id = PlatypusPlatoon.instanceCount
        PlatypusPlatoon.instanceCount = PlatypusPlatoon.instanceCount + 1

        this.position = position
        this.rotation = rotation
        this.scale = scale

        this.arcade = new Arcade(this)
        this.startScreen = new StartScreen(this)
        this.inGameScreen = new InGameScreen(this)

        if (this.isDebugging){
            let entity = createCube(this.position.x, this.position.y, this.position.z)
            entity.getComponent(Transform).scale = new Vector3(0.1, 10, 0.1)
        }
    }

    handleStartScreenInput(){
        this.startScreen.hide()
        this.inGameScreen.show()
    }

    onGameOver(){
        this.inGameScreen.hide()
        this.startScreen.show()
    }

    getPosition(){
        return this.position
    }

    getRotation(){
        return this.rotation
    }

    getScale(){
        return this.scale
    }

    getIngameScreen(){
        return this.inGameScreen
    }
}