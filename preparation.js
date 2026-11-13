// The break ends earlier when a noise penalty has been accumulated.
function preparationState(now, rows, deduction, baseMinutes) {
  const upcoming=rows.find(([time,label])=>label.includes('교시')&&seconds(time)>now);
  if(!upcoming)return null;
  const start=seconds(upcoming[0]);
  const end=start-Math.min(Math.max(0,deduction),baseMinutes*60);
  if(now<start-baseMinutes*60||now<end-60)return null;
  return {label:upcoming[1],remaining:Math.max(0,end-now)};
}
let previewUntil=0;
function updatePreparation(now){
  const preview=Date.now()<previewUntil;
  const state=preview?{label:'수업',remaining:60}:preparationState(now,schedule,deduction,config.base);
  const banner=$('prepBanner');
  banner.classList.toggle('warning',!!state);
  document.body.classList.toggle('prepare',!!state);
  const title=state?(state.remaining>0?'🚨 쉬는시간 종료 1분 전 · 수업 준비!':'📖 쉬는시간 끝 · 수업을 준비해요!'):'수업 준비 알림';
  const description=state?`${preview?'[테스트] ':''}자리에 앉아 책과 필기도구를 준비하세요.${!preview&&deduction?' (소음 차감 반영)':''}`:'쉬는시간이 끝나기 1분 전에 경고등이 켜져요.';
  if($('prepTitle').textContent!==title)$('prepTitle').textContent=title;
  if($('prepText').textContent!==description)$('prepText').textContent=description;
}
document.addEventListener('DOMContentLoaded',()=>{
  $('previewAlert').onclick=()=>{previewUntil=Date.now()+8000;tick()};
  $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{$('prepText').textContent='전체화면을 지원하지 않는 환경입니다. 브라우저에서 F11을 눌러 주세요.'}};
  document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'전체화면 종료':'전체화면'});
});
