const KEY="balancedDiet100_v1";
let state=JSON.parse(localStorage.getItem(KEY)||"null");
let selectedDate=null, editingId=null;
const $=id=>document.getElementById(id);
const iso=d=>{const x=new Date(d);return new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const parseDate=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const todayISO=()=>iso(new Date());
const fmt=d=>parseDate(d).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function init(){
 if(!state){$("setup").classList.remove("hidden");$("setupDate").value=todayISO();return}
 $("app").classList.remove("hidden"); selectedDate=todayISO(); render();
}
function dayIndex(date){const start=parseDate(state.startDate), cur=parseDate(date);return Math.floor((cur-start)/86400000)+1}
function validDate(date){return dayIndex(date)>=1&&dayIndex(date)<=100}
function getDay(date){return state.days[date]||(state.days[date]={meals:[],manualMiss:false})}
function calories(date){return getDay(date).meals.reduce((a,m)=>a+Number(m.cal||0),0)}
function status(date){
 const d=getDay(date), c=calories(date), max=Number(state.target)+100;
 if(d.manualMiss)return "fail";
 if(!d.meals.length)return "empty";
 return c<=Number(state.target)?"done":c<=max?"warn":"fail";
}
function streak(){
 let s=0, end=todayISO(), start=parseDate(state.startDate), now=parseDate(end);
 if(now<start)return 0;
 let idx=Math.min(100,Math.floor((now-start)/86400000)+1);
 for(let i=idx;i>=1;i--){let d=iso(new Date(start.getTime()+(i-1)*86400000)); if(status(d)==="done"||status(d)==="warn")s++;else break}
 return s;
}
function render(){
 const idx=dayIndex(selectedDate), c=calories(selectedDate), st=status(selectedDate), max=Number(state.target)+100;
 $("dayNumber").textContent=Math.min(100,Math.max(1,idx)); $("dateLabel").textContent=fmt(selectedDate);
 $("consumed").textContent=c.toLocaleString();$("target").textContent=Number(state.target).toLocaleString();$("remaining").textContent=Math.max(0,Number(state.target)-c).toLocaleString();$("streak").textContent=streak();
 $("sideTarget").textContent=Number(state.target).toLocaleString()+" kcal";$("sideMax").textContent=max.toLocaleString()+" kcal";$("limitLabel").textContent="Target + 100 kcal";
 const pct=Math.min(100,Math.round(c/max*100));$("percent").textContent=pct+"%";$("barFill").style.width=pct+"%";
 const badge=$("dayBadge"), msg=$("dayMessage");
 badge.className="badge "+(st==="done"?"good":st==="warn"?"warn":st==="fail"?"fail":"neutral");
 badge.textContent=st==="done"?"Complete":st==="warn"?"+100 allowance used":st==="fail"?"Failed":"Not logged";
 msg.textContent=st==="done"?"Within your daily target.":st==="warn"?"You are within the extra 100 kcal allowance, but this should not become the everyday target.":st==="fail"?"This day is over the allowance or was marked missed. The streak resets.":"Log your meals to see today's result.";
 $("completeBtn").textContent=getDay(selectedDate).manualMiss?"Undo missed day":"Mark day as missed";
 const list=$("mealList");list.innerHTML=""; const meals=getDay(selectedDate).meals;
 $("emptyMeals").classList.toggle("hidden",meals.length>0);
 meals.forEach(m=>{const el=document.createElement("div");el.className="meal";el.innerHTML=`<div><div class="meal-name">${esc(m.name)}</div><div class="muted">${Number(m.cal).toLocaleString()} kcal</div></div><div class="meal-actions"><button class="text-btn" onclick="editMeal('${m.id}')">Edit</button><button class="text-btn" onclick="deleteMeal('${m.id}')">Delete</button></div>`;list.appendChild(el)});
 renderCalendar();
}
function renderCalendar(){
 const cal=$("calendar");cal.innerHTML="";const start=parseDate(state.startDate);
 for(let i=1;i<=100;i++){const d=iso(new Date(start.getTime()+(i-1)*86400000)),s=status(d),el=document.createElement("button");el.className="day "+s+(d===selectedDate?" selected":"");el.title=`Day ${i} • ${fmt(d)}`;el.textContent=i; if(d>todayISO())el.classList.add("future");el.onclick=()=>{selectedDate=d;render()};cal.appendChild(el)}
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function addMeal(){editingId=null;$("dialogTitle").textContent="Add meal";$("mealName").value="";$("mealCalories").value="";$("mealDialog").showModal();setTimeout(()=>$("mealName").focus(),50)}
function editMeal(id){const m=getDay(selectedDate).meals.find(x=>x.id===id);if(!m)return;editingId=id;$("dialogTitle").textContent="Edit meal";$("mealName").value=m.name;$("mealCalories").value=m.cal;$("mealDialog").showModal()}
function deleteMeal(id){if(!confirm("Delete this meal?"))return;getDay(selectedDate).meals=getDay(selectedDate).meals.filter(x=>x.id!==id);save();render()}
$("mealForm").addEventListener("submit",e=>{e.preventDefault();const name=$("mealName").value.trim(),cal=Number($("mealCalories").value);if(!name||cal<0)return;const meals=getDay(selectedDate).meals;if(editingId){const m=meals.find(x=>x.id===editingId);m.name=name;m.cal=cal}else meals.push({id:crypto.randomUUID(),name,cal});save();$("mealDialog").close();render()});
$("addMealBtn").onclick=addMeal;
$("prevBtn").onclick=()=>{const d=parseDate(selectedDate);d.setDate(d.getDate()-1);const x=iso(d);if(validDate(x))selectedDate=x,render()};
$("nextBtn").onclick=()=>{const d=parseDate(selectedDate);d.setDate(d.getDate()+1);const x=iso(d);if(validDate(x))selectedDate=x,render()};
$("todayBtn").onclick=()=>{const t=todayISO();selectedDate=validDate(t)?t:state.startDate;render()};
$("completeBtn").onclick=()=>{const d=getDay(selectedDate);d.manualMiss=!d.manualMiss;save();render()};
$("settingsBtn").onclick=()=>{$("settingsTarget").value=state.target;$("settingsDate").value=state.startDate;$("settingsDialog").showModal()};
$("settingsForm").addEventListener("submit",e=>{e.preventDefault();const target=Number($("settingsTarget").value),date=$("settingsDate").value;if(!target||!date)return;state.target=target;state.startDate=date;save();selectedDate=validDate(todayISO())?todayISO():date;$("settingsDialog").close();render()});
$("setupDate").value=todayISO();
$("startBtn").onclick=()=>{const target=Number($("setupTarget").value),date=$("setupDate").value;if(!target||target<1||!date){alert("Please enter a calorie target and start date.");return}state={target,startDate:date,days:{}};save();$("setup").classList.add("hidden");$("app").classList.remove("hidden");selectedDate=validDate(todayISO())?todayISO():date;render()};
$("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="balanced-diet-100-days.json";a.click();URL.revokeObjectURL(a.href)};
$("importInput").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.target||!x.startDate||!x.days)throw Error();state=x;save();selectedDate=validDate(todayISO())?todayISO():state.startDate;render()}catch{alert("That file is not a valid challenge backup.")}};r.readAsText(f)};
$("resetBtn").onclick=()=>{if(confirm("Reset the entire 100-day challenge and delete its local data?")){localStorage.removeItem(KEY);location.reload()}};
init();