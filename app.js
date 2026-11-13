const $=id=>document.getElementById(id);
const schedule=[['08:30','아침'],['08:50','1교시'],['09:40','2교시'],['10:30','3교시'],['11:20','4교시'],['12:10','점심'],['12:50','5~6교시']];
const seconds=t=>Number(t.slice(0,2))*3600+Number(t.slice(3))*60;
const format=s=>[Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':');
const short=s=>`${Math.floor(s/60)}분 ${String(s%60).padStart(2,'0')}초`;
let config={threshold:75,duration:5,amount:10,base:10},deduction=0,day='',audio,armed=false,lastSecond='',lastBellKey='',stream,context,analyser,frame,running=false,starting=false,highTime=0,lastTime=0,smoothed=0;
try{const saved=JSON.parse(localStorage.getItem('classroom-settings'));if(saved)for(const key of Object.keys(config)){const v=Number(saved[key]);const limits={threshold:[10,100],duration:[1,60],amount:[1,300],base:[1,60]}[key];if(Number.isFinite(v)&&v>=limits[0]&&v<=limits[1])config[key]=v}}catch{}
// Upgrade the previous default once; preserve teacher-customized thresholds.
try{if(localStorage.getItem('classroom-sensitivity-version')!=='2'){if(config.threshold===65)config.threshold=75;localStorage.setItem('classroom-settings',JSON.stringify(config));localStorage.setItem('classroom-sensitivity-version','2')}}catch{}
function persist(){try{localStorage.setItem('classroom-penalty',JSON.stringify({day,deduction}))}catch{}}
function penalty(){deduction=Math.min(deduction,config.base*60);$('deduct').textContent=deduction+'초';$('remaining').textContent=short(config.base*60-deduction);$('ruleSummary').textContent=`높음 ${config.duration}초마다 쉬는시간 ${config.amount}초 차감`;persist()}
for(const key of Object.keys(config)){$(key).value=config[key];$(key).addEventListener('change',()=>{if(!$(key).checkValidity()||!Number.isFinite(Number($(key).value))||!$(key).value){$(key).value=config[key];return}config[key]=Math.round(Number($(key).value));$(key).value=config[key];highTime=0;try{localStorage.setItem('classroom-settings',JSON.stringify(config))}catch{}penalty()})}
function tick(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const p=Object.fromEntries(parts.map(v=>[v.type,v.value]));const today=`${p.year}-${p.month}-${p.day}`;if(day!==today){day=today;deduction=0;try{const saved=JSON.parse(localStorage.getItem('classroom-penalty'));if(saved?.day===day)deduction=Math.max(0,Number(saved.deduction)||0)}catch{}penalty()}$('date').textContent=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(new Date());$('clock').textContent=`${p.hour}:${p.minute}:${p.second}`;const now=+p.hour*3600 + +p.minute*60 + +p.second;const next=schedule.find(x=>seconds(x[0])>now);$('nextLabel').textContent=next?`다음 종 : ${next[1]} (${next[0]})`:'오늘의 시정이 모두 끝났어요';$('countdown').textContent=next?format(seconds(next[0])-now):'수고했어요!';$('schedule').innerHTML=schedule.map((x,i)=>`<tr class="${seconds(x[0])<=now&&(!schedule[i+1]||seconds(schedule[i+1][0])>now)?'active':''}"><td>${x[0]}</td><td>${x[1]}</td></tr>`).join('');$('progress').innerHTML=schedule.map(x=>`<span class="${seconds(x[0])<=now?'done':''}"></span>`).join('');const due=schedule.find(x=>now>=seconds(x[0])&&now-seconds(x[0])<5);if(armed&&due&&lastBellKey!==today+due[0]){lastBellKey=today+due[0];void ring();}lastSecond=today+now;updatePreparation(now)}
async function ring(){try{audio??=new AudioContext();await audio.resume();shushMuteUntil=performance.now()+2400;[0,.45,.9].forEach((offset,i)=>{const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime+offset;osc.type='sine';osc.frequency.value=[659,523,784][i];gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.2,t+.02);gain.gain.exponentialRampToValueAtTime(.001,t+.8);osc.connect(gain).connect(audio.destination);osc.start(t);osc.stop(t+.85)});armed=true;$('bellStatus').textContent='자동 종 알림 ON · 이 화면을 열어 두세요.'}catch{$('bellStatus').textContent='소리를 재생할 수 없어요. 브라우저 소리 설정을 확인해 주세요.'}}
$('bell').onclick=ring;
$('bell').textContent='🔔 소리 알림 켜기 / 테스트';
document.addEventListener('click',async()=>{
  if(armed)return;
  try{audio??=new AudioContext();await audio.resume();if(audio.state==='running'){armed=true;$('bellStatus').textContent='자동 종 알림 ON · 수업 시작 시간에 종이 울려요.';}}catch{}
});

let shushSource=null,shushMuteUntil=0,shushLastAt=-Infinity,shushReady=true,shushQuietTime=0;
async function playShush(){
  if(shushSource)return;
  const ctx=context??(audio??=new AudioContext());
  shushMuteUntil=performance.now()+2000;
  try{
    await ctx.resume();
    const duration=1.35,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate);
    const samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=buffer;filter.type='bandpass';filter.frequency.value=3200;filter.Q.value=.7;
    const now=ctx.currentTime;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.95,now+.09);gain.gain.setValueAtTime(.95,now+.8);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    source.connect(filter).connect(gain).connect(ctx.destination);
    shushSource=source;shushMuteUntil=performance.now()+duration*1000+650;
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();if(shushSource===source)shushSource=null};
    source.start();source.stop(now+duration);
  }catch{shushMuteUntil=0;const button=$('shushTest');if(button)button.textContent='소리 재생 실패 · 다시 테스트';}
}
function checkShush(score,delta,time){
  if(score<config.threshold-5){shushQuietTime+=delta;if(shushQuietTime>=2)shushReady=true}else shushQuietTime=0;
  if(score>=config.threshold&&shushReady&&time-shushLastAt>=8000){shushReady=false;shushLastAt=time;void playShush();}
}
const shushTest=document.createElement('button');shushTest.id='shushTest';shushTest.type='button';shushTest.textContent='🔊 쉿~ 테스트';shushTest.title='높음 단계에서 재생되는 쉿 소리를 들어보세요';shushTest.style.cssText='font-size:12px;padding:8px 10px;margin-top:10px;align-self:flex-start';shushTest.onclick=()=>{void playShush()};document.querySelector('.noise-heading').insertAdjacentElement('afterend',shushTest);

function stop(message='측정을 껐어요. 누적 차감은 유지됩니다.'){running=false;shushSource?.stop();shushSource=null;shushMuteUntil=0;shushReady=true;shushQuietTime=0;shushLastAt=-Infinity;cancelAnimationFrame(frame);stream?.getTracks().forEach(t=>t.stop());stream=null;context?.close().catch(()=>{});context=null;highTime=0;smoothed=0;$('mic').textContent='마이크 ON';$('mic').setAttribute('aria-pressed','false');$('level').textContent='측정 OFF';$('score').textContent='—';$('fill').style.width='0%';document.querySelector('.meter').setAttribute('aria-valuenow','0');document.body.classList.remove('high');$('status').textContent=message}
function sample(time){if(!running)return;const delta=Math.min((time-lastTime)/1000,.25);lastTime=time;if(time<shushMuteUntil){smoothed=0;$('status').textContent='쉿~ 작은 목소리로 이야기해요. (안내 소리는 차감에서 제외)';frame=requestAnimationFrame(sample);return;}const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);const rms=Math.sqrt(data.reduce((sum,v)=>sum+v*v,0)/data.length);const value=Math.max(0,Math.min(100,(20*Math.log10(Math.max(rms,.00001))+65)*100/65));smoothed=smoothed*.75+value*.25;const score=Math.round(smoothed),high=score>=config.threshold,medium=score>=config.threshold*.55;checkShush(score,delta,time);highTime=high?highTime+delta:0;let added=false;if(highTime>=config.duration){const previous=deduction;deduction=Math.min(config.base*60,deduction+config.amount);highTime=0;added=deduction>previous;penalty()}$('score').textContent=score;$('fill').style.width=score+'%';$('fill').style.background=high?'#df6c52':medium?'#d3a63c':'#39a78d';$('level').textContent=high?'높음 · 조용히 해주세요':medium?'보통 · 조금만 작게':'낮음 · 참 잘하고 있어요';document.body.classList.toggle('high',high);document.querySelector('.meter').setAttribute('aria-valuenow',score);$('status').textContent=deduction>=config.base*60?'쉬는시간이 모두 차감되었어요.':added?`높은 소음으로 쉬는시간이 차감되었어요.`:high?`높음 ${highTime.toFixed(1)} / ${config.duration}초 · 계속되면 ${config.amount}초 차감`:'서로를 배려하는 작은 목소리로 이야기해요.';frame=requestAnimationFrame(sample)}
$('mic').onclick=async()=>{if(running){stop();return}if(starting)return;starting=true;$('mic').disabled=true;$('status').textContent='마이크 사용 권한을 허용해 주세요.';try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('unsupported');stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});context=new AudioContext();await context.resume();analyser=context.createAnalyser();analyser.fftSize=2048;context.createMediaStreamSource(stream).connect(analyser);stream.getAudioTracks()[0].onended=()=>{if(running)stop('마이크 연결이 끊어졌어요. 다시 켜 주세요.')};running=true;$('mic').textContent='마이크 OFF';$('mic').setAttribute('aria-pressed','true');lastTime=performance.now();frame=requestAnimationFrame(sample)}catch(e){stop(e.name==='NotAllowedError'?'마이크 권한이 필요해요. 주소창의 권한 설정에서 허용한 후 다시 켜 주세요.':e.name==='NotFoundError'?'연결된 마이크를 찾을 수 없어요. 마이크를 연결해 주세요.':'마이크를 시작할 수 없어요. HTTPS 또는 localhost에서 열고 마이크 연결을 확인해 주세요.')}finally{starting=false;$('mic').disabled=false}};
$('reset').onclick=()=>{if(deduction>0&&!confirm('누적 차감을 초기화하고 쉬는시간을 복원할까요?'))return;deduction=0;highTime=0;penalty()};document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)stop('화면이 숨겨져 측정을 껐어요. 다시 ON을 눌러 주세요.')});window.addEventListener('pagehide',()=>stop());tick();setInterval(tick,1000);