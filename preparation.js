// The break ends earlier when a noise penalty has been accumulated.
function preparationState(now, rows, deduction, baseMinutes) {
  const upcoming=rows.find(([time,label])=>label.includes('교시')&&seconds(time)>now);
  if(!upcoming)return null;
  const start=seconds(upcoming[0]);
  const end=start-Math.min(Math.max(0,deduction),baseMinutes*60);
  if(now<start-baseMinutes*60||now<end-60)return null;
  return {label:upcoming[1],remaining:Math.max(0,end-now)};
}
function classStartState(now,rows){return rows.find(([time,label])=>label.includes('교시')&&now>=seconds(time)&&now<seconds(time)+60)??null;}
let previewUntil=0,startPreviewUntil=0;
function updatePreparation(now){
  const preview=Date.now()<previewUntil;
  const state=preview?{label:'수업',remaining:60}:preparationState(now,schedule,deduction,config.base);
  const started=Date.now()<startPreviewUntil?['','수업']:classStartState(now,schedule);
  const banner=$('prepBanner');
  if(started){
    banner.classList.remove('warning');banner.classList.add('class-start');document.body.classList.remove('prepare');document.body.classList.add('class-in-session');
    const title='🔔 '+started[1]+' 시작! 수업을 시작해요';
    if($('prepTitle').textContent!==title)$('prepTitle').textContent=title;
    const message='모두 자리에 앉아 선생님께 집중해 주세요.';
    if($('prepText').textContent!==message)$('prepText').textContent=message;
    return;
  }
  banner.classList.remove('class-start');document.body.classList.remove('class-in-session');
  banner.classList.toggle('warning',!!state);
  document.body.classList.toggle('prepare',!!state);
  const title=state?(state.remaining>0?'🚨 쉬는시간 종료 1분 전 · 수업 준비!':'📖 쉬는시간 끝 · 수업을 준비해요!'):'수업 준비 알림';
  const description=state?`${preview?'[테스트] ':''}자리에 앉아 책과 필기도구를 준비하세요.${!preview&&deduction?' (소음 차감 반영)':''}`:'쉬는시간이 끝나기 1분 전에 경고등이 켜져요.';
  if($('prepTitle').textContent!==title)$('prepTitle').textContent=title;
  if($('prepText').textContent!==description)$('prepText').textContent=description;
}
document.addEventListener('DOMContentLoaded',()=>{
  const style=document.createElement('style');style.textContent='.prep-banner.class-start{background:#176cc4;color:#fff;border-color:#d5edff;box-shadow:0 0 0 3px #398edf55}.class-start .warning-light{background:#a5ffcf;border-color:#e4fff0;box-shadow:0 0 16px #b9ffdb;animation:beacon 1.6s ease-in-out infinite}.class-start .text-button{color:#fff}.class-in-session .clock-panel{background:#b6dcf0;border-color:#2781c9}.class-in-session .reminder{color:#075399}#startTest{font-size:12px;margin-left:6px;padding:8px 10px}@media(prefers-reduced-motion:reduce){.class-start .warning-light{animation:none}}';document.head.append(style);
  const test=document.createElement('button');test.id='startTest';test.textContent='수업 시작 테스트';test.onclick=()=>{$('teacherDialog').close();startPreviewUntil=Date.now()+8000;void ring();tick()};$('bell').insertAdjacentElement('afterend',test);
  const dialog=$('teacherDialog');
  ['mic','fullscreen','reset'].forEach(id=>$('teacherControls').append($(id)));
  ['bell','startTest','shushTest','previewAlert','bellStatus'].forEach(id=>$('teacherTests').append($(id)));
  const options=document.querySelector('.noise details');options.open=true;$('teacherOptions').append(options);
  $('teacherSettings').onclick=()=>dialog.showModal();
  $('closeSettings').onclick=()=>dialog.close();
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
  $('previewAlert').onclick=()=>{dialog.close();previewUntil=Date.now()+8000;tick()};
  $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{$('prepText').textContent='전체화면을 지원하지 않는 환경입니다. 브라우저에서 F11을 눌러 주세요.'}};
  document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'전체화면 종료':'전체화면'});
});
