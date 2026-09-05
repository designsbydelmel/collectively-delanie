const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const backend = fs.readFileSync('Code.gs', 'utf8');
function scenario({writeFails=false,mailFails=false,photoFails=false}={}) {
  let writes=0;
  const context = vm.createContext({console, LockService:{getScriptLock:()=>({waitLock(){},hasLock:()=>true,releaseLock(){}})}, MailApp:{sendEmail(){if(mailFails)throw Error('mail');}}, ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})}});
  vm.runInContext(backend,context);
  Object.assign(context, {getOrderSheet_:()=>({}),writeOrderToFirstEmptyRow_:()=>{if(writeFails)throw Error('write');writes++;},formatLatestRow_:()=>{},sortOrdersByRequestedDate_:()=>{},sendNotification_:()=>{if(mailFails)throw Error('mail');},saveUploadedPhotosSafely_:()=>photoFails?'Photo upload failed. test':''});
  const result=context.doPost({parameter:{response_format:'json','Full Name':'Test','Phone Number':'2025550100','Email Address':'test@example.com','Project Description':'Test only','Requested Completion Date':'2026-10-01','Rush Order':'No'}});
  return {result,writes};
}
assert.equal(scenario().result.ok,true);
assert.equal(scenario({writeFails:true}).result.ok,false);
assert.equal(scenario({mailFails:true}).result.ok,true);
assert.equal(scenario({photoFails:true}).result.photoUploadFailed,true);
async function frontend(response,reject=false) {
 let handler;let destination='';const button={disabled:false,textContent:'Submit'};
 const form={dataset:{},action:'https://example.com',querySelectorAll:()=>[],querySelector:()=>button,addEventListener:(_,fn)=>handler=fn};
 const context=vm.createContext({URLSearchParams,Date,FileReader:class{},FormData:class{forEach(){}},document:{querySelector:()=>null,querySelectorAll:s=>s==='.custom-order-form'?[form]:[],getElementById:()=>null},window:{location:{set href(x){destination=x;}}},alert(){},fetch:async()=>{if(reject)throw Error('network');return response;}});
 vm.runInContext(fs.readFileSync('script.js','utf8'),context);
 await handler({preventDefault(){}});
 return {destination,button};
}
(async()=>{
 assert.equal((await frontend({ok:true,json:async()=>({ok:true})})).destination,'order-thank-you.html');
 for(const response of [{ok:false},{ok:true,json:async()=>({ok:false})},{ok:true,json:async()=>{throw Error('HTML');}}]) {
  const result=await frontend(response);assert.equal(result.destination,'');assert.equal(result.button.disabled,false);
 }
 assert.equal((await frontend(null,true)).destination,'');
 console.log('PASS: saved orders, write errors, notification errors, photo failures, confirmed redirects, server errors, invalid responses, and network failures.');
})();
