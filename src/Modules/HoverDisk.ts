import utils from "../../node_modules/decentraland-ecs-utils/index"

let x = new Vector3(1, 0, 0)
let y = new Vector3(0, 1, 0)
let z = new Vector3(0, 0, 1)

let messageBus: MessageBus = new MessageBus()

function createCube(x: number, y: number, z: number) {
    const cube = new Entity()

    cube.addComponent(new Transform({ position: new Vector3(x, y, z) }))
    cube.addComponent(new BoxShape())
    engine.addEntity(cube)

    return cube
}

function createEmptyEntity(x: number, y: number, z: number) {
    const entity = new Entity()

    entity.addComponent(new Transform({ position: new Vector3(x, y, z) }))
    engine.addEntity(entity)

    return entity
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
    parent: HoverDisk
    entity: Entity
    scale: Vector3
    initialPositionOffset: Vector3
    positionOffset: Vector3
    position: Vector3
    distanceFromOrigin: number

    constructor (parent: HoverDisk, positionOffset: Vector3){
        this.parent = parent
        this.initialPositionOffset = positionOffset
        this.positionOffset = positionOffset
        this.position = sumVec3(this.parent.getPosition(), this.positionOffset)
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

        transform.rotate(y, rotation.y)
        transform.position.x = parentPosition.x + correctedOffsets[0]
        transform.position.z = parentPosition.z + correctedOffsets[1]
    }

    getEntityPosition(){
        return this.entity.getComponent(Transform).position
    }

    getTransform(){
        return this.entity.getComponent(Transform)
    }
}

class FieldLimit extends GameObject{
    static highDiskSoundClip = new AudioClip('Sounds/DiskHigh.mp3')
    static lowDiskSoundClip = new AudioClip('Sounds/DiskLow.mp3')
    highDiskSound: AudioSource = new AudioSource(FieldLimit.highDiskSoundClip)
    lowDiskSound: AudioSource = new AudioSource(FieldLimit.lowDiskSoundClip)
    isDebugging: boolean = false
    disk: Disk

    constructor (parent: HoverDisk, positionOffset: Vector3, scale: Vector3) {
        super(parent, positionOffset)

        this.disk = parent.getDisk()
        this.scale = scale

        if (this.isDebugging){
            this.entity = createCube(this.position.x, this.position.y, this.position.z)
            this.entity.getComponent(BoxShape).withCollisions = false
        } else {
            this.entity = createEmptyEntity(this.position.x, this.position.y, this.position.z)
        }

        this.entity = createEmptyEntity(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = scale

        let entity = new Entity()
        entity.addComponent(this.getTransform())
        entity.addComponent(this.highDiskSound)
        engine.addEntity(entity)

        entity = new Entity()
        entity.addComponent(this.getTransform())
        entity.addComponent(this.lowDiskSound)
        engine.addEntity(entity)
    
        this.pivotRotate(parent.getRotation())
    }

    playRandomSound(){
        let source = this.highDiskSound

        if(Math.random() > 0.4){
            source = this.lowDiskSound
        }

        source.playOnce()
    }
}

class SideFieldLimit extends FieldLimit{
    constructor(parent: HoverDisk, positionOffset: Vector3, scale: Vector3){
        super(parent, positionOffset, scale)

        this.entity.addComponent(new utils.TriggerComponent(
            new utils.TriggerBoxShape(scale, Vector3.Zero()),
            0, //layer
            1, //triggeredByLayer
            () => {
                let disk = parent.getDisk()
                disk.isHandlingSideCollision = true
                disk.lastSideCollider = this

                let origin = disk.getEntityPosition()

                let destination = disk.previousLocation
                disk.previousDirection.x *= -1
                destination.x = destination.x + 100 * disk.previousDirection.x
                destination.z = destination.z + 100 * disk.previousDirection.z

                disk.previousLocation = new Vector3(origin.x, origin.y, origin.z)

                let p1 = new Vector2(origin.x, origin.z)
                let p2 = new Vector2(destination.x, destination.z)
                let distance = getDistanceBetweenPoints(p1, p2)
                this.playRandomSound()

                disk.entity.addComponentOrReplace(new utils.MoveTransformComponent(origin, destination, disk.timeToDestination))
            }, //onTriggerEnter
            () => {
                parent.getDisk().isHandlingSideCollision = false
                parent.getDisk().lastSideCollider = null
            }, //onTriggerExit
            null, // onCameraEnter
            null, //onCameraExit
            false //enableDebug
        ))
    }

    isRightCollider(){
        return this.positionOffset.x > 0
    }
}

class GoalFieldLimit extends FieldLimit{
    goalId: number

    constructor(parent: HoverDisk, positionOffset: Vector3, scale: Vector3, goalId: number){
        super(parent, positionOffset, scale)

        this.goalId = goalId

        this.entity.addComponent(new utils.TriggerComponent(
            new utils.TriggerBoxShape(scale, Vector3.Zero()),
            0, //layer
            1, //triggeredByLayer
            () => {
                this.playRandomSound()
                parent.handleGoal(goalId)
            }, //onTriggerEnter
            null, //onTriggerExit
            null, // onCameraEnter
            null, //onCameraExit
            false //enableDebug
        ))
    }
}

class DiskTable extends GameObject{
    static defaultPositionOffset: Vector3 = new Vector3(0, -0.7, 0)
    static defaultScale: Vector3 = new Vector3(0.6, 0.6, 0.6)

    constructor(parent: HoverDisk){
        super(parent, DiskTable.defaultPositionOffset)

        this.entity = createGTLFShape("Models/DiskTable.glb", this.position)
        this.entity.getComponent(Transform).scale = mulVec3(this.parent.getScale(), DiskTable.defaultScale)

        this.pivotRotate(parent.getRotation())
    }
}


class InputZone extends GameObject{
    constructor(parent: HoverDisk, positionOffset: Vector3, fieldSize: Vector2){
        super(parent, positionOffset)

        this.scale = new Vector3(fieldSize.x, 0.1, 1)

        this.entity = createCube(this.position.x, this.position.y, this.position.z)
        this.entity.getComponent(Transform).scale = this.scale
        this.entity.getComponent(BoxShape).withCollisions = false

        this.entity.addComponent(new utils.TriggerComponent(
            new utils.TriggerBoxShape(this.scale, Vector3.Zero()),
            0, //layer
            1, //triggeredByLayer
            () => {
                parent.getDisk().isInInputZone = true
            }, //onTriggerEnter
            () => {
                parent.getDisk().isInInputZone = false
            }, //onTriggerExit
            null, // onCameraEnter
            null, //onCameraExit
            false //enableDebug
        ))
    }
}

class Field{
    parent: HoverDisk
    diskTable: DiskTable
    fieldSize: Vector2 = new Vector2(3, 5)
    yOffset: number = -0.2
    limitThickness: number = 0.05
    downInputZone: InputZone
    downInputZoneOffset: Vector3 = new Vector3(0, -0.275, -1.7)
    upInputZone: InputZone
    upInputZoneOffset: Vector3 = new Vector3(0, -0.275, 1.7)

    leftLimit: SideFieldLimit
    leftLimitScale: Vector3 = new Vector3(this.limitThickness, 0.1, this.fieldSize.y)
    leftLimitOffset: Vector3 = new Vector3(-(this.fieldSize.x / 2), this.yOffset, 0)

    rightLimit: SideFieldLimit
    rightLimitScale: Vector3 = new Vector3(this.limitThickness, 0.1, this.fieldSize.y)
    rightLimitOffset: Vector3 = new Vector3((this.fieldSize.x / 2), this.yOffset, 0)

    downLimit: GoalFieldLimit
    downLimitScale: Vector3 = new Vector3(this.fieldSize.x, 0.1, this.limitThickness)
    downLimitOffset: Vector3 = new Vector3(0, this.yOffset, -(this.fieldSize.y / 2))

    upLimit: GoalFieldLimit
    upLimitScale: Vector3 = new Vector3(this.fieldSize.x, 0.1, this.limitThickness)
    upLimitOffset: Vector3 = new Vector3(0, this.yOffset, (this.fieldSize.y / 2))

    constructor (parent: HoverDisk) {
        this.parent = parent

        this.diskTable = new DiskTable(parent)

        this.leftLimit = new SideFieldLimit(this.parent, this.leftLimitOffset, this.leftLimitScale)
        this.upLimit = new GoalFieldLimit(this.parent, this.upLimitOffset, this.upLimitScale, 1)
        this.rightLimit = new SideFieldLimit(this.parent, this.rightLimitOffset, this.rightLimitScale)
        this.downLimit = new GoalFieldLimit(this.parent, this.downLimitOffset, this.downLimitScale, 0)

        this.downInputZone = new InputZone(this.parent, this.downInputZoneOffset, this.fieldSize)
        this.upInputZone = new InputZone(this.parent, this.upInputZoneOffset, this.fieldSize)
    }

    getSize(){
        return this.fieldSize
    }
}

class Disk extends GameObject{
    static defaultPositionOffset: Vector3 = new Vector3(0, -0.25, -2)
    static defaultScale: Vector3 = new Vector3(0.1, 0.1, 0.1)
    previousDirection: Vector3 = new Vector3(0, 0, -1)
    movementDirection: Vector3 = new Vector3(0, 0, 0)
    previousLocation: Vector3 = new Vector3(0, 0, 0)
    triggerShape = new utils.TriggerSphereShape(0.2, Vector3.Zero())
    triggerComponent = new utils.TriggerComponent(this.triggerShape, 1)
    timeToDestination: number = 50
    minTimeToDestination: number = 20
    maxTimeToDestination: number = 50
    isInInputZone: boolean
    isHandlingSideCollision: boolean = false
    lastSideCollider: SideFieldLimit = null
    speed: number

    constructor(parent: HoverDisk){
        super(parent, Disk.defaultPositionOffset)

        this.entity = createGTLFShape("Models/Disk.glb", this.position)
        this.entity.getComponent(Transform).scale = mulVec3(this.parent.getScale(), Disk.defaultScale)

        this.entity.addComponent(this.triggerComponent)

        this.pivotRotate(parent.getRotation())

        this.entity.addComponent(
            new OnPointerDown(e => {
                if (!this.isInInputZone){
                    return
                }

                if(this.previousDirection.z > 0 && e.direction.z > 0){
                    return
                }

                if(this.previousDirection.z < 0 && e.direction.z < 0){
                    return
                }

                let origin = this.entity.getComponent(Transform).position
                this.previousLocation = new Vector3(origin.x, origin.y, origin.z)
                this.previousDirection = new Vector3(e.direction.x, e.direction.y, e.direction.z)
                this.movementDirection = new Vector3(origin.x + 100 * e.direction.x, origin.y, origin.z + 100 * e.direction.z)

                if(this.isHandlingSideCollision){
                    let colliderPosition = this.lastSideCollider.getEntityPosition()

                    if(this.lastSideCollider.isRightCollider()){
                        if(this.movementDirection.x > colliderPosition.x){
                            this.previousDirection.x *= -1
                            this.movementDirection.x *= -1
                        }
                    } else {
                        if(this.movementDirection.x < colliderPosition.x){
                            this.previousDirection.x *= -1
                            this.movementDirection.x *= -1
                        }
                    }
                }

                this.timeToDestination = Math.floor(Math.random() * (this.maxTimeToDestination - this.minTimeToDestination + 1)) + this.minTimeToDestination

                let p1 = new Vector2(origin.x, origin.z)
                let p2 = new Vector2(this.movementDirection.x, this.movementDirection.z)
                this.speed = getDistanceBetweenPoints(p1, p2) / this.timeToDestination

                let data = []
                data[0] = origin
                data[1] = this.movementDirection
                data[2] = this.timeToDestination
                messageBus.emit("moveDisk" + parent.id, data)
            })
        )

        messageBus.on("moveDisk" + this.parent.id, (data) =>{
            this.movementDirection = data[1]

            this.entity.addComponentOrReplace(new utils.MoveTransformComponent(
                data[0],
                data[1],
                data[2],
                () => {
                    this.resetPosition(1)
                }
            ))
        })
    }

    enableTrigger(){
        this.triggerComponent.enabled = true
    }

    resetPosition(goalId: number){
        let sideCorrection = 1
        let pos

        this.entity.removeComponent(utils.MoveTransformComponent)

        if(goalId == 1){
            sideCorrection = -1
        }

        pos = sumVec3(
            this.parent.getPosition(), 
            new Vector3(this.positionOffset.x, this.positionOffset.y, this.positionOffset.z * sideCorrection)
        )

        this.getTransform().position = pos

        this.previousDirection = new Vector3(0, 0, -sideCorrection)
        this.movementDirection = new Vector3(0, 0, 0)
    }
}

class ScoreboardNumber extends GameObject{
    yRotation: number

    constructor(parent, positionOffset, yRotation, shape = null){
        super(parent, positionOffset)

        this.scale = new Vector3(0.3, 0.3, 0.3)
        this.yRotation = yRotation

        if (shape != null){
            this.entity = createEmptyEntity(this.position.x, this.position.y, this.position.z)
            this.entity.addComponentOrReplace(shape)
        } else {
            this.entity = createText("0", this.position)
        }

        this.getTransform().scale = this.scale
        this.getTransform().rotation = Quaternion.Euler(0, yRotation, 0)

        this.pivotRotate(parent.getRotation())
    }

    setText(text: string){
        this.entity.getComponent(TextShape).value = text
    }
}

class Scoreboard extends GameObject{
    static defaultPositionOffset: Vector3 = new Vector3(0, 2, 0)
    static defaultScale: Vector3 = new Vector3(0.6, 0.6, 0.6)
    scores = [0,0]
    maxScore = 10

    frontScoreOffset = new Vector3(-0.25, 1.9, -1.45)
    sideScoreOffset = new Vector3(1.30, 1.9, -0.25)

    player0ScoreTexts = []
    player1ScoreTexts = []
    playerScoreTexts = [this.player0ScoreTexts, this.player1ScoreTexts]

    constructor(parent: HoverDisk){
        super(parent, Scoreboard.defaultPositionOffset)

        this.entity = createGTLFShape("Models/Scoreboard.glb", this.position)
        this.entity.getComponent(Transform).scale = mulVec3(this.parent.getScale(), Scoreboard.defaultScale)
        this.entity.getComponent(Transform).rotate(y, parent.getRotation().y)

        let newOffset
        this.player0ScoreTexts.push(new ScoreboardNumber(parent, this.frontScoreOffset, 0))

        let shape = this.player0ScoreTexts[0].entity.getComponent(TextShape)

        this.player0ScoreTexts.push(new ScoreboardNumber(parent, this.sideScoreOffset, -90, shape))
        newOffset = new Vector3(this.frontScoreOffset.x, this.frontScoreOffset.y, -this.frontScoreOffset.z)
        this.player0ScoreTexts.push(new ScoreboardNumber(parent, newOffset, 180, shape))
        newOffset = new Vector3(-this.sideScoreOffset.x, this.sideScoreOffset.y, this.sideScoreOffset.z)
        this.player0ScoreTexts.push(new ScoreboardNumber(parent, newOffset, 90, shape))

        newOffset = new Vector3(-this.frontScoreOffset.x, this.frontScoreOffset.y, this.frontScoreOffset.z)
        this.player1ScoreTexts.push(new ScoreboardNumber(parent, newOffset, 0))

        shape = this.player1ScoreTexts[0].entity.getComponent(TextShape)

        newOffset = new Vector3(this.sideScoreOffset.x, this.sideScoreOffset.y, -this.sideScoreOffset.z)
        this.player1ScoreTexts.push(new ScoreboardNumber(parent, newOffset, -90, shape))
        newOffset = new Vector3(-this.frontScoreOffset.x, this.frontScoreOffset.y, -this.frontScoreOffset.z)
        this.player1ScoreTexts.push(new ScoreboardNumber(parent, newOffset, 180, shape))
        newOffset = new Vector3(-this.sideScoreOffset.x, this.sideScoreOffset.y, -this.sideScoreOffset.z)
        this.player1ScoreTexts.push(new ScoreboardNumber(parent, newOffset, 90, shape))
    }

    getPlayerTexts(id: number){
        if(id == 0){
            return this.player0ScoreTexts
        }

        return this.player1ScoreTexts
    }

    incrementScore(goalId: number){
        let playerId = 0

        if(goalId == 0){
            playerId = 1
        }

        this.scores[playerId] += 1

        if (this.scores[playerId] >= this.maxScore){
            this.parent.handleGameOver(playerId)
            this.resetScores()
            return
        }

        let score = this.scores[playerId].toString()

        this.playerScoreTexts[playerId][0].setText(score)
    }

    resetScores(){
        this.scores = [0,0]

        this.player0ScoreTexts[0].setText("0")
        this.player1ScoreTexts[0].setText("0")
    }
}

export class HoverDisk {
    static instanceCount: number = 0
    id: number
    position: Vector3
    rotation: Vector3
    scale: Vector3
    field: Field
    disk: Disk
    scoreboard: Scoreboard
    isDebugging: boolean = false

    constructor (position: Vector3, rotation: Vector3 = new Vector3(0, 0, 0), scale: Vector3 = new Vector3(1, 1, 1)) {
        this.id = HoverDisk.instanceCount
        HoverDisk.instanceCount = HoverDisk.instanceCount + 1

        this.position = position
        this.rotation = rotation
        this.scale = scale

        this.field = new Field(this)
        this.disk = new Disk(this)
        this.scoreboard = new Scoreboard(this)

        if (this.isDebugging){
            let entity = createCube(this.position.x, this.position.y, this.position.z)
            entity.getComponent(Transform).scale = new Vector3(0.1, 10, 0.1)
        }
    }

    handleGoal(goalId: number){
        this.disk.resetPosition(goalId)
        this.scoreboard.incrementScore(goalId)
    }

    handleGameOver(winnerId: number){
        
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

    getField(){
        return this.field
    }

    getDisk(){
        return this.disk
    }
}