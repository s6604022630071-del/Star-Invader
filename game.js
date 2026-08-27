(() => {
const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
let W = canvas.width, H = canvas.height;
const menu = document.querySelector('#menu'), select = document.querySelector('#select');
const help = document.querySelector('#help'), over = document.querySelector('#gameover');
const hud = document.querySelector('#hud'), bossbar = document.querySelector('#bossbar'), bossfill = document.querySelector('#bossfill');
const hudLeft = document.querySelector('#hudLeft'), hudRight = document.querySelector('#hudRight');

const scoreNumber = document.querySelector('#scoreNumber');
const musicVolume=document.querySelector('#musicVolume');
const stageMusic=new Audio();
const musicToggle=document.querySelector('#musicToggle');
let masterMusicVolume=CONFIG.MUSIC?.VOLUME ?? .42;
let musicMuted=false;
let musicFade={active:false,from:masterMusicVolume,to:masterMusicVolume,frame:0,duration:1,onDone:null};

stageMusic.preload='auto';
stageMusic.volume=masterMusicVolume;
stageMusic.loop=false;

let musicStage=-1;
let musicMode='none';
let desiredMusicUrl='';
let musicRetryCount=0;
let musicRetryTimer=null;
let visualMusicClock=0;

function clearMusicRetry(){
  if(musicRetryTimer){clearTimeout(musicRetryTimer);musicRetryTimer=null;}
}

function getCurrentTrackGain(){
  const gain=CONFIG.MUSIC?.TRACK_GAIN;
  if(!gain)return 1;
  if(musicMode==='lobby')return gain.lobby ?? 1;
  if(musicMode==='boss')return gain.boss?.[currentStage] ?? 1;
  if(musicMode==='stage')return gain.stage?.[currentStage] ?? 1;
  return 1;
}

function applyMusicVolume(v){
  const normalized=Math.max(0,Math.min(1,v*getCurrentTrackGain()));
  stageMusic.volume=musicMuted?0:normalized;
}

function fadeMusicTo(target,duration,onDone=null){
  musicFade={
    active:true,
    from:stageMusic.volume,
    to:Math.max(0,Math.min(1,target)),
    frame:0,
    duration:Math.max(1,duration),
    onDone
  };
}

function updateMusicFade(){
  if(!musicFade.active)return;

  musicFade.frame++;
  const p=Math.min(1,musicFade.frame/musicFade.duration);

  // Linear fade makes the volume drop/rise clearly perceptible.
  const v=musicFade.from+(musicFade.to-musicFade.from)*p;
  applyMusicVolume(v);

  if(p>=1){
    musicFade.active=false;
    const done=musicFade.onDone;
    musicFade.onDone=null;
    if(done)done();
  }
}

function switchMusicWithFade(url,mode){
  fadeMusicTo(0,CONFIG.MUSIC.FADE_OUT_FRAMES,()=>{
    switchMusic(url,mode,true);
    applyMusicVolume(0);
    fadeMusicTo(masterMusicVolume,CONFIG.MUSIC.FADE_IN_FRAMES);
  });
}

function safePlayMusic(){
  if(!CONFIG.MUSIC?.ENABLED || musicMode==='none' || !desiredMusicUrl)return;
  clearMusicRetry();
  const p=stageMusic.play();
  if(p?.catch)p.catch(()=>{});
}

function switchMusic(url,mode,restart=true){
  if(!CONFIG.MUSIC?.ENABLED || !url)return;
  const changed=desiredMusicUrl!==url;
  musicMode=mode; desiredMusicUrl=url; musicRetryCount=0; clearMusicRetry();
  if(changed){stageMusic.src=url;stageMusic.load();restart=true;}
  if(restart){try{stageMusic.currentTime=0;}catch(_){}}
  safePlayMusic();
}


const musicPreloadCache=new Map();

function preloadMusic(url){
  if(!url)return Promise.resolve();
  if(musicPreloadCache.has(url))return musicPreloadCache.get(url);

  const audio=new Audio();
  audio.preload='auto';
  audio.src=url;
  audio.load();

  const ready=new Promise(resolve=>{
    let done=false;
    const finish=()=>{
      if(done)return;
      done=true;
      audio.removeEventListener('canplaythrough',finish);
      audio.removeEventListener('loadeddata',finish);
      audio.removeEventListener('error',finish);
      resolve();
    };
    audio.addEventListener('canplaythrough',finish,{once:true});
    audio.addEventListener('loadeddata',finish,{once:true});
    audio.addEventListener('error',finish,{once:true});
    setTimeout(finish,CONFIG.MUSIC.PRELOAD_WAIT_MS||3000);
  });

  musicPreloadCache.set(url,ready);
  return ready;
}

function preloadStagePair(stageIndex){
  const stage=CONFIG.STAGES[stageIndex];
  if(!stage)return;
  preloadMusic(stage.music?.url);
  preloadMusic(stage.bossMusic?.url);
  const next=CONFIG.STAGES[stageIndex+1];
  if(next){
    preloadMusic(next.music?.url);
    preloadMusic(next.bossMusic?.url);
  }
}

// Begin buffering before the user starts the game.
preloadMusic(CONFIG.MUSIC?.LOBBY?.url);
preloadStagePair(0);


const musicReadyCache=new Map();

function prepareMusicUrl(url){
  if(!url)return Promise.resolve(false);
  if(musicReadyCache.has(url))return musicReadyCache.get(url);

  const probe=new Audio();
  probe.preload='auto';
  probe.src=url;

  const ready=new Promise(resolve=>{
    let done=false;

    const finish=(ok)=>{
      if(done)return;
      done=true;
      probe.removeEventListener('canplaythrough',onReady);
      probe.removeEventListener('loadeddata',onReady);
      probe.removeEventListener('error',onError);
      resolve(ok);
    };

    const onReady=()=>finish(true);
    const onError=()=>finish(false);

    probe.addEventListener('canplaythrough',onReady,{once:true});
    probe.addEventListener('loadeddata',onReady,{once:true});
    probe.addEventListener('error',onError,{once:true});

    probe.load();

    // Fallback so a browser never blocks the game indefinitely.
    setTimeout(()=>finish(probe.readyState>=2),CONFIG.MUSIC.PRELOAD_WAIT_MS ?? 3000);
  });

  musicReadyCache.set(url,ready);
  return ready;
}

function preloadStagePair(stageIndex){
  const stage=CONFIG.STAGES[stageIndex];
  if(!stage)return;

  prepareMusicUrl(stage.music?.url);
  prepareMusicUrl(stage.bossMusic?.url);

  const next=CONFIG.STAGES[stageIndex+1];
  if(next){
    prepareMusicUrl(next.music?.url);
    prepareMusicUrl(next.bossMusic?.url);
  }
}

function preloadGameAudio(){
  prepareMusicUrl(CONFIG.MUSIC?.LOBBY?.url);
  preloadStagePair(0);

  // Warm all remaining local tracks in the background.
  CONFIG.STAGES.forEach((stage,index)=>{
    setTimeout(()=>{
      prepareMusicUrl(stage.music?.url);
      prepareMusicUrl(stage.bossMusic?.url);
    },200+index*180);
  });
}

preloadGameAudio();

function transitionMusicTo(url,mode,restart=true){
  if(!CONFIG.MUSIC?.ENABLED || !url)return;

  if(desiredMusicUrl===url && musicMode===mode && !stageMusic.paused){
    return;
  }

  // Start buffering the NEXT track immediately while current music is still audible.
  const readyPromise=prepareMusicUrl(url);

  fadeMusicTo(0,CONFIG.MUSIC.FADE_OUT_FRAMES,async ()=>{
    clearMusicRetry();
    stageMusic.pause();

    // Usually this resolves instantly because preparation happened during fade-out.
    await Promise.race([
      readyPromise,
      new Promise(resolve=>setTimeout(resolve,CONFIG.MUSIC.PRELOAD_WAIT_MS ?? 3000))
    ]);

    musicMode=mode;
    desiredMusicUrl=url;
    musicRetryCount=0;

    stageMusic.src=url;
    stageMusic.preload='auto';
    stageMusic.load();

    try{
      if(restart)stageMusic.currentTime=0;
    }catch(_){}

    applyMusicVolume(0);

    // Wait for the ACTUAL playback element, not just the probe Audio object.
    if(stageMusic.readyState<2){
      await new Promise(resolve=>{
        let finished=false;
        const done=()=>{
          if(finished)return;
          finished=true;
          stageMusic.removeEventListener('canplay',done);
          stageMusic.removeEventListener('loadeddata',done);
          resolve();
        };

        stageMusic.addEventListener('canplay',done,{once:true});
        stageMusic.addEventListener('loadeddata',done,{once:true});
        setTimeout(done,CONFIG.MUSIC.PRELOAD_WAIT_MS ?? 3000);
      });
    }

    const playPromise=stageMusic.play();
    if(playPromise?.catch)playPromise.catch(()=>{});

    fadeMusicTo(masterMusicVolume,CONFIG.MUSIC.FADE_IN_FRAMES);
  });
}

function startLobbyMusic(restart=false){
  const lobby=CONFIG.MUSIC?.LOBBY;
  if(!lobby?.url)return;

  musicStage=-1;
  prepareMusicUrl(lobby.url);

  if(musicMode==='none' || !desiredMusicUrl){
    musicMode='lobby';
    desiredMusicUrl=lobby.url;

    stageMusic.src=lobby.url;
    stageMusic.preload='auto';
    stageMusic.load();

    try{
      if(restart)stageMusic.currentTime=0;
    }catch(_){}

    // Start at normal target level on the first user gesture.
    applyMusicVolume(masterMusicVolume);

    const p=stageMusic.play();
    if(p?.catch)p.catch(()=>{});
    return;
  }

  transitionMusicTo(lobby.url,'lobby',restart);
}

function startStageMusic(stageIndex,restart=true){
  preloadStagePair(stageIndex);
  const stage=CONFIG.STAGES[stageIndex]||CONFIG.STAGES[0];
  if(!stage?.music?.url)return;

  musicStage=stageIndex;

  if(musicMode==='none' || !desiredMusicUrl){
    musicMode='stage';
    desiredMusicUrl=stage.music.url;
    stageMusic.src=stage.music.url;
    try{if(restart)stageMusic.currentTime=0;}catch(_){}
    applyMusicVolume(0);
    const p=stageMusic.play();
    if(p?.catch)p.catch(()=>{});
    fadeMusicTo(masterMusicVolume,CONFIG.MUSIC.FADE_IN_FRAMES);
    return;
  }

  transitionMusicTo(stage.music.url,'stage',restart);
}

function startBossMusic(stageIndex,restart=true){
  preloadStagePair(stageIndex);
  const stage=CONFIG.STAGES[stageIndex]||CONFIG.STAGES[0];
  const track=stage?.bossMusic||stage?.music;
  if(!track?.url)return;

  musicStage=stageIndex;
  transitionMusicTo(track.url,'boss',restart);
}

function stopStageMusic(){
  musicMode='none';desiredMusicUrl='';musicStage=-1;clearMusicRetry();stageMusic.pause();
}

function restartDesiredMusic(){
  if(musicMode==='none' || !desiredMusicUrl)return;
  try{stageMusic.currentTime=0;}catch(_){}
  safePlayMusic();
}

stageMusic.addEventListener('ended',restartDesiredMusic);
stageMusic.addEventListener('stalled',()=>{
  if(musicMode==='none'||musicRetryTimer||musicRetryCount>=CONFIG.MUSIC.MAX_RETRIES)return;
  musicRetryCount++;
  musicRetryTimer=setTimeout(()=>{musicRetryTimer=null;safePlayMusic();},CONFIG.MUSIC.RETRY_DELAY_MS);
});
stageMusic.addEventListener('playing',()=>{musicRetryCount=0;clearMusicRetry();});
stageMusic.addEventListener('error',()=>{
  if(musicMode==='none'||musicRetryCount>=CONFIG.MUSIC.MAX_RETRIES)return;
  musicRetryCount++;clearMusicRetry();
  musicRetryTimer=setTimeout(()=>{
    musicRetryTimer=null;
    if(!desiredMusicUrl)return;
    stageMusic.src=desiredMusicUrl;stageMusic.load();
    try{stageMusic.currentTime=0;}catch(_){}
    safePlayMusic();
  },CONFIG.MUSIC.RETRY_DELAY_MS);
});

function unlockLobbyAudio(){
  preloadStagePair(currentStage);
  if(scene!=='game')startLobbyMusic(false);
}
document.addEventListener('pointerdown',unlockLobbyAudio,{once:true,capture:true});
document.addEventListener('keydown',unlockLobbyAudio,{once:true,capture:true});


function refreshMusicMuteIcon(){
  if(!musicToggle)return;
  musicToggle.textContent=musicMuted?'🔇':'♫';
  musicToggle.title=musicMuted?'Unmute music':'Mute music';
  musicToggle.setAttribute('aria-label',musicToggle.title);
  musicToggle.classList.toggle('muted',musicMuted);
}

if(musicToggle){
  musicToggle.onclick=()=>{
    musicMuted=!musicMuted;
    applyMusicVolume(musicMuted?0:masterMusicVolume);
    refreshMusicMuteIcon();
    if(!musicMuted && stageMusic.paused && musicMode!=='none')safePlayMusic();
  };
  refreshMusicMuteIcon();
}

function getMusicTime(){return (!stageMusic.paused&&Number.isFinite(stageMusic.currentTime))?stageMusic.currentTime:visualMusicClock/60;}
function getBeatState(){const stage=CONFIG.STAGES[currentStage]||CONFIG.STAGES[0],track=musicMode==='boss'?(stage.bossMusic||stage.music):stage.music,bpm=track?.bpm||120;const beats=getMusicTime()*bpm/60,phase=beats-Math.floor(beats);return {phase,pulse:.5-.5*Math.cos(phase*Math.PI*2),beatIndex:Math.floor(beats),bpm};}
function hexToRgb(hex){const c=hex.replace('#','');const n=parseInt(c.length===3?c.split('').map(x=>x+x).join(''):c,16);return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
function mixHex(a,b,t){const ca=hexToRgb(a),cb=hexToRgb(b),q=Math.max(0,Math.min(1,t));return `rgb(${Math.round(ca.r+(cb.r-ca.r)*q)},${Math.round(ca.g+(cb.g-ca.g)*q)},${Math.round(ca.b+(cb.b-ca.b)*q)})`;}


if(musicVolume){
  musicVolume.value=Math.round((CONFIG.MUSIC?.VOLUME ?? .42)*100);
  musicVolume.addEventListener('input',()=>{
    const v=Math.max(0,Math.min(1,Number(musicVolume.value)/100));
    stageMusic.volume=v;
  });
}


const bossShotSfxPool=[];
let bossShotSfxCursor=0;

function initBossShotSfx(){
  const cfg=CONFIG.SFX?.BOSS_SHOT;
  if(!CONFIG.SFX?.ENABLED || !cfg?.url)return;

  // Small pool allows rapid patterns without cutting off the previous shot.
  for(let i=0;i<5;i++){
    const a=new Audio(cfg.url);
    a.preload='auto';
    a.volume=CONFIG.SFX.VOLUME ?? .24;
    bossShotSfxPool.push(a);
  }
}

function playBossShotSfx(){
  if(!CONFIG.SFX?.ENABLED || bossShotSfxPool.length===0)return;

  const a=bossShotSfxPool[bossShotSfxCursor];
  bossShotSfxCursor=(bossShotSfxCursor+1)%bossShotSfxPool.length;

  try{a.currentTime=0;}catch(_){}
  a.volume=CONFIG.SFX.VOLUME ?? .24;

  const p=a.play();
  if(p?.catch)p.catch(()=>{});
}

initBossShotSfx();

const keys = {};
const touchState = {
  moveX:0,
  moveY:0,
};
let scene='menu', selected='reimu', difficulty='normal', paused=false, t=0, score=0, stageTime=0, spawnClock=0, boss=null, miniBossDefeated=0, bossDelayClock=0, pendingHitClear=false, currentStage=0, clearRipples=[], transition={type:'none',timer:0,max:1};
let player, enemies=[], bullets=[], enemyBullets=[], particles=[], pickups=[], stars=[];
for(let i=0;i<120;i++) stars.push({x:Math.random()*W,y:Math.random()*H,z:.2+Math.random()*.8});

function resizeGameCanvas(){
  // Same logical gameplay size on PC and mobile.
  canvas.width=CONFIG.GAMEPLAY.WIDTH;
  canvas.height=CONFIG.GAMEPLAY.HEIGHT;

  W=CONFIG.GAMEPLAY.WIDTH;
  H=CONFIG.GAMEPLAY.HEIGHT;

  stars=[];
  for(let i=0;i<120;i++){
    stars.push({
      x:Math.random()*W,
      y:Math.random()*H,
      z:.2+Math.random()*.8
    });
  }

  if(player){
    player.x=Math.max(18,Math.min(W-18,player.x));
    player.y=Math.max(45,Math.min(H-20,player.y));
  }
}

window.addEventListener('resize',resizeGameCanvas);
window.addEventListener('orientationchange',()=>setTimeout(resizeGameCanvas,50));
resizeGameCanvas();


const difficultySettings = CONFIG.DIFFICULTY;

const chars = Object.fromEntries(
  Object.entries(CONFIG.CHARACTERS).map(([key,c]) => [key,{
    name:c.name,
    speed:c.speed,
    focus:c.focusSpeed,
    fire:c.fireDelay,
    color:c.color,
    pattern:c.shotPattern,
    bulletSpeed:c.bulletSpeed,
    bulletDamage:c.bulletDamage,
    bulletSpreadX:c.bulletSpreadX,
    bulletLineSpacing:c.bulletLineSpacing,
    bulletRadius:c.bulletRadius,
    pierce:!!c.pierce
  }])
);

function reset(){
  t=0; score=0; stageTime=0; spawnClock=0; miniBossDefeated=0; bossDelayClock=0; pendingHitClear=false; currentStage=0; clearRipples=[]; enemies=[]; bullets=[]; enemyBullets=[]; particles=[]; pickups=[]; boss=null;
  const c=chars[selected];
  player={
    x:W/2,
    y:H-CONFIG.PLAYER.START_Y_OFFSET,
    r:CONFIG.PLAYER.HITBOX_RADIUS,
    hp:CONFIG.PLAYER.START_LIFE,
    maxHp:CONFIG.PLAYER.MAX_LIFE,
    power:CONFIG.PLAYER.START_BULLET_LINES,
    cool:0,
    inv:0,
    shield:0,
    ...c
  };
  paused=false; scene='game'; hud.classList.remove('hidden'); over.classList.add('hidden'); bossbar.classList.add('hidden');
  if(window.matchMedia('(pointer: coarse)').matches || window.innerWidth<=900){
    document.querySelector('#touchControls').classList.remove('hidden');
    document.querySelector('#touchControls').setAttribute('aria-hidden','false');
  }
  showToast('Stage 1 • Scarlet Orbit');
  startStageMusic(currentStage,true);
}
function showToast(msg){ /* popups disabled */ }
function addParticle(x,y,color,n=7){
  for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:20+Math.random()*25,color});
}
function shootPlayer(){
  if(player.cool>0)return;
  player.cool=player.fire;

  const lines=Math.max(
    CONFIG.PLAYER.START_BULLET_LINES,
    Math.min(CONFIG.PLAYER.MAX_BULLET_LINES,player.power)
  );
  const center=(lines-1)/2;

  for(let i=0;i<lines;i++){
    const n=i-center;

    let vx=n*player.bulletSpreadX;
    let vy=-player.bulletSpeed;
    let damage=player.bulletDamage;
    let pierce=player.pierce;
    let xoff=n*player.bulletLineSpacing;

    bullets.push({
      x:player.x+xoff,
      y:player.y-14,
      vx,vy,
      r:player.bulletRadius,
      d:damage,
      pierce
    });
  }
}
const minorVariants = [
  {name:'Blue', ...CONFIG.MINOR_ENEMIES.BLUE},
  {name:'Green', ...CONFIG.MINOR_ENEMIES.GREEN},
  {name:'Yellow', ...CONFIG.MINOR_ENEMIES.YELLOW},
  {name:'Purple', ...CONFIG.MINOR_ENEMIES.PURPLE}
].map(v => ({
  name: v.name,
  color: v.COLOR,
  moveSpeed: v.MOVE_SPEED,
  bulletSpeed: v.BULLET_SPEED,
  pattern: v.PATTERN,
  visualShape: v.VISUAL_SHAPE,
  hp: v.HP
}));

function spawnEnemy(){
  const v=minorVariants[Math.floor(Math.random()*minorVariants.length)];
  enemies.push({
    tier:'minor',
    x:70+Math.random()*(W-140), y:-30, r:CONFIG.MINOR_ENEMIES.SIZE,
    hp:v.hp, max:v.hp, color:v.color,
    vy:v.moveSpeed, bulletSpeed:v.bulletSpeed, pattern:v.pattern, visualShape:v.visualShape,
    phase:Math.random()*6.28, shot:35+Math.random()*50, hitFlash:0
  });
}

function spawnMiniBoss(){
  enemies.push({
    tier:'miniboss',
    x:W/2, y:-55, r:CONFIG.MINI_BOSS.SIZE,
    visualVariant:miniBossDefeated%3,
    hp:CONFIG.MINI_BOSS.HP, max:CONFIG.MINI_BOSS.HP, color:'#ff3048',
    vy:CONFIG.MINI_BOSS.MOVE_SPEED_Y, shot:CONFIG.MINI_BOSS.FIRST_SHOT_DELAY, hitFlash:0, patternIndex:0, patternClock:0, patternRotation:0, dir:Math.random()<.5?-1:1, phase:0
  });
  showToast('MINI BOSS • Red Vanguard');
}

function fireMinor(e){
  const d=difficultySettings[difficulty];
  const s=e.bulletSpeed*d.bulletSpeed;
  const down=Math.PI/2;
  const make=(angle,speed=s,dx=0)=>enemyBullets.push({
    x:e.x+dx,y:e.y+e.r,
    vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
    r:5,color:e.color
  });

  // Minor enemies ONLY fire forward, never toward the player or backward.
  if(e.pattern==='single'){
    make(down);
  }else if(e.pattern==='double'){
    make(down-.055,s,-5); make(down+.055,s,5);
  }else if(e.pattern==='triple'){
    make(down-.12,s); make(down,s); make(down+.12,s);
  }else if(e.pattern==='burst'){
    // Same straight line, three bullets with different speeds.
    make(down,s*.82); make(down,s*1.08); make(down,s*1.34);
  }
}

function chooseNextPattern(current,total,randomize){
  if(total<=1)return 0;
  if(!randomize)return (current+1)%total;
  let next=current;
  while(next===current) next=Math.floor(Math.random()*total);
  return next;
}

function spread120(e,count=9,speed=2.65){
  const d=difficultySettings[difficulty];
  count=Math.max(5,Math.round(count*d.bossDensity));
  speed*=d.bulletSpeed;
  // 120-degree fan centered straight downward.
  const start=Math.PI/6, end=5*Math.PI/6;
  for(let i=0;i<count;i++){
    const a=start+(end-start)*(i/Math.max(1,count-1));
    enemyBullets.push({
      x:e.x,y:e.y+e.r*.4,
      vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
      r:6,color:'#ff465b'
    });
  }
}

function ring(e,n=18,s=2.2,offset=0,color='#b884ff'){
  const d=difficultySettings[difficulty];
  n=Math.max(6,Math.round(n*d.bossDensity));
  s*=d.bulletSpeed;
  for(let i=0;i<n;i++){
    const a=offset+i*Math.PI*2/n;
    enemyBullets.push({
      x:e.x,y:e.y,
      vx:Math.cos(a)*s,vy:Math.sin(a)*s,
      r:5,color
    });
  }
}

function fireBossPattern(patternName){
  if(!boss)return;
  const p=CONFIG.BOSS.PATTERNS[patternName];
  const d=difficultySettings[difficulty];
  if(!p)return;

  const before=enemyBullets.length;
  boss.patternClock++;
  boss.visualPulse=1;
  boss.visualRock=0;

  const push=(a,s,color='#b884ff',shape='orb')=>{
    const speed=s*d.bulletSpeed;
    enemyBullets.push({x:boss.x,y:boss.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:5,color,shape});
  };
  const ringShot=(count,speed,offset,color='#b884ff',shape='orb')=>{
    count=Math.max(6,Math.round(count*d.bossDensity));
    for(let i=0;i<count;i++) push(offset+i*Math.PI*2/count,speed,color,shape);
  };

  // Stage 1 — crystal patterns
  if(patternName==='PRISM_RING'){
    boss.visualPulse=1+.035*Math.sin(boss.patternClock*.16);
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      boss.patternRotation+=p.ROTATION_SPEED;
      ringShot(p.BULLETS,p.SPEED,boss.patternRotation,'#69bfff','orb');
    }
  }else if(patternName==='PRISM_FAN'){
    boss.visualRock=Math.sin(boss.patternClock*.08)*p.SWAY;
    boss.patternRotation=boss.visualRock;
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      const n=Math.max(7,Math.round(p.BULLETS*d.bossDensity));
      const center=Math.PI/2+boss.visualRock;
      for(let i=0;i<n;i++) push(center-p.ARC/2+p.ARC*i/Math.max(1,n-1),p.SPEED,'#8fd8ff','diamond');
    }
  }else if(patternName==='PRISM_CROSS'){
    boss.patternRotation+=p.ROTATION_SPEED*.10;
    boss.visualPulse=1+.025*Math.sin(boss.patternClock*.22);
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      for(let arm=0;arm<p.ARMS;arm++){
        const base=boss.patternRotation+arm*Math.PI*2/p.ARMS;
        for(let j=0;j<p.BULLETS_PER_ARM;j++) push(base+(j-(p.BULLETS_PER_ARM-1)/2)*.075,p.SPEED,'#62aaff','diamond');
      }
    }
  }else if(patternName==='PRISM_SPLIT'){
    boss.visualPulse=1+.05*Math.sin(boss.patternClock*.30);
    boss.patternRotation=Math.sin(boss.patternClock*.06)*.12;
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      const base=Math.PI/2;
      for(let i=0;i<p.PAIRS;i++){
        const off=(i+1)*p.SPREAD;
        push(base-off,p.SPEED,'#9ce7ff','orb'); push(base+off,p.SPEED,'#9ce7ff','orb');
      }
    }
  }else if(patternName==='PRISM_PULSE'){
    boss.visualPulse=1+.07*Math.sin(boss.patternClock*.18);
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      boss.patternRotation+=p.ROTATION_STEP;
      ringShot(p.BULLETS,p.SPEED,boss.patternRotation,'#b6eeff','diamond');
    }
  }

  // Stage 2 — crescent patterns
  else if(patternName==='MOON_SPIRAL'){
    boss.patternRotation+=p.ROTATION_SPEED*.12;
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      for(let arm=0;arm<p.ARMS;arm++){
        const base=boss.patternRotation+arm*Math.PI*2/p.ARMS;
        for(let j=0;j<p.BULLETS_PER_ARM;j++) push(base+j*.10,p.SPEED,arm?'#cf7dff':'#8c63ff','orb');
      }
    }
  }else if(patternName==='MOON_ARC'){
    boss.visualRock=Math.sin(boss.patternClock*.07)*p.ROCK;
    boss.patternRotation=boss.visualRock;
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      const n=Math.max(8,Math.round(p.BULLETS*d.bossDensity));
      const center=Math.PI/2+boss.visualRock;
      for(let i=0;i<n;i++) push(center-p.ARC/2+p.ARC*i/Math.max(1,n-1),p.SPEED,'#d58cff','diamond');
    }
  }else if(patternName==='MOON_WAVE'){
    boss.patternRotation+=p.ROTATION_SPEED*.10;
    boss.visualPulse=1+.025*Math.sin(boss.patternClock*.20);
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      const n=Math.max(8,Math.round(p.BULLETS*d.bossDensity));
      for(let i=0;i<n;i++) push(boss.patternRotation+i*Math.PI*2/n+Math.sin(boss.patternClock*.1+i)*p.WAVE,p.SPEED,'#b36cff','orb');
    }
  }else if(patternName==='MOON_MIRROR'){
    boss.visualRock=Math.sin(boss.patternClock*.09)*.22;
    boss.patternRotation=boss.visualRock;
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      const n=Math.max(6,Math.round(p.BULLETS*d.bossDensity));
      for(let i=0;i<n;i++){
        const off=(i-(n-1)/2)*p.OFFSET;
        push(Math.PI/2+off,p.SPEED,'#ef9cff','diamond');
        push(-Math.PI/2-off,p.SPEED*.88,'#7d59ff','orb');
      }
    }
  }else if(patternName==='MOON_ORBIT'){
    boss.patternRotation+=p.ROTATION_SPEED*.14;
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      const n=Math.max(8,Math.round(p.ORBS*d.bossDensity));
      for(let i=0;i<n;i++) push(boss.patternRotation+i*Math.PI*2/n,p.SPEED*(1+.12*Math.sin(i+boss.patternClock*.08)),'#c77dff','orb');
    }
  }

  // Stage 3 — fortress patterns
  else if(patternName==='FORT_LANCE'){
    boss.patternRotation+=p.ROTATION_SPEED*.08;
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      for(let arm=0;arm<p.ARMS;arm++){
        const base=boss.patternRotation+arm*Math.PI*2/p.ARMS;
        for(let j=0;j<p.BULLETS_PER_ARM;j++) push(base,p.SPEED+j*.18,'#ff596e','diamond');
      }
    }
  }else if(patternName==='FORT_WALL'){
    boss.patternRotation=0;
    boss.visualPulse=1+.018*Math.sin(boss.patternClock*.25);
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      const cols=Math.max(5,Math.round(p.COLUMNS*d.bossDensity));
      for(let i=0;i<cols;i++) push(Math.PI/2+(i-(cols-1)/2)*p.ANGLE_STEP,p.SPEED,'#ff7b69','diamond');
    }
  }else if(patternName==='FORT_BURST'){
    boss.patternRotation+=p.ROTATION_SPEED*.09;
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      for(let point=0;point<p.POINTS;point++){
        const base=boss.patternRotation+point*Math.PI*2/p.POINTS;
        for(let j=0;j<p.BULLETS_PER_POINT;j++) push(base+(j-(p.BULLETS_PER_POINT-1)/2)*.09,p.SPEED,'#ff435f','orb');
      }
    }
  }else if(patternName==='FORT_GRID'){
    boss.visualRock=Math.sin(boss.patternClock*.05)*.08;
    boss.patternRotation=boss.visualRock;
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      for(let row=0;row<p.ROWS;row++){
        const sway=Math.sin(boss.patternClock*.08+row)*p.SWAY;
        for(let i=-3;i<=3;i++) push(Math.PI/2+i*.18+sway,p.SPEED+row*.10,'#ff9a76','diamond');
      }
    }
  }else if(patternName==='FORT_CANNON'){
    boss.visualPulse=1+.06*Math.sin(boss.patternClock*.18);
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      for(let v=0;v<p.VOLLEYS;v++){
        const center=Math.PI/2+(v-(p.VOLLEYS-1)/2)*.42;
        for(let i=0;i<p.BULLETS;i++) push(center-p.ARC/2+p.ARC*i/Math.max(1,p.BULLETS-1),p.SPEED+v*.12,'#ff304e','orb');
      }
    }
  }

  // Stage 4 — bloom patterns
  else if(patternName==='PETAL_FLOWER'){
    boss.patternRotation+=p.ROTATION_SPEED*.12;
    boss.visualPulse=1+.035*Math.sin(boss.patternClock*.18);
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      const petals=Math.max(5,Math.round(p.PETALS*d.bossDensity));
      for(let i=0;i<petals;i++){
        const base=boss.patternRotation+i*Math.PI*2/petals;
        const w=Math.sin(boss.patternClock*.09+i)*p.WAVE;
        push(base+w,p.SPEED,'#69ffb0','orb'); push(base-w,p.SPEED,'#9affd0','diamond');
      }
    }
  }else if(patternName==='PETAL_SEEDS'){
    boss.patternRotation+=p.ROTATION_SPEED*.10;
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      const n=Math.max(8,Math.round(p.BULLETS*d.bossDensity));
      for(let i=0;i<n;i++) push(boss.patternRotation+i*Math.PI*2/n,p.SPEED+(i%2)*.35,'#7cff9b','orb');
    }
  }else if(patternName==='PETAL_VINES'){
    boss.visualRock=Math.sin(boss.patternClock*.08)*.18;
    boss.patternRotation=boss.visualRock;
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      const n=Math.max(8,Math.round(p.BULLETS*d.bossDensity));
      for(let i=0;i<n;i++) push(Math.PI/2+(i-(n-1)/2)*.16+Math.sin(boss.patternClock*.08+i)*p.CURVE,p.SPEED,'#55d98c','diamond');
    }
  }else if(patternName==='PETAL_BLOOM'){
    boss.visualPulse=1+.08*Math.sin(boss.patternClock*.14);
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      boss.patternRotation+=p.STEP;
      for(let r=0;r<p.RINGS;r++) ringShot(p.BULLETS,p.SPEED+r*.30,boss.patternRotation+r*.16,'#b4ffc5',r?'diamond':'orb');
    }
  }else if(patternName==='PETAL_SWIRL'){
    boss.patternRotation+=p.ROTATION_SPEED*.13;
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      const n=Math.max(8,Math.round(p.ORBS*d.bossDensity));
      for(let i=0;i<n;i++) push(boss.patternRotation+i*Math.PI*2/n+Math.sin(i+boss.patternClock*.1)*p.WAVE,p.SPEED,'#66ffc0',i%2?'diamond':'orb');
    }
  }

  // Stage 5 — void patterns
  else if(patternName==='VOID_CAGE'){
    boss.patternRotation+=p.ROTATION_SPEED*.11;
    boss.visualPulse=1+.025*Math.sin(boss.patternClock*.20);
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      for(let side=0;side<p.SIDES;side++){
        const base=boss.patternRotation+side*Math.PI*2/p.SIDES;
        for(let j=0;j<p.BULLETS_PER_SIDE;j++) push(base+(j-(p.BULLETS_PER_SIDE-1)/2)*.06,p.SPEED+j*.12,'#d8b0ff','diamond');
      }
    }
  }else if(patternName==='VOID_LANCE'){
    boss.patternRotation+=p.ROTATION_SPEED*.15;
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      for(let arm=0;arm<p.ARMS;arm++){
        const a=boss.patternRotation+arm*Math.PI*2/p.ARMS;
        for(let j=0;j<p.BULLETS_PER_ARM;j++) push(a,p.SPEED+j*.22,'#ffffff',j%2?'diamond':'orb');
      }
    }
  }else if(patternName==='VOID_COLLAPSE'){
    boss.visualPulse=1+.09*Math.sin(boss.patternClock*.12);
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      boss.patternRotation+=p.ROTATION_STEP;
      ringShot(p.BULLETS,p.SPEED,boss.patternRotation,'#8d5cff','diamond');
    }
  }else if(patternName==='VOID_TWIST'){
    boss.patternRotation+=p.ROTATION_SPEED*.18;
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      for(let arm=0;arm<p.ARMS;arm++){
        const base=boss.patternRotation+arm*Math.PI*2/p.ARMS;
        for(let j=0;j<p.BULLETS_PER_ARM;j++) push(base+j*.11,p.SPEED,'#b17cff',arm%2?'diamond':'orb');
      }
    }
  }else if(patternName==='VOID_NOVA'){
    boss.patternRotation+=p.ROTATION_SPEED*.10;
    boss.visualPulse=1+.045*Math.sin(boss.patternClock*.22);
    if(boss.patternClock%p.FIRE_INTERVAL===0){
      for(let point=0;point<p.POINTS;point++){
        const base=boss.patternRotation+point*Math.PI*2/p.POINTS;
        for(let j=0;j<p.BULLETS_PER_POINT;j++) push(base+(j-1)*.08,p.SPEED,'#f0d8ff',j===1?'diamond':'orb');
      }
    }
  }

  if(enemyBullets.length>before && typeof playBossShotSfx==='function') playBossShotSfx();
}
function updateBossPatterns(){
  if(!boss)return;
  boss.clock++;

  const variant=CONFIG.BOSS.VARIANTS[boss.variantIndex]||CONFIG.BOSS.VARIANTS[0];

  if(boss.moveState==='moving'){
    const dx=boss.targetX-boss.x, dy=boss.targetY-boss.y;
    const distance=Math.hypot(dx,dy);
    if(distance<=CONFIG.BOSS.POSITION_REACHED_DISTANCE){
      boss.x=boss.targetX; boss.y=boss.targetY;
      boss.moveState='stopped';
      boss.stopTimer=variant.stopTime;
      boss.patternClock=0; boss.patternRotation=0;

      const point=variant.route[boss.moveIndex];
      const options=point.patterns||variant.route[0].patterns;
      boss.activePattern=difficultySettings[difficulty].RANDOM_BOSS_PATTERN
        ? options[Math.floor(Math.random()*options.length)]
        : options[0];
    }else{
      boss.x+=(dx/distance)*variant.moveSpeed;
      boss.y+=(dy/distance)*variant.moveSpeed;
    }
    return; // no shooting while moving
  }

  fireBossPattern(boss.activePattern);
  boss.stopTimer--;

  if(boss.stopTimer<=0){
    boss.moveIndex=(boss.moveIndex+1)%variant.route.length;
    const next=variant.route[boss.moveIndex];
    const margin=boss.r+16;
    boss.targetX=Math.max(margin,Math.min(W-margin,W*next.x));
    boss.targetY=Math.max(margin,Math.min(H-margin,H*next.y));
    boss.moveState='moving';
    boss.activePattern=null;
    boss.patternClock=0;
  }
}




function getBossConfig(){
  const variant=CONFIG.BOSS.VARIANTS[currentStage] || CONFIG.BOSS.VARIANTS[0];
  const hpScale=difficultySettings[difficulty]?.bossHP ?? 1;

  return {
    ...variant,
    hp:Math.round(variant.baseHP*hpScale),
    radius:variant.size,
    speed:variant.moveSpeed,
    stopFrames:variant.stopTime
  };
}

function spawnBoss(){
  const cfg=getBossConfig();
  const firstPoint=cfg.route?.[0] || {x:.5,y:.18,patterns:['PRISM_RING']};

  enemies.length=0;
  enemyBullets.length=0;
  bullets.length=0;
  pickups.length=0;

  const margin=cfg.radius+16;
  const startX=Math.max(margin,Math.min(W-margin,W*firstPoint.x));
  const startY=Math.max(margin,Math.min(H-margin,H*firstPoint.y));

  const firstOptions=firstPoint.patterns || ['PRISM_RING'];
  const firstPattern=difficultySettings[difficulty]?.RANDOM_BOSS_PATTERN
    ? firstOptions[Math.floor(Math.random()*firstOptions.length)]
    : firstOptions[0];

  boss={
    name:cfg.name,
    shape:cfg.shape,
    variantIndex:currentStage,

    x:startX,
    y:startY,
    r:cfg.radius,

    hp:cfg.hp,
    max:cfg.hp,

    speed:cfg.moveSpeed,
    moveSpeed:cfg.moveSpeed,
    stopTime:cfg.stopTime,

    fire:0,
    angle:0,
    visualAngle:0,
    hitFlash:0,
    clock:0,

    appearTimer:CONFIG.TRANSITIONS.BOSS_ENTRANCE_FRAMES,
    appearMax:CONFIG.TRANSITIONS.BOSS_ENTRANCE_FRAMES,

    // Start at the first route point, fire there, then move to the next point.
    moveState:'stopped',
    stopTimer:cfg.stopTime,
    moveTimer:cfg.stopTime,
    moveIndex:0,
    targetX:startX,
    targetY:startY,

    patternClock:0,
    patternIndex:0,
    patternRotation:0,
    visualPulse:1,
    visualRock:0,
    activePattern:firstPattern
  };

  bossbar.classList.remove('hidden');
  bossfill.style.width='100%';
}


function beginBossTransition(){
  if(transition.type!=='none' || boss)return;

  enemies.length=0;
  enemyBullets.length=0;
  bullets.length=0;

  spawnBoss();
  if(!boss)return;

  boss.appearTimer=CONFIG.TRANSITIONS.BOSS_ENTRANCE_FRAMES;
  boss.appearMax=CONFIG.TRANSITIONS.BOSS_ENTRANCE_FRAMES;

  transition={
    type:'boss-enter',
    timer:CONFIG.TRANSITIONS.BOSS_ENTRANCE_FRAMES,
    max:CONFIG.TRANSITIONS.BOSS_ENTRANCE_FRAMES,
    bossX:boss.x,
    bossY:boss.y
  };

  startBossMusic(currentStage,true);
}

function beginStageTransition(){
  if(transition.type!=='none')return;

  if(currentStage>=CONFIG.STAGES.length-1){
    end(true);
    return;
  }

  enemies.length=0;
  enemyBullets.length=0;
  bullets.length=0;

  transition={
    type:'stage-change',
    timer:CONFIG.TRANSITIONS.STAGE_CHANGE_FRAMES,
    max:CONFIG.TRANSITIONS.STAGE_CHANGE_FRAMES,
    targetStage:currentStage+1
  };
}


function updateTransitionState(){
  if(transition.type==='none')return;

  transition.timer=Math.max(0,transition.timer-1);
  if(transition.timer>0)return;

  if(transition.type==='boss-enter'){
    if(boss){
      boss.appearTimer=0;
    }
    transition={type:'none',timer:0,max:1};
    return;
  }

  if(transition.type==='stage-change'){
    const target=transition.targetStage;
    transition={type:'none',timer:0,max:1};

    if(target===undefined)return;

    currentStage=target;
    player.hp=Math.min(player.maxHp,player.hp+1);

    stageTime=0;
    spawnClock=0;
    miniBossDefeated=0;
    bossDelayClock=0;

    enemies.length=0;
    enemyBullets.length=0;
    bullets.length=0;

    startStageMusic(currentStage,true);
  }
}

function hitPlayer(){
  if(!player || player.inv>0 || scene!=='game')return;

  // Shield absorbs exactly one hit.
  // It grants i-frames but DOES NOT clear enemies or bullets.
  if(player.shield>0){
    player.shield=0;
    player.inv=CONFIG.PLAYER.SHIELD_IFRAMES;
    addParticle(player.x,player.y,'#7ee8ff',24);
    return;
  }

  player.hp--;
  player.inv=CONFIG.PLAYER.HIT_IFRAMES;

  // Unshielded hit creates the clear ripple.
  clearRipples.push({
    x:player.x,
    y:player.y,
    r:6,
    life:34,
    maxLife:34
  });

  // Defer the panic clear until all collision loops finish.
  pendingHitClear=true;

  addParticle(player.x,player.y,'#ffffff',24);

  if(player.hp<=0){
    end(false);
  }
}

function end(win){
  scene='over';
  startLobbyMusic(true); hud.classList.add('hidden'); bossbar.classList.add('hidden'); over.classList.remove('hidden');
  document.querySelector('#touchControls').classList.add('hidden');
  document.querySelector('#touchControls').setAttribute('aria-hidden','true');
  document.querySelector('#resultEyebrow').textContent=win?'MISSION COMPLETE':'MISSION FAILED';
  document.querySelector('#resultTitle').textContent=win?'Stage Clear!':'Game Over';
  document.querySelector('#resultText').textContent=`${win?'Guardian defeated. ':'The shrine was overwhelmed. '}Score: ${Math.floor(score).toLocaleString()}`;
  document.querySelector('#resultStats').textContent=`Pilot: ${chars[selected].name} • Difficulty: ${difficultySettings[difficulty].label} • Life: ${player ? player.hp : 0}/${player ? player.maxHp : CONFIG.PLAYER.MAX_LIFE}`;
}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function update(){
  if(scene!=='game'||paused)return;
  t++; visualMusicClock++;

  // Stage transitions do not lock the player.
  // Only stage spawning/progression pauses while the background changes.
  const stageTransitionActive=transition.type==='stage-change';
  const bossTransitionActive=transition.type==='boss-enter';
  const miniBossActive=enemies.some(e=>e.tier==='miniboss');
  const stagePausedByBoss=miniBossActive || !!boss;

  // Progression time stops while a mini-boss or boss is on screen.
  if(!stagePausedByBoss && !stageTransitionActive && !bossTransitionActive){
    stageTime++;
  }

  for(const s of stars){s.y+=.35+s.z*1.2;if(s.y>H){s.y=0;s.x=Math.random()*W}}
  const focus=keys.ShiftLeft||keys.ShiftRight, sp=focus?player.focus:player.speed;
  let dx=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0);
  let dy=(keys.ArrowDown||keys.KeyS?1:0)-(keys.ArrowUp||keys.KeyW?1:0);

  if(Math.abs(touchState.moveX)>.01 || Math.abs(touchState.moveY)>.01){
    dx=touchState.moveX;
    dy=touchState.moveY;
  }
  if(dx&&dy){dx*=.707;dy*=.707}
  player.x=Math.max(18,Math.min(W-18,player.x+dx*sp)); player.y=Math.max(45,Math.min(H-20,player.y+dy*sp));
  // Auto-fire pauses only while changing to the next stage after a boss defeat.
  if(!stageTransitionActive){
    shootPlayer();
  }
  if(player.cool>0)player.cool--;
  if(player.inv>0)player.inv--;

  if(!boss && !stageTransitionActive && !bossTransitionActive){
    const miniAlive=enemies.some(e=>e.tier==='miniboss');

    // ----------------------------------------------------------
    // STAGE PROGRESSION
    // stageTime itself is frozen while a mini-boss is alive.
    // ----------------------------------------------------------
    if(!miniAlive){
      const maxMinis=CONFIG.STAGE.MAX_MINI_BOSSES_BEFORE_BOSS;

      if(miniBossDefeated < maxMinis){
        // Spawn the next mini-boss every configured interval of active stage time.
        const nextMiniTime=(miniBossDefeated+1)*CONFIG.STAGE.MINI_BOSS_INTERVAL;

        if(stageTime>=nextMiniTime){
          spawnMiniBoss();
        }
      }else{
        // Once all configured mini-bosses are defeated, count active stage time
        // toward the final boss.
        bossDelayClock++;

        if(bossDelayClock>=CONFIG.STAGE.BOSS_DELAY_AFTER_MINI_BOSSES){
          beginBossTransition();
        }
      }
    }

    // Spawn normal enemies only while no mini-boss is active
    // and before the final boss encounter.
    if(!enemies.some(e=>e.tier==='miniboss') && !boss){
      spawnClock--;

      if(spawnClock<=0){
        spawnEnemy();

        const rate=difficultySettings[difficulty].spawnRate;
        spawnClock=Math.max(
          CONFIG.STAGE.MIN_MINOR_SPAWN_DELAY,
          Math.round(
            (CONFIG.STAGE.BASE_MINOR_SPAWN_DELAY-
            stageTime/CONFIG.STAGE.SPAWN_ACCELERATION)/rate
          )
        );
      }
    }
  }else if(boss){
    if((boss.appearTimer||0)<=0 && transition.type!=='boss-enter'){
      updateBossPatterns();
    }
    if(boss){
      bossfill.style.width=(boss.hp/boss.max*100)+'%';
    }
  }

  for(const e of enemies){
    if(e.tier==='minor'){
      e.y+=e.vy;
      e.x+=Math.sin(t*.025+e.phase)*.45;
      e.shot--;
      if(e.shot<=0){
        fireMinor(e);
        e.shot=CONFIG.MINOR_ENEMIES.SHOOT_DELAY_MIN+Math.random()*CONFIG.MINOR_ENEMIES.SHOOT_DELAY_RANDOM;
      }
    }else if(e.tier==='miniboss'){
      if(e.y<125) e.y+=e.vy;
      else{e.x+=e.dir*CONFIG.MINI_BOSS.MOVE_SPEED_X;if(e.x<85||e.x>W-85)e.dir*=-1;}
      e.patternClock++; e.shot--;
      const names=['FAN','SWEEP','TRIPLE_FAN'];
      if(e.patternClock>=CONFIG.MINI_BOSS.PATTERN_DURATION){
        e.patternClock=0;e.patternIndex=chooseNextPattern(e.patternIndex,names.length,CONFIG.MINI_BOSS.RANDOM_PATTERN);
      }
      if(e.shot<=0){
        const name=names[e.patternIndex],p=CONFIG.MINI_BOSS.PATTERNS[name],d=difficultySettings[difficulty];
        if(name==='FAN'){
          const count=Math.round(p.COUNT*d.bossDensity),width=p.ARC_DEGREES*Math.PI/180,start=Math.PI/2-width/2;
          for(let i=0;i<count;i++){const a=start+width*i/Math.max(1,count-1),s=p.SPEED*d.bulletSpeed;enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:6,color:'#ff465b',shape:'orb'});}
        }else if(name==='SWEEP'){
          e.patternRotation+=p.ROTATION_SPEED;const count=Math.round(p.COUNT*d.bossDensity),width=p.ARC_DEGREES*Math.PI/180,start=Math.PI/2-width/2+Math.sin(e.patternRotation)*.55;
          for(let i=0;i<count;i++){const a=start+width*i/Math.max(1,count-1),s=p.SPEED*d.bulletSpeed;enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:6,color:'#ff7b5b',shape:'diamond'});}
        }else{
          for(let layer=0;layer<p.LAYERS;layer++){const count=Math.round(p.COUNT*d.bossDensity),width=p.ARC_DEGREES*Math.PI/180,start=Math.PI/2-width/2;
            for(let i=0;i<count;i++){const a=start+width*i/Math.max(1,count-1),s=(p.SPEED+layer*p.LAYER_SPEED_STEP)*d.bulletSpeed;enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:5,color:'#ff3550',shape:layer%2?'diamond':'orb'});}}
        }
        e.shot=e.hp<e.max*CONFIG.MINI_BOSS.LOW_HP_THRESHOLD?CONFIG.MINI_BOSS.SHOT_DELAY_LOW_HP:CONFIG.MINI_BOSS.SHOT_DELAY_HIGH_HP;
      }
    }
  }
  // Direct contact damage: touching an enemy counts as a hit.
  // Player's actual hitbox remains the white dot radius.
  if(player.inv<=0){
    for(const e of enemies){
      if(dist(player,e)<player.r+e.r){
        hitPlayer();
        break;
      }
    }

    if(boss && (boss.appearTimer||0)<=0 && player.inv<=0){
      if(dist(player,boss)<player.r+boss.r){
        hitPlayer();
      }
    }
  }

  bullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy});
  enemyBullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy});

  // Player takes damage when touching any enemy body.
  // hitPlayer() handles shield and i-frames.
  if(player.inv<=0){
    for(const e of enemies){
      if(dist(player,e)<player.r+e.r){
        hitPlayer();
        break;
      }
    }

    if(boss && (boss.appearTimer||0)<=0 && player.inv<=0){
      if(dist(player,boss)<player.r+boss.r){
        hitPlayer();
      }
    }
  }
  pickups.forEach(p=>{p.y+=CONFIG.POWERUPS.FALL_SPEED;p.x+=Math.sin(t*CONFIG.POWERUPS.WOBBLE_SPEED+p.seed)*CONFIG.POWERUPS.WOBBLE_AMOUNT});
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=.96;p.vy*=.96;p.life--;});
  clearRipples.forEach(r=>{r.r+=18;r.life--;});

  for(let bi=bullets.length-1;bi>=0;bi--){
    const b=bullets[bi]; let remove=false;
    if(boss && (boss.appearTimer||0)<=0 && dist(b,boss)<boss.r+b.r){
      boss.hp-=b.d;
      boss.hitFlash=CONFIG.BOSS.HIT_FLICKER_FRAMES;
      score+=7;
      remove=!b.pierce; if(boss && boss.hp<=0){
        const bx=boss.x;
        const by=boss.y;

        addParticle(bx,by,'#ff9ad9',80);
        clearRipples.push({x:bx,y:by,r:12,life:45,maxLife:45});

        boss=null;
        bossbar.classList.add('hidden');

        beginStageTransition();
        return;
      }}
    for(let ei=enemies.length-1;ei>=0&&!remove;ei--){
      const e=enemies[ei];
      if(dist(b,e)<e.r+b.r){
        e.hp-=b.d;
        e.hitFlash=e.tier==='miniboss'
          ? CONFIG.MINI_BOSS.HIT_FLICKER_FRAMES
          : CONFIG.MINOR_ENEMIES.HIT_FLICKER_FRAMES;
        score+=e.tier==='miniboss'?8:4;
        remove=!b.pierce;
        if(e.hp<=0){
          const mini=e.tier==='miniboss';
          score+=mini?1600:100;
          addParticle(e.x,e.y,e.color,mini?40:14);
          if(mini){
            miniBossDefeated++;
            bossDelayClock=0;

            pickups.push({x:e.x-28,y:e.y,r:11,type:'power',seed:Math.random()*10});
            pickups.push({x:e.x,y:e.y,r:11,type:'shield',seed:Math.random()*10});
            pickups.push({x:e.x+28,y:e.y,r:11,type:'life',seed:Math.random()*10});

            if(miniBossDefeated>=CONFIG.STAGE.MAX_MINI_BOSSES_BEFORE_BOSS){
              showToast('Final Guardian Approaching');
            }
          }else if(Math.random()<CONFIG.POWERUPS.MINOR_DROP_CHANCE){
            const roll=Math.random();
            const bulletCut=CONFIG.POWERUPS.BULLET_LINE_CHANCE;
            const shieldCut=bulletCut+CONFIG.POWERUPS.SHIELD_CHANCE;
            const lifeCut=shieldCut+CONFIG.POWERUPS.LIFE_CHANCE;
            const type=roll<bulletCut?'power':roll<shieldCut?'shield':roll<lifeCut?'life':'score';
            pickups.push({x:e.x,y:e.y,r:10,type,seed:Math.random()*10});
          }
          enemies.splice(ei,1);
        }
      }
    }
    if(remove||b.y<-30||b.x<-30||b.x>W+30)bullets.splice(bi,1);
  }
  for(let i=enemyBullets.length-1;i>=0;i--){
    const b=enemyBullets[i]; if(dist(b,player)<b.r+player.r){enemyBullets.splice(i,1);hitPlayer();continue}
    if(b.y>H+30||b.y<-40||b.x<-40||b.x>W+40)enemyBullets.splice(i,1);
  }
  for(let i=pickups.length-1;i>=0;i--){
    const p=pickups[i];
    if(dist(p,player)<p.r+15){
      if(p.type==='power'){
        if(player.power>=CONFIG.PLAYER.MAX_BULLET_LINES) score+=CONFIG.POWERUPS.MAXED_PICKUP_SCORE;
        else player.power++;
      }
      if(p.type==='shield'){
        if(player.shield) score+=CONFIG.POWERUPS.MAXED_PICKUP_SCORE;
        else player.shield=1;
      }
      if(p.type==='life'){
        if(player.hp>=player.maxHp) score+=CONFIG.POWERUPS.MAXED_PICKUP_SCORE;
        else player.hp++;
      }
      if(p.type==='score') score+=CONFIG.POWERUPS.SCORE_VALUE;
      pickups.splice(i,1);continue;
    }
    if(p.y>H+20)pickups.splice(i,1);
  }
  for(const e of enemies){
    if(e.hitFlash>0)e.hitFlash--;
  }
  if(boss && boss.hitFlash>0)boss.hitFlash--;

  // Apply hit clear after all collision/update loops are finished.
  // This avoids changing the enemies array while it is being iterated.
  if(pendingHitClear){
    enemyBullets.length=0;
    enemies=enemies.filter(e=>e.tier!=='minor');
    pendingHitClear=false;
  }

  updateTransitionState();

  enemies=enemies.filter(e=>e.y<H+50);
  bullets=bullets.filter(b=>b.y>-40);
  particles=particles.filter(p=>p.life>0);
  clearRipples=clearRipples.filter(r=>r.life>0);
  score+=.06;
  const lifeIcons=document.querySelector('#lifeIcons'),shieldIcon=document.querySelector('#shieldIcon'),stageLabel=document.querySelector('#stageLabel');

  lifeIcons.innerHTML='';
  for(let i=0;i<player.hp;i++){
    const heart=document.createElement('span');
    heart.className='hud-heart';
    heart.textContent='♥';
    lifeIcons.appendChild(heart);
  }

  shieldIcon.textContent=player.shield?'◉':'—';
  stageLabel.textContent=`S${currentStage+1}`;
  scoreNumber.textContent=Math.floor(score).toLocaleString();
}
function draw(){
  ctx.clearRect(0,0,W,H);
  const stage=CONFIG.STAGES[currentStage]||CONFIG.STAGES[0];

  let bgTop=stage.backgroundTop;
  let bgBottom=stage.backgroundBottom;

  if(transition.type==='boss-enter' && transition.timer>0){
    const raw=1-transition.timer/transition.max;
    const p=raw*raw*(3-2*raw);
    bgTop=mixHex(stage.backgroundTop,stage.bossGradientA,p);
    bgBottom=mixHex(stage.backgroundBottom,stage.bossGradientB,p);
  }
  else if(transition.type==='stage-change' && transition.timer>0){
    const raw=1-transition.timer/transition.max;
    const p=raw*raw*(3-2*raw);
    const targetIndex=transition.targetStage ?? Math.min(currentStage+1,CONFIG.STAGES.length-1);
    const next=CONFIG.STAGES[targetIndex]||stage;

    bgTop=mixHex(stage.backgroundTop,next.backgroundTop,p);
    bgBottom=mixHex(stage.backgroundBottom,next.backgroundBottom,p);
  }
  else if(boss){
    bgTop=stage.bossGradientA;
    bgBottom=stage.bossGradientB;
  }

  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,bgTop);
  g.addColorStop(1,bgBottom);
  ctx.fillStyle=g;
  ctx.fillRect(0,0,W,H);

  for(const s of stars){ctx.globalAlpha=.35+s.z*.65;ctx.fillStyle='#b7d7ff';ctx.fillRect(s.x,s.y,1+s.z*1.5,1+s.z*1.5)}ctx.globalAlpha=1;
  ctx.strokeStyle=stage.grid;ctx.lineWidth=1;
  for(let x=0;x<W;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  for(let y=0;y<H;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}

  if(scene==='game'||scene==='over'){
    for(const p of pickups){
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.shadowBlur=18;

      if(p.type==='power'){
        ctx.fillStyle='#66dcff';ctx.shadowColor='#66dcff';
        ctx.beginPath();
        ctx.moveTo(0,-11);ctx.lineTo(9,7);ctx.lineTo(3,7);ctx.lineTo(3,11);
        ctx.lineTo(-3,11);ctx.lineTo(-3,7);ctx.lineTo(-9,7);ctx.closePath();ctx.fill();
        ctx.fillStyle='#ffffff';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('+',0,1);
      }else if(p.type==='shield'){
        ctx.fillStyle='#7ee8ff';ctx.shadowColor='#7ee8ff';
        ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.stroke();
      }else if(p.type==='life'){
        ctx.fillStyle='#79ff9a';ctx.shadowColor='#79ff9a';
        ctx.beginPath();
        ctx.moveTo(0,10);ctx.bezierCurveTo(-14,2,-12,-8,-5,-9);
        ctx.bezierCurveTo(-1,-10,0,-6,0,-4);
        ctx.bezierCurveTo(0,-6,1,-10,5,-9);
        ctx.bezierCurveTo(12,-8,14,2,0,10);ctx.fill();
      }else{
        ctx.fillStyle='#ffe477';ctx.shadowColor='#ffe477';
        ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fill();
      }

      ctx.restore();
    }
    for(const b of bullets){ctx.fillStyle='#9ff7ff';ctx.shadowBlur=10;ctx.shadowColor='#6fefff';ctx.fillRect(b.x-b.r,b.y-10,b.r*2,16);ctx.shadowBlur=0}
    for(const b of enemyBullets){
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx)+Math.PI/2);ctx.fillStyle=b.color;ctx.shadowBlur=12;ctx.shadowColor=b.color;
      if(b.shape==='diamond'){ctx.beginPath();ctx.moveTo(0,-b.r*1.55);ctx.lineTo(b.r,0);ctx.lineTo(0,b.r*1.55);ctx.lineTo(-b.r,0);ctx.closePath();ctx.fill();}
      else if(b.shape==='star'){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?b.r*.48:b.r*1.45;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fill();}
      else{ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=.72;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-b.r*.22,-b.r*.25,Math.max(1,b.r*.26),0,Math.PI*2);ctx.fill();ctx.restore();
    }
    for(const e of enemies){
      ctx.save(); ctx.translate(e.x,e.y);
      const enemyFlicker=e.hitFlash>0 && Math.floor(e.hitFlash/2)%2===1;
      ctx.fillStyle=enemyFlicker?'#ffffff':e.color;
      ctx.shadowBlur=e.tier==='miniboss'?20:9;
      ctx.shadowColor=e.color;
      if(e.tier==='miniboss'){
        if(e.visualVariant===0){
          ctx.beginPath();for(let i=0;i<12;i++){const a=-Math.PI/2+i*Math.PI/6,rr=i%2===0?e.r:e.r*.55,px=Math.cos(a)*rr,py=Math.sin(a)*rr;i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}ctx.closePath();ctx.fill();
        }else if(e.visualVariant===1){
          ctx.beginPath();ctx.moveTo(0,-e.r);ctx.lineTo(e.r*.9,-e.r*.2);ctx.lineTo(e.r*.45,e.r);ctx.lineTo(0,e.r*.55);ctx.lineTo(-e.r*.45,e.r);ctx.lineTo(-e.r*.9,-e.r*.2);ctx.closePath();ctx.fill();
          ctx.fillRect(-e.r*.75,-3,e.r*1.5,6);
        }else{
          ctx.beginPath();for(let i=0;i<8;i++){const a=Math.PI/4+i*Math.PI/4,rr=i%2?e.r*.58:e.r;const px=Math.cos(a)*rr,py=Math.sin(a)*rr;i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}ctx.closePath();ctx.fill();
          ctx.fillStyle='#310713';ctx.beginPath();ctx.arc(0,0,e.r*.30,0,Math.PI*2);ctx.fill();
        }
        ctx.strokeStyle='#ffd6db';ctx.lineWidth=3;ctx.stroke();
      }else{
        if(e.visualShape==='needle'){ctx.beginPath();ctx.moveTo(0,e.r);ctx.lineTo(-e.r*.65,-e.r);ctx.lineTo(0,-e.r*.45);ctx.lineTo(e.r*.65,-e.r);ctx.closePath();ctx.fill();}
        else if(e.visualShape==='split'){ctx.beginPath();ctx.moveTo(-e.r,-e.r*.7);ctx.lineTo(-2,e.r);ctx.lineTo(0,e.r*.2);ctx.lineTo(2,e.r);ctx.lineTo(e.r,-e.r*.7);ctx.closePath();ctx.fill();}
        else if(e.visualShape==='trident'){ctx.fillRect(-3,-e.r,6,e.r*2);ctx.fillRect(-e.r,-e.r*.6,5,e.r*1.2);ctx.fillRect(e.r-5,-e.r*.6,5,e.r*1.2);}
        else{ctx.fillRect(-e.r*.75,-e.r,e.r*1.5,e.r*.45);ctx.fillRect(-e.r*.55,-e.r*.35,e.r*1.1,e.r*.45);ctx.fillRect(-e.r*.35,e.r*.3,e.r*.7,e.r*.55);}
      }
      ctx.restore();
    }
    if(boss){
      ctx.save();ctx.translate(boss.x,boss.y);
      const patternSpin=boss.activePattern?(boss.patternRotation||0):0;
      const movementSpin=boss.moveState==='moving'?Math.atan2(boss.targetY-boss.y,boss.targetX-boss.x)+Math.PI/2:0;
      const bossVisualRotation=boss.moveState==='stopped'?patternSpin:movementSpin;
      ctx.rotate(bossVisualRotation);
      const bossVisualScale=boss.moveState==='stopped'?(boss.visualPulse||1):1;
      ctx.scale(bossVisualScale,bossVisualScale);
      const bossFlicker=boss.hitFlash>0 && Math.floor(boss.hitFlash/2)%2===1;
      const bossColor=mixHex(stage.bossGradientA,stage.bossGradientB,.25+.55*(.5+.5*Math.sin(getMusicTime()*.9+boss.patternRotation*.5)));
      ctx.fillStyle=bossFlicker?'#ffffff':bossColor;
      ctx.shadowBlur=28;ctx.shadowColor='#ffffff66';

      if(boss.shape==='crystal'){
        ctx.beginPath();ctx.moveTo(0,-boss.r);ctx.lineTo(boss.r*.75,-boss.r*.15);ctx.lineTo(boss.r*.42,boss.r);ctx.lineTo(0,boss.r*.60);ctx.lineTo(-boss.r*.42,boss.r);ctx.lineTo(-boss.r*.75,-boss.r*.15);ctx.closePath();ctx.fill();
      }else if(boss.shape==='crescent'){
        ctx.beginPath();ctx.arc(0,0,boss.r,-Math.PI*.72,Math.PI*.72);ctx.arc(boss.r*.34,0,boss.r*.72,Math.PI*.72,-Math.PI*.72,true);ctx.closePath();ctx.fill();
      }else if(boss.shape==='fortress'){
        ctx.beginPath();ctx.rect(-boss.r*.72,-boss.r*.72,boss.r*1.44,boss.r*1.44);ctx.fill();
        ctx.fillRect(-boss.r,-boss.r*.22,boss.r*2,boss.r*.44);ctx.fillRect(-boss.r*.22,-boss.r,boss.r*.44,boss.r*2);
      }else if(boss.shape==='bloom'){
        ctx.beginPath();for(let i=0;i<20;i++){const a=-Math.PI/2+i*Math.PI/10,rr=i%2===0?boss.r:boss.r*.52,px=Math.cos(a)*rr,py=Math.sin(a)*rr;i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}ctx.closePath();ctx.fill();
      }else if(boss.shape==='voidcore'){
        // Final boss: solid central core + four rotating blade arms.
        // Deliberately non-flower/non-star silhouette so Stage 5 is unmistakable.
        ctx.beginPath();
        for(let i=0;i<8;i++){
          const a=-Math.PI/8+i*Math.PI/4;
          const rr=boss.r*.58;
          const px=Math.cos(a)*rr,py=Math.sin(a)*rr;
          i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
        }
        ctx.closePath();ctx.fill();

        ctx.save();
        ctx.rotate(-bossVisualRotation*1.35);
        for(let arm=0;arm<4;arm++){
          ctx.save();ctx.rotate(arm*Math.PI/2);
          ctx.beginPath();
          ctx.moveTo(boss.r*.30,-boss.r*.18);
          ctx.lineTo(boss.r*1.08,-boss.r*.34);
          ctx.lineTo(boss.r*.88,0);
          ctx.lineTo(boss.r*1.08,boss.r*.34);
          ctx.lineTo(boss.r*.30,boss.r*.18);
          ctx.closePath();ctx.fill();
          ctx.restore();
        }
        ctx.restore();

        ctx.fillStyle='#09000f';
        ctx.beginPath();ctx.arc(0,0,boss.r*.30,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#ff4df2';ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(0,0,boss.r*.42,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle='#ffffff';
        ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();
      }else{
        ctx.beginPath();ctx.arc(0,0,boss.r,0,Math.PI*2);ctx.fill();
      }

      ctx.shadowBlur=0;ctx.strokeStyle='#d9dded';ctx.lineWidth=4;ctx.stroke();
      ctx.strokeStyle='#6b6f85';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,boss.r+10,bossVisualRotation,bossVisualRotation+Math.PI*1.45);ctx.stroke();
      ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/40);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;
    for(const r of clearRipples){ctx.save();ctx.globalAlpha=r.life/r.maxLife;ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();ctx.restore();}

    if(player){
      ctx.save();ctx.translate(player.x,player.y);
      const playerFlicker=player.inv>0 && Math.floor(player.inv/6)%2===1;
      ctx.globalAlpha=1;
      ctx.fillStyle=playerFlicker?'#ffffff':player.color;
      ctx.shadowBlur=18;
      ctx.shadowColor=playerFlicker?'#ffffff':player.color;
      ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(11,13);ctx.lineTo(0,8);ctx.lineTo(-11,13);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
      if(player.shield){
        ctx.strokeStyle='#7ee8ff';ctx.lineWidth=3;ctx.globalAlpha=.88;
        ctx.beginPath();ctx.arc(0,0,22+Math.sin(t*.08)*2,0,Math.PI*2);ctx.stroke();
        ctx.globalAlpha=1;
      }
      // The white dot is always visible and remains the real 3px collision hitbox.
      ctx.fillStyle='#fff';ctx.shadowBlur=8;ctx.shadowColor='#fff';ctx.beginPath();ctx.arc(0,0,player.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.restore();
    }
    if(paused){
      ctx.fillStyle='#070914aa';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='700 44px system-ui';ctx.fillText('PAUSED',W/2,H/2);
      ctx.font='18px system-ui';ctx.fillStyle='#bfc7e8';ctx.fillText('Press Esc to continue',W/2,H/2+38);
    }
  }

  drawSceneTransition();
}

function drawSceneTransition(){
  if(transition.type!=='boss-enter'||transition.timer<=0)return;

  const p=1-transition.timer/transition.max;
  const radius=20+p*Math.max(W,H)*.42;
  const alpha=Math.sin(Math.PI*p)*.65;

  const x=transition.bossX ?? W/2;
  const y=transition.bossY ?? H*.2;

  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.strokeStyle='#ffffff';
  ctx.lineWidth=2.5;
  ctx.beginPath();
  ctx.arc(x,y,radius,0,Math.PI*2);
  ctx.stroke();
  ctx.restore();
}

function loop(){
  // Audio fading must continue in menus as well as gameplay.
  updateMusicFade();
  update();
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.code==='Escape'&&scene==='game'){paused=!paused;showToast(paused?'Paused':'Resume')}})
addEventListener('keyup',e=>keys[e.code]=false);

document.querySelector('#startBtn').onclick=()=>{startLobbyMusic(false);menu.classList.add('hidden');select.classList.remove('hidden')};
document.querySelector('#howBtn').onclick=()=>{startLobbyMusic(false);menu.classList.add('hidden');help.classList.remove('hidden')};
document.querySelector('#helpBack').onclick=()=>{startLobbyMusic(false);help.classList.add('hidden');menu.classList.remove('hidden')};
document.querySelector('#backBtn').onclick=()=>{startLobbyMusic(false);select.classList.add('hidden');menu.classList.remove('hidden')};
document.querySelector('#playBtn').onclick=()=>{select.classList.add('hidden');resizeGameCanvas();reset()};
document.querySelector('#retryBtn').onclick=()=>reset();
document.querySelector('#selectBtn').onclick=()=>{
  startLobbyMusic(false);
  over.classList.add('hidden');
  select.classList.remove('hidden');
  document.querySelector('#touchControls').classList.add('hidden');
  scene='select';
};
document.querySelector('#menuBtn').onclick=()=>{
  startLobbyMusic(false);
  over.classList.add('hidden');
  menu.classList.remove('hidden');
  document.querySelector('#touchControls').classList.add('hidden');
  scene='menu';
};
document.querySelectorAll('.card').forEach(c=>c.onclick=()=>{document.querySelectorAll('.card').forEach(x=>x.classList.remove('active'));c.classList.add('active');selected=c.dataset.char});
document.querySelectorAll('.diff').forEach(d=>d.onclick=()=>{document.querySelectorAll('.diff').forEach(x=>x.classList.remove('active'));d.classList.add('active');difficulty=d.dataset.diff});

// ============================================================
// TOUCH CONTROLS
// Direct touch movement: drag anywhere on the gameplay field.
// ============================================================
const touchControls=document.querySelector('#touchControls');

let activeMovePointer=null;
let lastTouchX=0;
let lastTouchY=0;

canvas.addEventListener('pointerdown',e=>{
  if(scene!=='game')return;
  if(e.pointerType==='mouse')return;

  activeMovePointer=e.pointerId;
  lastTouchX=e.clientX;
  lastTouchY=e.clientY;

  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove',e=>{
  if(scene!=='game')return;
  if(e.pointerId!==activeMovePointer)return;

  const rect=canvas.getBoundingClientRect();

  // Convert screen-pixel drag distance into logical gameplay distance.
  const scaleX=W/rect.width;
  const scaleY=H/rect.height;

  const dx=(e.clientX-lastTouchX)*scaleX*CONFIG.MOBILE.DRAG_SENSITIVITY;
  const dy=(e.clientY-lastTouchY)*scaleY*CONFIG.MOBILE.DRAG_SENSITIVITY;

  player.x=Math.max(18,Math.min(W-18,player.x+dx));
  player.y=Math.max(45,Math.min(H-20,player.y+dy));

  lastTouchX=e.clientX;
  lastTouchY=e.clientY;
});

function stopTouchMove(e){
  if(e.pointerId!==activeMovePointer)return;
  activeMovePointer=null;
}

canvas.addEventListener('pointerup',stopTouchMove);
canvas.addEventListener('pointercancel',stopTouchMove);

})();
