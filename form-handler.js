let _eloquaSubmissionSent = false;

// ==== GATED CONTENT HELPERS ====
const GATED_TOKEN_KEY = "gatedContentToken";
const GATED_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function setGatedToken() {
const payload = { value: true, expires: Date.now() + GATED_TOKEN_TTL_MS };
localStorage.setItem(GATED_TOKEN_KEY, JSON.stringify(payload));
}

function getGatedToken() {
const raw = localStorage.getItem(GATED_TOKEN_KEY);
if (!raw) return null;
try {
const obj = JSON.parse(raw);
if (obj.expires && Date.now() < obj.expires) return true;
localStorage.removeItem(GATED_TOKEN_KEY);
return null;
} catch {
localStorage.removeItem(GATED_TOKEN_KEY);
return null;
}
}

function updateGatedContentVisibility() {
const has = !!getGatedToken();
document.querySelectorAll("[data-no-token]").forEach(el => el.style.display = has ? "none" : "");
document.querySelectorAll("[data-has-token]").forEach(el => el.style.display = has ? "" : "none");
}

const GATED_REGEX = [
/^\/webinars(\/.*)?$/, /^\/events(\/.*)?$/, /^\/reports(\/.*)?$/
];
function isGatedPage() {
return GATED_REGEX.some(rx => rx.test(window.location.pathname));
}
// ==== END GATED HELPERS ====


(function () {
if (window._domoFormHandlerLoaded) return;
window._domoFormHandlerLoaded = true;

// --- HELPERS ---
function getCookie(name) {
const parts = ("; " + document.cookie).split("; " + name + "=");
return parts.length === 2 ? parts.pop().split(";").shift() : "";
}
function setCookie(name, value, days) {
let exp = "";
if (days) {
const d = new Date();
d.setTime(d.getTime() + days * 86400000);
exp = "; expires=" + d.toUTCString();
}
document.cookie = name + "=" + (value||"") + exp + "; path=/";
}
function getUrlParam(name) {
return new URLSearchParams(window.location.search).get(name) || "";
}
async function hashSHA1(input) {
const enc = new TextEncoder().encode(input);
const buf = await crypto.subtle.digest("SHA-1", enc);
return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function getUniqueFFID() {
const p = getUrlParam("unique_ffid") || getUrlParam("uniqueFFID");
if (p) return p;
const domo = getUrlParam("domo_id") || getCookie("did") || "";
return await hashSHA1(crypto.randomUUID() + "|" + domo);
}
function generateDomoID() {
const t = Math.floor(Date.now()/1000), r = Math.floor(Math.random()*1e8);
return (t * r).toString().slice(0,10);
}
function getOrCreateDomoID() {
let d = getCookie("did");
if (!d || d==="undefined" || d.length<10 || +d===0) {
d = generateDomoID();
setCookie("did",d,3650);
}
return d;
}
function getGaClientId() {
const c = document.cookie.split("; ").find(r=>r.startsWith("_ga="));
return c ? c.split("=")[1] : "";
}
function getCanadaConsent(form) {
const cb = form.querySelector('input[name="consent"]');
if (cb) return cb.checked?1:0;
const hid = form.querySelector('input[name="sFDCCanadaEmailOptIn1"]');
return hid && ["1","Yes","true",1,true].includes(hid.value)?1:1;
}

// --- UINFO COOKIE ---
function setUInfoCookie(form) {
const domo = getCookie("did") || "";
//const val = name => (form.querySelector('[name="'+name+'"]')||{}).value.trim()||"";
const val = name => (form.querySelector(`[name="${name}"]`)?.value || "").trim();
const params = new URLSearchParams({
domoid: domo,
firstname: val("first_name"),
lastname:  val("last_name"),
email:     val("email"),
phone:     val("phone"),
selected:  val("department")
});
const exp = new Date(Date.now()+30*86400000).toUTCString();
document.cookie = "uinfo="+params.toString()+"; expires="+exp+"; path=/";
}

// --- POPULATORS ---
function populateUtmFields(form) {
const map = {
utm_source: "utmSource1", utm_medium: "utmMedium1",
source: "utmSource1", medium: "utmMedium1",
utm_campaign:"utmCampaign1", campid:"utmCampid1",
utm_campid:"utmCampid1", gclid:"gCLID1",
gadposition:"utmGadposition1", utm_gadposition:"utmGadposition1",
gcreative:"utmGcreative1", utm_gcreative:"utmGcreative1",
gdevice:"utmGdevice1", utm_gdevice:"utmGdevice1",
gnetwork:"utmGnetwork1", utm_gnetwork:"utmGnetwork1",
gkeyword:"utmGkeyword1", utm_gkeyword:"utmGkeyword1",
gplacement:"utmGplacement1", utm_gplacement:"utmGplacement1",
gmatchtype:"utmGmatchtype1", utm_gmatchtype:"utmGmatchtype1",
gtarget:"utmGtarget1", utm_gtarget:"utmGtarget1",
utm_orgid:"utmOrgid1", orgid:"utmOrgid1"
};
const urlP = new URLSearchParams(window.location.search);
const cookieP = new URLSearchParams(getCookie("_pubweb_utm")||"");
Object.entries(map).forEach(([p,n])=>{
let v = urlP.get(p) || cookieP.get(p) || "";
const fld = form.querySelector(`input[name="${n}"]`);
if (fld && v) fld.value = v;
});
}

async function populateAll(form) {
populateUtmFields(form);
form.querySelectorAll('input[name="domo_id"]').forEach(i=>i.value=getOrCreateDomoID());
form.querySelectorAll('input[name="g_id"]').forEach(i=>i.value=getGaClientId());
const ffid = await getUniqueFFID();
form.querySelectorAll('input[name="uniqueFFID"]').forEach(i=>i.value=ffid);

fetch("https://api.ipify.org?format=json").then(r=>r.json())
.then(d=>fetch("https://max-mind-get-production.up.railway.app/getIp?ip="+d.ip))
.then(r=>r.json()).then(data=>{
form.querySelectorAll('input[name="geoip_country_code"]').forEach(i=>i.value=data.iso_code);
if(data.iso_code==="CA"){
form.querySelectorAll(".consent-wrapper input").forEach(chk=>chk.removeAttribute("checked"));
form.querySelectorAll(".consent-wrapper").forEach(w=>w.style.display="flex");
}
}).catch(e=>console.error("Error fetching Geo IP:",e));
}

function populateSubmissionFields(form) {
const origin = window.location.origin;
const cf = form.querySelector('input[name="contentURL1"]');
if(cf){
let v=cf.value.trim();
if(v.toLowerCase()!=="noredirect" && !/^https?:\/\//.test(v)){
cf.value = origin + (v.startsWith("/")?v:"/"+v);
}
}
const pf = form.querySelector('input[name="pathName1"]');
if(pf) pf.value = origin + window.location.pathname;

const Q = window.location.search || getCookie("_pubweb_utm");
["rFCDMJunkReason1","originalUtmquerystring1"].forEach(n=>{
const el=form.querySelector(`input[name="${n}"]`);
if(el) el.value=Q;
});
const uq = form.querySelector('input[name="utmquerystring1"]');
if(uq) uq.value=Q;

const tfi = form.querySelector('input[name="formSubmit1"]');
if(tfi){
const d=new Date(),D=String(d.getDate()).padStart(2,"0"),
    M=String(d.getMonth()+1).padStart(2,"0"),Y=d.getFullYear(),
    h=String(d.getHours()).padStart(2,"0"),
    m=String(d.getMinutes()).padStart(2,"0"),
    s=String(d.getSeconds()).padStart(2,"0");
tfi.value=`${M}/${D}/${Y} ${h}:${m}:${s}`;
}

const li = form.querySelector('input[name="language"]');
if(li) li.value = navigator.language || "";
const em = form.querySelector('input[name="email"]');
const co = form.querySelector('input[name="company"]');
if(co) co.value = em?em.value.split("@").pop():"";
const cod = form.querySelector('input[name="sFDCCanadaEmailOptInOutDate1"]');
if(cod) cod.value = new Date().toISOString().split("T")[0];
const ci1 = form.querySelector('input[name="sFDCCanadaEmailOptIn1"]');
if(ci1) ci1.value = getCanadaConsent(form);
}

// --- DATA LAYER PUSHERS ---
function pushFormDataToDataLayer(form) {
window.dataLayer = window.dataLayer||[];
const elems=form.querySelectorAll("input,select,textarea"),
  data={};
elems.forEach(el=>{
if(!el.name) return;
if(["submit","button","file"].includes(el.type)) return;
if((el.type==="checkbox"||el.type==="radio")&&!el.checked) return;
data[el.name]=el.value;
});
window.dataLayer.push({ event:"form_submit", formData:data });
}
function pushDomoFormStart(form){
window.dataLayer=window.dataLayer||[];
window.dataLayer.push({
event:"DomoFormStart",
eventModel:{
formId:form.querySelector('[name="elqFormName"]').value.trim(),
cta: form.querySelector('input[type="submit"]').value.trim()
}
});
}
function pushFormStart(form){
window.dataLayer=window.dataLayer||[];
const fields=Array.from(form.querySelectorAll("input,select,textarea")),
  first=fields[0]||{};
window.dataLayer.push({
event:"form_start",
eventModel:{
form_id: form.querySelector('[name="elqFormName"]').value.trim(),
form_name:null,
form_destination: form.querySelector('[name="contentURL1"]').value,
form_length: fields.length,
first_field_id:first.id,
first_field_name:first.name,
first_field_type:first.type,
first_field_position:first?1:undefined
}
});
}
function pushFormSubmit(form){
window.dataLayer=window.dataLayer||[];
const fields=Array.from(form.querySelectorAll("input,select,textarea"));
window.dataLayer.push({
event:"form_submit",
eventModel:{
form_id: form.id.replace(/_form$/,"").replace(/_/g,"-"),
form_name:null,
form_destination: form.querySelector('[name="contentURL1"]').value,
form_length:fields.length,
form_submit_text: form.querySelector('input[type="submit"]').value.trim(),
event_callback:function(){}
}
});
}
function pushDomoFormSubmit(form){
window.dataLayer=window.dataLayer||[];
window.dataLayer.push({
event:"DomoFormSubmit",
eventModel:{ formId: form.querySelector('[name="elqFormName"]').value.trim() }
});
}

// --- VALIDATION ---
const VALIDATION_RULES = {
first_name:{ type:"name", min:2, required:true, messages:{
required:"First name is a required field.",
min:"Please enter two or more characters.",
invalid:"Please enter a valid first name."
}},
last_name :{ type:"name", min:2, required:true, messages:{
required:"Last name is a required field.",
min:"Please enter two or more characters.",
invalid:"Please enter a valid last name."
}},
email     :{ type:"email", required:true, messages:{
required:"Email is a required field.",
invalid:"Please make sure the email address is formatted as name@domain.com.",
business:"Please enter a valid business email address. Personal emails such as Gmail are not accepted."
}},
phone     :{ type:"phone", min:10, required:true, messages:{
required:"Phone number is a required field.",
min:"Please enter a minimum of 10 digits.",
invalid:"Please enter a valid phone number."
}},
title     :{ type:"title", min:2, required:true, messages:{
required:"Job title is required.",
min:"Please enter two or more characters.",
invalid:"Please enter a valid job title."
}}
};
function validateField(cfg){
const v=cfg.element.value.trim(); let ok=false, err;
switch(cfg.type){
case"name":
if(!v) err="required";
else if(v.length<cfg.min) err="min";
else if(/(.)\1{3,}/.test(v)||!/^[A-Za-z\s]+$/.test(v)) err="invalid";
else ok=true; break;
case"email":
if(!v) err="required";
else if(!/^[A-Za-z0-9](?:[A-Za-z0-9]|[.\-](?=[A-Za-z0-9])){3,}@(?:[A-Za-z0-9\-]+\.)+[A-Za-z0-9]{1,5}$/.test(v)) err="invalid";
else if(["gmail.com","yahoo.com","outlook.com","hotmail.com","aol.com","msn.com","ymail.com","comcast.net","live.com","protonmail.com"].includes(v.split("@")[1])) err="business";
else ok=true; break;
case"phone":
const norm=v.replace(/[^\d+]/g,""), digs=norm.replace(/\D/g,"");
if(!norm) err="required";
else if(digs.length<cfg.min) err="min";
else if(!/^(?!\+?(\d)\1+$)\+?\d{8,15}$/.test(norm)) err="invalid";
else ok=true; break;
case"title":
if(!v) err="required";
else if(v.length<cfg.min) err="min";
else if(!/^[A-Za-z\s\/\-]+$/.test(v)||/(.)\1{3,}/.test(v)) err="invalid";
else ok=true; break;
}
const ct=cfg.element.parentElement, nx=ct.nextElementSibling;
if(!ok){
if(!nx||!nx.classList.contains("error-message")){
const e=document.createElement("div");
e.className="error-message";
e.textContent=cfg.messages[err];
ct.insertAdjacentElement("afterend",e);
} else nx.textContent=cfg.messages[err];
} else if(nx&&nx.classList.contains("error-message")){
nx.remove();
}
return ok;
}
function validateSelect(sel){
const v=sel.value, ct=sel.parentElement, nx=ct.nextElementSibling;
const msg=(sel.getAttribute("errorlabel")||sel.name)+" is required.";
if(!v){
if(!nx||!nx.classList.contains("error-message")){
const e=document.createElement("div");
e.className="error-message";
e.textContent=msg;
ct.insertAdjacentElement("afterend",e);
} else nx.textContent=msg;
return false;
}
if(nx&&nx.classList.contains("error-message")) nx.remove();
return true;
}
function attachValidation(form){
Object.entries(VALIDATION_RULES).forEach(([n,c])=>{
const el=form.querySelector('[name="'+n+'"]');
if(el) el.addEventListener("blur",()=>validateField({ element:el, type:c.type, min:c.min, required:c.required, messages:c.messages }));
});
form.querySelectorAll("select[required]").forEach(sel=>{
sel.addEventListener("change",()=>validateSelect(sel));
sel.addEventListener("blur",()=>validateSelect(sel));
});
}

// --- DYNAMIC CONTACT US ---
function initContactUsDynamic(form){
const elq=form.querySelector('[name="elqFormName"]')?.value;
if(elq!=="website_cta_contactus") return;
const sub=form.querySelector('[name="subject"]');
if(!sub) return;
function attach(sel){ sel.addEventListener("change",()=>validateSelect(sel)); sel.addEventListener("blur",()=>validateSelect(sel)); }
function addF(){
const wrap=sub.closest(".form-input-wrap");
if(!form.querySelector("div[job-title-wrap]")){
wrap.insertAdjacentHTML("afterend",
                        '<div job-title-wrap class="form-input-wrap"><div class="form-input-inner-wrap">'+
                        '<select name="title" required class="input-relative" errorlabel="Job title">'+
                        '<option value="">Job title</option><option value="CXO/EVP">CXO/EVP</option><option value="SVP/VP">SVP/VP</option><option value="Director">Director</option><option value="Manager">Manager</option><option value="Individual Contributor">Individual Contributor</option><option value="Student">Student</option>'+
                        '</select></div></div>');
attach(form.querySelector('div[job-title-wrap] select[name="title"]'));
}
if(!form.querySelector("div[department-wrap]")){
form.querySelector("div[job-title-wrap]").insertAdjacentHTML("afterend",
                                                             '<div department-wrap class="form-input-wrap"><div class="form-input-inner-wrap">'+
                                                             '<select name="department" required class="input-relative" errorlabel="Department">'+
                                                             '<option value="">Department</option><option value="BI">BI</option><option value="Customer Service & Support">Customer Service & Support</option><option value="Engineering/Product Development">Engineering/Product Development</option><option value="Developer/Engineering">Developer/Engineering</option><option value="Human Resources">Human Resources</option><option value="IT">IT</option><option value="Marketing">Marketing</option><option value="Operations">Operations</option><option value="Sales">Sales</option><option value="Finance">Finance</option><option value="Other">Other</option>'+
                                                             '</select></div></div>');
attach(form.querySelector('div[department-wrap] select[name="department"]'));
}
}
function remF(){ form.querySelector("div[job-title-wrap]")?.remove(); form.querySelector("div[department-wrap]")?.remove(); }
function upd(){ sub.value==="Sales"?addF():remF(); }
sub.addEventListener("change",upd);
form.addEventListener("submit",upd);
upd();
}

// --- FALLBACK SUBMIT TO ELOQUA ---
function fallbackSubmitToEloqua(form, redirectParam = true){

console.log("📤 fallbackSubmitToEloqua called", {
_eloquaSubmissionSent,
formAlreadySubmitted: form._eloquaSubmitted
});

if (_eloquaSubmissionSent || form._eloquaSubmitted) return;
_eloquaSubmissionSent = true;
form._eloquaSubmitted = true;
const formName = form.querySelector('[name="elqFormName"]')?.value;
if(["website_cta_videodemorequest","website_cta_talktosales"].includes(formName)) setUInfoCookie(form);
pushFormDataToDataLayer(form);
pushFormSubmit(form);
pushDomoFormSubmit(form);

const submitBtn = form.querySelector('input[type="submit"]');
if(submitBtn){
submitBtn.dataset.origLabel = submitBtn.value;
submitBtn.value = "Submitting…";
submitBtn.disabled = true;
}

const data = new URLSearchParams(new FormData(form));
fetch(form.action, {
method:"POST",
headers:{"Content-Type":"application/x-www-form-urlencoded"},
body:data.toString()
}).then(r=>{
if(!r.ok) throw new Error(r.status);
const ri=form.querySelector('[name="contentURL1"]')?.value.trim(),
    wrapper=form.closest('.form-main-wrapper');
if(ri.toLowerCase()!=="noredirect" && /^https?:\/\//.test(ri) && redirectParam === true){
window.location.href = ri;
} else {
wrapper.querySelectorAll('[hide-on-submit]').forEach(el=>el.style.display='none');
wrapper.querySelectorAll('[show-on-submit]').forEach(el=>el.style.display='flex');
window.dataLayer=window.dataLayer||[];
window.dataLayer.push({ event:"form_success", form_id:form.id });
setGatedToken();
updateGatedContentVisibility();
}
}).catch(err=>console.error("[Form] Fallback error",err));
}

// --- SUBMIT HANDLER ---
async function handleSubmit(e){
e.preventDefault(); 
e.stopPropagation();
const form = e.target;
let ok = true;
Object.entries(VALIDATION_RULES).forEach(([n,c])=>{
const el=form.querySelector('[name="'+n+'"]');
if(c.required && el && !validateField({ element:el,type:c.type,min:c.min,required:c.required,messages:c.messages })) ok=false;
});
form.querySelectorAll("select[required]").forEach(sel=>{ if(!validateSelect(sel)) ok=false; });
if(!ok) return console.log("Please fix errors and try again.");

await populateAll(form);
await populateSubmissionFields(form);


const formName = form.querySelector('[name="elqFormName"]')?.value;
const country  = form.querySelector('[name="geoip_country_code"]')?.value;
const specialParam = new URLSearchParams(window.location.search).get("utm_campid")==="demo";
const shouldTriggerChili = formName==="website_cta_talktosales" && (country==="US"||specialParam);

if(shouldTriggerChili){
console.log("🔥 CP će presresti ovaj submit i otvoriti modal");
return;
}
fallbackSubmitToEloqua(form, true);

}

// --- INIT ---
function initForm(form){

populateAll(form);
populateSubmissionFields(form);

const emailInput = form.querySelector('input[name="email"]');
const companyInput = form.querySelector('input[name="company"]');
if (emailInput && companyInput) {
  emailInput.addEventListener("blur", () => {
    const emailVal = emailInput.value.trim();
    if(emailVal.includes("@")){
      companyInput.value = emailVal.split("@").pop();
    } else {
      companyInput.value = "";
    }
  });
}

ChiliPiper.deploy("domo-com", "talk-to-sales", {
formType:       "HTML",
fields: {
email:     "email",
firstName: "first_name",
lastName:  "last_name",
phone:     "phone",
title:     "title",
company:   "company",
domo_id: "domo_id",
sFDCCanadaEmailOptIn1: "sFDCCanadaEmailOptIn1",
sFDCCanadaEmailOptInOutDate1: "sFDCCanadaEmailOptInOutDate1",
geoip_country_code: "geoip_country_code",
formSubmit1: "formSubmit1",
gCLID1: "gCLID1",
uniqueFFID: "uniqueFFID",
marketingCloudID1: "marketingCloudID1",
utmquerystring1: "utmquerystring1",
pathName1: "pathName1",
rFCDMJunkReason1: "rFCDMJunkReason1",
language: "language",
originalUtmquerystring1: "originalUtmquerystring1",
utmCampaign1: "utmCampaign1",
utmCampid1: "utmCampid1",
utmGadposition1: "utmGadposition1",
utmGcreative1: "utmGcreative1",
utmGdevice1: "utmGdevice1",
utmGkeyword1: "utmGkeyword1",
utmGmatchtype1: "utmGmatchtype1",
utmGnetwork1: "utmGnetwork1",
utmGplacement1: "utmGplacement1",
utmGtarget1: "utmGtarget1",
utmMedium1: "utmMedium1",
utmOrgid1: "utmOrgid1",
utmSource1: "utmSource1",
g_id: "g_id"
},

onSuccess() {
console.log("✅ CP booking confirmed → Eloqua");
//fallbackSubmitToEloqua(form, false);
},
onError() {
console.log("⚠️ CP error → Eloqua fallback");
//fallbackSubmitToEloqua(form, false);
},
onClose() {
console.log("❌ CP closed → Eloqua fallback");
}
});

form.addEventListener("focusin",()=>{
if(!form._started){
pushDomoFormStart(form);
pushFormStart(form);
form._started=true;
}
});
form.addEventListener("submit",handleSubmit);
attachValidation(form);
initContactUsDynamic(form);
populateAll(form);
}
function init(){
document.querySelectorAll('form[eloquaform="true"]').forEach(initForm);
if(isGatedPage()){
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",updateGatedContentVisibility);
else updateGatedContentVisibility();
}
}
if(document.readyState!=="loading") init();
else document.addEventListener("DOMContentLoaded",init);

})();
