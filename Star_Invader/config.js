// ============================================================
// STAR SHRINE - GLOBAL GAMEPLAY CONFIG
// Edit this file to tune the game without touching game logic.
// ============================================================

const CONFIG = {
  GAMEPLAY: {
    WIDTH: 540,
    HEIGHT: 960
  },

  MOBILE: {
    JOYSTICK_RADIUS: 58,
    JOYSTICK_DEADZONE: 8,
    TOUCH_BUTTON_SIZE: 72,
    FIRE_BUTTON_HOLD: true,

    // Relative drag movement multiplier.
    DRAG_SENSITIVITY: 1.0
  },

  MUSIC: {
    ENABLED: true,
    VOLUME: 0.38,

    // Per-track gain compensation so tracks have a similar perceived loudness.
    TRACK_GAIN: {
      lobby: 0.82,
      stage: [0.86, 0.78, 0.76, 0.72, 0.70],
      boss:  [0.72, 0.70, 0.68, 0.66, 0.64]
    },

    LOBBY: {
      title:'Main Menu Music (Loop)',
      url:'https://opengameart.org/sites/default/files/main_menu_music_mastered_0.mp3',
      source:'https://opengameart.org/content/main-menu-music-loop'
    },

    RETRY_DELAY_MS: 1200,
    MAX_RETRIES: 4,
    BOSS_VOLUME_MULTIPLIER: 1.0,

    FADE_OUT_FRAMES: 150,
    FADE_IN_FRAMES: 150
  },


  SFX: {
    ENABLED: true,
    VOLUME: 0.6,
    BOSS_SHOT: {
      title:'Pew Laser Fire Sound',
      url:'https://opengameart.org/sites/default/files/laserpew_0.ogg',
      source:'https://opengameart.org/content/pew-laser-fire-sound'
    }
  },

  TRANSITIONS: {
    BOSS_CLEAR_FRAMES: 240,
    BOSS_ENTRANCE_FRAMES: 180,
    STAGE_CHANGE_FRAMES: 180
  },

  PLAYER: {
    START_LIFE: 3,
    MAX_LIFE: 6,
    START_BULLET_LINES: 2,
    MAX_BULLET_LINES: 5,

    HITBOX_RADIUS: 3,
    HIT_IFRAMES: 150,
    SHIELD_IFRAMES: 135,

    START_Y_OFFSET: 95,

    // Visual hit feedback
    HIT_FLICKER_FRAMES: 10
  },

  CHARACTERS: {
    reimu: {
      name: 'Rei',
      speed: 5.4,
      focusSpeed: 2.5,
      fireDelay: 7,
      color: '#ff6d91',
      shotPattern: 'spread',

      // Per-line projectile tuning
      bulletSpeed: 10.8,
      bulletDamage: 1,
      bulletSpreadX: 0.72,
      bulletLineSpacing: 7,
      bulletRadius: 3
    },

    marisa: {
      name: 'Mari',
      speed: 6.7,
      focusSpeed: 5,
      fireDelay: 8,
      color: '#ffe16b',
      shotPattern: 'laser',

      bulletSpeed: 13.0,
      bulletDamage: 1.5,
      bulletSpreadX: 0.2,
      bulletLineSpacing: 5,
      bulletRadius: 3
    },

    sakuya: {
      name: 'Saya',
      speed: 4.8,
      focusSpeed: 2.25,
      fireDelay: 7,
      color: '#7bc8ff',
      shotPattern: 'pierce',

      bulletSpeed: 12.0,
      bulletDamage: 0.2,
      bulletSpreadX: 0.40,
      bulletLineSpacing: 6,
      bulletRadius: 3,
      pierce: true
    }
  },

  POWERUPS: {
    MINOR_DROP_CHANCE: 0.58,

    // Chance split after a minor enemy drops something.
    BULLET_LINE_CHANCE: 0.42,
    SHIELD_CHANCE: 0.26,
    LIFE_CHANCE: 0.22,
    SCORE_CHANCE: 0.10,

    FALL_SPEED: 1.25,
    WOBBLE_SPEED: 0.05,
    WOBBLE_AMOUNT: 0.55,

    SCORE_VALUE: 750,
    MAXED_PICKUP_SCORE: 1200
  },

  STAGE: {
    // Stage timer pauses while any mini-boss or the final boss is alive.
    MINI_BOSS_INTERVAL: 1050,

    // Number of red mini-bosses that must be defeated before final boss can appear.
    MAX_MINI_BOSSES_BEFORE_BOSS: 2,

    // After the final mini-boss is defeated, stage time must continue
    // for this many frames before the black boss appears.
    BOSS_DELAY_AFTER_MINI_BOSSES: 1100,

    BASE_MINOR_SPAWN_DELAY: 55,
    MIN_MINOR_SPAWN_DELAY: 14,
    SPAWN_ACCELERATION: 400
  },

  STAGES: [
    {
      name:'Stage 1 • Azure Dawn',
      backgroundTop:'#081225', backgroundBottom:'#040711', grid:'#334d7750',
      bossGradientA:'#172545', bossGradientB:'#40194c',
      music:{title:'Urban Battle',bpm:135,url:'https://opengameart.org/sites/default/files/urban_battle_bpm135.ogg',source:'https://opengameart.org/content/urban-battle'},
      bossMusic:{title:'Urban Boss Battle',bpm:135,url:'https://opengameart.org/sites/default/files/urban_boss_battle_bpm135.ogg',source:'https://opengameart.org/content/urban-boss-battle'}
    },
    {
      name:'Stage 2 • Violet Rain',
      backgroundTop:'#1b102a', backgroundBottom:'#080510', grid:'#6f4b8a45',
      bossGradientA:'#49205d', bossGradientB:'#151934',
      music:{title:'Trance Battle',bpm:140,url:'https://opengameart.org/sites/default/files/trance_battle_bpm140.ogg',source:'https://opengameart.org/content/trance-battle'},
      bossMusic:{title:'Trance Boss Battle',bpm:150,url:'https://opengameart.org/sites/default/files/trance_boss_battle_bpm150.ogg',source:'https://opengameart.org/content/trance-boss-battle'}
    },
    {
      name:'Stage 3 • Crimson Sky',
      backgroundTop:'#2a0f18', backgroundBottom:'#09050a', grid:'#8c455045',
      bossGradientA:'#641827', bossGradientB:'#23142f',
      music:{title:'Space Adventure',bpm:140,url:'https://opengameart.org/sites/default/files/space_adventure_bpm140.ogg',source:'https://opengameart.org/content/space-adventure'},
      bossMusic:{title:'Space Boss Battle',bpm:175,url:'https://opengameart.org/sites/default/files/space_boss_battle_bpm175.ogg',source:'https://opengameart.org/content/space-boss-battle'}
    },
    {
      name:'Stage 4 • Emerald Void',
      backgroundTop:'#0c201c', backgroundBottom:'#030907', grid:'#3e806a45',
      bossGradientA:'#174238', bossGradientB:'#202648',
      music:{title:'Heavy Battle 1',bpm:190,url:'https://opengameart.org/sites/default/files/heavy_battle_1_bpm190.ogg',source:'https://opengameart.org/content/heavy-battle-1'},
      bossMusic:{title:'Heavy Boss Battle 1',bpm:200,url:'https://opengameart.org/sites/default/files/heavy_boss_battle_1_bpm200.ogg',source:'https://opengameart.org/content/heavy-boss-battle-1'}
    },
    {
      name:'Stage 5 • Black Shrine',
      backgroundTop:'#11131d', backgroundBottom:'#020204', grid:'#77798d35',
      bossGradientA:'#171717', bossGradientB:'#541852',
      music:{title:'Hard Battle 1',bpm:170,url:'https://opengameart.org/sites/default/files/hard_battle_1_bpm170.ogg',source:'https://opengameart.org/content/hard-battle-1'},
      bossMusic:{title:'Hard Boss Battle 1',bpm:200,url:'https://opengameart.org/sites/default/files/hard_boss_battle_1_bpm200.ogg',source:'https://opengameart.org/content/hard-boss-battle-1'}
    }
  ],

  MINOR_ENEMIES: {
    SIZE: 14,

    BLUE: {
      COLOR: '#58a9ff',
      MOVE_SPEED: 1.20,
      BULLET_SPEED: 2.45,
      PATTERN: 'single',
      VISUAL_SHAPE: 'needle',
      HP: 6
    },

    GREEN: {
      COLOR: '#64e69b',
      MOVE_SPEED: 1.55,
      BULLET_SPEED: 2.85,
      PATTERN: 'double',
      VISUAL_SHAPE: 'split',
      HP: 6
    },

    YELLOW: {
      COLOR: '#ffe06a',
      MOVE_SPEED: 1.00,
      BULLET_SPEED: 3.25,
      PATTERN: 'triple',
      VISUAL_SHAPE: 'trident',
      HP: 7
    },

    PURPLE: {
      COLOR: '#a978ff',
      MOVE_SPEED: 1.35,
      BULLET_SPEED: 2.60,
      PATTERN: 'burst',
      VISUAL_SHAPE: 'stack',
      HP: 7
    },

    SHOOT_DELAY_MIN: 72,
    SHOOT_DELAY_RANDOM: 42,

    HIT_FLICKER_FRAMES: 7
  },

  MINI_BOSS: {
    SIZE: 30,
    HP: 120,
    MOVE_SPEED_Y: 0.55,
    MOVE_SPEED_X: 0.75,
    FIRST_SHOT_DELAY: 55,
    SHOT_DELAY_HIGH_HP: 80,
    SHOT_DELAY_LOW_HP: 58,
    LOW_HP_THRESHOLD: 0.5,
    PATTERN_DURATION: 300,
    RANDOM_PATTERN: true,
    PATTERNS: {
      FAN: { COUNT: 11, SPEED: 2.6, ARC_DEGREES: 120 },
      SWEEP: { COUNT: 8, SPEED: 2.85, ARC_DEGREES: 95, ROTATION_SPEED: 0.11 },
      TRIPLE_FAN: { COUNT: 6, SPEED: 2.35, ARC_DEGREES: 110, LAYERS: 3, LAYER_SPEED_STEP: 0.34 }
    },
    HIT_FLICKER_FRAMES: 9
  },

  BOSS: {
    POSITION_REACHED_DISTANCE: 5,
    APPEAR_FRAMES: 96,
    APPEAR_RING_COUNT: 4,
    HIT_FLICKER_FRAMES: 11,

    // Shared attack definitions. Each stage boss chooses only from its own waypoint patterns.
    PATTERNS: {
      ROTATING_RING: { FIRE_INTERVAL: 20, BULLETS: 16, SPEED: 2.45, ROTATION_SPEED: 0.115 },
      DOUBLE_SPIRAL: { FIRE_INTERVAL: 14, BULLETS_PER_ARM: 3, SPEED: 2.7, ROTATION_SPEED: 0.145, ARM_OFFSET: 3.141592653589793 },
      PULSE_RINGS: { FIRE_INTERVAL: 52, BULLETS: 30, SPEED: 2.45, ROTATION_STEP: 0.18 },
      FLOWER: { FIRE_INTERVAL: 27, PETALS: 9, SPEED: 2.8, ROTATION_SPEED: 0.075, WAVE_AMOUNT: 0.38 },
      STAR_BURST: { FIRE_INTERVAL: 36, POINTS: 5, BULLETS_PER_POINT: 4, SPEED: 3.0, ROTATION_SPEED: 0.10 },
      CROSS_LANCE: { FIRE_INTERVAL: 30, ARMS: 4, BULLETS_PER_ARM: 5, SPEED: 3.1, ROTATION_SPEED: 0.065 },
      ORBIT_WAVE: { FIRE_INTERVAL: 18, ORBS: 14, SPEED: 2.55, ROTATION_SPEED: 0.155, WAVE: 0.25 }
    },

    // One unique boss per stage. Waypoint patterns are synchronized with movement:
    // move -> stop -> fire waypoint pattern -> move to next point.
    VARIANTS: [
      {
        name:'Azure Sentinel', shape:'crystal', size:38, baseHP:560, moveSpeed:3.15, stopTime:110,
        route:[
          {x:.50,y:.16,patterns:['ROTATING_RING']},
          {x:.18,y:.30,patterns:['PULSE_RINGS']},
          {x:.82,y:.30,patterns:['ROTATING_RING','STAR_BURST']},
          {x:.50,y:.55,patterns:['STAR_BURST']}
        ]
      },
      {
        name:'Violet Crescent', shape:'crescent', size:44, baseHP:650, moveSpeed:3.35, stopTime:115,
        route:[
          {x:.20,y:.18,patterns:['DOUBLE_SPIRAL']},
          {x:.80,y:.18,patterns:['FLOWER']},
          {x:.78,y:.58,patterns:['DOUBLE_SPIRAL','ORBIT_WAVE']},
          {x:.22,y:.58,patterns:['ORBIT_WAVE']},
          {x:.50,y:.34,patterns:['FLOWER']}
        ]
      },
      {
        name:'Crimson Fortress', shape:'fortress', size:52, baseHP:760, moveSpeed:2.95, stopTime:120,
        route:[
          {x:.50,y:.14,patterns:['CROSS_LANCE']},
          {x:.15,y:.45,patterns:['PULSE_RINGS']},
          {x:.85,y:.45,patterns:['CROSS_LANCE','STAR_BURST']},
          {x:.50,y:.72,patterns:['STAR_BURST']},
          {x:.50,y:.36,patterns:['PULSE_RINGS']}
        ]
      },
      {
        name:'Emerald Bloom', shape:'bloom', size:47, baseHP:850, moveSpeed:3.55, stopTime:105,
        route:[
          {x:.50,y:.20,patterns:['FLOWER']},
          {x:.16,y:.70,patterns:['ORBIT_WAVE']},
          {x:.84,y:.70,patterns:['FLOWER','DOUBLE_SPIRAL']},
          {x:.82,y:.22,patterns:['ORBIT_WAVE']},
          {x:.18,y:.22,patterns:['DOUBLE_SPIRAL']}
        ]
      },
      {
        name:'Black Shrine Core', shape:'voidstar', size:58, baseHP:980, moveSpeed:3.85, stopTime:100,
        route:[
          {x:.50,y:.12,patterns:['STAR_BURST','CROSS_LANCE']},
          {x:.12,y:.26,patterns:['DOUBLE_SPIRAL']},
          {x:.88,y:.26,patterns:['ROTATING_RING','ORBIT_WAVE']},
          {x:.88,y:.72,patterns:['FLOWER']},
          {x:.12,y:.72,patterns:['PULSE_RINGS','CROSS_LANCE']},
          {x:.50,y:.48,patterns:['STAR_BURST','ORBIT_WAVE']}
        ]
      }
    ]
  },

  DIFFICULTY: {
    easy: {
      label: 'Easy',
      bulletSpeed: 0.78,
      spawnRate: 0.78,
      bossDensity: 0.78,
      bossHP: 0.82,
      RANDOM_BOSS_PATTERN: false
    },

    normal: {
      label: 'Normal',
      bulletSpeed: 1.00,
      spawnRate: 1.00,
      bossDensity: 1.00,
      bossHP: 1.00,
      RANDOM_BOSS_PATTERN: true
    },

    hard: {
      label: 'Hard',
      bulletSpeed: 1.28,
      spawnRate: 1.25,
      bossDensity: 1.25,
      bossHP: 1.22,
      RANDOM_BOSS_PATTERN: true
    }
  }
};

