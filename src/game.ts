import {MadmanRacing} from "./modules/MadmanRacing"
import {HoverDisk} from "./modules/HoverDisk"
import {PlatypusPlatoon} from "./modules/PlatypusPlatoon"
import utils from "../node_modules/decentraland-ecs-utils/index"

function createPlane(x: number, y: number, z: number) {
  const plane = new Entity()

  plane.addComponent(new Transform({position: new Vector3(x, y, z)}))
  plane.addComponent(new PlaneShape())

  return plane
}

function createFloor(x: number, y: number, z: number) {
  var entity = createPlane(x, y, z)
  var material = new BasicMaterial()

  entity.getComponent(Transform).scale = new Vector3(16, 16, 0)
  entity.getComponent(Transform).rotation = Quaternion.Euler(90, 0, 0)

  material.texture = new Texture("Materials/floor.png")
  entity.addComponent(material)

  engine.addEntity(entity)

  return entity
}

class Ground {
  entities = []

  constructor(){
    this.entities[0] = createFloor(8, 0 ,8)
    this.entities[1] = createFloor(24, 0 ,8)
    this.entities[2] = createFloor(40, 0 ,8)
    this.entities[3] = createFloor(8, 0, 24)
    this.entities[4] = createFloor(24, 0, 24)
    this.entities[5] = createFloor(40, 0, 24)
    this.entities[6] = createFloor(8, 0, 40)
    this.entities[7] = createFloor(24, 0, 40)
    this.entities[8] = createFloor(40, 0, 40)
  }
}

class Building {
  entity: Entity
  position: Vector3 = new Vector3(24, -0.2, 24)
  scale: Vector3 = new Vector3(0.45, 0.2, 0.45)
  shape: GLTFShape = new GLTFShape("Models/Building.glb")

  constructor(rotation: Vector3){
    this.entity = new Entity()
    let transform = new Transform()
    transform.position = this.position
    transform.scale = this.scale
    transform.rotation = Quaternion.Euler(rotation.x, rotation.y, rotation.z)
    this.entity.addComponentOrReplace(transform)
    this.entity.addComponentOrReplace(this.shape)

    engine.addEntity(this.entity)
  }
}

class Platform {
  entity: Entity
  position: Vector3 = new Vector3(24, -2, 6)
  scale: Vector3 = new Vector3(0.3, 0.2, 0.3)
  shape: GLTFShape = new GLTFShape("Models/Platform.glb")
  groundY: number = -2
  secondFloorY: number = 4
  movementTime: number = 3

  constructor(rotation: Vector3){
    this.entity = new Entity()
    let transform = new Transform()
    transform.position = this.position
    transform.scale = this.scale
    transform.rotation = Quaternion.Euler(rotation.x, rotation.y, rotation.z)
    this.entity.addComponentOrReplace(transform)
    this.entity.addComponentOrReplace(this.shape)

    engine.addEntity(this.entity)

    this.moveUp()
  }

  moveUp(){
    let origin = this.getPosition()
    let destination = new Vector3(origin.x, this.secondFloorY, origin.z)

    let component = new utils.MoveTransformComponent(
      origin, 
      destination, 
      this.movementTime,
      () => {this.moveDown()}
    )

    this.entity.addComponentOrReplace(component)
  }

  moveDown(){
    let origin = this.getPosition()
    let destination = new Vector3(origin.x, this.groundY, origin.z)

    let component = new utils.MoveTransformComponent(
      origin, 
      destination, 
      this.movementTime,
      () => {this.moveUp()}
    )

    this.entity.addComponentOrReplace(component)
  }

  getPosition(){
    return this.entity.getComponent(Transform).position
  }
}

class DiskPlatform{
  entity: Entity
  position: Vector3 = new Vector3(43.5, 6, 12)
  scale: Vector3 = new Vector3(1, 1, 1)
  shape: GLTFShape = new GLTFShape("Models/DiskWithCollider.glb")
  movementTime: number = 5
  destinations = [
    new Vector3(43.5, 6, 43),
    new Vector3(4.5, 6, 43),
    new Vector3(4.5, 6, 12),
    new Vector3(43.5, 6, 12)
  ]
  nextDestination: number = 0

  constructor(rotation: Vector3){
    this.entity = new Entity()
    let transform = new Transform()
    transform.position = this.position
    transform.scale = this.scale
    transform.rotation = Quaternion.Euler(rotation.x, rotation.y, rotation.z)
    this.entity.addComponentOrReplace(transform)
    this.entity.addComponentOrReplace(this.shape)

    engine.addEntity(this.entity)

    this.move()
  }

  move(){
    let origin = this.getPosition()
    let destination = this.destinations[this.nextDestination]
    destination = new Vector3(destination.x, destination.y, destination.z)
    let y = 2

    if(Math.random() > 0.4){
      y = 0
    }

    destination.y += y

    let component = new utils.MoveTransformComponent(
      origin, 
      destination, 
      this.movementTime,
      () => {
        this.setNextDestination()
        this.move()
      }
    )

    this.entity.addComponentOrReplace(component)
  }

  setNextDestination(){
    this.nextDestination += 1

    if(this.nextDestination >= this.destinations.length){
      this.nextDestination = 0
    }
  }

  getPosition(){
    return this.entity.getComponent(Transform).position
  }
}

class PlatypusPoster{
  static texture = new Texture("Materials/PlatypusPlatoon/SoonInVR.png")
  static material = new BasicMaterial()

  entity: Entity
  position: Vector3 = new Vector3(24, 3, 3.3)
  scale: Vector3 = new Vector3(4, 4, 4)
  shape: PlaneShape = new PlaneShape

  constructor(rotation: Vector3){
    this.entity = new Entity()

    let transform = new Transform()
    transform.position = this.position
    transform.scale = this.scale
    transform.rotation = Quaternion.Euler(rotation.x + 180, rotation.y, rotation.z)

    PlatypusPoster.material.texture = PlatypusPoster.texture

    this.entity.addComponentOrReplace(transform)
    this.entity.addComponentOrReplace(this.shape)
    this.entity.addComponentOrReplace(PlatypusPoster.material)

    engine.addEntity(this.entity)
  }
}

class NeoArcadia{
  secondFloorY: number = 5.7
  ground: Ground
  building: Building
  platform: Platform
  diskPlatform: DiskPlatform

  hoverDisk1: HoverDisk
  hoverDisk1Position: Vector3 = new Vector3(38, 1.5, 12)

  hoverDisk2: HoverDisk
  hoverDisk2Position: Vector3 = new Vector3(38, 1.5, 24)

  hoverDisk3: HoverDisk
  hoverDisk3Position: Vector3 = new Vector3(10, 1.5, 12)

  hoverDisk4: HoverDisk
  hoverDisk4Position: Vector3 = new Vector3(10, 1.5, 24)

  hoverDisk5: HoverDisk
  hoverDisk5Position: Vector3 = new Vector3(24, 1.5, 16)

  hoverDisk6: HoverDisk
  hoverDisk6Position: Vector3 = new Vector3(24, 1.5, 28)

  upperFloorHoverDiskZOffset = 8
  hoverDisk1Up: HoverDisk
  hoverDisk2Up: HoverDisk
  hoverDisk3Up: HoverDisk
  hoverDisk4Up: HoverDisk
  hoverDisk5Up: HoverDisk
  hoverDisk6Up: HoverDisk

  platypus1: PlatypusPlatoon
  platypus1Position: Vector3 = new Vector3(4, 1.5, 34)

  platypus2: PlatypusPlatoon
  platypus2Position: Vector3 = new Vector3(44, 1.5, 34)

  madman1: MadmanRacing
  madman1Position: Vector3 = new Vector3(32, 1.5, 4)

  madman2: MadmanRacing
  madman2Position: Vector3 = new Vector3(16, 1.5, 4)

  platypusPoster: PlatypusPoster
  platypusPosterPosition: Vector3 = new Vector3(24, 1.5, 24)

  constructor(rotation: Vector3){
    this.ground = new Ground()
    this.building = new Building(rotation)
    this.platform = new Platform(rotation)
    this.diskPlatform = new DiskPlatform(rotation)

    this.hoverDisk1 = new HoverDisk(this.hoverDisk1Position, rotation)
    this.hoverDisk2 = new HoverDisk(this.hoverDisk2Position, rotation)
    this.hoverDisk3 = new HoverDisk(this.hoverDisk3Position, rotation)
    this.hoverDisk4 = new HoverDisk(this.hoverDisk4Position, rotation)
    this.hoverDisk5 = new HoverDisk(this.hoverDisk5Position, rotation)
    this.hoverDisk6 = new HoverDisk(this.hoverDisk6Position, rotation)

    let pos = this.hoverDisk1Position
    let finalPos = new Vector3(pos.x, pos.y + this.secondFloorY, pos.z + this.upperFloorHoverDiskZOffset)
    this.hoverDisk1Up = new HoverDisk(finalPos, rotation)

    pos = this.hoverDisk2Position
    finalPos = new Vector3(pos.x, pos.y + this.secondFloorY, pos.z + this.upperFloorHoverDiskZOffset)
    this.hoverDisk2Up = new HoverDisk(finalPos, rotation)

    pos = this.hoverDisk3Position
    finalPos = new Vector3(pos.x, pos.y + this.secondFloorY, pos.z + this.upperFloorHoverDiskZOffset)
    this.hoverDisk3Up = new HoverDisk(finalPos, rotation)

    pos = this.hoverDisk4Position
    finalPos = new Vector3(pos.x, pos.y + this.secondFloorY, pos.z + this.upperFloorHoverDiskZOffset)
    this.hoverDisk4Up = new HoverDisk(finalPos, rotation)

    pos = this.hoverDisk5Position
    finalPos = new Vector3(pos.x, pos.y + this.secondFloorY, pos.z + this.upperFloorHoverDiskZOffset)
    this.hoverDisk5Up = new HoverDisk(finalPos, rotation)

    pos = this.hoverDisk6Position
    finalPos = new Vector3(pos.x, pos.y + this.secondFloorY, pos.z + this.upperFloorHoverDiskZOffset)
    this.hoverDisk6Up = new HoverDisk(finalPos, rotation)

    this.platypus1 = new PlatypusPlatoon(this.platypus1Position, new Vector3(rotation.x, rotation.y + 90, rotation.z))
    this.platypus2 = new PlatypusPlatoon(this.platypus2Position, new Vector3(rotation.x, rotation.y - 90, rotation.z))

    this.madman1 = new MadmanRacing(this.madman1Position, rotation)
    this.madman2 = new MadmanRacing(this.madman2Position, rotation)

    this.platypusPoster = new PlatypusPoster(rotation)
  }
}

let neoArcadia = new NeoArcadia(new Vector3(0, 0, 0))