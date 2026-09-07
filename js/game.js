/* The Princess Bird — client-only Phaser 3 game.
   CUSTOM ASSET: replace assets/custom/wedding_princess.jpg & ending_photo.jpg with personal images. */
(() => {
  'use strict';
  const W=960,H=540,SAVE_KEY='princess-bird-save-v1';
  const touch={left:false,right:false,jumpHeld:false,jumpPressed:false,attackHeld:false,attackPressed:false,fishHeld:false,fishPressed:false};
  const defaultState={muted:false,music:true,sfx:true,shake:true,musicVol:0.8,sfxVol:0.9,
    collectibles:{hearts:0,controllers:0,records:3},
    checkpoint:100,checkpointWorld:0,worldProgress:0,hearts:3,dialogueSeen:{},recordAmmo:10};
  // Güvenli state yükleme: localStorage bozuk/eksikse default'a fallback
  function loadState(){
    let raw=null;try{raw=localStorage.getItem(SAVE_KEY)}catch(e){return structuredClone(defaultState)}
    if(!raw)return structuredClone(defaultState);
    try{
      const parsed=JSON.parse(raw);
      if(!parsed||typeof parsed!=='object')return structuredClone(defaultState);
      const merged=Object.assign({},defaultState,parsed);
      merged.collectibles=Object.assign({},defaultState.collectibles,parsed.collectibles||{});
      merged.dialogueSeen=Object.assign({},defaultState.dialogueSeen,parsed.dialogueSeen||{});
      return merged;
    }catch(e){return structuredClone(defaultState)}
  }
  const state=loadState();
  // Hearts/recordAmmo clamp koruma (WORLDS henüz tanımlı değilse güvenli fallback)
  state.hearts=Number.isFinite(state.hearts)?Math.max(0,Math.min(5,state.hearts|0)):3;
  state.recordAmmo=Number.isFinite(state.recordAmmo)?Math.max(0,state.recordAmmo|0):10;
  // worldProgress ve world indexlerini clamp (WORLDS daha sonra tanımlanacak)
  state.worldProgress=Number.isFinite(state.worldProgress)?Math.max(0,state.worldProgress|0):0;
  state.checkpointWorld=Number.isFinite(state.checkpointWorld)?Math.max(0,state.checkpointWorld|0):0;
  // Save debounce: aynı ms içinde pek çok save olursa sadece sonuncusunu yaz
  let __saveTimer=null;
  const save=()=>{try{clearTimeout(__saveTimer);__saveTimer=setTimeout(()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(state))}catch(e){}},120)}catch(e){}};
  function beginNewGame(){
    state.collectibles=structuredClone(defaultState.collectibles);
    state.checkpoint=defaultState.checkpoint;
    state.checkpointWorld=defaultState.checkpointWorld;
    state.worldProgress=0;
    state.hearts=defaultState.hearts;
    state.dialogueSeen={};
    state.recordAmmo=defaultState.recordAmmo;
    save();
  }
  const palette={ink:0x29223a,cream:0xfff7dc,pink:0xf9739b,gold:0xffc85a,grass:0x4fa85a,sky:0x83cfea,
    forest:0x387852,mountain:0x70889a,castle:0x695154,water:0x65badd,snow:0xe8f0ff,leaf:0x6fae4e,
    heart:0xff6588,controller:0x5b8def,record:0x333344,recordLabel:0xf9739b};
  const Art={cat:'cat_idle',bird:'bird_idle',yigo:'yigo_talk1'};
  const ENEMY_TYPES={
    slug:{key:'enemy_slug',w:44,h:28,speed:55,hp:1,gravity:true,damage:1,color:0x7cb342,behavior:'walker'},
    bat:{key:'enemy_bat',w:42,h:30,speed:65,hp:1,gravity:false,damage:1,color:0x4a3a6a,behavior:'flyer_sine'},
    bee:{key:'enemy_bee',w:38,h:32,speed:80,hp:1,gravity:false,damage:1,color:0xffc107,behavior:'flyer_dash'},
    mushroom:{key:'enemy_mushroom',w:40,h:42,speed:45,hp:2,gravity:true,damage:1,color:0xe57373,behavior:'walker'},
    ghostpep:{key:'enemy_ghostpep',w:36,h:46,speed:90,hp:1,gravity:true,damage:2,color:0xef5350,behavior:'walker_charge'},
    tinychef:{key:'enemy_tinychef',w:44,h:52,speed:50,hp:2,gravity:true,damage:1,color:0xffe082,behavior:'walker'}};
  const NPC_TYPES={
    meowl:{name:'MEOWL',texture:'meowl_idle',dialogues:['Miyav! Yigo Prenses Kuş’u mutfak kalesine götürdü.','Yol uzun; kontrol noktalarını görünce mutlaka etkinleştir.']},
    sad_twer:{name:'SAD TWER',texture:'twerk_idle',dialogues:['Prenses Kuş’u kurtarmaya geldiğin için teşekkür ederim.','Yigo’ya karşı plaklarını sakla; son kapıda işine yarayacaklar.']}};
  const WORLDS=[
    {name:'1-1  GÜNEŞLİ KÖY',subtitle:'Prenses Kuş’u kurtarmak için köyden çık.',sky:0x83cfea,ground:0x4fa85a,width:2800,checkpoint:1300,goal:2640,
      gems:[{x:420,t:'controller'},{x:990,t:'record'},{x:1730,t:'controller'},{x:2100,t:'heart'}],
      enemies:[{x:620,t:'slug'},{x:1130,t:'slug'},{x:1860,t:'bee'}],
      platforms:[{x:280,y:374,w:110},{x:510,y:328,w:126},{x:735,y:378,w:96},{x:930,y:310,w:130},{x:1180,y:365,w:110},{x:1410,y:324,w:140},{x:1680,y:375,w:100,t:'falling'},{x:1910,y:330,w:130},{x:2200,y:290,w:100,t:'breakable'},{x:2400,y:340,w:120}],
      npcs:[{x:180,t:'meowl'}],feature:'Meowl seni Yigo’nun izine yönlendiriyor.',weather:'sunny',bg:'village'},
    {name:'2-1  FISILTILI ORMAN',subtitle:'Nehri aş, plak ve kumandaları topla.',sky:0x5fa9a0,ground:0x387852,width:3100,checkpoint:1500,goal:2930,
      gems:[{x:560,t:'record'},{x:1350,t:'controller'},{x:2280,t:'record'},{x:2600,t:'heart',hidden:true}],
      enemies:[{x:440,t:'slug'},{x:1040,t:'bee'},{x:1780,t:'bat'},{x:2380,t:'mushroom'}],
      platforms:[{x:250,y:350,w:130},{x:470,y:295,w:105,t:'breakable'},{x:700,y:350,w:110},{x:980,y:310,w:150,t:'moving',x2:1200},{x:1260,y:355,w:92},{x:1510,y:280,w:145},{x:1810,y:338,w:115,t:'falling'},{x:2090,y:290,w:130},{x:2380,y:350,w:100},{x:2680,y:300,w:120}],
      npcs:[{x:220,t:'sad_twer'}],feature:'Sad Twer nehir yolunda sana ipucu veriyor.',weather:'rain',bg:'forest'},
    {name:'3-1  AYAZ DAĞI',subtitle:'Kayalıkları aş, plakları Yigo için biriktir.',sky:0x9eb8d4,ground:0x55657f,width:3200,checkpoint:1580,goal:3040,
      gems:[{x:480,t:'record'},{x:1280,t:'controller'},{x:2100,t:'record',hidden:true},{x:2680,t:'heart'}],
      enemies:[{x:520,t:'bat'},{x:1100,t:'bat'},{x:1750,t:'mushroom'},{x:2400,t:'ghostpep'}],
      platforms:[{x:260,y:360,w:120},{x:500,y:300,w:100,t:'breakable'},{x:750,y:355,w:110},{x:1020,y:280,w:130,t:'moving',x2:1240},{x:1380,y:340,w:100},{x:1620,y:260,w:140},{x:1890,y:330,w:110,t:'falling'},{x:2160,y:290,w:120},{x:2480,y:350,w:105},{x:2780,y:300,w:130}],
      npcs:[],feature:'Ayaz rüzgârı seni iter; çift zıplama ve duvar zıplaması hayati!',weather:'snow',bg:'mountain'},
    {name:'4-1  YIGO’NUN MUTFAK KALESİ',subtitle:'Plakları Yigo’ya fırlat, kuşu kurtar!',sky:0x533d69,ground:0x695154,width:2800,checkpoint:1320,goal:null,
      gems:[{x:470,t:'record'},{x:1120,t:'record'},{x:1740,t:'heart'},{x:2100,t:'controller'}],
      enemies:[{x:610,t:'tinychef'},{x:1000,t:'ghostpep'},{x:1520,t:'tinychef'}],
      platforms:[{x:290,y:370,w:125},{x:540,y:310,w:100},{x:780,y:358,w:110},{x:1000,y:280,w:140,t:'breakable'},{x:1260,y:350,w:105},{x:1500,y:275,w:130},{x:1740,y:350,w:120,t:'falling'},{x:2000,y:300,w:140},{x:2250,y:340,w:130}],
      npcs:[],feature:'Tencereler kaynıyor, buhar çıkıyor. En üst salonda Yigo seni bekliyor!',weather:'steam',bg:'castle',isBoss:true}];
  const COLLECTIBLE_DEFS={
    heart:{label:'Kalp',color:palette.heart,size:18,shape:'heart',text:'+1 KALP'},
    controller:{label:'Televizyon Kumandası',color:palette.controller,size:20,shape:'remote',text:'YUMMY!'},
    record:{label:'Müzik Plağı',color:palette.record,size:20,shape:'record',text:'+1 PLAK'}};
  state.worldProgress=Math.min(state.worldProgress,WORLDS.length);
  state.checkpointWorld=Math.min(state.checkpointWorld,WORLDS.length-1);
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function pickTex(scene,...keys){for(const k of keys)if(texOk(scene,k))return k;return keys[keys.length-1]}
  function makeButton(scene,x,y,label,onClick,variant='primary'){
    const wide=Math.max(220,label.length*15+74),high=60;
    const isPrimary=variant==='primary';
    const fillTop=isPrimary?0xe04060:0x6040a0;
    const fillBottom=isPrimary?0xa02040:0x402080;
    const edge=isPrimary?0xff6080:0x8060c0;
    const glowCol=isPrimary?0xff4060:0x7040b0;
    const shadow=scene.add.graphics().fillStyle(0x0a0a15,.6).fillRoundedRect(-wide/2+4,-high/2+8,wide,high,16);
    const glow=scene.add.graphics().fillStyle(glowCol,.2).fillRoundedRect(-wide/2-6,-high/2-6,wide+12,high+12,20);
    const face=scene.add.graphics();
    face.fillGradientStyle(fillTop,fillTop,fillBottom,fillBottom,1).fillRoundedRect(-wide/2,-high/2,wide,high,16);
    face.lineStyle(2,edge,.9).strokeRoundedRect(-wide/2,-high/2,wide,high,16);
    face.fillStyle(0xffffff,.15).fillRoundedRect(-wide/2+6,-high/2+5,wide-12,16,10);
    face.fillStyle(0x1a1025,.12).fillRoundedRect(-wide/2+8,high/2-18,wide-16,10,6);
    const gem=scene.add.circle(-wide/2+22,0,6,isPrimary?0xf0c040:0x8060c0).setStrokeStyle(2,0xffffff,.7);
    const text=scene.add.text(10,0,label,{fontFamily:'Georgia',fontStyle:'bold',fontSize:21,color:'#e8e8f0',stroke:'#1a1025',strokeThickness:4,shadow:{offsetX:0,offsetY:2,color:'#00000055',blur:2,fill:true}}).setOrigin(.5);
    const button=scene.add.container(x,y,[glow,shadow,face,gem,text]).setSize(wide,high)
      .setInteractive(new Phaser.Geom.Rectangle(-wide/2,-high/2,wide,high),Phaser.Geom.Rectangle.Contains);
    button.on('pointerover',()=>scene.tweens.add({targets:button,scaleX:1.03,scaleY:1.03,y:y-3,duration:120,ease:'Sine.easeOut'}));
    button.on('pointerout',()=>scene.tweens.add({targets:button,scaleX:1,scaleY:1,y,duration:120,ease:'Sine.easeOut'}));
    button.on('pointerdown',()=>scene.tweens.add({targets:button,scaleX:.97,scaleY:.97,duration:80,yoyo:true,onComplete:onClick}));
    return button;}
  class Sound{
    constructor(scene){this.s=scene;this.ctx=null}
    tone(freq,d=.08,type='sine',vol=.035){if(state.muted||!state.sfx)return;try{
      const c=this.ctx||(this.ctx=new (window.AudioContext||window.webkitAudioContext)());
      const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;
      const realVol=vol*(state.sfxVol??0.9);
      g.gain.setValueAtTime(realVol,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d);
      o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+d)}catch(e){}}
    chirp(){this.tone(740,.06,'triangle');setTimeout(()=>this.tone(1040,.09,'triangle'),55)}
    jump(){this.tone(430,.08,'square',.04);setTimeout(()=>this.tone(560,.07,'square',.03),40)}
    collect(){this.tone(880,.06,'sine',.05);setTimeout(()=>this.tone(1180,.08,'sine',.05),60);setTimeout(()=>this.tone(1380,.07,'sine',.04),130)}
    hurt(){this.tone(180,.18,'sawtooth',.06)}
    bossHit(){this.tone(220,.12,'square',.06);setTimeout(()=>this.tone(150,.16,'sawtooth',.05),90)}
    victory(){[523,659,784,1046].forEach((n,i)=>setTimeout(()=>this.tone(n,.16,'triangle',.05),i*130))}
    ui(){this.tone(660,.05,'sine',.02)}
  }
  class Music{
    static inst=null;
    static _ctxKill(){try{if(Music.inst){try{Music.inst.close?.()}catch(_){}Music.inst=null}}catch(_){}}
    static ensure(){Music._ctxKill()}
    static sync(){Music._ctxKill()}
    static stop(){Music._ctxKill()}
  }
  function makeTextures(s){
    const g=s.make.graphics({x:0,y:0,add:false});
    const texture=(key,w,h,draw)=>{
      try{
        g.clear();draw(g);g.generateTexture(key,w,h);
      }catch(e){
        try{console.warn('texture uret hatasi:',key,e.message||e)}catch(_){}
      }
    };
    /* Karakter yedek çizimleri kaldırıldı: yalnızca assets/cat, assets/bird ve
       assets/yigo altındaki kullanıcının yüklediği sprite'lar kullanılır.
    texture('cat',32,36,g=>{g.fillStyle(0x674a57).fillRoundedRect(7,16,18,16,8);
      g.fillTriangle(7,17,10,5,14,15);g.fillTriangle(18,15,23,5,25,17);
      g.fillStyle(0xf4b5a3).fillRoundedRect(9,16,14,14,7);
      g.fillStyle(0x29223a).fillCircle(13,22,2).fillCircle(19,22,2);
      g.fillStyle(0xffffff).fillCircle(13.5,21.5,0.7).fillCircle(19.5,21.5,0.7);
      g.fillStyle(0xff8fa3).fillCircle(16,26,2);g.fillStyle(0x674a57).lineStyle(1.5,0x674a57).lineBetween(22,29,30,24)});
    texture('cat_run',32,36,g=>{g.fillStyle(0x674a57).fillRoundedRect(6,18,18,14,7);
      g.fillTriangle(7,18,10,7,14,16);g.fillTriangle(18,16,23,6,25,18);
      g.fillStyle(0xf4b5a3).fillRoundedRect(8,17,14,13,6);
      g.fillStyle(0x29223a).fillCircle(13,22,2).fillCircle(19,22,2);g.fillStyle(0xff8fa3).fillCircle(16,26,2);
      g.fillStyle(0x674a57).fillRect(8,30,4,5).fillRect(20,32,4,4)});
    texture('cat_jump',32,36,g=>{g.fillStyle(0x674a57).fillRoundedRect(7,14,18,16,8);
      g.fillTriangle(6,15,9,4,13,13);g.fillTriangle(19,13,24,4,26,15);
      g.fillStyle(0xf4b5a3).fillRoundedRect(9,15,14,13,6);
      g.fillStyle(0x29223a).fillCircle(13,20,2).fillCircle(19,20,2);g.fillStyle(0xff8fa3).fillCircle(16,24,2);
      g.fillStyle(0x674a57).fillRect(10,28,4,3).fillRect(19,28,4,3).fillRect(18,28,12,2)});
    texture('cat_fall',32,36,g=>{g.fillStyle(0x674a57).fillRoundedRect(7,16,18,16,8);
      g.fillTriangle(7,17,10,6,14,15);g.fillTriangle(18,15,23,5,25,17);
      g.fillStyle(0xf4b5a3).fillRoundedRect(9,17,14,13,6);
      g.fillStyle(0x29223a).fillCircle(13,23,2).fillCircle(19,23,2);g.fillStyle(0xff8fa3).fillCircle(16,27,2)});
    texture('cat_attack',32,36,g=>{g.fillStyle(0x674a57).fillRoundedRect(7,16,18,16,8);
      g.fillTriangle(7,17,10,5,14,15);g.fillTriangle(18,15,23,4,25,17);
      g.fillStyle(0xf4b5a3).fillRoundedRect(9,16,14,14,7);
      g.fillStyle(0x29223a).fillCircle(13,22,2).fillCircle(19,22,2);g.fillStyle(0xff8fa3).fillCircle(16,26,2);
      g.lineStyle(2,0xffd3d9).lineBetween(25,18,31,10).lineBetween(25,22,31,22).lineBetween(25,26,31,34)});
    texture('cat_hurt',32,36,g=>{g.fillStyle(0xa05057).fillRoundedRect(7,16,18,16,8);
      g.fillTriangle(7,17,10,5,14,15);g.fillTriangle(18,15,23,4,25,17);
      g.fillStyle(0xf4b5a3).fillRoundedRect(9,17,14,13,6);
      g.lineStyle(1.5,0x29223a).lineBetween(11,21,15,23).lineBetween(11,23,15,21).lineBetween(17,21,21,23).lineBetween(17,23,21,21)});
    texture('cat_win',32,36,g=>{g.fillStyle(0x674a57).fillRoundedRect(7,16,18,16,8);
      g.fillTriangle(7,17,10,5,14,15);g.fillTriangle(18,15,23,4,25,17);
      g.fillStyle(0xf4b5a3).fillRoundedRect(9,16,14,14,7);
      g.fillStyle(0x29223a).fillCircle(12,22,2).fillCircle(20,22,2);g.fillStyle(0xff6588).fillCircle(16,25,3)
      .fillCircle(5,15,2.5).fillCircle(27,15,2.5)});
    texture('cat_sit',32,36,g=>{g.fillStyle(0x674a57).fillRoundedRect(6,14,20,20,9);
      g.fillTriangle(7,15,10,4,14,14);g.fillTriangle(18,14,23,3,25,15);
      g.fillStyle(0xf4b5a3).fillRoundedRect(9,15,14,14,7);
      g.fillStyle(0x29223a).fillCircle(13,21,2).fillCircle(19,21,2);g.fillStyle(0xff8fa3).fillCircle(16,25,2);
      g.fillStyle(0x674a57).fillRoundedRect(6,29,20,7,3)});
    texture('bird',34,38,g=>{g.fillStyle(0xeefaff).fillEllipse(17,22,22,24);g.fillStyle(0x65badd).fillEllipse(13,20,11,15);
      g.fillStyle(0xffffff).fillTriangle(5,21,17,5,27,21);g.fillStyle(0xf7f2f4).fillTriangle(5,29,17,15,28,29);
      g.lineStyle(2,0xf5b4d0).strokeTriangle(5,29,17,15,28,29);
      g.fillStyle(0x29223a).fillCircle(22,15,2);g.fillStyle(0xffffff).fillCircle(22.5,14.5,0.7);
      g.fillStyle(0xf3bd51).fillTriangle(28,19,33,21,28,23)});
    texture('bird_wave',34,38,g=>{g.fillStyle(0xeefaff).fillEllipse(17,22,22,24);g.fillStyle(0x65badd).fillEllipse(13,20,11,15);
      g.fillStyle(0xffffff).fillTriangle(5,21,17,5,27,21);g.fillStyle(0xf7f2f4).fillTriangle(5,29,17,15,28,29);
      g.lineStyle(2,0xf5b4d0).strokeTriangle(5,29,17,15,28,29);
      g.fillStyle(0x29223a).fillCircle(22,15,2);g.fillStyle(0xf3bd51).fillTriangle(28,19,33,21,28,23);
      g.fillStyle(0xffffff).lineStyle(1.5,0xffffff).lineBetween(4,10,10,6).lineBetween(4,13,12,10)});
    texture('bird_cage',34,38,g=>{g.fillStyle(0xeefaff).fillEllipse(17,24,20,20);g.fillStyle(0x65badd).fillEllipse(13,22,10,13);
      g.fillStyle(0xffffff).fillTriangle(6,23,17,8,26,23);g.lineStyle(1.5,0x555555)
      .lineBetween(2,2,2,38).lineBetween(8,2,8,38).lineBetween(14,2,14,38).lineBetween(20,2,20,38).lineBetween(26,2,26,38).lineBetween(32,2,32,38);
      g.fillStyle(0x29223a).fillCircle(22,16,2);g.fillStyle(0xf3bd51).fillTriangle(28,21,33,23,28,25)});
    texture('bird_sit',34,38,g=>{g.fillStyle(0xeefaff).fillEllipse(17,24,22,22);g.fillStyle(0x65badd).fillEllipse(13,22,11,14);
      g.fillStyle(0xffffff).fillTriangle(5,23,17,7,27,23);g.fillStyle(0xf7f2f4).fillTriangle(5,30,17,17,28,30);
      g.lineStyle(2,0xf5b4d0).strokeTriangle(5,30,17,17,28,30);
      g.fillStyle(0x29223a).fillCircle(22,17,2);g.fillStyle(0xf3bd51).fillTriangle(28,21,33,23,28,25)});
    texture('yigo',48,60,g=>{g.fillStyle(0xffffff).fillRoundedRect(10,0,28,14,6).fillRect(6,12,36,6);
      g.fillStyle(0xffc66e).fillCircle(24,4,3);g.fillStyle(0x88c670).fillRoundedRect(6,18,36,30,12);
      g.fillStyle(0xb9e28c).fillCircle(15,22,11).fillCircle(33,22,11);
      g.fillStyle(0xffffff).fillCircle(15,25,7).fillCircle(33,25,7);
      g.fillStyle(0x29223a).fillCircle(15,25,2.5).fillCircle(33,25,2.5);
      g.fillStyle(0x562f3b).fillEllipse(24,38,18,7);g.fillStyle(0xffffff).fillEllipse(24,38,14,3);
      g.fillStyle(0xf4c6a1).fillRect(8,46,32,8)});
    texture('yigo_walk',48,60,g=>{g.fillStyle(0xffffff).fillRoundedRect(10,2,28,14,6).fillRect(6,14,36,6);
      g.fillStyle(0x88c670).fillRoundedRect(6,20,36,28,12);
      g.fillStyle(0xb9e28c).fillCircle(15,24,11).fillCircle(33,24,11);
      g.fillStyle(0xffffff).fillCircle(15,27,7).fillCircle(33,27,7);
      g.fillStyle(0x29223a).fillCircle(15,27,2.5).fillCircle(33,27,2.5);
      g.fillStyle(0x562f3b).fillEllipse(24,40,18,7);
      g.fillStyle(0xf4c6a1).fillRect(10,48,10,10).fillRect(28,46,10,12)});
    texture('yigo_attack',48,60,g=>{g.fillStyle(0xffffff).fillRoundedRect(10,0,28,14,6).fillRect(6,12,36,6);
      g.fillStyle(0x88c670).fillRoundedRect(6,18,36,30,12);
      g.fillStyle(0xb9e28c).fillCircle(15,22,11).fillCircle(33,22,11);
      g.fillStyle(0xffffff).fillCircle(15,25,7).fillCircle(33,25,7);
      g.fillStyle(0x29223a).fillCircle(13,25,2.5).fillCircle(31,25,2.5);
      g.fillStyle(0x562f3b).fillEllipse(24,38,18,7);
      g.fillStyle(0xaaaaaa).fillRoundedRect(40,16,10,4,1);g.fillStyle(0xaaaaaa).fillCircle(2,30,6)});
    texture('yigo_hurt',48,60,g=>{g.fillStyle(0xffffff).fillRoundedRect(10,3,28,14,6).fillRect(6,15,36,6);
      g.fillStyle(0xd95a5a).fillRoundedRect(6,21,36,28,12);
      g.fillStyle(0xff8a8a).fillCircle(15,25,11).fillCircle(33,25,11);
      g.lineStyle(1.5,0x29223a).lineBetween(11,25,18,27).lineBetween(11,27,18,25).lineBetween(29,25,36,27).lineBetween(29,27,36,25);
      g.fillStyle(0x562f3b).fillEllipse(24,40,14,5);g.fillStyle(0xf4c6a1).fillRect(8,48,32,8)});
    texture('yigo_defeat',48,60,g=>{g.fillStyle(0xffffff).fillRoundedRect(2,34,28,14,6);
      g.fillStyle(0x88c670).fillRoundedRect(0,20,36,28,12);
      g.fillStyle(0xb9e28c).fillCircle(11,28,11).fillCircle(29,28,11);
      g.fillStyle(0xffffff).fillCircle(11,31,7).fillCircle(29,31,7);
      g.lineStyle(1.5,0x29223a).lineBetween(8,31,14,33).lineBetween(8,33,14,31).lineBetween(26,31,32,33).lineBetween(26,33,32,31);
      g.fillStyle(0xf4c6a1).fillRect(4,40,28,6)});
    texture('yigo_laugh',48,60,g=>{g.fillStyle(0xffffff).fillRoundedRect(10,0,28,14,6).fillRect(6,12,36,6);
      g.fillStyle(0x88c670).fillRoundedRect(6,18,36,30,12);
      g.fillStyle(0xb9e28c).fillCircle(15,22,11).fillCircle(33,22,11);
      g.fillStyle(0xffffff).fillCircle(15,25,7).fillCircle(33,25,7);
      g.fillStyle(0x29223a).fillCircle(14,25,2.5).fillCircle(32,25,2.5);
      g.fillStyle(0x562f3b).fillEllipse(24,40,20,10);g.fillStyle(0xff7777).fillEllipse(24,40,16,7);
      g.fillStyle(0xffffff).fillEllipse(24,37,10,3);g.fillStyle(0xf4c6a1).fillRect(8,48,32,8)});
    */
    texture('heart',32,30,g=>{
      const CX=16,CY=14;
      g.fillStyle(0x6a1528,.48).fillCircle(CX,CY+3,13);
      g.fillStyle(0xe13256).fillCircle(9,9,6).fillCircle(23,9,6).fillTriangle(1.5,13.5,30.5,13.5,CX,28);
      g.fillStyle(0xff5575).fillCircle(9,9,4.8).fillCircle(23,9,4.8).fillTriangle(4,13.5,28,13.5,CX,25.5);
      g.fillStyle(0xff7a96).fillCircle(9,9,3.6).fillCircle(23,9,3.6).fillTriangle(6.2,13.5,25.8,13.5,CX,23);
      g.fillStyle(0xffa9bd).fillCircle(9,7.5,2.1).fillCircle(22,7.5,1.6).fillCircle(16,12,1.3);
      g.fillStyle(0xffd5e0).fillCircle(6.5,4.8,1.8);
      g.fillStyle(0xffffff,.95).fillCircle(7.3,3.6,0.9);
      g.fillStyle(0xffffff,.7).fillCircle(5.8,6.5,0.55);
      g.fillStyle(0xffffff,.45).fillCircle(10.5,8.6,0.45).fillCircle(17,16,0.4);
    });
    texture('seed',14,16,g=>{g.fillStyle(0xd99a57).fillEllipse(7,8,6,8);g.fillStyle(0xf4c691).fillEllipse(6,7,3,5);g.lineStyle(1.5,0x5a3a20).lineBetween(7,1,7,6)});
    texture('fish',30,20,g=>{
      g.fillStyle(0x3a6fa0,.4).fillEllipse(14,11,12,8);
      g.fillStyle(0xff8c42).fillEllipse(13,10,11,7);
      g.fillStyle(0xffb06b).fillEllipse(12,9,7,4.5);
      g.fillStyle(0xff5a2d).fillTriangle(21,10,28,3,28,17);
      g.fillStyle(0xffa05a).fillTriangle(21,10,26,5,26,15);
      g.fillStyle(0xffffff).fillCircle(8,8,2.5);
      g.fillStyle(0x1a1a2a).fillCircle(8,8,1.4);
      g.fillStyle(0xffffff,.9).fillCircle(7.3,7.2,0.55);
      g.fillStyle(0xffd8a0,.7).fillCircle(4,11,1);
      g.fillStyle(0xffffff,.6).fillCircle(10,13,0.8).fillCircle(14,13,0.8).fillCircle(17,13,0.7);
      g.fillStyle(0xff5a2d).fillTriangle(13,17,11,20,15,20);
    });
    texture('yarn',20,20,g=>{g.fillStyle(0xff7a9c).fillCircle(10,10,9);g.lineStyle(1,0xd95579).lineBetween(3,10,17,10).lineBetween(10,3,10,17).lineBetween(5,5,15,15).lineBetween(5,15,15,5);g.fillStyle(0xffc6d8).fillCircle(7,7,2.5)});
    texture('letter',22,18,g=>{g.fillStyle(0xffe0a0).fillRoundedRect(2,3,18,13,2);g.lineStyle(1.5,0x8a6a3a).lineBetween(2,3,11,10).lineBetween(20,3,11,10);g.fillStyle(0xff6588).fillCircle(11,10,2.5)});
    texture('feather',18,26,g=>{g.fillStyle(0xffe8b0).fillEllipse(9,11,6,14);g.fillStyle(0xffc85a).fillEllipse(9,11,4,12);g.lineStyle(1.5,0xc98a2a).lineBetween(9,2,9,24)});
    texture('crown',30,22,g=>{g.fillStyle(0xffd84a).fillTriangle(2,18,8,2,15,18).fillTriangle(15,18,22,6,28,18).fillRect(2,16,26,5);g.fillStyle(0xff6588).fillCircle(15,14,2.5);g.fillStyle(0x74c2e8).fillCircle(6,15,1.5).fillCircle(24,15,1.5)});
    texture('gem',16,18,g=>{g.fillStyle(0xffe06b).fillTriangle(8,0,16,8,8,18);g.fillStyle(0xfff8c4).fillTriangle(8,0,8,18,0,8)});
    texture('controller',28,58,g=>{
      g.fillStyle(0x131020,.55).fillRoundedRect(2,3,24,54,12);
      g.fillStyle(0x201a33).fillRoundedRect(1,1,26,56,13);
      g.fillStyle(0x2e2647).fillRoundedRect(2,2,24,54,12);
      g.fillStyle(0x3a3058).fillRoundedRect(3,3,22,52,11);
      g.fillStyle(0x4a3f70).fillRoundedRect(4,4,20,3,3);
      g.fillStyle(0xe8394b).fillCircle(14,11,2.8);
      g.fillStyle(0xff5566).fillCircle(14,11,2.1);
      g.fillStyle(0x2a1f3d).fillCircle(14,11,0.7);
      g.fillStyle(0xffffff,.5).fillCircle(13.2,10.2,0.7);
      const nums=[
        [7,18,0],[14,18,1],[21,18,2],
        [7,24,3],[14,24,4],[21,24,5],
        [7,30,6],[14,30,7],[21,30,8]
      ];
      nums.forEach(n=>{
        g.fillStyle(0x1a1428).fillCircle(n[0],n[1],2.3);
        g.fillStyle(0x4a3f70).fillCircle(n[0],n[1],1.85);
        g.fillStyle(0x6e5d9a).fillCircle(n[0],n[1],1.35);
      });
      g.fillStyle(0xffffff,.82);
      const txt=['1','2','3','4','5','6','7','8','9'];
      nums.forEach((n,i)=>{
        if(txt[i]==='1'){g.fillStyle(0xffffff,.75);g.fillRect(n[0]-0.35,n[1]-1.2,0.7,2.4)}
        else if(txt[i]==='2'){g.fillStyle(0xffffff,.75);g.fillRoundedRect(n[0]-1.05,n[1]-1.25,2.1,2.5,0.3)}
        else if(txt[i]==='3'){g.fillStyle(0xffffff,.75);g.fillCircle(n[0],n[1],1.1)}
        else if(txt[i]==='4'){g.fillStyle(0xffffff,.75);g.fillTriangle(n[0]-1.2,n[1]+1,n[0]+1.2,n[1]+1,n[0],n[1]-1.1)}
        else if(txt[i]==='5'){g.fillStyle(0xffffff,.75);g.fillRoundedRect(n[0]-1,n[1]-1,2,2,0.5)}
        else if(txt[i]==='6'){g.fillStyle(0xffffff,.75);g.fillCircle(n[0],n[1],1)}
        else if(txt[i]==='7'){g.fillStyle(0xffffff,.7);g.fillCircle(n[0],n[1],1.05)}
        else if(txt[i]==='8'){g.fillStyle(0xffffff,.7);g.fillCircle(n[0],n[1]-0.6,0.65);g.fillCircle(n[0],n[1]+0.6,0.65)}
        else if(txt[i]==='9'){g.fillStyle(0xffffff,.7);g.fillCircle(n[0],n[1],1)}
      });
      g.fillStyle(0x1a1428).fillRoundedRect(4,36,20,18,4);
      g.fillStyle(0xff6588).fillCircle(14,41,3.1);
      g.fillStyle(0xffa9bd).fillCircle(14,41,2.1);
      g.fillStyle(0x2a1f3d).fillCircle(14,41,0.7);
      g.fillStyle(0xff8da0).fillRect(14-0.5,37,1,2);
      g.fillStyle(0xff8da0).fillRect(14-0.5,43,1,2);
      g.fillStyle(0xff8da0).fillRect(10,40.5,2,1);
      g.fillStyle(0xff8da0).fillRect(16,40.5,2,1);
      const volch=[
        [6.5,50,0x6ae88c,'V'],
        [21.5,50,0x5ac8ff,'C']
      ];
      volch.forEach(v=>{
        g.fillStyle(0x1a1428).fillCircle(v[0],v[1],2.4);
        g.fillStyle(v[2]).fillCircle(v[0],v[1],1.9);
        g.fillStyle(0xffffff,.6).fillCircle(v[0]-0.5,v[1]-0.5,0.55);
      });
      g.fillStyle(0xffffff,.3).fillCircle(5,5,1);
      g.fillStyle(0xffffff,.18).fillCircle(4,4,0.6);
    });
    texture('grass_pickup',26,24,g=>{g.lineStyle(2,0x276d36).lineBetween(13,23,3,8).lineBetween(13,23,8,3).lineBetween(13,23,13,1).lineBetween(13,23,18,4).lineBetween(13,23,23,8);g.lineStyle(2,0x74bf58).lineBetween(13,23,6,12).lineBetween(13,23,11,7).lineBetween(13,23,16,8).lineBetween(13,23,21,13);g.fillStyle(0x9bdd67).fillCircle(8,15,2).fillCircle(18,14,2)});
    texture('record',32,32,g=>{
      const cx=16,cy=16;
      g.fillStyle(0x000000,.5).fillCircle(cx+1,cy+2,15);
      g.fillStyle(0x1a1625).fillCircle(cx,cy,15);
      for(let i=5;i>=1;i--){
        const shade=0x1e1a2e+0x0a0a14*i;
        g.fillStyle(shade).fillCircle(cx,cy,i*2.6);
      }
      g.lineStyle(1.2,0x3a3550,.7);
      for(let i=0;i<4;i++){
        g.strokeCircle(cx,cy,5+i*2.3);
      }
      g.fillStyle(0xf9739b).fillCircle(cx,cy,6);
      g.fillStyle(0xff8fb0).fillCircle(cx,cy,4.8);
      g.fillStyle(0xffc6d8).fillCircle(cx,cy,3);
      g.fillStyle(0x2a1f35).fillCircle(cx,cy,1.1);
      g.lineStyle(0.8,0xf9739b,.8).strokeCircle(cx,cy,6);
      g.fillStyle(0xffe0ec,.35).fillCircle(cx-4,cy-5,1.4);
      g.fillStyle(0xffffff,.25).fillCircle(cx-5,cy-6,0.7);
      g.lineStyle(1,0xffffff,.12);
      for(let a=0;a<18;a++){
        const ang=a*0.65;
        const r1=7.5+(a%3)*1.8;
        const r2=r1+2.2;
        g.lineBetween(cx+Math.cos(ang)*r1,cy+Math.sin(ang)*r1,cx+Math.cos(ang)*r2,cy+Math.sin(ang)*r2);
      }
    });
    texture('enemy_slug',44,30,g=>{g.fillStyle(0x94bc5f).fillRoundedRect(4,10,36,18,12);g.fillStyle(0xb9e28c).fillEllipse(10,14,7,5);g.fillStyle(0xffffff).fillCircle(11,13,3);g.fillStyle(0x29223a).fillCircle(11,13,1.5);g.lineStyle(2,0x3d7a3a).lineBetween(8,10,6,4).lineBetween(14,10,15,4)});
    texture('enemy_bat',44,30,g=>{g.fillStyle(0x3d3455).fillRoundedRect(16,10,12,14,6);g.fillStyle(0x4d3f6e).fillTriangle(2,14,16,8,16,20).fillTriangle(42,14,28,8,28,20);g.fillStyle(0xff6588).fillCircle(19,14,2).fillCircle(25,14,2);g.fillStyle(0xffffff).fillTriangle(20,19,22,22,24,19)});
    texture('enemy_bee',40,32,g=>{g.fillStyle(0xffd155).fillEllipse(20,18,14,10);g.fillStyle(0x29223a).fillRect(12,14,4,10).fillRect(20,14,4,10).fillRect(28,14,3,10);g.fillStyle(0xe8e8ff,.75).fillEllipse(13,10,8,6).fillEllipse(27,10,8,6);g.fillStyle(0x29223a).fillCircle(16,17,1.5).fillCircle(24,17,1.5)});
    texture('enemy_mushroom',40,42,g=>{g.fillStyle(0xd24f4f).fillEllipse(20,14,20,14);g.fillStyle(0xffffff).fillCircle(12,12,3).fillCircle(22,8,2.5).fillCircle(28,16,2.5);g.fillStyle(0xf4e2a0).fillRoundedRect(12,22,16,16,4);g.fillStyle(0x29223a).fillCircle(17,30,2).fillCircle(23,30,2);g.fillStyle(0x562f3b).fillEllipse(20,35,5,2)});
    texture('enemy_ghostpep',36,46,g=>{g.fillStyle(0xff5656).fillRoundedRect(6,6,24,32,12).fillTriangle(6,38,30,38,18,46);g.fillStyle(0x57a033).fillRect(15,2,6,7);g.fillStyle(0xffffff,.6).fillCircle(13,16,4.5).fillCircle(23,16,4.5);g.fillStyle(0x29223a).fillCircle(13,16,2).fillCircle(23,16,2);g.fillStyle(0x29223a).fillRoundedRect(14,24,8,3,1)});
    texture('enemy_tinychef',44,52,g=>{g.fillStyle(0xffffff).fillRoundedRect(10,0,24,12,5).fillRect(6,10,32,5);g.fillStyle(0xf4c6a1).fillRoundedRect(12,15,20,14,6);g.fillStyle(0xffffff).fillCircle(18,20,3.5).fillCircle(26,20,3.5);g.fillStyle(0x29223a).fillCircle(18,20,2).fillCircle(26,20,2);g.fillStyle(0x562f3b).fillEllipse(22,26,5,2);g.fillStyle(0xe95f87).fillRoundedRect(8,29,28,18,5);g.fillStyle(0xffffff).fillRect(20,30,4,18)});
    texture('npc_body',36,48,g=>{g.fillStyle(0xdddddd).fillRoundedRect(6,16,24,28,12);g.fillStyle(0xffffff).fillRoundedRect(8,4,20,16,7);g.fillStyle(0x29223a).fillCircle(14,12,1.5).fillCircle(22,12,1.5);g.fillStyle(0xff6588).fillCircle(18,16,1.5)});
    texture('npc_rabbit',44,58,g=>{g.fillStyle(0xfff2ec).fillRoundedRect(8,18,28,34,14);g.fillStyle(0xd9c7b8).fillRoundedRect(10,6,24,22,12);g.fillStyle(0xfff2ec).fillRoundedRect(10,0,8,22,6).fillRoundedRect(26,0,8,22,6);g.fillStyle(0xf9a9c4,.92).fillRoundedRect(12,2,4,16,3).fillRoundedRect(28,2,4,16,3);g.fillStyle(0x29223a).fillCircle(18,17,1.8).fillCircle(26,17,1.8);g.fillStyle(0xff8fa3).fillCircle(22,23,1.6);g.fillStyle(0xffd9e6,.85).fillCircle(15,22,2.1).fillCircle(29,22,2.1);g.fillStyle(0xf9a9c4,.85).fillRoundedRect(8,4,28,7,5)});
    texture('npc_frog',44,58,g=>{g.fillStyle(0xb6e88d).fillRoundedRect(8,18,28,34,14);g.fillStyle(0x7fba5a).fillRoundedRect(10,6,24,22,12);g.fillStyle(0xffffff).fillCircle(16,14,4.6).fillCircle(28,14,4.6);g.fillStyle(0x29223a).fillCircle(16,14,2).fillCircle(28,14,2);g.fillStyle(0xff8fa3).fillEllipse(22,22,6,3);g.fillStyle(0x387852,.92).fillRoundedRect(9,4,26,7,5);g.fillStyle(0x4fa85a,.75).fillCircle(14,26,2.4).fillCircle(30,26,2.4)});
    texture('npc_owl',44,58,g=>{g.fillStyle(0xc59465).fillRoundedRect(8,18,28,34,14);g.fillStyle(0x8a5a3a).fillRoundedRect(10,6,24,22,12);g.fillStyle(0xffffff).fillCircle(16,15,5).fillCircle(28,15,5);g.fillStyle(0x29223a).fillCircle(16,15,2.2).fillCircle(28,15,2.2);g.fillStyle(0xffd07a).fillTriangle(22,20,18,24,26,24);g.fillStyle(0x4a3451,.9).fillRoundedRect(8,4,28,7,5);g.fillStyle(0xffe2a8,.55).fillCircle(22,28,6)});
    texture('npc_turtle',44,58,g=>{g.fillStyle(0x78c85e).fillRoundedRect(8,18,28,34,14);g.fillStyle(0x3d7a3a).fillRoundedRect(10,8,24,20,12);g.fillStyle(0x8b6f47,.9).fillRoundedRect(9,4,26,7,5);g.fillStyle(0x2a233a,.18).fillRoundedRect(12,24,20,20,10);g.lineStyle(1.5,0x2a233a,.25).strokeRoundedRect(13,26,18,16,8);g.fillStyle(0x29223a).fillCircle(18,17,1.8).fillCircle(26,17,1.8);g.fillStyle(0xff8fa3).fillCircle(22,23,1.6);g.fillStyle(0xbdebd6,.55).fillCircle(15,30,2.1).fillCircle(29,30,2.1)});
    texture('npc_hedgehog',44,58,g=>{g.fillStyle(0xb98a5e).fillRoundedRect(8,18,28,34,14);g.fillStyle(0x7a5a3a).fillRoundedRect(10,6,24,22,12);g.fillStyle(0xf4c6a1,.9).fillRoundedRect(9,4,26,7,5);g.fillStyle(0x2a233a,.28);for(let i=0;i<9;i++){g.fillTriangle(8+i*4,18,10+i*4,8,12+i*4,18)}g.fillStyle(0x29223a).fillCircle(18,17,1.8).fillCircle(26,17,1.8);g.fillStyle(0xff8fa3).fillCircle(22,23,1.6);g.fillStyle(0xffd9e6,.75).fillCircle(15,22,2).fillCircle(29,22,2)});
    texture('npc_mouse',44,58,g=>{g.fillStyle(0xd9cfc5).fillRoundedRect(8,18,28,34,14);g.fillStyle(0xa08b7e).fillRoundedRect(10,6,24,22,12);g.fillStyle(0xd9cfc5).fillCircle(12,10,6).fillCircle(32,10,6);g.fillStyle(0xffd9e6,.85).fillCircle(12,10,3.2).fillCircle(32,10,3.2);g.fillStyle(0x8b7db9,.92).fillRoundedRect(9,4,26,7,5);g.fillStyle(0x29223a).fillCircle(18,17,1.8).fillCircle(26,17,1.8);g.fillStyle(0xff8fa3).fillCircle(22,23,1.6);g.fillStyle(0xbda7ff,.35).fillEllipse(22,29,18,10)});
    texture('npc_squirrel',44,58,g=>{g.fillStyle(0xe2965a).fillRoundedRect(8,18,28,34,14);g.fillStyle(0xa06a3a).fillRoundedRect(10,6,24,22,12);g.fillStyle(0x4a3451,.9).fillRoundedRect(9,4,26,7,5);g.fillStyle(0xe2965a).fillCircle(34,30,10);g.fillStyle(0xa06a3a,.85).fillCircle(34,30,6);g.fillStyle(0x29223a).fillCircle(18,17,1.8).fillCircle(26,17,1.8);g.fillStyle(0xff8fa3).fillCircle(22,23,1.6);g.fillStyle(0xffd9e6,.75).fillCircle(15,22,2).fillCircle(29,22,2)});
    texture('cloud',80,26,g=>{g.fillStyle(0xffffff,.78).fillCircle(18,14,12).fillCircle(35,10,16).fillCircle(54,15,12).fillRect(18,14,36,11)});
    texture('firefly',5,5,g=>g.fillStyle(0xffef91).fillCircle(2,2,2));
    texture('rain',2,10,g=>g.fillStyle(0xaadfff,.7).fillRect(0,0,2,10));
    texture('snow',4,4,g=>g.fillStyle(0xffffff).fillCircle(2,2,2));
    texture('leaf',10,10,g=>{g.fillStyle(0x6fae4e).fillEllipse(5,5,5,3);g.lineStyle(1,0x3d7a3a).lineBetween(0,5,10,5)});
    texture('dust',3,3,g=>g.fillStyle(0xd8c8aa,.8).fillCircle(1,1,1.5));
    texture('spark',4,4,g=>g.fillStyle(0xffffff).fillCircle(2,2,2));
    texture('steam',12,12,g=>g.fillStyle(0xffffff,.45).fillCircle(6,6,6));
    texture('ground',64,64,g=>{g.fillStyle(0x274833).fillRect(0,0,64,64);g.fillStyle(0x5fbc68).fillRect(0,0,64,12);g.fillStyle(0xa7ec8d).fillRect(0,0,64,4);g.fillStyle(0x7fd26c).fillRect(0,5,64,3);g.fillStyle(0x3b6f4a).fillRoundedRect(4,16,15,10,4).fillRoundedRect(24,26,18,12,4).fillRoundedRect(45,18,13,9,4);g.fillStyle(0x204430).fillRect(8,22,9,5).fillRect(30,38,11,5).fillRect(49,28,7,5);g.fillStyle(0x1a2f21).fillRect(0,50,64,14)});
    texture('platform',128,20,g=>{g.fillStyle(0x2f5d41).fillRoundedRect(0,0,128,20,6);g.fillStyle(0xa2ea79).fillRoundedRect(2,2,124,6,4);g.fillStyle(0xd7ffb2).fillRect(8,3,38,2).fillRect(58,3,28,2);g.fillStyle(0x4f8a57).fillRect(4,9,120,3);g.fillStyle(0x1f4030).fillRoundedRect(3,13,122,4,2)});
    texture('platform_falling',128,20,g=>{g.fillStyle(0x9b6a42).fillRoundedRect(0,0,128,20,5);g.fillStyle(0xc78d5a).fillRect(3,2,122,5);g.lineStyle(1.5,0x5a3a20).lineBetween(30,4,30,16).lineBetween(64,2,64,18).lineBetween(98,4,98,16)});
    texture('platform_breakable',128,20,g=>{g.fillStyle(0xb09068).fillRoundedRect(0,0,128,20,5);g.lineStyle(1.5,0x6a4a30).lineBetween(20,0,20,20).lineBetween(40,0,40,20).lineBetween(60,0,60,20).lineBetween(80,0,80,20).lineBetween(100,0,100,20);g.fillStyle(0x8a6a40).fillRect(2,2,16,4).fillRect(42,2,16,4).fillRect(82,2,16,4)});
    texture('checkpoint',26,56,g=>{g.fillStyle(0xc39a4f).fillRect(10,3,6,51);g.fillStyle(0xfff0ad).fillRect(11,3,3,50);g.fillStyle(0xff6d91).fillTriangle(15,6,15,31,35,18);g.fillStyle(0xffb1c5).fillTriangle(15,8,15,24,28,16);g.fillStyle(0xfff4bf).fillCircle(13,4,6);g.fillStyle(0xffffff,.55).fillCircle(11,3,2)});
    texture('goal',40,64,g=>{g.fillStyle(0xe7d49a).fillRect(17,10,6,52);g.fillStyle(0xfff6c7).fillRect(18,10,2,50);g.fillStyle(0xffcb63).fillCircle(20,10,12);g.fillStyle(0xfff8d2).fillCircle(20,10,6);g.fillStyle(0xff90b0).fillTriangle(23,18,23,46,46,31);g.fillStyle(0xffd0dc).fillTriangle(23,20,23,34,37,28)});
    texture('spoon',28,10,g=>{g.fillStyle(0xc0c0c0).fillRoundedRect(0,3,18,5,2);g.fillStyle(0xeeeeee).fillRoundedRect(18,0,10,10,5)});
    texture('pan',34,14,g=>{g.fillStyle(0x222222).fillEllipse(22,7,12,6);g.fillStyle(0x5a5a5a).fillRect(0,5,12,4);g.lineStyle(1.5,0x888888).strokeEllipse(22,7,12,6)});
    texture('pot',50,50,g=>{g.fillStyle(0x2a2a2a).fillRoundedRect(5,15,40,30,8);g.fillStyle(0x444444).fillRoundedRect(2,13,46,6,3);g.fillStyle(0xff7744).fillEllipse(25,20,14,3);g.fillStyle(0xffdd66).fillEllipse(25,18,10,2)});
    g.destroy();
  }
  // =========================== SCENES ===========================
  let panoramaLoaded=false;
  let endingPanoramaLoaded=false;
  let panoramaFileName='intro_panorama.png';
  const CUSTOM_ASSET_KEYS=[
    'cat_idle','cat_walk1','cat_walk2',
    'bird_idle','bird_jump','bird_scared',
    'yigo_talk1','yigo_talk2','yigo_defeated'
  ];
  const CUSTOM={loaded:{}};
  function texOk(sceneOrTexMgr,key){
    try{
      const mgr=(sceneOrTexMgr&&sceneOrTexMgr.textures)?sceneOrTexMgr.textures:sceneOrTexMgr;
      if(!mgr||!mgr.exists)return false;
      if(!mgr.exists(key))return false;
      const t=mgr.get(key);
      if(!t||t.key==='__MISSING')return false;
      const f0=t.get(0);return !!(f0&&f0.width>0&&f0.height>0);
    }catch(e){return false}
  }
  function ensureCharacterAliases(scene){
    const mgr=scene.textures;
    const alias=(to,from)=>{if(texOk(mgr,to)||!texOk(mgr,from))return;try{mgr.addImage(to,mgr.get(from).getSourceImage())}catch(e){}};
    // Animasyon için eksik kareler, yalnızca kullanıcının yüklediği karelerden türetilir.
    alias('cat_walk2','cat_walk1');alias('cat_attack','cat_walk1');alias('cat_sit','cat_idle');
    alias('bird_jump','bird_idle');alias('bird_scared','bird_idle');
    alias('yigo_talk2','yigo_talk1');alias('yigo_defeated','yigo_talk1');
    alias('yigo_attack','yigo_talk1');alias('yigo_hurt','yigo_talk1');alias('yigo_laugh','yigo_talk1');
  }
  let introVideoLoaded=false;
  let yesVideoLoaded=false;
  class Boot extends Phaser.Scene{
    constructor(){super('Boot')}
    preload(){
      this.load.on('loaderror',(file)=>{
        if(file.key==='intro_panorama')panoramaLoaded=false;
        if(file.key==='ending_panorama')endingPanoramaLoaded=false;
        if(file.key==='intro_video')introVideoLoaded=false;
        if(file.key==='yes_video')yesVideoLoaded=false;
      });
      this.load.on('filecomplete-image-intro_panorama',()=>{panoramaLoaded=true});
      this.load.on('filecomplete-image-ending_panorama',()=>{endingPanoramaLoaded=true});
      this.load.on('filecomplete-video-intro_video',()=>{introVideoLoaded=true});
      this.load.on('filecomplete-video-yes_video',()=>{yesVideoLoaded=true});
      CUSTOM_ASSET_KEYS.forEach(k=>{
        const folder=k.startsWith('cat_')?'cat':k.startsWith('bird_')?'bird':'yigo';
        const name=k.substring(k.indexOf('_')+1);
        this.load.image(k,`assets/${folder}/${name}.png`);
      });
      this.load.image('meowl_idle','assets/meowl/meowl.png');
      this.load.image('twerk_idle','assets/twerk/twerk1.png');
      this.load.image('twerk_frame1','assets/twerk/twerk1.png');
      this.load.image('twerk_frame2','assets/twerk/twerk2.png');
      this.load.image('intro_panorama',`assets/cutscenes/${panoramaFileName}`);
      this.load.image('ending_panorama',`assets/cutscenes/ending_panorama.png`);
      this.load.video('intro_video','assets/cutscenes/intro.mp4','loadeddata',false,true);
      this.load.video('yes_video','assets/cutscenes/yes.mp4','loadeddata',false,true);
      // Sprite placeholder'lar opsiyonel yüklenir (gerçek asset varsa kullanılır)
      this.load.once('complete',()=>{
        try{
          const tex=this.textures.get('intro_panorama');
          panoramaLoaded=!!(tex&&tex.key!=='__MISSING'&&tex.get(0)&&tex.get(0).width>0);
        }catch(e){}
        try{
          const etex=this.textures.get('ending_panorama');
          endingPanoramaLoaded=!!(etex&&etex.key!=='__MISSING'&&etex.get(0)&&etex.get(0).width>0);
        }catch(e){}
      })
    }
    create(){
      try{
        try{
          const tex=this.textures.get('intro_panorama');
          panoramaLoaded=!!(tex&&tex.key!=='__MISSING'&&tex.get(0)&&tex.get(0).width>0&&tex.get(0).height>0);
        }catch(e){panoramaLoaded=false}
        try{
          const etex=this.textures.get('ending_panorama');
          endingPanoramaLoaded=!!(etex&&etex.key!=='__MISSING'&&etex.get(0)&&etex.get(0).width>0&&etex.get(0).height>0);
        }catch(e){endingPanoramaLoaded=false}
        document.body.classList.remove('in-game');
        const E=Phaser.Math.Easing;
        let __ok=false;
        if(E){
          const linFn=(typeof E.Linear==='function')?E.Linear:(v=>v);
          const sineIn=E.Sine?.easeIn??linFn;const sineOut=E.Sine?.easeOut??linFn;const sineIO=E.Sine?.easeInOut??linFn;
          if(E.Sine){try{E.Sine.in=sineIn;E.Sine.out=sineOut;E.Sine.inOut=sineIO;__ok=true}catch(e){}}
          if(E.Back){try{E.Back.in=E.Back.easeIn;E.Back.out=E.Back.easeOut;E.Back.inOut=E.Back.easeInOut;__ok=true}catch(e){}}
          if(!E.Quad){E.Quad={in:sineIn,out:sineOut,inOut:sineIO}}
        }
        try{window.__pbEasingInjected=__ok;window.__pbEasingMap={Sine:{in:typeof E?.Sine?.in,out:typeof E?.Sine?.out,inOut:typeof E?.Sine?.inOut},Back:{in:typeof E?.Back?.in,out:typeof E?.Back?.out}}}catch(e){}
        try{makeTextures(this)}catch(e){console.warn('makeTextures hatasi:',e)}
        ensureCharacterAliases(this);
        Art.cat='cat_idle';
        Art.bird='bird_idle';
        Art.yigo='yigo_talk1';
        try{
          const singleAnim=(animKey,texKey)=>{if(!this.anims.exists(animKey)&&this.textures.exists(texKey))this.anims.create({key:animKey,frames:[{key:texKey,frame:0}],frameRate:2,repeat:-1})};
          ['idle','run','jump','fall','attack','hurt','win','sit'].forEach(v=>singleAnim(`cat-${v}`,`cat_${v}`));
          ['idle','happy','wave','cage','sit'].forEach(v=>singleAnim(`bird-${v}`,`bird_${v}`));
          ['idle','walk','attack','hurt','defeat','laugh'].forEach(v=>singleAnim(`yigo-${v}`,`yigo_${v}`));
        }catch(e){console.warn('animasyon hatasi:',e)}
      }catch(fatal){console.error('Boot create FATAL:',fatal)}
      finally{
        // DIKKAT: create icinde dogrudan scene.stop() / start() CAGIRMA — create yariyorsa bozar!
        // Sadece setTimeout ve Phaser delayedCall kullan: create TAMAMLANDIKTAN SONRA calissin!
        var urlParams;
        try{urlParams=new URLSearchParams(window.location.search||'');}catch(_){urlParams={get:function(){return ''}}}
        var forceScene='';
        try{forceScene=urlParams.get('scene')||'';}catch(_){forceScene=''}
        var validScenes=['Credits','Title','Intro','LevelCard','World','Ending'];
        var useScene='Title';
        for(var _i=0;_i<validScenes.length;_i++){if(validScenes[_i]===forceScene){useScene=forceScene;break;}}
        var _tryCount=0;
        var _goTry=function(){
          try{
            // Yontem 1: this.scene.start (normal)
            try{this.scene.start(useScene);return true;}catch(e1){}
            // Yontem 2: game.scene.start
            try{game.scene.start(useScene);return true;}catch(e2){}
            // Yontem 3: window.__game.scene.start
            try{if(window.__game && window.__game.scene){window.__game.scene.start(useScene);return true;}}catch(e3){}
          }catch(bigErr){}
          return false;
        }.bind(this);
        var go=function(){
          if(this._endingStarted)return;
          this._endingStarted=true;
          // ilk deneme
          if(_goTry())return;
          // basarisiz olursa interval ile 10 kere daha dene
          var _tries=0;
          var _retryInt=setInterval(function(){
            _tries++;
            if(_goTry() || _tries>=10){clearInterval(_retryInt);}
          },120);
        }.bind(this);
        // 1. Phaser time — 1 frame sonra (create bittikten sonra)
        try{this.time.delayedCall(50,go)}catch(_){}
        // 2. JS timeout — en garantili, create bittikten 280ms sonra
        try{setTimeout(go,280)}catch(_){}
        // 3. Ekstra fallback: 750ms sonra tekrar dene (forceScene icin onemli)
        try{setTimeout(go,750)}catch(_){}
      }
    }
  }
  class Title extends Phaser.Scene{
    constructor(){super('Title')}
    create(){
      try{this.scene.stop('Boot')}catch(e){}
      try{
        document.body.classList.remove('in-game');
        this.sfx=new Sound(this);
        const bg=this.add.graphics();
        bg.fillGradientStyle(0x8fdcff,0x8fdcff,0xf6b4cb,0xf0a6c2,1).fillRect(0,0,W,H);
        this.add.circle(760,92,76,0xfff0b1,.95);this.add.circle(760,92,118,0xfff0b1,.22);
        try{for(let i=0;i<4;i++)this.add.image(110+i*230,78+(i%2)*18,'cloud').setScale(.85+(i%3)*.18).setAlpha(.78)}catch(e){}
        for(let i=0;i<8;i++)this.add.circle(70+i*130,455-(i%3)*12,88+(i%2)*30,i%2?0x7dbb7a:0x6ba1d8,.2);
        this.add.rectangle(W/2,470,W,150,0x6aa45f,.88);
        this.add.rectangle(W/2,500,W,92,0x4b7b49,.95);
        for(let i=0;i<12;i++){const x=40+i*82;this.add.circle(x,438-(i%2)*9,4,i%3?0xffd88a:0xff8db0,.95)}
        const panelGlow=this.add.rectangle(W/2,286,660,360,0xffffff,.08).setStrokeStyle(2,0xfff0d2,.45);
        try{panelGlow.setBlendMode(Phaser.BlendModes.SCREEN)}catch(e){}
        this.add.rectangle(W/2,286,632,332,0x251b35,.3).setStrokeStyle(3,0xfff0d2,.78);
        this.add.text(W/2,102,'MASALSI PLATFORM MACERASI',{fontFamily:'Georgia',fontSize:19,color:'#fff7dc',stroke:'#5c3a56',strokeThickness:4,letterSpacing:2}).setOrigin(.5);
        this.add.text(W/2,150,'THE PRINCESS BIRD',{fontFamily:'Georgia',fontStyle:'bold',fontSize:60,color:'#fff3bf',stroke:'#523149',strokeThickness:8,shadow:{offsetX:0,offsetY:3,color:'#00000033',blur:2,fill:true}}).setOrigin(.5);
        // Yalnızca yüklenen kuş sprite'ı kullanılır.
        try{
          const bird=this.add.sprite(538,240,Art.bird).setScale(2.45);
          if(this.anims.exists('bird-idle'))try{bird.play('bird-idle')}catch(e){}
          this.tweens.add({targets:bird,y:230,angle:-5,duration:920,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
        }catch(e){}
        // Yalnızca yüklenen kedi sprite'ı kullanılır.
        try{
          const cat=this.add.sprite(255,344,'cat_sit').setScale(2.85);
          if(this.anims.exists('cat-sit'))try{cat.play('cat-sit')}catch(e){}
          this.tweens.add({targets:cat,y:336,duration:1200,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
        }catch(e){}
        // Spark particles — spark yoksa gorsel efekt atla
        try{
          if(this.textures.exists('spark')){
            this.add.particles(0,0,'spark',{x:{min:150,max:820},y:{min:110,max:430},speed:{min:4,max:15},lifespan:2200,frequency:240,quantity:1,scale:{start:.9,end:0},alpha:{start:.75,end:0},tint:[0xfff1b2,0xffa2c4,0xdef7ff]});
          }
        }catch(e){}
        this.add.text(W/2,314,'Küçük kediyi yönet, prenses kuşu kurtar,\ndört dünyayı geç ve Yigo ile yüzleş.',{fontFamily:'Georgia',fontSize:22,color:'#fff8ec',stroke:'#4d3148',strokeThickness:5,align:'center',lineSpacing:10}).setOrigin(.5);
        makeButton(this,W/2,400,'MACERAYA BAŞLA',()=>{try{this.sfx.ui()}catch(e){}beginNewGame();Music.ensure();this.scene.start('Intro')});
        const hasProgress=state.worldProgress>0&&state.worldProgress<WORLDS.length;
        if(hasProgress)makeButton(this,W/2,470,`DEVAM ET · ${state.worldProgress+1}. BÖLÜM`,()=>{try{this.sfx.ui()}catch(e){}this.scene.start('LevelCard',{worldIndex:state.worldProgress})},'secondary');
        else if(state.worldProgress>=WORLDS.length)this.add.text(W/2,470,'Masal tamamlandı · yeniden oynamak için Maceraya Başla',{fontSize:16,color:'#fff7dc',stroke:'#4d3148',strokeThickness:4}).setOrigin(.5);
      }catch(fatal){
        console.error('Title create FATAL:',fatal);
        // FATAL durumda bile EN AZINDAN butonlari ciz
        try{
          document.body.classList.remove('in-game');
          this.add.rectangle(W/2,H/2,W,H,0x2a1f3e,1);
          this.add.text(W/2,150,'THE PRINCESS BIRD',{fontFamily:'Georgia',fontStyle:'bold',fontSize:56,color:'#fff3bf'}).setOrigin(.5);
          makeButton(this,W/2,350,'MACERAYA BAŞLA',()=>this.scene.start('Intro'));
        }catch(last){}
      }
    }
  }
  class Intro extends Phaser.Scene{
    constructor(){super('Intro');this.finished=false}
    create(){
      try{this.scene.stop('Boot')}catch(e){}
      document.body.classList.remove('in-game');
      this.finished=false;
      Music.ensure();
      this.playVideo();
    }
    finish(){if(this.finished)return;this.finished=true;this.scene.start('LevelCard',{worldIndex:0})}
    playVideo(){
      this.cameras.main.setBackgroundColor('#2a1f4a');
      const wrap=document.createElement('div');
      wrap.id='intro-video-wrap';
      wrap.style.cssText=`position:fixed;left:0;top:0;width:100vw;height:100vh;background:#000;z-index:99998;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s ease;overflow:hidden`;
      const v=document.createElement('video');
      v.src='assets/cutscenes/intro.mp4';
      v.crossOrigin='anonymous';
      v.playsInline=true;
      v.setAttribute('webkit-playsinline','true');
      v.muted=false;
      v.preload='auto';
      v.style.cssText=`max-width:100vw;max-height:100vh;width:auto;height:auto;object-fit:none;border:0;box-shadow:0 20px 80px rgba(0,0,0,.7)`;
      const skip=document.createElement('button');
      skip.textContent='ATLA ›';
      skip.style.cssText=`position:absolute;right:22px;bottom:22px;background:#221b30cc;color:#fff;border:none;padding:9px 16px;font-size:14px;border-radius:10px;cursor:pointer;font-family:Georgia;font-weight:bold;backdrop-filter:blur(6px);box-shadow:0 6px 18px rgba(0,0,0,.4);letter-spacing:.5px`;
      wrap.appendChild(v);wrap.appendChild(skip);
      document.body.appendChild(wrap);
      requestAnimationFrame(()=>wrap.style.opacity='1');
      let done=false,cleanupRan=false;
      const cleanup=(andFinish=true)=>{
        if(cleanupRan)return;cleanupRan=true;
        try{wrap.style.opacity='0';setTimeout(()=>wrap.remove(),320)}catch(_){}
        if(!done&&andFinish){done=true;this.finish()}
      };
      skip.addEventListener('click',()=>cleanup(true));
      v.addEventListener('ended',()=>cleanup(true));
      v.addEventListener('error',()=>{cleanupRan=true;try{wrap.remove()}catch(_){}this.playPanorama()});
      v.addEventListener('loadedmetadata',()=>{
        v.style.width='auto';v.style.height='auto';
      });
      const tryPlay=()=>{
        const p=v.play();
        if(p&&typeof p.then==='function'){
          p.then(()=>{}).catch(()=>{
            v.muted=true;
            const q=v.play();
            if(q&&typeof q.then==='function')q.catch(()=>{
              cleanupRan=true;try{wrap.remove()}catch(_){}this.playPanorama()
            })
          })
        }
      };
      tryPlay()
    }
    makeFallbackTex(){
      const PAN_W=4000,PAN_H=H;
      if(this.textures.exists('__fallback_pan')){try{this.textures.remove('__fallback_pan')}catch(e){}}
      const g=this.make.graphics({x:0,y:0,add:false});
      for(let i=0;i<PAN_H;i++){
        const t=i/PAN_H;
        const r=Math.round(110+(148-110)*(1-t));
        const gr=Math.round(90+(208-90)*(1-t));
        const b=Math.round(140+(250-140)*(1-t));
        g.fillStyle((r<<16)|(gr<<8)|b,1).fillRect(0,i,PAN_W,1)
      }
      g.fillStyle(0xffe6a8,.95).fillCircle(500,80,70);
      g.fillStyle(0xffd88a,.35).fillCircle(500,80,120);
      g.fillStyle(0xffc86a,.18).fillCircle(500,80,170);
      for(let i=0;i<40;i++){
        const x=i*110,h=70+((i*73)%90);
        g.fillStyle(0x7d7aa5,.55);
        g.fillTriangle(x,210,x+90,210-h,x+180,210);
        g.fillStyle(0xffffff,.7);
        g.fillTriangle(x+55,210-h+10,x+70,210-h+30,x+85,210-h+10)
      }
      for(let i=0;i<32;i++){
        const x=i*140+40,h=110+((i*131)%130);
        g.fillStyle(0x5b6f8e,.85);
        g.fillTriangle(x,240,x+110,240-h,x+220,240)
      }
      for(let i=0;i<28;i++){
        const x=i*170+30;
        g.fillStyle(0x387852).fillCircle(x,260,80);
        g.fillStyle(0x458a60).fillCircle(x+60,265,70);
        g.fillStyle(0x2e6244).fillCircle(x+120,258,78);
        g.fillStyle(0x573327).fillRect(x+75,270,6,30)
      }
      const housePositions=[300,900,1500,2200,2900,3600];
      housePositions.forEach((hx,i)=>{
        const baseY=275;
        g.fillStyle(0xe8d5b5).fillRect(hx,baseY-40,80,45);
        g.fillStyle(i%2?0xd96e6e:0xa45d7a).fillTriangle(hx-8,baseY-40,hx+40,baseY-90,hx+88,baseY-40);
        g.fillStyle(0x5a3a2a).fillRect(hx+30,baseY-22,16,27);
        g.fillStyle(0xffd88a,.9).fillRect(hx+10,baseY-30,14,14);
        g.fillRect(hx+56,baseY-30,14,14)
      });
      const cx=3550;
      g.fillStyle(0x8a7d9c,.95).fillRect(cx-70,170,140,110);
      g.fillStyle(0x695a7e).fillRect(cx-80,150,35,130);
      g.fillStyle(0x695a7e).fillRect(cx+45,150,35,130);
      for(let k=0;k<5;k++){g.fillStyle(0xb8a55e).fillTriangle(cx-82+k*38,150,cx-63+k*38,125,cx-44+k*38,150)}
      g.fillStyle(0x2a1f3a).fillRect(cx-10,210,20,70);
      g.fillStyle(0x4c8a52).fillRect(0,280,PAN_W,50);
      g.fillStyle(0x3b6f42).fillRect(0,300,PAN_W,30);
      for(let i=0;i<PAN_W;i+=18){
        g.fillStyle(0x6fae4e).fillRect(i,276,2,6);
        if((i/18)%5===0)g.fillStyle(0xffb86b).fillCircle(i,278,2)
      }
      for(let i=0;i<30;i++){
        const cx2=100+i*132,cy=50+((i*37)%110);
        g.fillStyle(0xffffff,.75).fillCircle(cx2,cy,22).fillCircle(cx2+20,cy-6,24).fillCircle(cx2+42,cy,20)
      }
      g.generateTexture('__fallback_pan',PAN_W,PAN_H);g.destroy();
      return true
    }
    playPanorama(){
      const PAN_W=4000,PAN_H=H;
      this.cameras.main.setBackgroundColor('#1a1428');
      this.add.rectangle(W/2,H/2,W,H,0x1a1428).setDepth(-10);
      const y=0;
      // Önce fallback'i HER ZAMAN oluştur (güvenli). Sonra panorama varsa onu kullan.
      let fbOk=false;try{this.makeFallbackTex();fbOk=this.textures.exists('__fallback_pan')}catch(e){}
      let useKey='__fallback_pan';
      let panoramaWidth=PAN_W;
      try{
        if(panoramaLoaded&&this.textures.exists('intro_panorama')){
          const t=this.textures.get('intro_panorama');
          if(t&&t.key!=='__MISSING'&&t.get(0)&&t.get(0).width>0&&t.get(0).height>0){
            useKey='intro_panorama';
            // Görseli ezmeden ekran yüksekliğine göre ölçekle (cover).
            panoramaWidth=Math.max(W,Math.round((t.get(0).width/t.get(0).height)*PAN_H));
          }
        }
      }catch(e){useKey='__fallback_pan'}
      // SAĞDAN SOLA panorama akışı — görselin sağ tarafı görünür, sola kayar
      // Phaser'da +x ekranın SAĞINA doğrudur.
      // startX=W  : Görselin SOL KENARI ekranın sağ kenarında (görselin sağ yarısı neredeyse görünmeye başlar)
      // endX=-panoramaWidth: Görselin SOL KENARI tamamen sola kaymış, görsel bitmiş
      const startX=W;
      const endX=-panoramaWidth;
      const panorama=this.add.image(startX,y,useKey).setOrigin(0,0).setDepth(0);
      panorama.setDisplaySize(panoramaWidth,PAN_H);panorama.setVisible(true).setAlpha(1);
      const skip=this.add.text(W-28,H-28,'ATLA ›',{fontSize:16,color:'#fff',backgroundColor:'#221b30cc',padding:{x:12,y:7}}).setOrigin(1).setInteractive({useHandCursor:true}).setDepth(30);
      skip.on('pointerdown',()=>{this.tweens.killTweensOf(panorama);this.finish()});
      // Add cat sprite
      const cat=this.add.sprite(W/2,H-80,'cat_idle').setScale(1.5).setDepth(10);
      this.tweens.add({targets:cat,y:H-100,duration:800,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      this.tweens.add({targets:panorama,x:endX,duration:14000,ease:'Linear',onComplete:()=>{
        this.cameras.main.fadeOut(600);this.time.delayedCall(700,()=>this.finish())
      }});
    }
  }
  class LevelCard extends Phaser.Scene{
    constructor(){super('LevelCard')}
    init(data={}){this.worldIndex=Phaser.Math.Clamp(data.worldIndex||0,0,WORLDS.length-1)}
    create(){
      try{this.scene.stop('Boot')}catch(e){}
      document.body.classList.remove('in-game');
      this.sfx=new Sound(this);const world=WORLDS[this.worldIndex];
        const bg=this.add.graphics();
        bg.fillGradientStyle(world.sky,world.sky,0x2e243f,0x2e243f,1).fillRect(0,0,W,H);
        this.add.circle(W-150,100,58,0xfff1b6,.8);this.add.circle(W-150,100,92,0xfff1b6,.16);
        this.add.image(100,100,'cloud').setAlpha(.72);this.add.image(780,180,'cloud').setAlpha(.72);this.add.image(520,86,'cloud').setScale(.8).setAlpha(.65);
        this.add.rectangle(W/2,270,712,320,0x261d34,.42).setStrokeStyle(2,0xfff3c6,.78);
        this.add.rectangle(W/2,270,680,288,0xffffff,.05);
      this.add.text(W/2,140,world.name,{fontFamily:'Georgia',fontStyle:'bold',fontSize:33,color:'#fff5d4',stroke:'#33233d',strokeThickness:6}).setOrigin(.5);
        this.add.text(W/2,198,world.subtitle,{fontSize:22,color:'#fff7dc',fontStyle:'italic',stroke:'#33233d',strokeThickness:3}).setOrigin(.5);
        this.add.text(W/2,275,world.feature,{fontSize:17,color:'#fff7dc',wordWrap:{width:620},align:'center',lineSpacing:8}).setOrigin(.5);
      const hearts='♥'.repeat(state.hearts||3);
        this.add.text(W/2,350,`Hayat: ${hearts}    Toplanan: ${Object.values(state.collectibles).reduce((a,b)=>a+b,0)}`,{fontSize:18,color:'#ffd88a',stroke:'#33233d',strokeThickness:3}).setOrigin(.5);
        makeButton(this,W/2,420,'BÖLÜME GİR',()=>{this.sfx.ui();this.scene.start('World',{worldIndex:this.worldIndex})});
    }
  }
  // ========== WORLD (MAIN GAMEPLAY) ==========
  class World extends Phaser.Scene{
    constructor(){super('World')}
    init(data={}){
      this.worldIndex=Number.isInteger(data.worldIndex)?data.worldIndex:Math.min(state.worldProgress||0,WORLDS.length-1);
      this.world=WORLDS[this.worldIndex]||WORLDS[0];this.paused=false;
      this.hearts=Math.max(1,state.hearts||3);this._dying=false;this._didRestart=false;this.invulnerable=false;this._isHurt=false;this._hurtUntil=0;this._hurtTween=null;this.jumpCount=0;this.lastGrounded=0;
      this.bossStarted=false;this.bossPhase=1;this.bossLastAttack=0;
      this.levelCompleting=false;this.checkpointActive=false;this.attackCooldown=0;this.dustTimer=0;
      this.dialogueOpen=false;this.npcDialogueCooldown=0;
      this._catWalkTimer=0;this._yigoTalkTimer=0;this._endingStarted=false;this.bossDefeated=false;
      this._isAttacking=false;this._hurtTween=null;
    }
    create(){
      try{this.scene.stop('Boot')}catch(e){}
      document.body.classList.add('in-game');
      this.events.on('shutdown',()=>document.body.classList.remove('in-game'));
      this.events.once('destroy',()=>document.body.classList.remove('in-game'));
      // Pause sistemi: ESC / P / HTML panel
      this.paused=false;
      const pausePanel=()=>document.getElementById('pause');
      const pauseNow=()=>{if(!this.paused)this.togglePause()};
      const resumeNow=()=>{if(this.paused)this.togglePause()};
      this._onVisChange=()=>{if(document.hidden)pauseNow()};
      this._onKeyEsc=(e)=>{if(e.key==='Escape'||e.keyCode===27){e.preventDefault();this.togglePause()}};
      this._onKeyP=(e)=>{if(e.key==='p'||e.key==='P'){e.preventDefault();this.togglePause()}};
      this._onWinBlur=()=>pauseNow();
      document.addEventListener('visibilitychange',this._onVisChange);
      window.addEventListener('blur',this._onWinBlur);
      document.addEventListener('keydown',this._onKeyEsc);
      document.addEventListener('keydown',this._onKeyP);
      this.events.once('shutdown',()=>{
        document.removeEventListener('visibilitychange',this._onVisChange);
        window.removeEventListener('blur',this._onWinBlur);
        document.removeEventListener('keydown',this._onKeyEsc);
        document.removeEventListener('keydown',this._onKeyP);
        pausePanel()?.classList.add('hidden');
        // Boss ölüm sonrası tüm bossWeapons temizle
        if(this.bossWeapons)this.bossWeapons.clear(true,true);
        if(this.yigo&&this.yigo.active){this.yigo.disableBody(true,true)}
      });
      this.soundFX=new Sound(this);
      this.physics.world.setBounds(0,0,this.world.width,H);
      this.cameras.main.setBounds(0,0,this.world.width,H);
      this.cameras.main.setBackgroundColor(this.world.sky);this.cameras.main.fadeIn(330);
      this.bgDecorations();this.setupWeather();
      this.ground=this.physics.add.staticGroup();
      for(let x=0;x<this.world.width;x+=80){const tile=this.ground.create(x+40,475,'ground');tile.setDisplaySize(82,130).setTint(this.world.ground).refreshBody()}
      for(let i=0;i<this.world.width/74;i++)this.add.circle(i*74+20,445-(i%4)*6,3,i%3?0xf4e7a1:0xf68ba8).setDepth(1);
      this.staticPlatforms=this.physics.add.staticGroup();this.movingPlatforms=this.physics.add.group();
      this.fallingPlatforms=this.physics.add.group();this.breakablePlatforms=this.physics.add.group();
      this.setupPlatforms();this.allGrounds=[this.ground,this.staticPlatforms,this.movingPlatforms,this.fallingPlatforms,this.breakablePlatforms];
      this.respawnX=(this.worldIndex===state.checkpointWorld)?clamp(state.checkpoint||100,100,this.world.width-150):100;
      this.player=this.physics.add.sprite(this.respawnX,350,'cat_idle').setScale(1.3).setCollideWorldBounds(true);
      this.player.body.setSize(22,28).setOffset(5,4);
      this.player.body.setDragX(1550).setMaxVelocity(215,620);
      this.allGrounds.forEach(g=>this.physics.add.collider(this.player,g));
      this.cursors=this.input.keyboard.createCursorKeys();
      this.keys=this.input.keyboard.addKeys('A,D,W,SPACE,E,SHIFT,P,ESC,F,Q');
      this.input.gamepad.once('connected',()=>{this.gamepad=this.input.gamepad.pad1},this);
        this.add.rectangle(180,38,560,56,0x1f172d,.46).setScrollFactor(0).setDepth(99).setStrokeStyle(2,0xffeab8,.58);
        this.add.text(22,20,this.world.name,{fontSize:16,color:'#fff7dc',stroke:'#40304c',strokeThickness:4}).setScrollFactor(0).setDepth(100);
        this.hudHearts=[];
        for(let i=0;i<5;i++){
          const hx=22+i*26;
          const sh=this.add.image(hx,50,'heart').setScrollFactor(0).setDepth(100).setOrigin(0,.5);
          sh.setScale(0.62);
          this.hudHearts.push(sh);
        }
        this.hudRecIcon=this.add.image(170,50,'record').setScrollFactor(0).setDepth(100).setOrigin(0,.5).setScale(0.7);
        this.hudRecText=this.add.text(200,50,'0',{fontSize:19,color:'#ffd1d9',stroke:'#402030',strokeThickness:5,align:'left'}).setScrollFactor(0).setDepth(100).setOrigin(0,.5);
        this.hudCtrlIcon=this.add.image(248,50,'controller').setScrollFactor(0).setDepth(100).setOrigin(0,.5).setScale(0.38);
        this.hudCtrlText=this.add.text(288,50,'0',{fontSize:19,color:'#c8e4ff',stroke:'#153050',strokeThickness:5,align:'left'}).setScrollFactor(0).setDepth(100).setOrigin(0,.5);
        this.hudText=null;this.updateHud();
        this.add.text(250,375,this.world.subtitle,{fontSize:15,color:'#fffdf3',stroke:'#40304c',strokeThickness:3,backgroundColor:'#2a2138aa',padding:{x:10,y:5}}).setDepth(5);
      this.collectibles=this.physics.add.group();this.setupCollectibles();
      this.physics.add.overlap(this.player,this.collectibles,(p,c)=>this.collect(c),null,this);
      this.enemies=this.physics.add.group();this.setupEnemies();
      this.allGrounds.forEach(g=>this.physics.add.collider(this.enemies,g));
      this.physics.add.overlap(this.player,this.enemies,(p,e)=>this.resolveEnemyContact(p,e),null,this);
      this.npcs=this.add.group();this.setupNPCs();
      this.checkpoint=this.physics.add.staticImage(this.world.checkpoint,378,'checkpoint').setDepth(2);
      this.physics.add.overlap(this.player,this.checkpoint,()=>this.activateCheckpoint());
      if(this.world.isBoss)this.setupCastle();else this.setupGoal();
      if(this.world.weather==='sunny')this.addSunRays();
      this.throwCooldown=0;
      this.fishProjectiles=this.physics.add.group({allowGravity:true});
      this.allGrounds.forEach(g=>this.physics.add.collider(this.fishProjectiles,g,(fish)=>{if(!fish.active)return;const fx=fish.x,fy=fish.y;fish.disableBody(true,true);this.spark(fx,fy,0xf9739b,5)}));
      this.physics.add.overlap(this.fishProjectiles,this.enemies,(fish,enemy)=>{if(!fish.active||!enemy.active)return;const fx=fish.x,fy=fish.y;fish.disableBody(true,true);this.hitEnemy(enemy,1);this.spark(fx,fy,0xf9739b,7)});
      Music.ensure();
      this.cameras.main.startFollow(this.player,true,0.08,0.08);this.cameras.main.setDeadzone(120,80);
    }
    bgDecorations(){
        const skyGlow=this.add.graphics().setScrollFactor(0);
        skyGlow.fillGradientStyle(0xffffff,0xffffff,0x000000,0x000000,.06).fillRect(0,0,this.world.width,H*.55);
        for(let i=0;i<10;i++){const c=this.add.image(80+i*300,50+(i%3)*55,'cloud').setScrollFactor(.15+(i%3)*.1).setAlpha(.7);this.tweens.add({targets:c,x:'+=120',duration:12000+i*800,repeat:-1,yoyo:true,ease:'Sine.easeInOut'})}
        if(this.world.bg==='forest'){
          this.add.rectangle(this.world.width/2,470,this.world.width,180,0x274c38,.52).setScrollFactor(.15);
          for(let i=0;i<18;i++){const x=150+i*170;this.add.circle(x,300,90,0x295543,.3).setScrollFactor(.25);this.add.circle(x+35,336,72,0x1d4030,.22).setScrollFactor(.25)}
          for(let i=0;i<20;i++){const x=200+i*150;this.add.rectangle(x,410,16,98,0x3b2d36).setScrollFactor(.5);this.add.circle(x,352,44,0x2d5b42).setScrollFactor(.5);this.add.circle(x-24,382,34,0x387852).setScrollFactor(.5);this.add.circle(x+22,380,32,0x44865b).setScrollFactor(.5)}
          for(let i=0;i<8;i++)this.add.ellipse(140+i*380,435,260,44,0xdfffea,.08).setScrollFactor(.42)
        }else if(this.world.bg==='mountain'){
          for(let i=0;i<11;i++){const x=250+i*290;this.add.graphics().fillStyle(0x55657f,.28).fillTriangle(x-210,470,x,180,x+210,470).setScrollFactor(.22)}
          for(let i=0;i<10;i++){const x=300+i*320;this.add.graphics().fillStyle(0x6a7a95,.86).fillTriangle(x-150,470,x,230,x+150,470).setScrollFactor(.4);this.add.graphics().fillStyle(0xf7fbff,.9).fillTriangle(x-44,302,x,230,x+44,302).setScrollFactor(.4)}
          for(let i=0;i<7;i++)this.add.ellipse(150+i*430,420,280,54,0xf8fbff,.12).setScrollFactor(.36)
        }else if(this.world.bg==='castle'){
          this.add.circle(this.world.width-320,110,58,0xffe3b8,.32).setScrollFactor(.08);
          for(let i=0;i<36;i++)this.add.circle(90+i*72,90+(i%4)*26,1.8,0xfff6d1,.7).setScrollFactor(.05);
          this.add.rectangle(this.world.width/2,455,this.world.width,120,0x2d2239,.74).setScrollFactor(.2);
          for(let i=0;i<8;i++){const x=180+i*340;this.add.rectangle(x,370,86,210,0x3a2748).setScrollFactor(.45);this.add.rectangle(x,280,34,70,0x4a335d).setScrollFactor(.45);this.add.rectangle(x-24,294,20,42,0x4d3662).setScrollFactor(.45);this.add.rectangle(x+24,294,20,42,0x4d3662).setScrollFactor(.45);this.add.rectangle(x,360,16,36,0xffd88a).setScrollFactor(.5);this.add.rectangle(x,410,24,60,0x24172d).setScrollFactor(.5)}
        }else{
          for(let i=0;i<10;i++)this.add.ellipse(160+i*280,446,250,72,i%2?0x76b96d:0x70aee1,.18).setScrollFactor(.2);
          for(let i=0;i<12;i++){const x=100+i*240;this.add.rectangle(x,405,44,136,0xc89856).setScrollFactor(.5);this.add.triangle(x,336,x-34,402,x+34,402,0xd96657).setScrollFactor(.5);this.add.rectangle(x-12,430,10,24,0x8b5d34).setScrollFactor(.55);this.add.circle(x+18,438,4,0xfff1a8,.9).setScrollFactor(.55)}
          for(let i=0;i<11;i++){const x=80+i*250;this.add.rectangle(x,425,12,86,0x74512d).setScrollFactor(.45);this.add.circle(x,370,42,0x6ca75b).setScrollFactor(.45);this.add.circle(x-22,392,30,0x87c76d).setScrollFactor(.45);this.add.circle(x+18,394,27,0x75b65e).setScrollFactor(.45)}
        }
    }
    setupWeather(){
      const w=this.world.weather;
      if(w==='rain'){this.add.particles(0,-20,'rain',{x:{min:0,max:this.world.width},y:-10,speedY:{min:420,max:580},speedX:{min:-50,max:50},lifespan:1800,frequency:18,quantity:1,scale:{start:.9,end:1},angle:{min:-10,max:10},scrollFactor:.7});
        this.add.particles(0,0,'leaf',{x:{min:0,max:this.world.width},y:{min:0,max:200},speedX:{min:-60,max:-20},speedY:{min:30,max:80},lifespan:4000,frequency:400,quantity:1,angle:{min:0,max:360},rotate:{min:-180,max:180},scrollFactor:.7})}
      else if(w==='snow'){this.mountainWind=true;
        this.add.particles(0,-20,'snow',{x:{min:0,max:this.world.width},y:-10,speedY:{min:60,max:120},speedX:{min:-80,max:-30},lifespan:6000,frequency:30,quantity:1,scale:{start:.8,end:1.3},scrollFactor:.8});
        this.add.text(680,122,'❄ AYAZ RÜZGÂRI',{fontSize:16,color:'#eefaff',stroke:'#49637d',strokeThickness:3})}
      else if(w==='steam')for(let i=0;i<4;i++)this.add.particles(400+i*550,430,'steam',{speedY:{min:-30,max:-70},speedX:{min:-10,max:10},lifespan:2000,frequency:180,quantity:1,scale:{start:.7,end:1.6},alpha:{start:.6,end:0}})
    }
      addSunRays(){const g=this.add.graphics().setScrollFactor(.25).setAlpha(.35);for(let i=0;i<7;i++){g.fillStyle(0xfff6d1,.18);g.fillTriangle(180+i*95,0,140+i*95,540,260+i*95,540)}this.add.circle(160,92,54,0xfff2ae,.55).setScrollFactor(.15);this.add.circle(160,92,88,0xfff2ae,.18).setScrollFactor(.15)}
    setupPlatforms(){
      this.world.platforms.forEach(p=>{
        const type=p.t||'static';
        if(type==='static'){const plat=this.staticPlatforms.create(p.x,p.y,'platform');plat.setDisplaySize(p.w,18).setTint(this.world.ground).refreshBody()}
        else if(type==='moving'){const raft=this.movingPlatforms.create(p.x,p.y,'platform');raft.setDisplaySize(p.w,18);raft.body.setSize(p.w,18,true);raft.body.setImmovable(true);raft.body.setAllowGravity(false);this.tweens.add({targets:raft,x:p.x2??p.x+200,y:p.y2??p.y,duration:2600,yoyo:true,repeat:-1,ease:'Sine.easeInOut'})}
        else if(type==='falling'){const fp=this.fallingPlatforms.create(p.x,p.y,'platform_falling');fp.setDisplaySize(p.w,18);fp.body.setSize(p.w,18,true);fp.body.setImmovable(true);fp.body.setAllowGravity(false);fp.setData('falling',false);fp.setData('fallingDelay',0)}
        else if(type==='breakable'){const bp=this.breakablePlatforms.create(p.x,p.y,'platform_breakable');bp.setDisplaySize(p.w,18);bp.body.setSize(p.w,18,true);bp.body.setImmovable(true);bp.body.setAllowGravity(false);bp.setData('broken',false);bp.setData('hits',0)}
      })
    }
    setupCollectibles(){
      this.world.gems.forEach(({x,t,hidden},i)=>{
        const def=COLLECTIBLE_DEFS[t]||COLLECTIBLE_DEFS.controller;const y=hidden?250:395-(i*12);
        const visualKey=t==='heart'?'heart':t==='record'?'record':'controller';
        const c=this.collectibles.create(x,y,visualKey);c.setData('type',t);c.setData('hidden',!!hidden);
        if(t==='heart')c.setScale(0.72);
        else if(t==='record')c.setScale(0.8);
        else c.setScale(0.42);
        if(hidden)c.setAlpha(0.55);c.body.setAllowGravity(false);
        this.tweens.add({targets:c,y:y-15,duration:700+i*60,delay:i*130,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
        this.tweens.add({targets:c,angle:t==='controller'?5:8,duration:1400+i*120,yoyo:true,repeat:-1})
      })
    }
    setupEnemies(){
      this.world.enemies.forEach(({x,t},i)=>{
        const def=ENEMY_TYPES[t];if(!def)return;
        const e=this.enemies.create(x,def.gravity?350:200,def.key);
        e.setData('type',t);e.setData('dir',i%2?1:-1);e.setData('speed',def.speed);
        e.setData('hp',def.hp);e.setData('maxhp',def.hp);e.setData('damage',def.damage);
        e.setData('behavior',def.behavior);e.setData('homeX',x);e.setData('baseY',def.gravity?0:200+(i%3)*20);
        e.body.setSize(def.w,def.h);if(!def.gravity)e.body.setAllowGravity(false);
        e.setVelocityX(e.getData('dir')*e.getData('speed'))
      })
    }
    setupNPCs(){
      const parent=document.getElementById('game')||document.body;
      const canvas=parent.querySelector('canvas');
      this.world.npcs?.forEach(({x,t},idx)=>{
        const def=NPC_TYPES[t];if(!def)return;
        const npc=this.add.container(x,390);
        let body=null;
        if(t==='sad_twer'){
          const dImg=document.createElement('img');
          dImg.src='assets/twerk/twerk1.png';
          dImg.crossOrigin='anonymous';
          dImg.style.cssText=`position:absolute;transform-origin:center bottom;pointer-events:none;image-rendering:auto;filter:drop-shadow(0 6px 8px rgba(0,0,0,.35));transition:opacity .12s;will-change:transform,left,top,width,height;z-index:500`;
          (canvas?.parentNode||parent).appendChild(dImg);
          // === GLOBAL KAYIT (Master loop arka planda interval donduysa pozisyon/frame manuel guncellensin) ===
          try{
            window.__twerkDomImg=dImg;
            dImg.dataset.sv='0.55';       // bodyScale
            dImg.dataset.ow='126';        // baseW
            dImg.dataset.yoff='-30';      // -6 (default yukari) + -24 (ek yukari, daha onceki ayar) = -30
            dImg.dataset.worldX=String(x);
            // ayrıca frame sakla (swap durduysa diye)
            dImg.dataset.frame='0';
          }catch(_){}
          // ===============================================================================================
          const bodyScale=0.55;
          const baseW=126;
          let bobOff=0,frame=0;
          body={element:dImg,_scale:bodyScale,_offY:0,destroy(){try{dImg.remove()}catch(_){}},setScale(){},setTint(){},setFlipX(){},setFlipY(){}};
          this.tweens.add({targets:body,_offY:-3,duration:900+idx*120,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
          const animSwap=setInterval(()=>{
            if(!dImg.isConnected){clearInterval(animSwap);return}
            frame^=1;
            try{
              const ns=frame?'assets/twerk/twerk2.png':'assets/twerk/twerk1.png';
              if(dImg.src.indexOf(frame?'twerk2':'twerk1')===-1)dImg.src=ns;
            }catch(_){}
          },220);
          const updater=this.time.addEvent({delay:30,loop:true,callback:()=>{
            try{
              if(!dImg.isConnected){try{updater.remove(false)}catch(_){}clearInterval(animSwap);return}
              const cam=this.cameras.main;
              const wx=x-cam.scrollX;
              const wy=390-10-cam.scrollY;
              const rect=canvas?canvas.getBoundingClientRect():{left:0,top:0,width:innerWidth,height:innerHeight};
              const scaleX=rect.width/(this.game.config.width);
              const scaleY=rect.height/(this.game.config.height);
              const px=rect.left+wx*scaleX;
              const py=rect.top+wy*scaleY;
              const bw=(baseW*bodyScale)*scaleX;
              dImg.style.left=(px-bw/2)+'px';
              dImg.style.top=(py-6*scaleY+body._offY*scaleY-24*scaleY)+'px';
              dImg.style.width=(bw)+'px';
              dImg.style.height='auto';
            }catch(_){}
          }});
          npc.setData('__domImgEl',dImg);
          npc.setData('__useDom',true);
          this.events.once('shutdown',()=>{try{dImg.remove()}catch(_){}try{clearInterval(animSwap)}catch(_){}try{updater.remove(false)}catch(_){}});
        }else{
          let tex=def.texture;
          let fallback='npc_rabbit';
          if(t==='meowl')fallback='cat_idle';
          try{
            if(!this.textures.exists(tex)||this.textures.get(tex).key==='__MISSING')tex=fallback;
          }catch(_){tex=fallback}
          body=this.add.sprite(0,-10,tex);
          if(t==='meowl')body.setScale(0.12);
          else body.setScale(0.5);
          npc.add(body);
          this.tweens.add({targets:body,y:body.y-4,duration:900+idx*120,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
        }
        const label=this.add.text(0,-58,def.name,{fontSize:12,color:'#fff9ea',stroke:'#241b34',strokeThickness:3,backgroundColor:'rgba(42,35,58,.55)',padding:{x:8,y:4}}).setOrigin(.5);npc.add(label);
        npc.setSize(50,72);this.physics.add.existing(npc,true);
        npc.setData('def',def);npc.setData('type',t);npc.setData('id',`npc_${idx}_${t}`);
        this.npcs.add(npc);
      });
    }
      setupGoal(){this.add.circle(this.world.goal,325,40,0xffefab,.15);this.add.circle(this.world.goal,325,68,0xffefab,.08);this.goal=this.physics.add.staticImage(this.world.goal,368,'goal');this.add.text(this.world.goal,280,'AY KAPISI\nSONRAKİ DÜNYA →',{fontSize:14,color:'#fff8cc',stroke:'#40304c',strokeThickness:4,align:'center'}).setOrigin(.5);this.physics.add.overlap(this.player,this.goal,()=>this.completeLevel())}
    setupCastle(){
        this.add.circle(this.world.width-220,346,78,0xffd6a8,.09);
        this.add.rectangle(this.world.width-220,385,82,98,0xffffff,.08).setStrokeStyle(4,0x7e617d,.8);
        const cageX=this.world.width-220;
        for(let i=0;i<7;i++)this.add.line(cageX,340+i*12,-36,0,36,0,0x7a5d75).setLineWidth(1.4).setAlpha(.8);
        this.add.line(cageX,340,-36,0,36,0,0x7a5d75).setLineWidth(2).setAlpha(.85);
        this.add.line(cageX,430,-36,0,36,0,0x7a5d75).setLineWidth(2).setAlpha(.85);
      this.captiveBird=this.add.sprite(this.world.width-220,375,'bird_scared').setScale(0.9);
      this.captiveBird.setFlipX(true);
      this.tweens.add({targets:this.captiveBird,y:370,duration:900,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
        this.add.text(this.world.width-448,320,'Yigo: “ÇORBA SAATİ GELMİŞ ÖYLEMİ!”',{fontSize:16,color:'#fff7dc',stroke:'#40304c',strokeThickness:4,backgroundColor:'#2a1d35aa',padding:{x:10,y:6}});
    }
    spark(x,y,color,qty=10){const ps=this.add.particles(x,y,'spark',{speed:{min:30,max:110},scale:{start:.9,end:0},lifespan:450,quantity:qty,tint:color,gravityY:200});this.time.delayedCall(500,()=>ps.destroy())}
    dust(x,y){this.add.particles(x,y,'dust',{speedX:{min:-40,max:40},speedY:{min:-50,max:-10},lifespan:400,quantity:3,scale:{start:1.2,end:0}})}
    splash(x,y){this.add.particles(x,y,'rain',{speedY:{min:-180,max:-80},speedX:{min:-100,max:100},lifespan:400,quantity:10,scale:{start:1,end:.3}})}
    collect(c){
      if(!c.active)return;
      const dataType=c.getData('type');
      const texKey=c.texture?.key||'';
      const type=(dataType&&String(dataType).trim())||(texKey&&!['__MISSING','','texture'].includes(texKey)?texKey:null)||'controller';
      const cx=c.x,cy=c.y;
      c.destroy();
      const def=COLLECTIBLE_DEFS[type]||COLLECTIBLE_DEFS.controller;
      const inc=(k)=>{state.collectibles[k]=(Number.isFinite(state.collectibles[k])?state.collectibles[k]:0)+1};
      if(type==='heart'){inc('hearts');this.hearts=clamp((this.hearts|0)+1,0,5);state.hearts=this.hearts}
      else if(type==='record'){inc('records');state.recordAmmo=(Number.isFinite(state.recordAmmo)?state.recordAmmo:0)+3}
      else if(type==='controller'){inc('controllers')}
      else{inc('controllers')}
      save();
      this.soundFX.collect();this.spark(cx,cy,def.color,14);this.updateHud();this.toast(def.text,def.color)
    }
    toast(text,color=0xffc85a){
      const el=document.createElement('div');el.className='collectible-toast';
      // Color'ı basit hex'e çevir
      const r=(color>>16)&0xff,g=(color>>8)&0xff,b=color&0xff;
      el.style.borderColor=`rgb(${r},${g},${b})`;
      el.style.boxShadow=`0 0 24px rgba(${r},${g},${b},0.35)`;
      el.textContent=text;document.body.appendChild(el);
      this.tweens.addCounter({from:0,to:1,duration:1600,onUpdate:t=>{el.style.opacity=t.getValue()<.5?t.getValue()*2:(1-t.getValue())*2},onComplete:()=>el.remove()})
    }
    updateHud(){
      this.hearts=Number.isFinite(this.hearts)?this.hearts:3;
      const lives=Math.max(0,Math.min(5,this.hearts|0));
      if(Array.isArray(this.hudHearts)){
        this.hudHearts.forEach((h,i)=>{
          try{
            if(i<lives){h.setTint(0xffffff);h.setAlpha(1)}
            else{h.setTint(0x332233);h.setAlpha(.35)}
          }catch(_){}
        })
      }
      const c=state.collectibles||{};
      try{
        const recAmmo=Number.isFinite(state.recordAmmo)?state.recordAmmo|0:0;
        const totalRec=(c.records|0)+recAmmo;
        if(this.hudRecText)this.hudRecText.setText(String(totalRec));
      }catch(_){}
      try{if(this.hudCtrlText)this.hudCtrlText.setText(String(c.controllers|0))}catch(_){}
      const fbtn=document.getElementById('touch-fish');if(fbtn){const ammo=state.recordAmmo||0;const stock=(state.collectibles&&state.collectibles.records)||0;fbtn.setAttribute('data-fish-count',ammo);if(ammo<=0&&stock<=0)fbtn.classList.add('empty');else fbtn.classList.remove('empty')}}
    activateCheckpoint(){if(this.checkpointActive)return;this.checkpointActive=true;state.checkpoint=this.world.checkpoint;state.checkpointWorld=this.worldIndex;save();this.checkpoint.setTint(0xffe06b);this.spark(this.checkpoint.x,this.checkpoint.y-18,0xffe06b,18);const tag=this.add.text(this.checkpoint.x,this.checkpoint.y-52,'Kayıt noktası!',{fontSize:15,color:'#fff7dc',stroke:'#40304c',strokeThickness:3}).setOrigin(.5);this.tweens.add({targets:tag,alpha:0,duration:1500,delay:1600})}
    completeLevel(){
      if(this.levelCompleting)return;this.levelCompleting=true;this.player.setAccelerationX(0).setVelocityX(0);
      if(this.anims.exists('cat-win'))this.player.play('cat-win');
      this.soundFX.victory();state.worldProgress=Math.max(state.worldProgress,this.worldIndex+1);
      state.hearts=this.hearts;save();
      this.add.particles(this.player.x,this.player.y-20,'heart',{speed:{min:30,max:90},lifespan:1200,quantity:6,scale:{start:.6,end:0},gravityY:-20,tint:0xff6588});
      this.add.text(this.player.x,200,'BÖLÜM TAMAMLANDI!\nSonraki dünyaya gidiliyor…',{fontSize:24,color:'#fff8cc',stroke:'#40304c',strokeThickness:5,align:'center'}).setOrigin(.5).setDepth(20);
      this.cameras.main.flash(180,255,247,207);
      this.time.delayedCall(1100,()=>{this.cameras.main.fadeOut(400);this.time.delayedCall(480,()=>{const next=this.worldIndex+1;if(next>=WORLDS.length)this.scene.start('Ending');else this.scene.start('LevelCard',{worldIndex:next})})})
    }
    resolveEnemyContact(player,enemy){
      if(!enemy.active||this.invulnerable)return;
      const stomped=player.body.velocity.y>80&&player.body.bottom<enemy.body.center.y+20;
      if(stomped){enemy.setData('hp',enemy.getData('hp')-1);this.soundFX.tone(650,.08,'square',.05);this.spark(enemy.x,enemy.y,0xf7d35c,8);player.setVelocityY(-320);
        if(enemy.getData('hp')<=0){enemy.disableBody(true,true);this.dust(enemy.x,enemy.y+10);
          if(Math.random()<0.3){const h=this.collectibles.create(enemy.x,enemy.y,'heart');h.setData('type','heart');h.body.setAllowGravity(true);h.setBounce(.6);this.time.delayedCall(8000,()=>h.active&&h.destroy())}}}
      else this.takeHit(enemy.getData('damage')||1)
    }
    enemyHasFloorAhead(enemy){const body=enemy.body,dir=enemy.getData('dir');const footX=body.center.x+dir*(body.width*.55+7),footY=body.bottom;let ok=false;this.allGrounds.forEach(grp=>{grp.getChildren().forEach(p=>{if(!p.body)return;const L=p.x-p.displayWidth/2,R=p.x+p.displayWidth/2,T=p.y-p.displayHeight/2;if(footX>=L&&footX<=R&&Math.abs(footY-T)<16)ok=true})});return ok}
    hitEnemy(enemy,dmg=1){if(!enemy.active)return;enemy.setData('hp',(enemy.getData('hp')||1)-dmg);this.soundFX.tone(680,.09,'square',.05);
      const dir=Math.sign((enemy.x-this.player.x)||1);enemy.setVelocityX(dir*180);enemy.setVelocityY(-160);enemy.setTint(0xffffff);
      this.time.delayedCall(90,()=>enemy?.active&&enemy.clearTint());
      this.spark(enemy.x,enemy.y,0xf7d35c,10);
      if((enemy.getData('hp')||0)<=0){enemy.disableBody(true,true);this.dust(enemy.x,enemy.y+10);
        if(Math.random()<0.3){const h=this.collectibles.create(enemy.x,enemy.y,'heart');h.setData('type','heart');h.body.setAllowGravity(true);h.setBounce(.6);this.time.delayedCall(8000,()=>h.active&&h.destroy())}}}
    catThrowFish(now){
      if(now<this.throwCooldown)return;
      const ammo=state.recordAmmo||0;
      const stock=state.collectibles.records||0;
      if(ammo<=0&&stock<=0){this.showToast('Plak kalmadı! 💿 Topla ve Yigo’ya fırlat!',1500);this.throwCooldown=now+300;return}
      if(ammo<=0&&stock>0){state.collectibles.records=stock-1;state.recordAmmo=3}
      state.recordAmmo=(state.recordAmmo||0)-1;
      this.throwCooldown=now+420;this.soundFX.tone(620,.10,'sawtooth',.04);setTimeout(()=>this.soundFX.tone(880,.08,'triangle',.03),50);this.updateHud();save();
      const dir=this.player.flipX?-1:1;
      const rec=this.fishProjectiles.create(this.player.x+dir*22,this.player.y-8,'record');if(!rec)return;
      rec.setScale(1.1);rec.body.reset(this.player.x+dir*22,this.player.y-8);rec.refreshBody();
      rec.body.setAllowGravity(true);rec.body.setGravityY(700);rec.setActive(true).setVisible(true);
      rec.setVelocity(dir*460,-260);rec.setAngularVelocity(dir*600);rec.setData('damage',1);
      this.time.delayedCall(2600,()=>{if(rec.active)rec.disableBody(true,true)});
    }
    showToast(text,ttl=1500){const t=document.createElement('div');t.className='collectible-toast';t.textContent=text;document.body.appendChild(t);setTimeout(()=>t.remove(),ttl)}
    togglePause(){
      const panel=document.getElementById('pause');
      if(this.paused){
        this.paused=false;panel?.classList.add('hidden');this.physics.world.resume();this.time.timeScale=1;this.scene.resume('World');
      }else{
        this.paused=true;panel?.classList.remove('hidden');this.physics.world.pause();this.time.timeScale=0;this.scene.pause('World');
      }
    }
    takeHit(dmg=1){
      if(this.invulnerable||this._dying)return;
      this.hearts=clamp((this.hearts|0)-dmg,0,5);state.hearts=this.hearts;this.updateHud();save();
      this.soundFX.hurt();
      const now=this.time.now||0;
      this.invulnerable=true;
      this._isHurt=true;
      this._hurtUntil=now+720;
      try{
        this._hurtTween?.stop?.();
        this._hurtTween=null;
        this.player?.setAlpha(1);
        this.player?.clearTint?.();
        this.player?.setTexture(pickTex(this,'cat_hurt','cat_idle'));
        this._hurtTween=this.tweens.add({targets:this.player,alpha:.35,duration:80,yoyo:true,repeat:4,ease:'Sine.easeInOut',onComplete:()=>{
          if(!this._dying&&(this.time.now||0)>=(this._hurtUntil||0)){this._forceRestoreTexture()}
        }});
      }catch(e){try{this._hurtTween=null}catch(_){}}
      this.player?.setVelocity((this.player.flipX?1:-1)*220,-290);
      if(state.shake)this.cameras.main.shake(160,.01);this.spark(this.player?.x??0,this.player?.y??0,0xff6588,10);
      if(this.hearts<=0){
        if(this._dying)return;
        this._dying=true;this.invulnerable=true;
        this._hurtTween?.stop?.();this._hurtTween=null;
        try{this.player?.setAlpha(1)}catch(_){}
        const self=this;
        const wi=this.worldIndex;
        const doRestart=()=>{
          try{if(self._didRestart)return;}catch(_){}
          try{self._didRestart=true;}catch(_){}
          self._hurtTween?.stop?.();self._hurtTween=null;
          self._isHurt=false;self.invulnerable=false;self._hurtUntil=0;self._dying=false;
          state.hearts=3;state.recordAmmo=Number.isFinite(state.recordAmmo)?Math.max(10,state.recordAmmo|0):10;
          try{clearTimeout(__saveTimer);localStorage.setItem(SAVE_KEY,JSON.stringify(state))}catch(e){}
          try{self.cameras.main.off('camerafadeoutcomplete')}catch(e){}
          let usedRestart=false;
          try{self.scene.restart();usedRestart=true;}catch(e1){
            try{window.__game.scene.stop('World');window.__game.scene.start('World',{worldIndex:wi});usedRestart=true;}catch(e2){usedRestart=false}
          }
          try{setTimeout(()=>{
            try{
              const w=window.__game.scene.getScene('World');
              if(!w||w.hearts===0||w._dying===true){location.reload()}
            }catch(_){try{location.reload()}catch(_){}}
          },usedRestart?1100:350)}catch(_){}
        };
        try{this.player?.setVelocity(0,0);this.player?.body?.setAllowGravity(false);}catch(_){}
        try{this.physics.world.pause();}catch(_){}
        try{this.player?.setTint(0x000000);this.cameras.main.fadeOut(700,0,0,0);}catch(_){}
        try{this.cameras.main.once('camerafadeoutcomplete',doRestart);}catch(_){}
        try{this.time.delayedCall(900,doRestart);}catch(_){}
        try{setTimeout(doRestart,1200);}catch(_){}
      }else{
        this.time.delayedCall(740,()=>this.finishHurt())
      }
    }
    _forceRestoreTexture(){
      try{
        this._hurtTween?.stop?.();this._hurtTween=null;
        if(this.player){
          this.player.setAlpha(1);
          this.player.clearTint?.();
          const grounded=this.player.body?.blocked?.down||this.player.body?.touching?.down;
          const vel=Math.abs(this.player.body?.velocity?.x||0);
          if(!grounded){this.player.setTexture(pickTex(this,'cat_walk1','cat_idle'))}
          else if(vel>20){this.player.setTexture(pickTex(this,'cat_walk1','cat_idle'))}
          else{this.player.setTexture('cat_idle')}
        }
      }catch(_){}
    }
    finishHurt(){
      if(this._dying)return;
      if((this.time.now||0)<(this._hurtUntil||0)){
        const remaining=((this._hurtUntil||0)-(this.time.now||0))+20;
        if(remaining>0){this.time.delayedCall(remaining,()=>this.finishHurt());return}
      }
      if(!this._isHurt&&!this.invulnerable){return}
      this._hurtTween?.stop?.();this._hurtTween=null;
      this._forceRestoreTexture();
      this._isHurt=false;this.invulnerable=false;this._hurtUntil=0;
    }
    startBoss(){
      if(this.bossStarted)return;this.bossStarted=true;state.hearts=this.hearts;save();
      this.cameras.main.zoomTo(1.15,700,'Sine.easeInOut');
      if(state.shake)this.cameras.main.shake(280,.01);
      this.player.setVelocityX(0);
      this.bossBar=this.add.graphics().setScrollFactor(0).setDepth(120);
      this.bossLabel=this.add.text(480,58,'',{fontSize:20,color:'#fff7dc',stroke:'#33233d',strokeThickness:5}).setOrigin(.5).setScrollFactor(0).setDepth(121);
      this.bossHome=this.world.width-410;
      this.yigo=this.physics.add.sprite(this.bossHome,330,'yigo_laugh').setScale(1.7);
      if(this.anims.exists('yigo-laugh'))this.yigo.play('yigo-laugh');
      this.yigo.setData('hp',10);this.yigo.setData('maxHp',10);this.yigo.body.setSize(36,44).setOffset(6,8);
      this.yigo.body.setDragX(900).setMaxVelocity(180,680);
      this.yigo.setActive(true).setVisible(true).setAlpha(1).setDepth(100);this.yigo.body.enable=true;
      this.allGrounds.forEach(g=>this.physics.add.collider(this.yigo,g));
      this.physics.add.overlap(this.player,this.yigo,()=>{if(this.yigo?.active&&this.yigo.getData('hp')>0)this.takeHit()},null,this);
      this.bossWeapons=this.physics.add.group({allowGravity:false});this.bossPhase=1;this.bossPhaseTimer=0;this.bossHitCooldown=0;
      this.allGrounds.forEach(g=>this.physics.add.collider(this.bossWeapons,g,(w)=>{
        if(!w.active)return;const wx=w.x,wy=w.y;w.disableBody(true,true);this.spark(wx,wy,0xcccccc,6)}));
      this.physics.add.overlap(this.player,this.bossWeapons,(p,w)=>{
        if(!w.active)return;const dmg=w.getData('damage')||1;w.disableBody(true,true);this.takeHit(dmg)},null,this);
      this.physics.add.overlap(this.fishProjectiles,this.yigo,(a,b)=>{
        const isFish=(o)=>!!o&&o.active&&((o.texture?.key||'')==='record'||(o.getData&&o.getData('damage')!=null));
        const fish=isFish(a)?a:(isFish(b)?b:null);
        if(!fish||!this.yigo||!this.yigo.active)return;
        if(fish===this.yigo)return;
        const hp=this.yigo.getData('hp')||0;
        if(hp<=0){try{fish.disableBody(true,true)}catch(_){};return}
        const fx=fish.x,fy=fish.y;
        try{fish.disableBody(true,true)}catch(_){}
        this.soundFX.bossHit();
        this.spark(fx,fy,0xf9739b,14);
        this.spark(this.yigo.x,this.yigo.y-8,0xff8da0,10);
        const dmg=(fish.getData&&fish.getData('damage'))||1;
        this.hitBoss(dmg);
        if(!this.yigo||!this.yigo.active)return;
        this.yigo.setActive(true).setVisible(true).setAlpha(1).setDepth(100);
        const dir=Math.sign((this.yigo.x-fx)||1);
        this.yigo.setVelocityX(dir*120);this.yigo.setVelocityY(-90);
        if(this.yigo.body)this.yigo.body.enable=true;
        this.refreshBossBar()
      },null,this);
      this.bossLabel.setText('👨‍🍳  YIGO ÖNÜNÜ KESTİ!');
      this.soundFX.tone(120,.3,'sawtooth',.08);
      this.time.delayedCall(1800,()=>this.refreshBossBar());
    }
    refreshBossBar(){if(!this.bossBar||!this.yigo?.active)return;const x=250,y=30,w=460,h=18;const hp=this.yigo.getData('hp')||0;const maxHp=this.yigo.getData('maxHp')||10;this.bossBar.clear();this.bossBar.fillStyle(0x221b30,.9).fillRoundedRect(x-5,y-5,w+10,h+10,6);this.bossBar.fillStyle(0x562f3b).fillRoundedRect(x,y,w,h,4);const pct=clamp(hp/maxHp,0,1);const col=pct>.6?0xff6588:pct>.3?0xffa040:0xff4040;this.bossBar.fillStyle(col).fillRoundedRect(x,y,w*pct,h,4);this.bossBar.lineStyle(2,0xffc6d8).strokeRoundedRect(x,y,w,h,4)}
    bossAttack(now){
      if(!this.yigo?.active||this.bossLastAttack>now)return;
      const p=this.bossPhase;
      if(p===1){this.bossLastAttack=now+1100;this.yigoBossThrow('spoon',320);this._yigoAnimBusy(450,'yigo_attack');this.bossLabel.setText('FAZ 1 · Yigo kaşık atıyor!')}
      else if(p===2){this.bossLastAttack=now+1500;this.yigoBossThrow('pan',270,true);this._yigoAnimBusy(450,'yigo_attack');this.bossLabel.setText('FAZ 2 · Yigo tava savuruyor!')}
      else if(p===3){this.bossLastAttack=now+1600;this._yigoAnimBusy(350,'yigo_laugh');this.soundFX.tone(400,.15,'triangle',.05);this.bossLabel.setText('FAZ 3 · Yigo çıldırıp koşuyor!');this.yigoBossThrow('spoon',240)}
      this.refreshBossBar()
    }
    _yigoAnimBusy(ms,tex){
      this._yigoBusy=true;
      if(tex&&this.yigo?.active)this.yigo.setTexture(tex);
      this.time.delayedCall(ms,()=>{this._yigoBusy=false});
    }
    yigoBossThrow(key,speed,slowFall=false){
      const dirToPlayer=Math.sign(this.player.x-this.yigo.x)||1;
      const w=this.bossWeapons.create(this.yigo.x+dirToPlayer*25,this.yigo.y-10,key);if(!w)return;
      w.setScale(1.2);w.body.setAllowGravity(true);w.body.reset(this.yigo.x+dirToPlayer*25,this.yigo.y-10);w.refreshBody();
      w.setBounce(slowFall?0.4:0.1);w.setVelocity(dirToPlayer*speed,-140);w.body.setGravityY(slowFall?300:700);
      w.setAngularVelocity(dirToPlayer*500);w.setData('damage',1);w.setActive(true).setVisible(true);
      this.time.delayedCall(3500,()=>{if(w.active)w.disableBody(true,true)})
    }
    setBossPhase(phase){
      if(!this.yigo)return;this.bossPhase=phase;
      this.yigo.setActive(true).setVisible(true).setAlpha(1).setDepth(100);
      if(this.yigo.body)this.yigo.body.enable=true;
      if(phase===2){this.yigo.setTint(0xffda79);if(state.shake)this.cameras.main.shake(200,.015)}
      if(phase===3){this.yigo.setTint(0xff8da0);if(state.shake)this.cameras.main.shake(260,.02)}
      this.soundFX.bossHit();
      this.time.delayedCall(180,()=>{if(!this.yigo)return;this.yigo.setActive(true).setVisible(true).setAlpha(1).setDepth(100);if(this.yigo.body)this.yigo.body.enable=true})
    }
    hitBoss(dmg=1){
      if(!this.yigo||!this.yigo.active||!this.yigo.body)return;
      // Zorla görünür kıl — race condition'a karşı
      this.yigo.setActive(true).setVisible(true).setAlpha(1).setDepth(100);
      if(this.yigo.body)this.yigo.body.enable=true;
      const now=this.time.now||0;
      if(now<(this.bossHitCooldown||0))return;
      this.bossHitCooldown=now+180;
      const maxHp=this.yigo.getData('maxHp')||10;
      const hp=Math.max(0,(this.yigo.getData('hp')??maxHp)-dmg);
      this.yigo.setData('hp',hp);
      // Tekrar garanti (tint çakışmasın diye)
      this.yigo.setActive(true).setVisible(true).setAlpha(1).setDepth(100);
      if(this.yigo.body)this.yigo.body.enable=true;
      if(this.anims.exists('yigo-hurt')){this.yigo.play('yigo-hurt');this._yigoBusy=true;this.time.delayedCall(350,()=>{this._yigoBusy=false})}
      else this._yigoAnimBusy(350,'yigo_hurt');
      this.soundFX.bossHit();this.yigo.setTint(0xffffff);
      const phase=this.bossPhase;
      if(hp>0){
        this.time.delayedCall(100,()=>{
          if(!this.yigo)return;
          this.yigo.setActive(true).setVisible(true).setAlpha(1).setDepth(100);
          if(this.yigo.body)this.yigo.body.enable=true;
          if(phase===2)this.yigo.setTint(0xffda79);
          else if(phase===3)this.yigo.setTint(0xff8da0);
          else this.yigo.clearTint()
        });
        this.time.delayedCall(160,()=>{
          if(!this.yigo)return;
          this.yigo.setActive(true).setVisible(true).setAlpha(1).setDepth(100);
          if(this.yigo.body)this.yigo.body.enable=true;
          if(phase===3)this.yigo.setTint(0xff8da0);
          else if(phase===2)this.yigo.setTint(0xffda79);
          else this.yigo.clearTint();
        });
      }else{
        // Ölüm — defeated texture kullan
        this.yigo.setTexture('yigo_defeated');
        this.yigo.clearTint();
        this.time.delayedCall(120,()=>{if(!this.yigo)return;this.yigo.setActive(true).setVisible(true).setAlpha(1).setDepth(100)})
      }
      if(state.shake)this.cameras.main.shake(150,.012);
      this.spark(this.yigo.x,this.yigo.y-10,0xff8da0,14);
      if(hp<=7&&this.bossPhase===1)this.setBossPhase(2);
      if(hp<=4&&this.bossPhase===2)this.setBossPhase(3);
      if(hp<=0){this.bossPhase=4;this.winBoss()}
      this.refreshBossBar()
    }
    winBoss(){
      if(!this.yigo?.active||this._endingStarted)return;
      this._endingStarted=true;
      this.yigo.setData('hp',0);this.yigo.body.enable=false;
      this.player.setAccelerationX(0).setVelocity(0,0);
      this.player.body.enable=false;
      this.cameras.main.zoomTo(1,800,'Sine.easeInOut');
      this.yigo.setTexture('yigo_defeated');
      this.yigo.clearTint();
      const pot=this.physics.add.image(this.yigo.x+50,this.yigo.y+30,'pot').setScale(.9);
      pot.body.setAllowGravity(true);pot.body.setGravityY(800);this.allGrounds.forEach(g=>this.physics.add.collider(pot,g));
      this.tweens.add({targets:this.yigo,x:this.yigo.x+70,y:this.yigo.y-10,angle:20,duration:450});
      this.time.delayedCall(450,()=>{if(!this.yigo?.active)return;if(state.shake)this.cameras.main.shake(300,.015)});
      this.bossLabel?.setText('🥘 Yigo kendi tenceresine takıldı! Kaçıyor!');
      this.add.text(this.bossHome,270,'Yigo: "Aaa! Sen kazandın kedi! Geri geleceğim!"',{fontSize:18,color:'#fff7dc',stroke:'#40304c',strokeThickness:5,align:'center'}).setOrigin(.5);
      this.spark(this.yigo.x,this.yigo.y,0xffd88a,30);this.soundFX.victory();
      state.worldProgress=WORLDS.length;state.hearts=this.hearts;save();
      this.bossStarted=false;
      this.bossDefeated=true;
      // =========== 3 KATLI GARANTİ: FORGIVE.HTML YÖNLENDİRME ===========
      const toForgive=(delay)=>{
        try{this.time.delayedCall(delay,()=>{try{window.location.replace('forgive.html')}catch(_){try{window.location.href='forgive.html'}catch(__){window.location.assign('forgive.html')}}})}catch(_){
          setTimeout(()=>{try{window.location.href='forgive.html'}catch(__){window.location.assign('forgive.html')}},delay);
        }
      };
      // 1200ms, 2000ms, 2800ms, 3600ms sonra tekrar dene (kesin!)
      toForgive(1200); toForgive(2000); toForgive(2800); toForgive(3600);
      // SetInterval 500ms: sayfa değişene kadar dene (kesin!)
      try{
        const _intv=setInterval(()=>{
          try{
            if(window.location.href.includes('forgive.html')){clearInterval(_intv);return}
            try{window.location.replace('forgive.html')}catch(_){try{window.location.href='forgive.html'}catch(__){}}
          }catch(_){}
        },500);
      }catch(_){}
      const go=()=>{
        if(this._endingTransitioned)return;
        this._endingTransitioned=true;
        try{
          if(this.captiveBird)this.captiveBird.destroy();
          const free=this.add.sprite(this.world.width-220,375,'bird_idle').setScale(1.5);
          free.setFlipX(false);
          this.tweens.add({targets:free,y:180,x:free.x+100,duration:1600,ease:'Sine.easeOut'})
        }catch(e){}
        try{if(this.bossWeapons)this.bossWeapons.clear(true,true)}catch(e){}
        try{if(this.yigo){try{this.yigo.disableBody(true,true)}catch(e){};try{this.yigo.destroy()}catch(e){}}this.yigo=null;}catch(e){}
        try{this.cameras.main.fadeOut(500)}catch(e){}
        const bootEnding=()=>{
          try{
            document.body.classList.remove('in-game');
            // Ending sahnesine geç, YINE DE 200ms sonra direkt forgive.html atla (her ihtimale karşı)
            try{if(!this.scene.isActive('Ending'))this.scene.start('Ending');}catch(e){}
            // ⚠️ EN GARANTİLİ YÖNTEM: scene.start çalışsın / çalışmasın 200ms SONRA SAYFAYI DEĞİŞTİR
            setTimeout(()=>{try{window.location.replace('forgive.html')}catch(_){try{window.location.href='forgive.html'}catch(__){window.location.assign('forgive.html')}}},200);
          }catch(e){
            try{window.__game?.scene?.start('Ending')}catch(_){
              try{this.game.scene.start('Ending')}catch(__){}
            }
            setTimeout(()=>{try{window.location.href='forgive.html'}catch(__){window.location.assign('forgive.html')}},200);
          }
        };
        this.time.delayedCall(550,bootEnding);
        try{setTimeout(bootEnding,900)}catch(_){}
      };
      try{this.time.delayedCall(750,go)}catch(e){go()}
    }
    showDialogue(def,npcType){
      const seen=state.dialogueSeen[npcType]||0;const dIdx=Math.min(seen,def.dialogues.length-1);
      const text=def.dialogues[dIdx];state.dialogueSeen[npcType]=Math.min(seen+1,def.dialogues.length-1);save();
      this.dialogueOpen=true;const el=document.createElement('div');el.className='dialogue-box';
      el.innerHTML=`<div class="speaker">${def.name}</div><div>${text}</div><div class="hint">[TIKLA veya E] Kapat</div>`;
      document.body.appendChild(el);
      const close=()=>{if(!el.parentElement)return;el.remove();this.dialogueOpen=false;this._activeNpcId=null};
      el.addEventListener('click',close);
      this.time.delayedCall(7000,close)
    }
    catAttack(now){
      if(this._isHurt||this._dying||now<this.attackCooldown)return;this.attackCooldown=now+280;
      const atkTex=pickTex(this,'cat_attack','cat_walk1');
      this.player.setTexture(atkTex);
      this._isAttacking=true;
      this.time.delayedCall(280,()=>{
        this._isAttacking=false;
        this.player.setTexture('cat_idle');
      });
      this.soundFX.tone(680,.05,'square',.04);
      const range=42;const ax=this.player.x+(this.player.flipX?-range:range);
      this.enemies.children.iterate(e=>{if(!e.active)return;if(Phaser.Math.Distance.Between(ax,this.player.y,e.x,e.y)<range){e.setData('hp',e.getData('hp')-1);e.setVelocityX(this.player.flipX?-180:180);e.setVelocityY(-140);this.spark(e.x,e.y,0xffc6d8,6);if(e.getData('hp')<=0)e.disableBody(true,true)}});
      if(this.bossStarted&&this.yigo?.active&&Phaser.Math.Distance.Between(ax,this.player.y,this.yigo.x,this.yigo.y)<range+20)this.hitBoss();
      this.breakablePlatforms.getChildren().forEach(bp=>{if(bp.active&&!bp.getData('broken')&&Phaser.Math.Distance.Between(ax,this.player.y,bp.x,bp.y)<60){const hits=bp.getData('hits')+1;bp.setData('hits',hits);this.soundFX.tone(200,.08,'square');if(hits>=2){bp.setData('broken',true);this.spark(bp.x,bp.y,0xc78d5a,14);bp.disableBody(true,true)}}});
      const swipe=this.add.graphics().setDepth(20);swipe.lineStyle(3,0xffc6d8,.7);
      if(this.player.flipX){swipe.lineBetween(this.player.x-15,this.player.y-15,this.player.x-40,this.player.y);swipe.lineBetween(this.player.x-15,this.player.y,this.player.x-40,this.player.y+10)}
      else{swipe.lineBetween(this.player.x+15,this.player.y-15,this.player.x+40,this.player.y);swipe.lineBetween(this.player.x+15,this.player.y,this.player.x+40,this.player.y+10)}
      this.time.delayedCall(180,()=>swipe.destroy())
    }
    update(time,delta){
      if(this.paused)return;const now=time;
      // ===== HASAR DURUMU GÜVENLİK AĞI (3 KATMANLI) =====
      // Katman 1: Zamanlayıcı kaçırılırsa normal bitiş
      if(this._isHurt&&!this._dying&&now>=(this._hurtUntil||0)){this.finishHurt()}
      // Katman 2: _hurtUntil süresi çoktan geçmiş ama _isHurt hala takılıysa acil reset
      if(!this._dying&&this._hurtUntil>0&&now>this._hurtUntil+150&&(this._isHurt||this.invulnerable)){
        this._hurtTween?.stop?.();this._hurtTween=null;this._forceRestoreTexture();
        this._isHurt=false;this.invulnerable=false;this._hurtUntil=0;
      }
      // Katman 3: Texture yanlışlıkla hurt'te kalmışsa ama flag kapalıysa — anında düzelt
      if(!this._isHurt&&!this._dying&&!this._isAttacking&&this.player){
        const curKey=this.player.texture?.key;
        if(curKey==='cat_hurt'){this._forceRestoreTexture()}
      }
      if(this.npcDialogueCooldown>0)this.npcDialogueCooldown-=delta;
      // ===== INPUT TEK HESAPLAMA (JustDown stateful oldugu icin EN BASTA!) =====
      const kUp=Phaser.Input.Keyboard.JustDown(this.cursors.up);
      const kW=Phaser.Input.Keyboard.JustDown(this.keys.W);
      const kSpace=Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
      const kFish=Phaser.Input.Keyboard.JustDown(this.keys.F)||Phaser.Input.Keyboard.JustDown(this.keys.Q);
      const kE=Phaser.Input.Keyboard.JustDown(this.keys.E);
      const shiftHeld=this.keys.SHIFT?.isDown;
      const grounded=this.player.body.blocked.down||this.player.body.touching.down;
      const wallLeft=this.player.body.blocked.left;const wallRight=this.player.body.blocked.right;
      const gamepadJumpNow=this.gamepad?.isButtonDown(2)&&!this._prevGamepadJump;
      const gamepadAttackNow=this.gamepad?.isButtonDown(1)&&!this._prevGamepadAttack;
      this._prevGamepadJump=!!this.gamepad?.isButtonDown(2);
      this._prevGamepadAttack=!!this.gamepad?.isButtonDown(1);
      // NPC: yakındayken E ile konuş
      if(this.npcs&&this.npcs.getChildren().length){
        let nearest=null,nearestD=Infinity;
        this.npcs.getChildren().forEach(npc=>{
          const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,npc.x,npc.y);
          if(d<nearestD){nearestD=d;nearest=npc}
        });
        const npc=nearest;
        if(npc&&nearestD<90&&kE&&!this.dialogueOpen&&this.npcDialogueCooldown<=0){
          this.showDialogue(npc.getData('def'),npc.getData('type'));
          this.npcDialogueCooldown=900;
          this._activeNpcId=npc.getData('id');
        }else if(kE&&this.dialogueOpen){
          const el=document.querySelector('.dialogue-box');if(el){el.remove();this.dialogueOpen=false;this._activeNpcId=null}
        }
      }
      if(!this.world.isBoss&&!this.levelCompleting&&this.player.x>=(this.world.goal||0)-48)this.completeLevel();
      if(this.world.isBoss&&!this.bossStarted&&!this.bossDefeated&&this.player.x>this.world.width-660)this.startBoss();
      const left=this.cursors.left.isDown||this.keys.A.isDown||(this.gamepad&&this.gamepad.left)||touch.left;
      const right=this.cursors.right.isDown||this.keys.D.isDown||(this.gamepad&&this.gamepad.right)||touch.right;
      if(grounded){this.lastGrounded=now;this.jumpCount=0;if(Math.abs(this.player.body.velocity.x)>120){this.dustTimer-=delta;if(this.dustTimer<=0){this.dustTimer=120;this.dust(this.player.x+(this.player.flipX?10:-10),this.player.y+12)}}}
      const direction=left?-1:right?1:0;const accel=shiftHeld?1850:1200;const maxRun=shiftHeld?270:215;
      this.player.body.setMaxVelocityX(maxRun);this.player.setAccelerationX(direction*accel);
      if(this.mountainWind&&this.player.y<385)this.player.body.velocity.x=clamp(this.player.body.velocity.x+Math.sin(now*.006)*2-0.5,-maxRun,maxRun);
      this.fallingPlatforms.getChildren().forEach(fp=>{if(!fp.active)return;
        if(!fp.getData('falling')){
          const playerBottom=this.player.y+this.player.displayHeight/2;
          const platTop=fp.y-fp.displayHeight/2;
          const standingOn=grounded&&this.player.body.blocked.down&&Math.abs(this.player.x-fp.x)<fp.displayWidth/2+8&&Math.abs(playerBottom-platTop)<14;
          const bumpedFromBelow=this.player.body.touching.up&&Math.abs(this.player.x-fp.x)<fp.displayWidth/2+8;
          if(standingOn||bumpedFromBelow){fp.setData('falling',true);fp.setData('fallingDelay',360);this.tweens.add({targets:fp,angle:[-2,2,-1,1,0],duration:360,ease:'Sine.easeInOut'})}
        }else{let d=fp.getData('fallingDelay')-delta;fp.setData('fallingDelay',d);
          if(d<=0&&fp.body.allowGravity===false){fp.body.setAllowGravity(true);fp.body.setImmovable(false);fp.setVelocityY(0);this.time.delayedCall(1500,()=>fp.destroy())}}
      });
      // ===== ZIPLAMA (inputlar bastan hesaplandi, guvenli) =====
      const jumpPressed=kUp||kW||(!this.bossStarted&&!shiftHeld&&kSpace)||gamepadJumpNow||touch.jumpPressed;
      if(jumpPressed){let jumped=false;
        if(grounded||now-this.lastGrounded<115){this.player.setVelocityY(-480);this.jumpCount=1;this.lastGrounded=-99999;jumped=true}
        else if(wallLeft||wallRight){this.player.setVelocityX((wallLeft?1:-1)*230);this.player.setVelocityY(-450);this.jumpCount=1;this.lastGrounded=-99999;this.dust(this.player.x,this.player.y);jumped=true}
        else if(this.jumpCount<2){this.player.setVelocityY(-435);this.jumpCount++;this.spark(this.player.x,this.player.y+14,0xffc6d8,6);jumped=true}
        if(jumped)this.soundFX.jump()}
      // ===== SALDIRI (Shift+Space veya boss'ta Space) =====
      // Shift tek başına koşu içindir; saldırı başlatmamalı.
      const attackPressed=(shiftHeld&&kSpace)||(!shiftHeld&&this.bossStarted&&kSpace)||gamepadAttackNow||touch.attackPressed;
      if(attackPressed)this.catAttack(now);
      // ===== BALIK =====
      if(kFish)this.catThrowFish(now);
      if(touch.fishPressed)this.catThrowFish(now);
      if(direction)this.player.setFlipX(direction<0);
      // ---- KEDİ ANİMASYONU ----
      if(!this.dialogueOpen&&!this._isHurt&&!this._isAttacking){
        const idleKey='cat_idle';
        const walk1Key='cat_walk1';
        const walk2Key='cat_walk2';
        const vel=Math.abs(this.player.body.velocity.x);
        if(!grounded){
          if(this.player.texture.key!==walk1Key)this.player.setTexture(walk1Key);
        }else if(vel>20){
          this._catWalkTimer=(this._catWalkTimer||0)+delta;
          const want=this._catWalkTimer<170?walk1Key:walk2Key;
          if(this.player.texture.key!==want)this.player.setTexture(want);
          if(this._catWalkTimer>=340)this._catWalkTimer=0;
        }else{
          if(this.player.texture.key!==idleKey)this.player.setTexture(idleKey);
          this._catWalkTimer=0;
        }
      }
      // ---- YİGO KONUŞMA ANİMASYONU ----
      if(this.bossStarted&&this.yigo?.active&&(this.yigo.getData('hp')||0)>0&&!this._yigoBusy){
        const t1='yigo_talk1';
        const t2='yigo_talk2';
        this._yigoTalkTimer=(this._yigoTalkTimer||0)+delta;
        const want=this._yigoTalkTimer<310?t1:t2;
        if(this.yigo.texture.key!==want)this.yigo.setTexture(want);
        if(this._yigoTalkTimer>=620)this._yigoTalkTimer=0;
        try{this.yigo.setFlipX(this.player.x>=this.yigo.x)}catch(_){}
      }
      this.enemies.children.iterate(e=>{if(!e.active)return;const b=e.getData('behavior');
        if(b==='walker'){if(!e.body.blocked.down)return;
          const blocked=e.body.blocked.left||e.body.blocked.right;const noFloor=!this.enemyHasFloorAhead(e);
          if(blocked||noFloor){e.setData('dir',-e.getData('dir'));e.setFlipX(e.getData('dir')<0)}e.setVelocityX(e.getData('dir')*e.getData('speed'))}
        else if(b==='walker_charge'){if(!e.body.blocked.down)return;
          const blocked=e.body.blocked.left||e.body.blocked.right;const noFloor=!this.enemyHasFloorAhead(e);
          if(blocked||noFloor){e.setData('dir',-e.getData('dir'));e.setFlipX(e.getData('dir')<0)}
          const distP=Math.abs(this.player.x-e.x);const sp=distP<220?2.1:1;
          if(distP<220){e.setData('dir',Math.sign(this.player.x-e.x)||e.getData('dir'));e.setFlipX(e.getData('dir')<0)}
          e.setVelocityX(e.getData('dir')*e.getData('speed')*sp);if(distP<180&&Math.random()<.01)e.setVelocityY(-240)}
        else if(b==='flyer_sine'){e.setVelocityX(e.getData('dir')*e.getData('speed'));e.y=e.getData('baseY')+Math.sin(now*.003+e.x*.01)*32;
          if(e.x<60||e.x>this.world.width-60){e.setData('dir',-e.getData('dir'));e.setFlipX(e.getData('dir')<0)}}
        else if(b==='flyer_dash'){const distPx=Phaser.Math.Distance.Between(e.x,e.y,this.player.x,this.player.y);
          if(distPx<260){const ang=Phaser.Math.Angle.Between(e.x,e.y,this.player.x,this.player.y);e.setVelocity(Math.cos(ang)*e.getData('speed')*1.7,Math.sin(ang)*e.getData('speed')*1.7);e.setFlipX(this.player.x<e.x)}
          else{e.setVelocityX(e.getData('dir')*e.getData('speed'));e.y=e.getData('baseY')+Math.sin(now*.005+e.x*.02)*18;
            if(e.x<60||e.x>this.world.width-60){e.setData('dir',-e.getData('dir'));e.setFlipX(e.getData('dir')<0)}}}});
      if(this.bossStarted&&this.yigo?.active&&(this.yigo.getData('hp')||0)>0){this.bossAttack(now);
        if(this.bossPhase===2||this.bossPhase===3){const target=this.bossPhase===3?this.player.x:this.bossHome+Math.sin(now*.002)*85;
          this.yigo.setVelocityX(clamp((target-this.yigo.x)*1.9,-this.bossPhase*45,this.bossPhase*45))}
        if(this.bossWeapons)this.bossWeapons.getChildren().forEach(w=>{if(w.active&&(w.y>H+60||w.x<-50||w.x>this.world.width+50))w.disableBody(true,true)})}
      // Water splash if player enters ground near forest river
      if(this.world.bg==='forest'&&grounded&&Math.random()<.0004){const rx=600+Math.floor(Math.random()*4)*600;this.splash(rx,470)}
      touch.jumpPressed=false;touch.attackPressed=false;touch.fishPressed=false;
    }
  }
  // ========== YENİ ENDING: SADECE PANORAMİK GÖRSEL KAYMASI ==========
  class Ending extends Phaser.Scene{
    constructor(){super('Ending');this.finished=false;this._questionShown=false;this._redirected=false}
    create(){
      try{this.scene.stop('Boot');this.scene.stop('World')}catch(e){}
      document.body.classList.remove('in-game');
      this.finished=false;
      this._questionShown=false;
      this._panDone=false;
      // ===== 3 KATLI GARANTİLİ YÖNLENDİRME (winBoss'ta çalışmazsa burada çalışsın) =====
      const go2=()=>{
        if(this._redirected)return;
        this._redirected=true;
        try{window.location.replace('forgive.html')}catch(_){try{window.location.href='forgive.html'}catch(__){try{window.location.assign('forgive.html')}catch(___){}}}
      };
      this.time.delayedCall(300,go2);
      try{setTimeout(go2,600)}catch(_){}
      this.time.delayedCall(1000,go2);
      try{setTimeout(go2,1400)}catch(_){}
      // setInterval 500ms: sayfa değişene kadar dene
      try{
        const _i2=setInterval(()=>{
          try{
            if(window.location.href.includes('forgive.html')){clearInterval(_i2);return}
            go2();
          }catch(_){}
        },500);
      }catch(_){}
      this.cameras.main.setBackgroundColor('#2a1f4a');
      this.cameras.main.fadeIn(260,0,0,0);
      try{
        this.add.text(this.game.config.width/2,this.game.config.height/2,'⏳ Affedermisin sayfasına gidiyorsun... 💖',
          {fontSize:22,color:'#fff9ea',stroke:'#3a2270',strokeThickness:4}).setOrigin(.5);
      }catch(_){}
      this.time.delayedCall(320,()=>{
        if(this._redirected)return;
        this._redirected=true;
        try{window.location.replace('forgive.html')}catch(_){window.location.href='forgive.html'}
      });
      // Geri kalan kodlar yedek olarak kalsın ama asla çalışmasın
      this.soundFX=new Sound(this);
      // === SİYAH EKRAN KESİNLİKLE OLMASIN: HEMEN GARANTİLİ ARKA PLAN ===
      this.cameras.main.setBackgroundColor('#2a1f4a');
      const backCover=this.add.graphics().setDepth(-12);
      for(let i=0;i<H;i++){
        const tt=i/H;
        const rr=Math.round(110+(255-110)*(1-tt));
        const gg=Math.round(80+(160-80)*(1-tt));
        const bb=Math.round(160+(220-160)*(1-tt));
        backCover.fillStyle((rr<<16)|(gg<<8)|bb,1).fillRect(0,i,W,1);
      }
      // Dev pembe/rengi ışıltılar
      for(let i=0;i<14;i++){
        backCover.fillStyle(i%2?0xffc6d8:0xffd88a,.09+Math.random()*.08);
        backCover.fillCircle(Math.random()*W,Math.random()*H,60+Math.random()*80);
      }
      // Minik yıldız/parlaklıklar
      for(let i=0;i<140;i++){
        backCover.fillStyle(i%5===0?0xffe6b0:0xffffff,.25+Math.random()*.55);
        backCover.fillCircle(Math.random()*W,Math.random()*H,0.8+Math.random()*2.2);
      }
      const baseBg=this.add.rectangle(W/2,H/2,W,H,0xff8fb0,.08).setDepth(-11);
      this.cameras.main.fadeIn(250);
      this._bgLayer=this.add.container(0,0).setDepth(0);
      // Float eden küçük kalp yağmuru (panorama olmasa bile hareket var)
      try{
        this.add.particles(W/2,-30,'heart',{
          x:{min:0,max:W},y:-30,speedY:{min:40,max:95},speedX:{min:-30,max:30},
          lifespan:9000,frequency:380,quantity:1,scale:{start:.18,end:.28},
          alpha:{start:.65,end:.25},rotate:{min:-30,max:30},tint:[0xff99bb,0xffd88a,0xb0e8ff,0xffc6d8]
        }).setDepth(1);
      }catch(_){}
      this.time.delayedCall(150,()=>this._playPanorama());
      // === ZORLU EMRAN: 3.5 saniye sonra soru ekranı gelsin ===
      this._safe1=this.time.delayedCall(3500,()=>this._forceShowForgiveQuestion());
      try{this._safe2=setTimeout(()=>this._forceShowForgiveQuestion(),4000)}catch(_){}
      // Extra emniyet: her 1.5 saniyede bir soru gösterilmediyse dene
      this._safe3=this.time.addEvent({delay:1500,loop:true,callback:()=>this._forceShowForgiveQuestion()});
    }
    shutdown(){try{clearTimeout(this._safe2)}catch(_){}}
    _forceShowForgiveQuestion(){
      if(this._questionShown||this.finished)return;
      this._questionShown=true;
      try{this._safe1?.remove?.(false)}catch(_){}
      try{this._safe3?.remove?.(false)}catch(_){}
      try{clearTimeout(this._safe2)}catch(_){}
      this._showForgiveQuestion_DOM()
    }
    _showWeddingPhoto(onDone){
      let card=null,hint=null;
      try{
        if(weddingPhotoLoaded&&texOk(this,'wedding_princess')){
          card=this.add.image(W/2,H/2,'wedding_princess').setDisplaySize(W*0.75,H*0.78).setDepth(1);
        }else{
          card=this.add.rectangle(W/2,H/2,W*0.62,H*0.55,0xFFF3D6,.96).setDepth(1).setStrokeStyle(3,0xFFC84A);
          hint=this.add.text(W/2,H/2,'Kişisel fotoğrafınızı\nassets/custom/wedding_princess.jpg\nolarak ekleyebilirsiniz',{fontSize:18,color:'#6D4BB5',align:'center',lineSpacing:8}).setOrigin(.5).setDepth(2);
        }
      }catch(_){}
      const done=()=>{
        try{card?.destroy?.()}catch(_){}
        try{hint?.destroy?.()}catch(_){}
        if(!this._weddingDone){this._weddingDone=true;onDone()}
      };
      this.time.delayedCall(800,done);
    }
    _playPanorama(){
      this._panDone=false;
      let useKey='';
      let displayWidth=3000;
      const tryTex=(k)=>{
        try{
          if(this.textures.exists(k)){
            const t=this.textures.get(k);
            if(t&&t.key!=='__MISSING'&&t.get(0)&&t.get(0).width>0&&t.get(0).height>0){
              useKey=k;displayWidth=Math.max(W,Math.round((t.get(0).width/t.get(0).height)*H));
              return true;
            }
          }
        }catch(e){}
        return false;
      };
      if(!tryTex('ending_panorama'))tryTex('intro_panorama');
      let imageObj=null;
      try{
        if(useKey){
          const im=this.add.image(W,0,useKey).setOrigin(0,0);
          im.setDisplaySize(displayWidth,H);
          this._bgLayer.add(im);imageObj=im;
        }else{
          const gfx=this.add.graphics();
          for(let i=0;i<H;i++){
            const tt=i/H;
            const rr=Math.round(150+(255-150)*(1-tt));
            const gg=Math.round(110+(190-110)*(1-tt));
            const bb=Math.round(170+(230-170)*(1-tt));
            gfx.fillStyle((rr<<16)|(gg<<8)|bb,1).fillRect(0,i,W,1);
          }
          for(let k=0;k<22;k++){
            const col=k%3===0?0xff8da0:k%3===1?0xffd88a:0xffffff;
            gfx.fillStyle(col,.05+Math.random()*.09);
            gfx.fillCircle(Math.random()*W,Math.random()*H,45+Math.random()*95);
          }
          for(let k=0;k<170;k++){
            gfx.fillStyle(k%7===0?0xffe6b0:0xffffff,.25+Math.random()*.5);
            gfx.fillCircle(Math.random()*W,Math.random()*H,0.8+Math.random()*2.6);
          }
          for(let k=0;k<9;k++){
            gfx.fillStyle(0xff6588,.6);
            gfx.fillCircle(60+k*90,120+Math.sin(k)*40,1+Math.random()*.7);
          }
          this._bgLayer.add(gfx);
          imageObj={x:W,visible:true,destroy:()=>{try{gfx.destroy()}catch(_){}},setAlpha:()=>{},alpha:1}
        }
      }catch(e){imageObj=null}
      const endPan=()=>{
        if(this._panDone)return;this._panDone=true;
        try{this.tweens.killTweensOf(imageObj)}catch(_){}
        this.time.delayedCall(150,()=>this._forceShowForgiveQuestion())
      };
      if(useKey&&imageObj){
        try{
          this.tweens.add({targets:imageObj,x:-displayWidth,duration:4000,ease:'Linear',onComplete:endPan})
        }catch(_){this.time.delayedCall(3500,endPan)}
      }else{
        this.time.delayedCall(3500,endPan)
      }
    }
    _goCredits(){
      if(this.finished)return;this.finished=true;
      this.cameras.main.fadeOut(500);
      this.time.delayedCall(600,()=>{
        try{this.scene.start('Credits')}catch(e){try{window.__game?.scene?.start('Credits')}catch(_){}}
      });
    }
    _showForgiveQuestion_DOM(){
      if(this.finished)return;
      const bg=document.createElement('div');
      bg.id='forgive-overlay';
      bg.style.cssText=`position:fixed;inset:0;background:rgba(10,5,25,0.78);backdrop-filter:blur(7px);z-index:999999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s ease;flex-direction:column;gap:26px;padding:20px`;
      const card=document.createElement('div');
      card.style.cssText=`position:relative;background:linear-gradient(180deg,#fff7dc 0%,#ffeec0 100%);border-radius:26px;padding:42px 56px 44px;box-shadow:0 0 0 5px #ffc85a, 0 30px 90px rgba(0,0,0,.6);max-width:620px;width:92%;text-align:center;border-top:10px solid #ffd88a`;
      const glow=document.createElement('div');
      glow.style.cssText=`position:absolute;inset:-18px;border-radius:34px;background:radial-gradient(circle at 30% 20%,rgba(255,150,180,.28),transparent 55%),radial-gradient(circle at 70% 80%,rgba(255,230,160,.35),transparent 60%);pointer-events:none;z-index:0`;
      const deco=document.createElement('div');
      deco.style.cssText=`display:flex;justify-content:center;gap:22px;margin-bottom:16px;position:relative;z-index:2`;
      deco.innerHTML=`<div style="font-size:40px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25))">💖</div><div style="font-size:38px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25))">✨</div><div style="font-size:40px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25))">💖</div>`;
      const h=document.createElement('div');
      h.textContent='BENİ AFFEDERMİSİN?';
      h.style.cssText=`font-size:42px;font-family:Georgia,serif;font-weight:900;color:#5d3aa0;-webkit-text-stroke:3px #3a2270;text-shadow:0 6px 0 rgba(90,50,140,.15);margin:0 0 10px;letter-spacing:1.5px;line-height:1.1;position:relative;z-index:2`;
      const sub=document.createElement('div');
      sub.textContent='lütfen kral çok yalvarıyorum 🥺✨';
      sub.style.cssText=`font-size:22px;color:#7a55c2;-webkit-text-stroke:2px #3a2270;margin-bottom:28px;font-family:Georgia,serif;position:relative;z-index:2`;
      const row=document.createElement('div');
      row.style.cssText=`display:flex;gap:28px;justify-content:center;align-items:center;flex-wrap:wrap;position:relative;z-index:2`;
      const yes=document.createElement('button');
      yes.textContent='❤️  EVET';
      yes.style.cssText=`background:linear-gradient(180deg,#8ce26b,#6bbf4e);color:#2a5015;-webkit-text-stroke:2px #2a5015;font-size:28px;font-family:Georgia,serif;font-weight:900;padding:18px 44px;border-radius:18px;border:4px solid #7bcb5b;cursor:pointer;box-shadow:0 8px 0 #4d8a36, 0 14px 24px rgba(0,0,0,.25);letter-spacing:2px;transition:transform .12s;user-select:none;min-width:180px`;
      const noWrap=document.createElement('div');
      noWrap.id='forgive-now-wrap';
      noWrap.style.cssText=`position:relative;width:180px;height:80px;display:flex;align-items:center;justify-content:center`;
      const no=document.createElement('button');
      no.textContent='HAYIR';
      no.id='forgive-now-btn';
      no.style.cssText=`background:linear-gradient(180deg,#ff95b3,#ff6588);color:#701e38;-webkit-text-stroke:2px #701e38;font-size:28px;font-family:Georgia,serif;font-weight:900;padding:18px 44px;border-radius:18px;border:4px solid #ff7ea6;cursor:pointer;box-shadow:0 8px 0 #b83f62, 0 14px 24px rgba(0,0,0,.25);letter-spacing:2px;transition:transform .18s cubic-bezier(.2,1.3,.4,1);user-select:none;white-space:nowrap;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);min-width:180px`;
      noWrap.appendChild(no);
      row.appendChild(yes);row.appendChild(noWrap);
      card.appendChild(glow);card.appendChild(deco);card.appendChild(h);card.appendChild(sub);card.appendChild(row);
      bg.appendChild(card);
      document.body.appendChild(bg);
      requestAnimationFrame(()=>bg.style.opacity='1');
      let noCount=0,clicked=false;
      const taunts=["yakalama","yakala beni","heeey","yavaşsın kral","n'apıyosun","vınzı","hızlı ol","yetersizsin","🥴","yakala","geldin mi?","hadi hadi","yakala yakala 🤭","tut beni","neden kaçıyorum ben 🫣"];
      const doYes=()=>{
        if(clicked)return;clicked=true;
        try{this.soundFX?.tone(880,.1,'sine',.04)}catch(_){}
        try{this.soundFX?.tone(1180,.12,'sine',.035)}catch(_){}
        bg.style.opacity='0';
        setTimeout(()=>{try{bg.remove()}catch(_){}},320);
        this._playYesVideo();
      };
      const dodge=()=>{
        const bw=noWrap.getBoundingClientRect();
        const maxX=window.innerWidth-bw.width-40;
        const maxY=window.innerHeight-bw.height-40;
        let tx=bw.left,ty=bw.top,tries=0;
        const mx=event?.clientX||window.innerWidth/2;
        const my=event?.clientY||window.innerHeight/2;
        while(tries<14&&Math.hypot(tx+bw.width/2-mx,ty+bw.height/2-my)<230){
          tx=20+Math.random()*Math.max(20,maxX);
          ty=20+Math.random()*Math.max(20,maxY);
          tries++;
        }
        no.style.transition='left .22s cubic-bezier(.2,1.2,.5,1), top .22s cubic-bezier(.2,1.2,.5,1), transform .22s';
        no.style.left=((tx-bw.left)+parseFloat(getComputedStyle(no).left||0))+'px';
        no.style.top=((ty-bw.top))+'px';
        no.style.left=(tx-bw.left)+'px';
        no.style.top=(ty-bw.top)+'px';
        const rot=noCount%2===0?-6:6;
        setTimeout(()=>{no.style.transform=`translate(-50%,-50%) rotate(${rot}deg)`;setTimeout(()=>no.style.transform='translate(-50%,-50%) rotate(0deg)',180)},10);
        noCount++;
        if(noCount%2===0){
          const t=taunts[Math.floor(Math.random()*taunts.length)];
          no.textContent=t;
          setTimeout(()=>{try{no.textContent='HAYIR'}catch(_){}},780);
        }
        try{this.soundFX?.tone(500+Math.random()*350,.05,'triangle',.025)}catch(_){}
      };
      yes.addEventListener('click',doYes);
      yes.addEventListener('mouseenter',()=>{yes.style.transform='scale(1.04)';});
      yes.addEventListener('mouseleave',()=>{yes.style.transform='scale(1)';});
      yes.addEventListener('touchstart',(e)=>{e.preventDefault();doYes()},{passive:false});
      no.addEventListener('mouseenter',dodge);
      no.addEventListener('mouseover',dodge);
      no.addEventListener('pointerenter',dodge);
      no.addEventListener('touchstart',(e)=>{e.preventDefault();dodge()},{passive:false});
      no.addEventListener('click',(e)=>{try{e.preventDefault();e.stopPropagation();dodge()}catch(_){dodge()}});
      setTimeout(()=>{try{bg.scrollIntoView({block:'center'})}catch(_){}},120);
    }
    _showForgiveQuestion(){
      if(this._questionShown||this.finished)return;
      this._questionShown=true;
      try{this._failSafeTimer?.remove?.(false)}catch(_){}
      const cx=W/2,cy=H/2;
      const card=this.add.container(cx,cy).setDepth(40);
      const cardW=W*0.68,cardH=H*0.52;
      const glow=this.add.graphics().fillStyle(0xff6588,.22).fillRoundedRect(-cardW/2-10,-cardH/2-10,cardW+20,cardH+20,26);
      const questionBg=this.add.graphics()
        .fillStyle(0xfff7dc,.98).fillRoundedRect(-cardW/2,-cardH/2,cardW,cardH,22)
        .lineStyle(5,0xffc85a,.95).strokeRoundedRect(-cardW/2,-cardH/2,cardW,cardH,22)
        .fillStyle(0xff6588,.12).fillRoundedRect(-cardW/2+10,-cardH/2+10,cardW-20,70,14);
      const decoLeft=this.add.image(-cardW/2+36,-cardH/2+42,'heart').setScale(0.7).setTint(0xff99bb);
      const decoRight=this.add.image(cardW/2-36,-cardH/2+42,'heart').setScale(0.7).setTint(0xff99bb);
      const decoRec=this.add.image(0,cardH/2-38,'record').setScale(0.55).setAlpha(.35);
      card.add([glow,questionBg,decoLeft,decoRight,decoRec]);
      const questionText=this.add.text(cx,cy-70,'BENİ AFFEDERMİSİN?',{fontSize:36,color:'#5d3aa0',stroke:'#3a2270',strokeThickness:6,align:'center',fontStyle:'bold'}).setOrigin(.5).setDepth(41);
      const subHint=this.add.text(cx,cy-22,'lütfen kral çok yalvarıyorum 🥺✨',{fontSize:19,color:'#7a55c2',stroke:'#3a2270',strokeThickness:3,align:'center'}).setOrigin(.5).setDepth(41);
      const yesBg=this.add.graphics().fillStyle(0x7bcb5b,.14).fillRoundedRect(-80,-28,160,56,16).lineStyle(3,0x7bcb5b,.7).strokeRoundedRect(-80,-28,160,56,16);
      const yesBtnWrap=this.add.container(cx-120,cy+60,[yesBg]).setSize(160,56).setDepth(41).setInteractive(new Phaser.Geom.Rectangle(-80,-28,160,56),Phaser.Geom.Rectangle.Contains,true);
      const yesBtn=this.add.text(cx-120,cy+60,'❤️  EVET',{fontSize:24,color:'#4a802a',stroke:'#2a5015',strokeThickness:5,align:'center',fontStyle:'bold'}).setOrigin(.5).setDepth(42);
      const noBg=this.add.graphics().fillStyle(0xff7ea6,.14).fillRoundedRect(-74,-28,148,56,16).lineStyle(3,0xff7ea6,.75).strokeRoundedRect(-74,-28,148,56,16);
      const noBtnWrap=this.add.container(cx+120,cy+60,[noBg]).setSize(148,56).setDepth(41).setInteractive(new Phaser.Geom.Rectangle(-74,-28,148,56),Phaser.Geom.Rectangle.Contains,true);
      const noBtn=this.add.text(cx+120,cy+60,'HAYIR',{fontSize:24,color:'#a63a5a',stroke:'#701e38',strokeThickness:5,align:'center',fontStyle:'bold'}).setOrigin(.5).setDepth(42);
      let noEscapeCount=0;
      const noTaunts=["yakalama","yakala beni","heeey","yavaşsın kral","n'apıyosun","vınzı","hızlı ol","yetersizsin","🥴","yakala","geldin mi?","hadi hadi","yakala yakala 🤭","tut beni","neden kaçıyorum ben 🫣"];
      const cleanup=()=>{try{card.destroy()}catch(_){}try{questionText.destroy()}catch(_){}try{subHint.destroy()}catch(_){}try{yesBtnWrap.destroy()}catch(_){}try{yesBtn.destroy()}catch(_){}try{noBtnWrap.destroy()}catch(_){}try{noBtn.destroy()}catch(_){}};
      const dodgeNo=()=>{
        const left=160,right=W-160,top=140,bottom=H-140;let x=noBtnWrap.x,y=noBtnWrap.y;
        for(let i=0;i<18&&Phaser.Math.Distance.Between(x,y,this.input.activePointer.x,this.input.activePointer.y)<200;i++){x=Phaser.Math.Between(left,right);y=Phaser.Math.Between(top,bottom)}
        this.tweens.killTweensOf(noBtnWrap);
        this.tweens.killTweensOf(noBtn);
        const rot=(noEscapeCount%2===0?-4:4);
        const ease=noEscapeCount<3?'Back.easeOut':'Sine.easeOut';
        this.tweens.add({targets:noBtnWrap,x,y,angle:rot,duration:230+Math.random()*90,ease,onComplete:()=>{
          this.tweens.add({targets:noBtnWrap,angle:0,duration:160,ease:'Sine.easeOut'})
        }});
        this.tweens.add({targets:noBtn,x,y,angle:rot,duration:230+Math.random()*90,ease,onComplete:()=>{
          this.tweens.add({targets:noBtn,angle:0,duration:160,ease:'Sine.easeOut'})
        }});
        noEscapeCount++;
        if(noEscapeCount%2===0){
          const t=noTaunts[Phaser.Math.Between(0,noTaunts.length-1)];
          noBtn.setText(t);
          this.time.delayedCall(750,()=>{try{if(noBtn.active)noBtn.setText('HAYIR')}catch(_){}})
        }
        this.soundFX?.tone(500+Math.random()*350,.05,'triangle',.025);
      };
      yesBtnWrap.on('pointerover',()=>{this.tweens.add({targets:yesBtnWrap,scaleX:1.06,scaleY:1.06,duration:120,yoyo:true});this.tweens.add({targets:yesBtn,scaleX:1.06,scaleY:1.06,duration:120,yoyo:true})});
      const doYes=()=>{this.soundFX?.tone(880,.1,'sine',.04);this.soundFX?.tone(1180,.12,'sine',.035);cleanup();this._playYesVideo()};
      yesBtnWrap.on('pointerdown',doYes);
      yesBtn.on('pointerdown',doYes);
      noBtnWrap.on('pointerover',dodgeNo);
      noBtnWrap.on('pointerdown',(p,ev)=>{ev?.stopPropagation();dodgeNo()});
      noBtn.on('pointerover',dodgeNo);
      noBtn.on('pointerdown',(p,ev)=>{ev?.stopPropagation();dodgeNo()});
    }
    _playYesVideo(){
      this.soundFX?.victory();
      for(let i=0;i<40;i++){
        this.time.delayedCall(i*25,()=>{
          const cx=W/2,cy=H/2;
          const ang=Math.random()*Math.PI*2;
          const dist=40+Math.random()*180;
          const col=[0xff6588,0xffd88a,0x8be3ff,0xffc6d8,0xb8ffc1,0xffffff];
          const c=col[Math.floor(Math.random()*col.length)];
          this.add.circle(cx+Math.cos(ang)*dist*0.3,cy+Math.sin(ang)*dist*0.3,3+Math.random()*4,c,1).setDepth(69);
        })
      }
      const wrap=document.createElement('div');
      wrap.id='yes-video-wrap';
      wrap.style.cssText=`position:fixed;left:0;top:0;width:100vw;height:100vh;background:#000;z-index:99999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s ease;overflow:hidden`;
      const v=document.createElement('video');
      v.src='assets/cutscenes/yes.mp4';
      v.crossOrigin='anonymous';
      v.playsInline=true;
      v.setAttribute('webkit-playsinline','true');
      v.muted=false;
      v.preload='auto';
      v.style.cssText=`max-width:100vw;max-height:100vh;width:auto;height:auto;object-fit:none;border:0;box-shadow:0 0 0 3px #ffc6d8, 0 30px 80px rgba(255,100,140,.35)`;
      const skip=document.createElement('button');
      skip.textContent='ATLA ›';
      skip.style.cssText=`position:absolute;right:22px;bottom:22px;background:#221b30cc;color:#fff;border:none;padding:9px 16px;font-size:14px;border-radius:10px;cursor:pointer;font-family:Georgia;font-weight:bold;backdrop-filter:blur(6px);box-shadow:0 6px 18px rgba(0,0,0,.4);letter-spacing:.5px`;
      wrap.appendChild(v);wrap.appendChild(skip);
      document.body.appendChild(wrap);
      requestAnimationFrame(()=>wrap.style.opacity='1');
      let done=false,cleanupRan=false;
      const cleanup=()=>{if(cleanupRan)return;cleanupRan=true;try{wrap.style.opacity='0';setTimeout(()=>wrap.remove(),320)}catch(_){}if(done)return;done=true;this._goCredits()};
      skip.addEventListener('click',cleanup);
      v.addEventListener('ended',cleanup);
      v.addEventListener('error',()=>{cleanupRan=true;try{wrap.remove()}catch(_){}this._fallbackYesScreen()});
      v.addEventListener('loadedmetadata',()=>{
        v.style.width='auto';v.style.height='auto';
      });
      const tryPlay=()=>{
        const p=v.play();
        if(p&&typeof p.then==='function'){
          p.then(()=>{}).catch(()=>{
            v.muted=true;
            const q=v.play();
            if(q&&typeof q.then==='function')q.catch(()=>{
              cleanupRan=true;try{wrap.remove()}catch(_){}this._fallbackYesScreen()
            })
          })
        }
      };
      tryPlay()
    }
    _fallbackYesScreen(){
      if(this.finished)return;
      const bg=this.add.rectangle(W/2,H/2,W,H,0x1a1028,1).setDepth(70);
      const heart=this.add.text(W/2,H/2-40,'💖',{fontSize:120}).setOrigin(.5).setDepth(71);
      this.tweens.add({targets:heart,scaleX:1.3,scaleY:1.3,duration:500,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      const msg=this.add.text(W/2,H/2+80,'Seni çok seviyorum! 💕',{fontSize:32,color:'#ffd1d9',stroke:'#a03050',strokeThickness:6,align:'center'}).setOrigin(.5).setDepth(71);
      for(let i=0;i<30;i++){
        const h=this.add.circle(Math.random()*W,Math.random()*H,2+Math.random()*3,0xffa8c0,0.8).setDepth(71);
        this.tweens.add({targets:h,y:h.y-150,alpha:0,duration:1500+Math.random()*1500,repeat:-1,delay:Math.random()*1000});
      }
      this.time.delayedCall(3500,()=>this._goCredits());
    }
    makeFallbackTexEnding(){
      const PAN_W=4000,PAN_H=H;
      if(this.textures.exists('__fallback_ending')){try{this.textures.remove('__fallback_ending')}catch(e){}}
      const g=this.make.graphics({x:0,y:0,add:false});
      for(let i=0;i<PAN_H;i++){
        const t=i/PAN_H;
        const r=Math.round(70+(30-70)*(1-t));
        const gr=Math.round(50+(20-50)*(1-t));
        const b=Math.round(90+(60-90)*(1-t));
        g.fillStyle((r<<16)|(gr<<8)|b,1).fillRect(0,i,PAN_W,1)
      }
      for(let i=0;i<40;i++){
        const x=i*110,h=50+((i*41)%80);
        g.fillStyle(0x332942,.4).fillTriangle(x,220,x+70,220-h,x+140,220)
      }
      for(let i=0;i<50;i++){
        const cx2=80+i*85,cy2=40+((i*53)%180);
        g.fillStyle(0xffe06b,.25).fillCircle(cx2,cy2,2+((i*7)%3));
      }
      for(let i=0;i<8;i++){
        const px=80+i*490,py=50,pw=460,ph=240;
        g.fillStyle(0x2a2138,1).fillRoundedRect(px,py,pw,ph,18);
        g.lineStyle(3,0xffd07a,.7).strokeRoundedRect(px,py,pw,ph,18);
        g.fillStyle(0xfff7dc,.35).fillRoundedRect(px+16,py+16,pw-32,ph-64,10)
      }
      try{g.generateTexture('__fallback_ending',PAN_W,PAN_H)}catch(e){return false}
      try{g.destroy()}catch(_){}
      return this.textures.exists('__fallback_ending')
    }
  }
  // ========== CREDITS (SADECE for my wife by taha yasi + ana menü) ==========
  class Credits extends Phaser.Scene{
    constructor(){super('Credits')}
    create(){
      document.body.classList.remove('in-game');
      // ===== Arka plan: Mor-pembe-beyaz yumuşak gradient =====
      const bg=this.add.graphics();
      for(let y=0;y<H;y++){
        const t=y/H;
        const r=Math.round(60 + (255-60)*(1-t));
        const g=Math.round(40 + (200-40)*(1-t));
        const b=Math.round(100 + (255-100)*(1-t));
        bg.fillStyle((r<<16)|(g<<8)|b,1).fillRect(0,y,W,1);
      }
      // ===== Işıltı ve yıldızlar =====
      for(let i=0;i<14;i++){
        bg.fillStyle(i%2?0xffc6d8:0xffd88a,.12+Math.random()*.08);
        bg.fillCircle(Math.random()*W,Math.random()*H,70+Math.random()*90);
      }
      for(let i=0;i<140;i++){
        bg.fillStyle(i%5===0?0xffe6b0:0xffffff,.28+Math.random()*.55);
        bg.fillCircle(Math.random()*W,Math.random()*H,0.8+Math.random()*2.2);
      }
      bg.setDepth(-5);
      // ===== Kalp yağmuru efekti =====
      try{
        this.add.particles(W/2,-30,'heart',{
          x:{min:0,max:W},y:-30,speedY:{min:30,max:70},speedX:{min:-20,max:20},
          lifespan:10000,frequency:520,quantity:1,scale:{start:.18,end:.32},
          alpha:{start:.7,end:.3},rotate:{min:-30,max:30},tint:[0xff99bb,0xffd88a,0xb0e8ff,0xffc6d8]
        }).setDepth(1);
      }catch(_){}
      // ===== SADECE TEK BÜYÜK METİN =====
      this.add.text(W/2,H/2-40,'for my wife 💕',{
        fontFamily:'Georgia',fontSize:68,fontStyle:'italic',
        color:'#ffd1d9',stroke:'#7a2f50',strokeThickness:5,
        align:'center'
      }).setOrigin(.5).setDepth(2);
      this.add.text(W/2,H/2+58,'by taha yasin',{
        fontFamily:'Georgia',fontSize:44,fontStyle:'italic',
        color:'#fff4c9',stroke:'#4a2a6b',strokeThickness:4,
        align:'center'
      }).setOrigin(.5).setDepth(2);
      // Dekoratif küçük kalpler
      this.add.text(W/2-340,H/2-10,'💖',{fontSize:52}).setOrigin(.5).setDepth(2);
      this.add.text(W/2+340,H/2-10,'💖',{fontSize:52}).setOrigin(.5).setDepth(2);
      // ===== SADECE TEK BUTON: ANA MENÜ =====
      makeButton(this,W/2,H-120,'🏠 ANA MENÜ',()=>this.scene.start('Title'),'primary');
    }
  }
  // ===== PHASER BOOTSTRAP =====
  const cfg={type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#83cfea',pixelArt:false,
    dom:{createContainer:true},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
    input:{gamepad:true},
    physics:{default:'arcade',arcade:{gravity:{y:1280},debug:false}},
    scene:[Boot,Title,Intro,LevelCard,World,Ending,Credits]};
  let game=new Phaser.Game(cfg);
  // ========== GLOBAL PAUSE / RESUME HANDLER (Sekme arka plana atılınca DONMA sorunu KÖKTEN ÇÖZÜM) ==========
  (function installGlobalPauseFix(){
    try{
      // tum global interval'lar (winBoss 500ms, Ending 500ms, ?testWin=1 intervali) icin basit bir kayit defteri
      // sorun: tarayici background'a alininca setTimeout/setInterval cok yavaslar / durur; tekrar aktiflestiginde devam etmeyebilir
      // cozum: her geri donuste (visible/focus) tum scene timerlarini force restart; AudioContext resume
      var lastHiddenAt=0;
      function hardResumeAll(){
        try{
          // 1) AudioContext (muzik/sesler donduyse) resume
          try{
            var ctx=null;
            try{ctx=Music._getCtx && Music._getCtx();}catch(_){ctx=null;}
            try{
              if(window.__acTone)window.__acTone; // for forgive.html shared? yok burada
            }catch(_){}
            try{
              if(window.webkitAudioContext && !ctx){
                // boss icin yaratilan herhangi bir AudioContext? try find any
                try{if(Music && Music.ensure)Music.ensure();}catch(_){}
              }
            }catch(_){}
            // herhangi bir audioCtx varsa resume et
            try{
              var winAny=window;
              if(winAny.__audioCtx && typeof winAny.__audioCtx.resume==='function'){
                try{winAny.__audioCtx.resume();}catch(_){}
              }
            }catch(_){}
          }catch(_){}
          // 2) Music state sync:
          try{Music.sync();}catch(_){}
          // 3) Phaser GAME loop force resume (bazen oyun pause olur ama geri gelince acilmaz)
          try{
            if(game && game.loop){
              try{game.loop.paused=false;}catch(_){}
              try{if(game.paused)game.paused=false;}catch(_){}
              try{if(game.scene)game.scene.pause=game.scene.pause;}catch(_){} // noop, just trigger
            }
          }catch(_){}
          // 4) HER SAHNE ICIN: force sahne resume (bazen bireysel scene.sys.pause donmus)
          try{
            var all=game.scene.scenes;
            if(all && all.length){
              for(var i=0;i<all.length;i++){
                var sc=all[i];
                try{
                  if(sc && sc.sys){
                    if(sc.sys.paused){
                      try{sc.scene.resume();}catch(_){try{sc.sys.paused=false;}catch(__){}}
                    }
                    // time eventleri sakinlasmissa tazele:
                    try{if(sc.time && sc.time.paused)sc.time.paused=false;}catch(_){}
                    try{if(sc.tweens){
                      try{
                        // paused tweensleri devreye sok
                        var list=sc.tweens.getAllTweens?sc.tweens.getAllTweens():sc.tweens._tweens;
                        if(list){
                          for(var j=0;j<list.length;j++){
                            try{
                              var tw=list[j];
                              if(tw && tw.isPaused && tw.isPaused())tw.play();
                              else if(tw && tw.paused===true){try{tw.paused=false;tw.play?tw.play():null;}catch(_){}}
                            }catch(_){}
                          }
                        }
                      }catch(_){}
                    }}catch(_){}
                    // physics addon
                    try{if(sc.physics && sc.physics.world && sc.physics.world.paused===true)sc.physics.world.paused=false;}catch(_){}
                    // arcade gravity
                    try{if(sc.physics && sc.physics.arcade && sc.physics.arcade.paused===true)sc.physics.arcade.paused=false;}catch(_){}
                  }
                }catch(_){}
              }
            }
          }catch(_){}
          // 5) Input tazele (bazen pointerlar kilitli kalir):
          try{
            if(game.input){
              try{
                if(game.input.mouse){
                  try{game.input.mouse.enabled=true;game.input.mouse.requestPointerLock=null;}catch(_){}
                }
              }catch(_){}
              try{
                if(game.input.touch){
                  try{game.input.touch.enabled=true;}catch(_){}
                }
              }catch(_){}
              try{if(game.input.keyboard && game.input.keyboard.enabled===false)game.input.keyboard.enabled=true;}catch(_){}
            }
          }catch(_){}
          // 6) Canvas'in render olmasi icin zorla 1 tick:
          try{
            if(game && game.renderer && game.renderer.snapshotCallback)null;
            else if(game.step){try{game.step(Date.now());}catch(_){}}
          }catch(_){}
          // 7) Eger FORGIVE.HTML yonlendirmesi bekliyorsa tekrar dene (interval background'da durduysa diye)
          try{
            var href=window.location.href||'';
            if(href.indexOf('forgive.html')<0){
              // Ending veya World sahnelerinde isek: yonlendirme interval tekrar trigger etsin (background'da durduysa)
              var worldS=null;try{worldS=game.scene.getScene('World');}catch(_){worldS=null;}
              var endS=null;try{endS=game.scene.getScene('Ending');}catch(_){endS=null;}
              // Yönlendirme flagi var mi? (winBoss cagrilmis ve _endingTransitioned=true ise)
              if(worldS && (worldS._endingStarted===true || worldS._endingTransitioned===true)){
                try{window.location.href='forgive.html';}catch(_){}
              }
              if(endS && endS._redirected!==true){
                // Ending acik, yonlendirme gerceklesmemis: hemen zorla yonlendir
                try{endS._redirected=true;window.location.href='forgive.html';}catch(_){}
              }
            }
          }catch(_){}
          // 8) Music ctx sakinlasmissa tekrar calistir:
          try{if(typeof Music==='object' && state && state.music){try{Music.ensure();Music.sync();}catch(_){}}}catch(_){}
          try{if(typeof SoundFX==='function'||typeof Sound==='function'){try{if(state && state.sfx===false)null;}catch(_){}}}catch(_){}
          // 9) Canvas/DOM boyutu degismisse (cihaz donduyse) resize trigger:
          try{
            if(game.scale){try{game.scale.refresh();}catch(_){try{game.scale.updateLayout(true);}catch(__){}}}
          }catch(_){}
          // 10) Safari icin ekstra: gorunurlukten sonra null anim varsa start
          try{
            if(game && game.canvas && game.canvas.style){
              // none -> block trick for Safari
              try{game.canvas.style.display='none';game.canvas.offsetHeight;game.canvas.style.display='';}catch(_){}
            }
          }catch(_){}
        }catch(bigErr){try{console.error('resume-all err:',bigErr);}catch(_){}}
      }
      // A) Visibility Change: Sekme / pencere on/off
      try{
        document.addEventListener('visibilitychange',function(){
          try{
            if(document.visibilityState==='hidden'){lastHiddenAt=Date.now();}
            else{
              // geri donuldu (visible)
              var howLong=lastHiddenAt?(Date.now()-lastHiddenAt):0;
              // 1sn+ arka planda kaldıysa (kısa süreli alıntılama ise yok say)
              if(howLong>800)setTimeout(hardResumeAll,80);
              else hardResumeAll();
            }
          }catch(_){}
        },false);
      }catch(_){}
      // B) Focus (pencere aktif)
      try{window.addEventListener('focus',function(){setTimeout(hardResumeAll,50);},false);}catch(_){}
      // C) Window blur yok (gerek yok)
      // D) Phaser GAME_PAUSE / GAME_RESUME eventleri (IDE'deki pause tuşu, oyun içi menü)
      try{
        if(game && game.events){
          try{game.events.on(Phaser.Core.Events.GAME_RESUME,function(){setTimeout(hardResumeAll,30);});}catch(_){
            try{game.events.on('resume',function(){setTimeout(hardResumeAll,30);});}catch(__){}
          }
          try{game.events.on(Phaser.Core.Events.RESUME,function(){setTimeout(hardResumeAll,30);});}catch(_){}
        }
      }catch(_){}
      // E) Blur sonrasi geri gelme: window.onpageshow (safari baze)
      try{window.addEventListener('pageshow',function(e){if(e && e.persisted)setTimeout(hardResumeAll,100);},false);}catch(_){}
      // F) Oyun baslar baslamaz calis (ilk frame'de resume tetikle)
      try{setTimeout(hardResumeAll,400);}catch(_){}

      // ========== G) ZORLU MASTER LOOP (ASLA DURMAZ!) ==========
      // Eger Phaser kendi loopunu pause eder (IDE pause tuşu, tarayıcı throttle vb.), biz manuel step atıyoruz.
      try{
        if(window.__masterStepInterval)clearInterval(window.__masterStepInterval);
        window.__masterStepInterval=setInterval(function(){
          try{
            if(!game)return;
            // 1. Eger oyun loopu pause ise manuel step at
            var loopPaused=false;
            try{loopPaused=!!(game.loop && game.loop.paused);}catch(_){}
            var gamePaused=false;
            try{gamePaused=!!game.paused;}catch(_){}
            var needStep=false;
            if(loopPaused||gamePaused){needStep=true;}
            // Ekstra: document visible ama FPS 0 ise step at
            if(document.visibilityState==='visible'){needStep=true;}
            if(needStep){
              try{game.step(Date.now());}catch(_){}
              // 2. Herhangi bir sahne paused ise: resume (her stepte kontrol)
              try{
                var scenes=game.scene.scenes;
                if(scenes&&scenes.length){
                  for(var _si=0;_si<scenes.length;_si++){
                    try{
                      var _sc=scenes[_si];
                      if(_sc&&_sc.sys&&_sc.sys.active){
                        if(_sc.sys.paused){try{_sc.scene.resume();}catch(_){try{_sc.sys.paused=false;}catch(__){}}}
                        if(_sc.time&&_sc.time.paused)_sc.time.paused=false;
                        if(_sc.physics&&_sc.physics.world&&_sc.physics.world.paused)_sc.physics.world.paused=false;
                        if(_sc.physics&&_sc.physics.arcade&&_sc.physics.arcade.paused)_sc.physics.arcade.paused=false;
                      }
                    }catch(_){}
                  }
                }
              }catch(_){}
              // 3. World sahnesindeki PLAYER'ın body'si kapalıysa aç:
              try{
                var _W=game.scene.getScene('World');
                if(_W&&_W.sys&&_W.sys.active){
                  if(_W.player&&_W.player.body){
                    try{if(_W.player.body.enable===false)_W.player.body.enable=true;}catch(_){}
                    try{if(_W.physics&&_W.physics.world&&_W.physics.world.bodies){
                      // body collide enable
                      if(_W.player.body&&_W.player.body.checkCollision){}
                    }}catch(_){}
                  }
                  if(_W.cursors&&_W.keys){
                    // input resetle (kilitlenme)
                    try{if(_W.input&&_W.input.keyboard)_W.input.keyboard.enabled=true;}catch(_){}
                  }
                }
              }catch(_){}
              // 4. Player twerk DOM IMG: Eger DOM elementi varsa ama pozisyon güncellenmiyorsa (interval arka planda durduysa) manuel pozisyon guncelle + frame swap (animasyon)
              try{
                if(window.__twerkDomImg&&document.body.contains(window.__twerkDomImg)){
                  try{
                    var _W2=game.scene.getScene('World');
                    if(_W2&&_W2.cameras&&_W2.cameras.main){
                      var _cam2=_W2.cameras.main;
                      var _gW=parseInt(window.__twerkDomImg.dataset.worldX||'0',10)||0;
                      if(_gW<=0){
                        // fallback: world kayitli degil, twerkin npc nesnesinden bul
                        if(_W2.sadTwer) _gW=(_W2.sadTwer.x!==undefined)?_W2.sadTwer.x:_gW;
                      }
                      var __sv=parseFloat(window.__twerkDomImg.dataset.sv||'0.55')||0.55;
                      var __ow=parseInt(window.__twerkDomImg.dataset.ow||'126',10)||126;
                      var __yoff=parseFloat(window.__twerkDomImg.dataset.yoff||'-30')||-30;
                      // KARE (frame) SWAP: arka planda animSwap intervali durduysa, her ~220ms'de bir degistir (masterloop 16ms → 14 tick = 224ms)
                      try{
                        window.__twerkDomImg.__tickCount=(window.__twerkDomImg.__tickCount||0)+1;
                        if(window.__twerkDomImg.__tickCount>=14){
                          window.__twerkDomImg.__tickCount=0;
                          var __curF=parseInt(window.__twerkDomImg.dataset.frame||'0',10)||0;
                          var __newF=1-__curF;
                          window.__twerkDomImg.dataset.frame=String(__newF);
                          var __srcNS=__newF?'assets/twerk/twerk2.png':'assets/twerk/twerk1.png';
                          if(window.__twerkDomImg.src.indexOf((__newF?'twerk2':'twerk1'))<0)window.__twerkDomImg.src=__srcNS;
                        }
                      }catch(_SWAP){}
                      // setupNPCs'teki AYNI HESAPLAR:
                      var __canvas=document.querySelector('#game canvas')||document.querySelector('canvas');
                      var __rect;
                      try{__rect=__canvas?__canvas.getBoundingClientRect():(function(){try{var c=game.canvas;return c?c.getBoundingClientRect():{left:0,top:0,width:window.innerWidth,height:window.innerHeight};}catch(_){return{left:0,top:0,width:window.innerWidth,height:window.innerHeight}}})();}catch(_E2){__rect={left:0,top:0,width:window.innerWidth,height:window.innerHeight};}
                      var __gameW=parseInt(game.config.width,10)||1024;
                      var __gameH=parseInt(game.config.height,10)||576;
                      var __scaleX=__rect.width/__gameW;
                      var __scaleY=__rect.height/__gameH;
                      var __wx=_gW - _cam2.scrollX;
                      var __wy=(390-10) - _cam2.scrollY; // setupNPCs'teki 390-10
                      var __px=__rect.left + __wx*__scaleX;
                      var __py=__rect.top + __wy*__scaleY;
                      var __bw=(__ow*__sv)*__scaleX;
                      // bob (yoyo) off: arka planda tween durduysa, basit bir sinus ver rahat olsun
                      var __bob=0;
                      try{
                        var _t=_W2.sadTwer;
                        if(_t && _t.list && _t.list[0]) __bob=_t.list[0]._offY||0;
                      }catch(_B){}
                      if(__bob===0){
                        __bob=-1.5+Math.sin(Date.now()/450)*1.5;
                      }
                      window.__twerkDomImg.style.left=(__px - __bw/2)+'px';
                      window.__twerkDomImg.style.top=(__py + (__yoff*__scaleY) + __bob*__scaleY)+'px';
                      window.__twerkDomImg.style.width=__bw+'px';
                      window.__twerkDomImg.style.height='auto';
                    }
                  }catch(_BIG_ERR){}
                }
              }catch(_){}
            }
          }catch(_STEP_BIG){}
        },16); // ~60 FPS — asla durmaz
      }catch(_){}

      // ========== H) HER 1 SN AUTO-RESUME KONTROL (Ne olursa olsun pause varsa kaldır!) ==========
      try{
        if(window.__autoResumeInterval)clearInterval(window.__autoResumeInterval);
        window.__autoResumeInterval=setInterval(function(){
          try{
            if(document.visibilityState!=='visible')return;
            var paused=false;
            try{if(game&&game.paused)paused=true;}catch(_){}
            try{if(game&&game.loop&&game.loop.paused)paused=true;}catch(_){}
            // scene paused var mı?
            try{
              var scs=game.scene.scenes;
              if(scs&&scs.length){
                for(var _ai=0;_ai<scs.length;_ai++){
                  try{if(scs[_ai]&&scs[_ai].sys&&scs[_ai].sys.active&&scs[_ai].sys.paused)paused=true;}catch(_){}
                }
              }
            }catch(_){}
            if(paused)hardResumeAll();
          }catch(_){}
        },1000);
      }catch(_){}

    }catch(bigFatal){try{console.error('PAUSEFIX FATAL:',bigFatal);}catch(_){}}
  })();
  // ========================================
  try{window.__game=game;window.__state=state;window.__save=save;
    window.testWin=function(){
      try{
        var w=game.scene.getScene('World');
        if(w && typeof w.winBoss==='function'){
          try{console.log('[TEST] winBoss() CAGIRILIYOR...')}catch(_){}
          try{w._endingStarted=false;w._endingTransitioned=false;}catch(_){}
          try{w.winBoss();}catch(err1){
            try{console.warn('winBoss hata:', err1 && err1.message);}catch(_){}
            try{window.location.href='forgive.html';}catch(_1){}
          }
          return 'OK - winBoss cagrildi, birkac saniye icinde forgive.html sayfasina gideceksin!';
        }else{
          try{window.location.href='forgive.html';}catch(_){}
          return 'World sahnede degil, direkt forgive.html';
        }
      }catch(e){
        try{window.location.href='forgive.html';}catch(_){}
        return 'Hata oldu ama forgive.html yonlendirildi';
      }
    };
    window.testEnding=function(){try{window.location.href='forgive.html';return 'yonlendiriliyor';}catch(_){return 'yonlendirme hatasi'}};
    // === URL ?testWin=1 otomatik tetikle ===
    var up2;
    try{up2=new URLSearchParams(window.location.search||'');}catch(_){up2={get:function(){return ''}}}
    var testWinFlag=false;
    try{testWinFlag=(up2.get('testWin')==='1');}catch(_){testWinFlag=false;}
    if(testWinFlag){
      // World sahnesi hazir olunca 900ms sonra testWin() calistir
      var _waitW=0;
      var _intW=setInterval(function(){
        try{
          var w=game.scene.getScene('World');
          if(w && w.sys && w.sys.active){
            clearInterval(_intW);
            setTimeout(function(){try{window.testWin();}catch(_){}},900);
          }else{
            _waitW++;
            if(_waitW>60){clearInterval(_intW);}
          }
        }catch(_){}
      },200);
    }
  }catch(e){}
  // ===== DOM BINDINGS =====
  const bindUI=()=>{
    const $=(id)=>document.getElementById(id);
    // Settings panel toggle (GERCEK ID: settings)
    $('settings-toggle')?.addEventListener('click',()=>{
      const p=$('settings');if(p){p.classList.toggle('hidden');if(!p.classList.contains('hidden')){
        // Panel açılır açılmaz mevcut state'i yansıt
        const om=$('music');if(om)om.checked=!!state.music;
        const osfx=$('sfx');if(osfx)osfx.checked=!!state.sfx;
        const os=$('shake');if(os)os.checked=!!state.shake;
        const mv=$('music-vol');if(mv)mv.value=String((state.musicVol??0.8)*100);
        const sv=$('sfx-vol');if(sv)sv.value=String((state.sfxVol??0.9)*100);
      }}
    });
    // Müzik checkbox (id: music)
    $('music')?.addEventListener('change',e=>{state.music=e.target.checked;if(state.music)Music.ensure();else Music.stop();Music.sync();save()});
    // Efekt checkbox (id: sfx)
    $('sfx')?.addEventListener('change',e=>{state.sfx=e.target.checked;save()});
    // Shake checkbox (id: shake)
    $('shake')?.addEventListener('change',e=>{state.shake=e.target.checked;save()});
    // Ses seviyeleri (id: music-vol / sfx-vol)
    $('music-vol')?.addEventListener('input',e=>{state.musicVol=parseFloat(e.target.value)/100;Music.sync();save()});
    $('sfx-vol')?.addEventListener('input',e=>{state.sfxVol=parseFloat(e.target.value)/100;save()});
    // Sıfırla butonu (id: reset-save)
    $('reset-save')?.addEventListener('click',()=>{
      if(confirm('Tüm kaydedilen ilerlemen silinecek. Emin misin?')){
        try{localStorage.removeItem(SAVE_KEY)}catch(e){}location.reload()
      }
    });
    // Ses butonu (mute toggle)
    const soundBtn=$('sound-toggle');if(soundBtn){
      if(state.muted)soundBtn.classList.add('muted');else soundBtn.classList.remove('muted');
      soundBtn.addEventListener('click',()=>{
        state.muted=!state.muted;save();Music.sync();
        if(state.muted)soundBtn.classList.add('muted');else soundBtn.classList.remove('muted')
      })
    }
    // Tam ekran
    const fs=()=>{try{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()}catch(e){}};
    $('fullscreen-toggle')?.addEventListener('click',fs);
    $('pause-fullscreen')?.addEventListener('click',fs);
    // Pause butonu (World sahnesi açıksa toggle eder)
    $('pause-toggle')?.addEventListener('click',()=>{const sc=game.scene.getScenes(true).find(s=>s instanceof World);if(sc)sc.togglePause()});
    // Pause panel butonlari (HTML'de var: pause-resume / pause-mainmenu)
    $('pause-resume')?.addEventListener('click',()=>{
      const sc=game.scene.getScenes(true).find(s=>s instanceof World);if(sc){sc.togglePause()}else{$('pause')?.classList.add('hidden')}
    });
    $('pause-mainmenu')?.addEventListener('click',()=>{
      $('pause')?.classList.add('hidden');game.scene.stop('World');game.scene.start('Title')
    });
    // Touch kontrolleri
    const bindTouch=(id,field,isJustPress=false)=>{const el=document.getElementById(id);if(!el)return;
      const press=(ev)=>{ev.preventDefault();try{if(ev.pointerId!=null)el.setPointerCapture?.(ev.pointerId)}catch(e){}touch[field]=true;el.classList.add('pressed');
        if(field==='jumpHeld'){touch.jumpPressed=true}if(field==='attackHeld'){touch.attackPressed=true}if(field==='fishHeld'){touch.fishPressed=true}};
      const release=(ev)=>{ev.preventDefault();touch[field]=false;el.classList.remove('pressed')};
      el.addEventListener('pointerdown',press);el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);
      el.addEventListener('pointerleave',release);el.addEventListener('touchstart',press,{passive:false});
      el.addEventListener('touchend',release,{passive:false});el.addEventListener('touchcancel',release,{passive:false});
      el.addEventListener('dblclick',e=>e.preventDefault())
    }
    bindTouch('touch-left','left');bindTouch('touch-right','right');
    bindTouch('touch-jump','jumpHeld',true);bindTouch('touch-attack','attackHeld',true);
    bindTouch('touch-fish','fishHeld',true);
  };
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',bindUI);else bindUI();
  // ===== GLOBAL ACIL DURUM: Boot kilitlenmesini onle =====
  // Boot sahnede 2+ saniye kilitlenirse zorla Title'a gecis (her 900ms'de kontrol)
  let __bootChecks=0;setInterval(()=>{
    try{
      const g=window.__game;if(!g)return;
      const act=g.scene.getScenes(true).map(s=>s.scene.key);
      if(act.length===1&&act[0]==='Boot'){
        __bootChecks++;
        if(__bootChecks>=2){
          try{g.scene.stop('Boot')}catch(_){}
          try{g.scene.start('Title')}catch(_){}
          __bootChecks=0;
        }
      }else __bootChecks=0;
    }catch(e){}
  },900);
})();
