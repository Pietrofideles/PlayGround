(() => {
  'use strict';
  const canvas = document.querySelector('#arena');
  const ctx = canvas.getContext('2d');
  const ui = {
    home: document.querySelector('#homeScreen'), select: document.querySelector('#selectScreen'), fight: document.querySelector('#fightUI'),
    grid: document.querySelector('#rosterGrid'), name: document.querySelector('#fighterName'), number: document.querySelector('#fighterNumber'),
    desc: document.querySelector('#fighterDesc'), monogram: document.querySelector('#portraitMonogram'), portrait: document.querySelector('#portrait'), stats: document.querySelector('#fighterStats'),
    pHealth: document.querySelector('#pHealth'), eHealth: document.querySelector('#eHealth'), pChakra: document.querySelector('#pChakra'), eChakra: document.querySelector('#eChakra'),
    timer: document.querySelector('#timer'), message: document.querySelector('#fightMessage'), pause: document.querySelector('#pauseOverlay'), result: document.querySelector('#resultOverlay')
  };
  const roster = [
    ['Naruto','N'],['Sasuke','S'],['Sakura','さ'],['Kakashi','カ'],['Shikamaru','シ'],['Hinata','ヒ'],['Rock Lee','李'],['Neji','ネ'],['Gaara','我'],['Temari','テ'],
    ['Kiba','キ'],['Shino','シ'],['Ino','イ'],['Choji','チ'],['Tenten','天'],['Might Guy','ガ'],['Jiraiya','自'],['Tsunade','綱'],['Orochimaru','大'],['Itachi','鼬'],
    ['Kisame','鬼'],['Deidara','デ'],['Sasori','サ'],['Pain','ペ'],['Konan','小'],['Tobi','ト'],['Killer Bee','B'],['Minato','波'],['Obito','オ'],['Madara','斑'],
    ['Hashirama','柱'],['Tobirama','扉'],['Hiruzen','猿'],['Kankuro','カ'],['Sai','サ'],['Yamato','ヤ'],['Asuma','ア'],['Kurenai','紅'],['Anko','ア'],['Shizune','シ'],
    ['Kabuto','兜'],['Kimimaro','君'],['Haku','白'],['Zabuza','桃'],['Suigetsu','水'],['Karin','香'],['Jugo','重'],['Konohamaru','木'],['Iruka','海'],['Danzo','団']
  ];
  const descriptions = {
    Naruto:'Determinação sem limites. O próximo Hokage nunca recua.',
    Sasuke:'Frio, veloz e preciso. Seu olhar nunca perde o alvo.'
  };
  const palette = {
    Naruto:{main:'#e57632',dark:'#733f2c',hair:'#e9bd57',skin:'#e6b28a',accent:'#3c5260',aura:'#ff9c48'},
    Sasuke:{main:'#344a62',dark:'#28303d',hair:'#202831',skin:'#ddb092',accent:'#a6afb4',aura:'#78b9e8'}
  };
  const state = {screen:'home', selected:0, keys:new Set(), actors:[], particles:[], time:0, last:0, paused:false, ended:false, muted:true, timer:99, timerAcc:0, shake:0, flash:0, winner:'', countdown:0, countdownStep:3, combat:false, toast:'', toastUntil:0, width:innerWidth, height:innerHeight};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rand=(a,b)=>a+Math.random()*(b-a);
  function resize(){const dpr=Math.min(devicePixelRatio||1,2); state.width=innerWidth;state.height=innerHeight;canvas.width=Math.floor(innerWidth*dpr);canvas.height=Math.floor(innerHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
  addEventListener('resize',resize); resize();
  function buildRoster(){
    roster.forEach((entry,i)=>{
      const cell=document.createElement('button'); cell.className='roster-cell '+(i<2?'unlocked':'locked')+(i===state.selected?' selected':'');cell.type='button';cell.setAttribute('role','option');cell.setAttribute('aria-selected',i===state.selected?'true':'false');cell.setAttribute('aria-label',entry[0]+(i<2?'':' — bloqueado'));
      cell.innerHTML=`<span class="cell-number">${String(i+1).padStart(2,'0')}</span><span class="cell-avatar">${entry[1]}</span>${i>1?'<span class="lock">◆</span>':''}<span class="cell-name">${entry[0]}</span>`;
      cell.addEventListener('click',()=>{if(i>1){toast('Este shinobi ainda está bloqueado.');return}selectCharacter(i)});ui.grid.appendChild(cell);
    }); updateCard();
  }
  function selectCharacter(i){if(i>1)return;state.selected=i;document.querySelectorAll('.roster-cell').forEach((el,n)=>{el.classList.toggle('selected',n===i);el.setAttribute('aria-selected',n===i?'true':'false')});updateCard()}
  function updateCard(){const n=roster[state.selected][0],p=palette[n];ui.name.textContent=n.toUpperCase();ui.number.textContent=String(state.selected+1).padStart(2,'0');ui.monogram.textContent=roster[state.selected][1];ui.desc.textContent=descriptions[n];ui.portrait.style.background=`radial-gradient(ellipse at 50% 70%, ${p.main}99 0, ${p.dark} 38%, #272b31 75%, #21242c 100%)`;ui.monogram.style.color=p.hair;
    const values=n==='Naruto'?[82,73,88]:[89,86,75],labels=['PODER','VELOCIDADE','CHAKRA'];ui.stats.innerHTML=values.map((v,i)=>`<div class="stat"><span>${labels[i]}</span><span class="stat-track"><i style="width:${v}%"></i></span><b>${v}</b></div>`).join('')}
  function showScreen(name){state.screen=name;ui.home.classList.toggle('active',name==='home');ui.select.classList.toggle('active',name==='select');ui.fight.classList.toggle('active',name==='fight');ui.select.setAttribute('aria-hidden',name==='select'?'false':'true');ui.fight.setAttribute('aria-hidden',name==='fight'?'false':'true');ui.pause.classList.remove('show');ui.result.classList.remove('show');if(name!=='fight'){state.paused=false;state.ended=false;state.combat=false;state.actors=[]}}
  function toast(text){state.toast=text;state.toastUntil=performance.now()+1800}
  function newActor(name,player,x){return{name,player,x,y:0,vx:0,vy:0,face:player?1:-1,hp:100,chakra:40,attack:0,attackType:'',cool:0,block:false,dash:0,hit:0,stun:0,walk:0,seed:Math.random()*10,aiWait:rand(.4,1.1)}}
  function startFight(){const picked=roster[state.selected][0],opponent=picked==='Naruto'?'Sasuke':'Naruto';state.actors=[newActor(picked,true,-.22),newActor(opponent,false,.22)];state.timer=99;state.timerAcc=0;state.paused=false;state.ended=false;state.combat=false;state.countdown=2.2;state.countdownStep=3;state.particles=[];ui.pause.classList.remove('show');ui.result.classList.remove('show');document.querySelector('#pName').textContent=picked.toUpperCase();updateHUD();showScreen('fight');ui.message.classList.add('show');ui.message.querySelector('span').textContent='PREPARE-SE';ui.message.querySelector('b').textContent='3'}
  function updateHUD(){const [p,e]=state.actors;if(!p||!e)return;ui.pHealth.style.width=p.hp+'%';ui.eHealth.style.width=e.hp+'%';ui.pChakra.style.width=p.chakra+'%';ui.eChakra.style.width=e.chakra+'%';ui.timer.textContent=String(Math.ceil(state.timer)).padStart(2,'0')}
  function endFight(winner){state.ended=true;state.combat=false;state.winner=winner;ui.result.classList.add('show');document.querySelector('#resultTitle').textContent=winner==='player'?'VITÓRIA!':'DERROTA';document.querySelector('#resultText').textContent=winner==='player'?'Seu caminho ninja continua.':'Levante-se. Ainda há muito a aprender.'}
  buildRoster();
  document.querySelector('#playBtn').addEventListener('click',()=>showScreen('select'));
  document.querySelector('#rosterBtn').addEventListener('click',()=>showScreen('select'));
  document.querySelector('#backBtn').addEventListener('click',()=>showScreen('home'));
  document.querySelector('#fightBtn').addEventListener('click',startFight);
  document.querySelector('#pauseBtn').addEventListener('click',()=>{if(!state.ended){state.paused=true;ui.pause.classList.add('show')}});
  document.querySelector('#resumeBtn').addEventListener('click',()=>{state.paused=false;ui.pause.classList.remove('show')});
  document.querySelector('#quitBtn').addEventListener('click',()=>showScreen('home'));
  document.querySelector('#rematchBtn').addEventListener('click',startFight);
  document.querySelector('#resultMenuBtn').addEventListener('click',()=>showScreen('home'));
  document.querySelector('#soundToggle').addEventListener('click',e=>{state.muted=!state.muted;e.currentTarget.innerHTML=(state.muted?'♫':'♪')+' <span>'+(state.muted?'SOM OFF':'SOM ON')+'</span>';if(!state.muted)beep(440,.07)});
  function beep(freq,duration=.08,type='sine'){if(state.muted)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!state.audio)state.audio=new A();if(state.audio.state==='suspended')state.audio.resume();const o=state.audio.createOscillator(),g=state.audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.035,state.audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,state.audio.currentTime+duration);o.connect(g);g.connect(state.audio.destination);o.start();o.stop(state.audio.currentTime+duration)}catch(_){}}
  const keyMap={ArrowUp:'w',ArrowDown:'s',ArrowLeft:'a',ArrowRight:'d',Space:'k'};
  addEventListener('keydown',e=>{const key=keyMap[e.code]||e.key.toLowerCase();if(['w','a','s','d','j','k','l','shift',' '].includes(key)){e.preventDefault();state.keys.add(key);if(!e.repeat&&state.screen==='select'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){const next=state.selected===0?1:0;selectCharacter(next)}if(!e.repeat&&state.screen==='select'&&e.code==='Enter')startFight();if(!e.repeat&&state.screen==='fight'&&key==='Escape'){state.paused=!state.paused;ui.pause.classList.toggle('show',state.paused)}}});
  addEventListener('keyup',e=>state.keys.delete(keyMap[e.code]||e.key.toLowerCase()));addEventListener('blur',()=>state.keys.clear());
  document.querySelectorAll('.touch-controls [data-key]').forEach(btn=>{const key=btn.dataset.key;const down=e=>{e.preventDefault();state.keys.add(key);btn.classList.add('pressed')},up=e=>{e.preventDefault();state.keys.delete(key);btn.classList.remove('pressed')};btn.addEventListener('pointerdown',down);['pointerup','pointercancel','pointerleave'].forEach(ev=>btn.addEventListener(ev,up))});

  function polygon(points,fill,stroke=null,line=1){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}}
  function ellipse(x,y,rx,ry,fill,angle=0){ctx.beginPath();ctx.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),angle,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill()}
  function line(x1,y1,x2,y2,color,width=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
  function drawBackground(t){
    const w=state.width,h=state.height,ground=h*.71;
    const sky=ctx.createLinearGradient(0,0,0,ground);sky.addColorStop(0,'#242630');sky.addColorStop(.55,'#57504d');sky.addColorStop(1,'#a16a4a');ctx.fillStyle=sky;ctx.fillRect(0,0,w,ground);
    const sunX=w*.69,sunY=h*.33,sunR=Math.min(w,h)*.15;let halo=ctx.createRadialGradient(sunX,sunY,5,sunX,sunY,sunR);halo.addColorStop(0,'#ffc58666');halo.addColorStop(.42,'#e6935c2b');halo.addColorStop(1,'#e6935c00');ctx.fillStyle=halo;ctx.fillRect(sunX-sunR,sunY-sunR,sunR*2,sunR*2);ellipse(sunX,sunY,sunR*.27,sunR*.27,'#f1bd8b28');
    // layered mountain silhouettes
    polygon([[0,ground*.75],[w*.12,ground*.42],[w*.23,ground*.68],[w*.36,ground*.3],[w*.49,ground*.62],[w*.65,ground*.37],[w*.82,ground*.64],[w*.93,ground*.4],[w,ground*.66],[w,ground],[0,ground]],'#35343a');
    polygon([[0,ground*.77],[w*.13,ground*.6],[w*.28,ground*.72],[w*.42,ground*.51],[w*.55,ground*.7],[w*.7,ground*.53],[w*.83,ground*.73],[w*.94,ground*.55],[w,ground*.72],[w,ground],[0,ground]],'#292d32');
    // distant training hall
    const hx=w*.48,hy=ground*.52;ctx.fillStyle='#25262b';ctx.fillRect(hx,hy,w*.11,ground-hy);polygon([[hx-w*.02,hy],[hx+w*.055,hy-ground*.1],[hx+w*.13,hy],[hx+w*.115,hy+7],[hx-w*.005,hy+7]],'#1b1e23');ctx.fillRect(hx+w*.045,hy+ground*.15,w*.023,ground*.33);ctx.fillStyle='#7d5442';ctx.fillRect(hx+w*.049,hy+ground*.15,w*.015,ground*.33);
    // forest silhouette and trunks
    for(let i=0;i<17;i++){const x=((i/16)*w + Math.sin(i*12.7)*w*.015), base=ground*(.94+Math.sin(i*8)*.04),hh=ground*(.25+(i*17%7)/20),tw=8+(i%3)*5;ctx.fillStyle=i%2?'#292d31':'#252a2e';ctx.fillRect(x-tw/2,base-hh*.2,tw,hh*.2);polygon([[x,base-hh],[x-tw*3,base-hh*.35],[x-tw*1.6,base-hh*.4],[x-tw*2.7,base-hh*.15],[x+tw*2.5,base-hh*.15],[x+tw*1.7,base-hh*.42],[x+tw*3,base-hh*.5]],i%2?'#262a2e':'#22272b')}
    // arena ground
    const floor=ctx.createLinearGradient(0,ground,0,h);floor.addColorStop(0,'#6a5142');floor.addColorStop(.18,'#4e4038');floor.addColorStop(1,'#20242a');ctx.fillStyle=floor;ctx.fillRect(0,ground,w,h-ground);
    polygon([[w*.13,ground],[w*.84,ground],[w*1.05,h],[w*-.05,h]],'#ffffff05','#f8c09919',1);
    // perspective floor seams
    for(let i=-5;i<14;i++){const x=w*(i/9);line(w*.5+(x-w*.5)*.11,ground,x,h,'#edc3a21a',1)}
    for(let j=1;j<5;j++){const y=ground+(h-ground)*j*j/25;line(0,y,w,y,'#e0b49913',1)}
    // drifting embers
    for(let i=0;i<18;i++){const x=((i*137+t*9)%Math.max(w,1)),y=(h*.27+Math.sin(t*.6+i*4)*h*.035+(i*47)%Math.max(h*.58,1));ctx.globalAlpha=.2+((Math.sin(t*1.8+i)*.5+.5)*.45);ellipse(x,y,1.2+(i%3)*.4,1.2+(i%3)*.4,'#ffb37b')};ctx.globalAlpha=1;
    const vignette=ctx.createRadialGradient(w*.52,h*.46,h*.13,w*.52,h*.46,h*.77);vignette.addColorStop(.55,'#090a0d00');vignette.addColorStop(1,'#07090fc9');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  }
  function drawFighter(a,t){
    const w=state.width,h=state.height, p=palette[a.name], scale=clamp(h/760,.68,1.18), menu=state.screen!=='fight';
    const spacing=menu?.18:.22;const x=w*(.5+a.x),depth=a.y;const floorY=h*(menu?.78:.75)+depth*h*.05;const sx=scale*(menu?1.18:1.04)*(1+depth*.15);const bob=Math.sin(t*5+a.seed)*2.5*(1+Math.min(a.walk,1)*.6);const hurt=a.hit>0;const face=a.face||1;const running=Math.min(1,Math.abs(a.vx)*4);const action=a.attack>0;const attackReach=a.attackType==='jutsu'?100:65;
    ctx.save();ctx.translate(x,floorY);ctx.scale(sx,sx);ctx.globalAlpha=.34;ellipse(0,0,48,9,'#08090d');ctx.globalAlpha=1;
    // chakra glow
    if(a.attackType==='jutsu'&&a.attack>0){ctx.globalAlpha=.22+Math.sin(t*20)*.1;ellipse(0,-68,58+a.attack*24,72+a.attack*18,p.aura);ctx.globalAlpha=1}
    ctx.scale(face,1);
    const jump=clamp(-a.vy*3,0,24), lift=bob-jump;
    // legs
    const stride=Math.sin(t*13+a.seed)*running*12;
    const legBack=action? -7:stride, legFront=action?4:-stride;
    line(-10,-34+lift,-14+legBack,-7, p.dark,13);line(-14+legBack,-7,-24+legBack,-4,p.dark,11);
    line(9,-34+lift,13+legFront,-8,'#393c44',13);line(13+legFront,-8,24+legFront,-4,'#252a31',11);
    ellipse(-24+legBack,-4,9,4,p.dark);ellipse(24+legFront,-4,9,4,'#20232a');
    // torso, jacket and belt
    polygon([[-18,-83+lift],[14,-83+lift],[22,-43+lift],[14,-31+lift],[-17,-31+lift],[-24,-46+lift]],p.main,'#16191f',1.5);
    polygon([[-15,-79+lift],[-2,-72+lift],[2,-37+lift],[-14,-35+lift],[-21,-48+lift]],p.dark);
    polygon([[3,-77+lift],[15,-80+lift],[21,-47+lift],[13,-39+lift],[2,-48+lift]],'#ffffff18');
    // belt / pouch
    polygon([[-19,-48+lift],[19,-48+lift],[17,-40+lift],[-17,-40+lift]],'#262a32');ellipse(-18,-45+lift,5,7,'#b17b51');
    // arms with action windup and guard pose
    const guard=a.block?1:0;const punch=action&&a.attackType==='strike'?Math.sin((1-a.attack/.23)*Math.PI):0;const jabX=action?(a.attackType==='jutsu'?24:24+attackReach*punch):0;
    line(-17,-76+lift,-26,-55+lift,-1===1?p.main:p.main,12);line(-26,-55+lift,-22,-46+lift,p.skin,9);
    const elbowX=a.block?17:15;const elbowY=a.block?-70:-60+lift;
    line(15,-75+lift,elbowX,-62+lift,p.main,13);line(elbowX,-62+lift,20+jabX,-57+lift-(guard*9),p.skin,10);
    ellipse(20+jabX,-57+lift-(guard*9),7,6,p.skin);
    // neck and head
    ctx.fillStyle=p.skin;ctx.fillRect(-6,-91+lift,12,13);
    ellipse(0,-103+lift,18,19,p.skin);
    // cheek shadow and distinctive whisker marks
    ellipse(12,-100+lift,6,9,'#c88870');
    if(a.name==='Naruto'){for(let i=0;i<3;i++){line(-18,-104+lift+i*6,-9,-102+lift+i*6,'#a45b4e',1.4);line(9,-102+lift+i*6,18,-104+lift+i*6,'#a45b4e',1.4)}}
    // hair cap / spikes
    if(a.name==='Naruto'){
      polygon([[-18,-107+lift],[-24,-120+lift],[-11,-116+lift],[-9,-132+lift],[0,-120+lift],[7,-137+lift],[12,-118+lift],[25,-126+lift],[19,-108+lift]],p.hair,'#6c5034',1);
      polygon([[-18,-106+lift],[18,-106+lift],[14,-113+lift],[-15,-112+lift]],'#374550');
    }else{
      polygon([[-19,-105+lift],[-25,-126+lift],[-12,-119+lift],[-6,-139+lift],[2,-121+lift],[14,-136+lift],[16,-117+lift],[25,-125+lift],[18,-105+lift]],p.hair,'#0e1118',1);
      polygon([[-17,-107+lift],[19,-107+lift],[14,-112+lift],[-15,-112+lift]],'#343c45');
    }
    // headband metal and leaf-like engraving
    polygon([[-18,-112+lift],[18,-112+lift],[18,-106+lift],[-18,-106+lift]],'#7e868a');line(-4,-110+lift,5,-108+lift,'#d7c8aa',1.2);ellipse(0,-109+lift,3,1.2,'#d5c3a4');
    // eyes follow opponent
    ellipse(8,-104+lift,3,1.5,'#f5eadd');ellipse(9,-104+lift,1.15,1.4,'#22232a');line(5,-107+lift,11,-108+lift,'#392b2c',1.5);
    // shoulder sash details
    line(-17,-75+lift,-4,-57+lift,'#e9c6a145',2);line(8,-78+lift,14,-53+lift,'#fff2dc38',1);
    // chakra sparks
    if(action&&a.attackType==='jutsu'){for(let i=0;i<7;i++){const ang=t*7+i*Math.PI*2/7;const q=22+Math.sin(t*17+i)*5;ellipse(Math.cos(ang)*q,-58+Math.sin(ang)*q,2,2,p.aura)}}
    // impact flashes
    if(a.hit>0){ctx.globalAlpha=clamp(a.hit*4,0,.7);ellipse(0,-66,40,52,'#fff');ctx.globalAlpha=1}
    ctx.restore();
  }
  function drawFightEffects(t){for(const p of state.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ellipse(p.x,p.y,p.size*(p.life/p.max),p.size*(p.life/p.max),p.color);ctx.globalAlpha=1}}
  function burst(a,color,count=14){const x=state.width*(.5+a.x),y=state.height*.75+a.y*state.height*.05-state.height*.12;for(let i=0;i<count;i++){const ang=Math.random()*Math.PI*2,speed=rand(35,210);state.particles.push({x,y,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed-35,life:rand(.22,.62),max:.62,size:rand(2,5),color})}}
  function damage(target,amount,attacker,type){const blocked=target.block&&target.face===-attacker.face;const actual=blocked?Math.ceil(amount*.16):amount;target.hp=clamp(target.hp-actual,0,100);target.hit=blocked?.06:.22;target.stun=blocked?.04:.17;target.vx+=attacker.face*(blocked?.035:.09);if(type==='jutsu')target.chakra=clamp(target.chakra+5,0,100);burst(target,palette[target.name].aura,blocked?5:12);state.shake=blocked?3:7;state.flash=.14;beep(blocked?170:105,.06,blocked?'triangle':'sawtooth');updateHUD();if(target.hp<=0)endFight(attacker.player?'player':'enemy')}
  function activateAttack(a,type){a.attackType=type;a.attack=type==='jutsu'?.42:.28;a.cool=type==='jutsu'?.68:.38;a.hitDone=false;if(type==='jutsu'){a.chakra=clamp(a.chakra-22,0,100);burst(a,palette[a.name].aura,20);beep(260,.16,'triangle')}else beep(125,.045,'square')}
  function updateActor(a,other,dt){
    a.cool=Math.max(0,a.cool-dt);a.hit=Math.max(0,a.hit-dt);a.stun=Math.max(0,a.stun-dt);a.attack=Math.max(0,a.attack-dt);a.dash=Math.max(0,a.dash-dt);a.chakra=clamp(a.chakra+dt*(a.block?4:7),0,100);a.block=false;
    if(a.attack<=0)a.attackType='';
    const dx=other.x-a.x;a.face=dx>=0?1:-1;
    let moveX=0,moveY=0;
    if(a.player){if(state.keys.has('a'))moveX-=1;if(state.keys.has('d'))moveX+=1;if(state.keys.has('w'))moveY-=1;if(state.keys.has('s'))moveY+=1;a.block=state.keys.has('shift');
      if(!a.stun&&!state.ended){if(state.keys.has('j')&&a.cool<=0&&a.chakra>=22)activateAttack(a,'jutsu');else if(state.keys.has('k')&&a.cool<=0)activateAttack(a,'strike');if(state.keys.has('l')&&a.dash<=0){a.dash=.55;a.vx=a.face*.95;burst(a,'#f3d9b2',7);beep(340,.05)}}
    }else if(!a.stun&&!state.ended&&state.combat){a.aiWait-=dt;const dist=Math.abs(dx);if(dist>.18)moveX=Math.sign(dx);if(a.aiWait<=0){a.aiWait=rand(.3,.72);a.block=Math.random()<.25&&state.actors[0].attack>0;if(dist<.29&&Math.random()<.66){if(a.chakra>=22&&dist>.11&&Math.random()<.36)activateAttack(a,'jutsu');else activateAttack(a,'strike')}else if(dist>.12&&Math.random()<.35){a.dash=.4;a.vx=Math.sign(dx)*.8}}}
    if(a.stun>0){moveX=0;moveY=0}
    const maxSpeed=a.dash>0?4.7:2.05;const accel=a.dash>0?16:9;
    if(moveX){a.vx+=(moveX*maxSpeed-a.vx)*Math.min(1,accel*dt)}else a.vx*=Math.pow(.001,dt);
    a.x=clamp(a.x+a.vx*dt,-.4,.4);a.y=clamp(a.y+moveY*dt*1.05,-.8,.8);a.walk=Math.abs(a.vx);
    if(a.attack>0&&!a.hitDone){const dist=Math.abs(other.x-a.x),reach=a.attackType==='jutsu'?.42:.145;const depth=Math.abs(other.y-a.y);if(dist<reach&&depth<.8){a.hitDone=true;const damageValue=a.attackType==='jutsu'?24:13;damage(other,damageValue,a,a.attackType)}else if(a.attackType==='jutsu'&&a.attack<.18){a.hitDone=true;burst(a,palette[a.name].aura,8)}}
  }
  function update(dt){state.time+=dt;const t=state.time;if(state.screen==='fight'&&!state.paused&&!state.ended){
      if(!state.combat){state.countdown-=dt;const step=Math.max(0,Math.ceil(state.countdown));if(step<state.countdownStep){state.countdownStep=step;ui.message.querySelector('b').textContent=step>0?step:'LUTEM!';if(step===0){state.combat=true;ui.message.querySelector('span').textContent='';beep(510,.18)}}if(state.countdown<-.45){ui.message.classList.remove('show');state.combat=true}}
      else{state.timerAcc+=dt;if(state.timerAcc>=1){state.timerAcc-=1;state.timer=Math.max(0,state.timer-1);updateHUD();if(state.timer===0)endFight(state.actors[0].hp>=state.actors[1].hp?'player':'enemy')}}
      if(state.combat){const [p,e]=state.actors;updateActor(p,e,dt);updateActor(e,p,dt);if(Math.abs(p.x-e.x)<.085&&Math.abs(p.y-e.y)<.8){const push=(.085-Math.abs(p.x-e.x))*.5;p.x-=p.face*push;e.x+=p.face*push}}
    }
    for(const p of state.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=250*dt;p.vx*=Math.pow(.2,dt)}state.particles=state.particles.filter(p=>p.life>0);
  }
  function render(){const t=state.time,w=state.width,h=state.height;ctx.clearRect(0,0,w,h);ctx.save();if(state.shake>0){ctx.translate(rand(-state.shake,state.shake),rand(-state.shake,state.shake));state.shake=Math.max(0,state.shake-1)}drawBackground(t);
    if(state.screen==='fight'&&state.actors.length){const ordered=state.actors.slice().sort((a,b)=>a.y-b.y);for(const a of ordered)drawFighter(a,t);drawFightEffects(t)}else{
      const nar=newActor('Naruto',true,-.18),sas=newActor('Sasuke',false,.12);nar.face=1;sas.face=-1;nar.seed=0;sas.seed=2;nar.y=.3;sas.y=-.12;drawFighter(nar,t);drawFighter(sas,t);
    }
    if(state.flash>0){ctx.fillStyle=`rgba(255,235,206,${state.flash*1.2})`;ctx.fillRect(0,0,w,h);state.flash=Math.max(0,state.flash-.016)}
    if(state.toastUntil>performance.now()){ctx.save();ctx.globalAlpha=clamp((state.toastUntil-performance.now())/350,0,1);ctx.fillStyle='#171a20dd';ctx.fillRect(w/2-145,h-100,290,38);ctx.strokeStyle='#e77839';ctx.strokeRect(w/2-145,h-100,290,38);ctx.fillStyle='#eee';ctx.font='11px Arial';ctx.textAlign='center';ctx.fillText(state.toast,w/2,h-77);ctx.restore()}
    ctx.restore();
  }
  function frame(now){const dt=Math.min(.04,(now-state.last)/1000||0);state.last=now;update(dt);render();requestAnimationFrame(frame)}requestAnimationFrame(frame);
})();
