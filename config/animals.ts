// List of animals that can be detected by COCO-SSD model
export const ANIMAL_CLASSES = new Set([
  // Common pets and farm animals
  'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  
  // Large mammals
  'elephant', 'bear', 'zebra', 'giraffe', 'tiger', 'lion',
  'wolf', 'deer', 'buffalo', 'rhinoceros', 'hippopotamus',
  
  // Primates
  'monkey', 'gorilla', 'chimpanzee', 'orangutan', 'panda',
  
  // Small mammals
  'rabbit', 'mouse', 'fox', 'raccoon', 'squirrel', 'hamster',
  'hedgehog', 'skunk', 'beaver',
  
  // Marine animals
  'whale', 'dolphin', 'fish', 'shark', 'seal', 'turtle',
  'octopus', 'starfish', 'crab',
  
  // Birds
  'duck', 'penguin', 'eagle', 'owl', 'parrot', 'swan',
  'peacock', 'chicken', 'turkey', 'goose',
  
  // Reptiles and amphibians
  'snake', 'lizard', 'frog', 'toad', 'crocodile', 'alligator',
  'iguana', 'chameleon'
])

// Categories for nature elements
export const NATURE_CATEGORIES = {
  static: [
    "tree", "mountain", "rock", "bush", "lake", "river", 
    "forest", "plant", "grass", "flower", "beach", "desert", 
    "waterfall", "cave", "cliff", "valley", "meadow"
  ],
  dynamic: Array.from(ANIMAL_CLASSES) // Convert Set to Array for consistency
} 