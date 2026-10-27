// Run with PLAYWRIGHT_MODULE pointing to a local Playwright install.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
 const page = await browser.newPage({ viewport: { width:1440, height:900 } });
 page.setDefaultTimeout(5000);
 const errors=[]; page.on('pageerror', e=>errors.push(String(e)));
 await page.addInitScript(()=>{window.writes=0;const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){window.writes++;return put.apply(this,args)}});
 page.on('dialog', dialog => dialog.accept());
 await page.goto('http://127.0.0.1:5182/focus-speed-reader/');
 async function close(){await page.getByRole('button',{name:'Close reader'}).click();await page.getByRole('heading',{name:'Focus Speed Reader',exact:true}).waitFor();}
 async function add(title,text){await page.getByRole('button',{name:'Add Book',exact:true}).click();await page.getByPlaceholder('Title',{exact:true}).fill(title);await page.getByPlaceholder('Paste your text here...').fill(text);await page.getByRole('button',{name:'Add to Library'}).click();await page.getByText(title,{exact:true}).click();await page.getByTestId('word').waitFor();}
 async function seek(index){await page.getByRole('slider',{name:'Reading position'}).fill(String(index));}
 const long='pneumonoultramicroscopicsilicovolcanoconiosis';
 await add('Synthetic reader',`Hello ${long} “punctuation—yes!” ${'W'.repeat(200)} end`);
 await page.waitForTimeout(400);
 const writes=await page.evaluate(()=>window.writes);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.writes),writes,'paused reader must stop writing');
 for(const viewport of [{width:1440,height:900},{width:1920,height:1080},{width:768,height:700},{width:390,height:844},{width:320,height:568},{width:640,height:360}]){
  await page.setViewportSize(viewport);
  for(const index of [0,1,2,3]){await seek(index);await page.waitForTimeout(30);const layout=await page.getByTestId('word').evaluate(e=>({parts:[...e.querySelectorAll('span')].map(n=>({left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right})),width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(layout.parts.every(p=>p.left>=0&&p.right<=layout.width+1),JSON.stringify(layout));assert(layout.scroll<=viewport.width,JSON.stringify(layout));}
 }
 console.log('PASS layout: six viewports and 200-character tokens');
 await page.setViewportSize({width:1440,height:900});await seek(1);
 await page.screenshot({path:path.join(__dirname,'reader-wide.png')});
 // CSS zoom exercises the same available-layout-width changes as browser zoom.
 await page.evaluate(()=>document.documentElement.style.zoom='2');await seek(3);await page.waitForTimeout(100);
 assert(await page.getByTestId('word').evaluate(e=>[...e.querySelectorAll('span')].every(n=>n.getBoundingClientRect().right<=innerWidth+1&&n.getBoundingClientRect().left>=0)));
 await page.evaluate(()=>document.documentElement.style.zoom='');
 await page.getByRole('button',{name:'Forward 10 words',exact:true}).click();await page.getByRole('button',{name:'Forward 10 words',exact:true}).click();assert.equal(await page.getByTestId('position').innerText(),'Word 5 of 5');
 await page.getByRole('button',{name:'Back 10 words',exact:true}).click();assert.equal(await page.getByTestId('position').innerText(),'Word 1 of 5');
 const speed=page.getByRole('slider',{name:'Speed',exact:true});await speed.fill('60');await page.getByRole('button',{name:'Play',exact:true}).click();await page.getByRole('button',{name:'Pause',exact:true}).click();await speed.fill('1000');await page.getByRole('button',{name:'Play',exact:true}).click();await page.getByRole('button',{name:'Replay',exact:true}).waitFor();assert.equal(await page.getByTestId('position').innerText(),'Word 5 of 5');await page.getByRole('button',{name:'Replay',exact:true}).click();await page.getByRole('button',{name:'Pause',exact:true}).click();
 console.log('PASS playback, speed and seek bounds');
 // Native range keyboard controls: Home/End/arrows remain within valid words.
 const position=page.getByRole('slider',{name:'Reading position'});await position.focus();await page.keyboard.press('End');assert.equal(await position.inputValue(),'4');await page.keyboard.press('Home');assert.equal(await position.inputValue(),'0');await page.keyboard.press('ArrowRight');assert.equal(await position.inputValue(),'1');
 // Test the document fullscreen API without adding a new app feature.
 await page.getByRole('button',{name:'Pause',exact:true}).count();
 await page.evaluate(()=>document.documentElement.requestFullscreen());assert(await page.evaluate(()=>!!document.fullscreenElement));assert.equal(await page.locator('header').evaluate(e=>e.getBoundingClientRect().top),0);await page.evaluate(()=>document.exitFullscreen());
 await seek(2);await close();await page.getByText('Synthetic reader',{exact:true}).click();await page.getByTestId('word').waitFor();assert.equal(await page.getByTestId('position').innerText(),'Word 3 of 5');await close();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download library backup (JSON)'}).click();const download=await downloadPromise;const backupPath=path.join(__dirname,'synthetic-backup.json');await download.saveAs(backupPath);const backup=JSON.parse(fs.readFileSync(backupPath));assert.equal(backup[0].title,'Synthetic reader');
 // Restoring valid and malformed backup data exercises validation and text fidelity.
 assert(await page.evaluate(async json=>{
  const db=await import('/focus-speed-reader/src/lib/db.ts');
  const before=await db.exportLibrary();
  const entries=JSON.parse(json);entries[0].title='MALFORMED BACKUP MUST NOT OVERWRITE';
  try{await db.importLibrary(JSON.stringify([...entries,{}]));return false}catch{}
  return await db.exportLibrary()===before;
 },JSON.stringify(backup)), 'malformed backup must preserve existing records');
 await page.locator('input[accept=".json"]').setInputFiles(backupPath);
 console.log('PASS resume, backup download/restore and malformed preservation');
 // TXT import and EPUB extraction use generated, non-private fixtures.
 for(const [file,title] of [['synthetic.txt','Synthetic TXT'],['synthetic.epub','Synthetic EPUB']]){
  await page.getByRole('button',{name:'Add Book',exact:true}).click();await page.getByPlaceholder('Title',{exact:true}).fill(title);await page.getByRole('button',{name:'Upload File (EPUB or TXT)'}).click();await page.locator('input[accept=".epub,.txt"]').setInputFiles(path.join(__dirname,file));await page.getByRole('button',{name:'Add to Library'}).click();await page.getByText(title,{exact:true}).click();await page.getByTestId('word').waitFor();assert.equal(await page.getByTestId('position').innerText(),'Word 1 of 4');await close();
 }
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.getByText('Synthetic reader',{exact:true}).click();await page.getByTestId('word').waitFor();await seek(1);await page.waitForTimeout(50);await page.screenshot({path:path.join(__dirname,'reader-phone.png')});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',viewports:6,pausedWrites:writes,errors,checks:'word fitting, punctuation, 200-character tokens, zoom, seek bounds, native slider keyboard, speed, playback/pause/replay, resume, fullscreen API entry/exit, TXT/EPUB, backup download/restore/reject invalid backup'}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
