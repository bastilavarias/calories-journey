import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const files={'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/app.mjs':'app.mjs','/FOOD_TRACKER.md':'FOOD_TRACKER.md'};
const server=createServer(async(req,res)=>{const file=files[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404).end();return;}try{const body=await readFile(new URL(file,import.meta.url));res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.mjs')?'text/javascript':'text/plain'}).end(body);}catch{res.writeHead(500).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=process.env.TEST_URL||'http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const viewport of [{width:1440,height:900},{width:768,height:1024},{width:390,height:844},{width:320,height:700}]){
  const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?day=2026-11-24');await page.locator('#dashboard').waitFor({state:'visible'});
  assert.equal(await page.locator('#kcal').textContent(),'2,025');assert.equal(await page.locator('#remaining-number').textContent(),'125');assert.equal(await page.locator('#protein').textContent(),'136 g');
  assert.equal(await page.locator('#weight').textContent(),'Not recorded');assert.equal(await page.locator('#accountability').count(),0);
  assert.equal(await page.locator('#meals tr').count(),8);
  await page.locator('#prev-day').click();assert.equal(await page.locator('#kcal').textContent(),'1,865');assert.equal(await page.locator('#remaining-number').textContent(),'35');
  await page.locator('#next-day').click();assert.equal(await page.locator('#kcal').textContent(),'2,025');
  await page.locator('#history a[data-date="2026-11-23"]').click();assert.equal(await page.locator('#kcal').textContent(),'1,865');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);console.log('PASS',viewport.width,'px: both days, navigation, ledger, no page errors or horizontal overflow');await page.close();
 }
 const page=await browser.newPage();let fail=true;
 await page.route('**/FOOD_TRACKER.md',async route=>{if(fail){fail=false;await route.fulfill({status:503,body:'temporary error'});}else await route.continue();});
 await page.goto(base);await page.locator('#retry').waitFor({state:'visible'});await page.locator('#retry').click();await page.locator('#dashboard').waitFor({state:'visible'});console.log('PASS retry after failed fetch');await page.close();
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
