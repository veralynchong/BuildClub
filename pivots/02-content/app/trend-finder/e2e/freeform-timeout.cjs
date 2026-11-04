// Intentionally exceeds the runner timeout to exercise detached render cleanup.
const fs = require('node:fs')
const path = require('node:path')
const {spawn,execFileSync} = require('node:child_process')
const work = process.env.FREEFORM_WORK_DIR
const media = path.join(work,'timeout-media')
fs.mkdirSync(media)
execFileSync('ffmpeg',['-y','-loglevel','error','-f','lavfi','-i','testsrc2=size=720x1280:rate=30:duration=1','-c:v','libx264','-pix_fmt','yuv420p',path.join(media,'a.mp4')])
const project = {fps:30,width:1080,height:1920,clips:Array.from({length:100},(_,i)=>({id:'c'+i,source:{kind:'generation',id:'a'},in:0,out:1,volume:1,muted:false})),texts:[],captions:{enabled:false},music:null,voiceover:[],primaries:{},showLogo:false}
const job = path.join(work,'timeout-job.json')
fs.writeFileSync(job,JSON.stringify({input:{project,urls:{'generation:a':'a.mp4'},lines:{},musicUrl:null,voice:[],brand:{font:'Noto Sans TC',color:'#22c55e',logoUrl:null},fontUrl:''},mediaDir:media,out:path.join(work,'timeout.mp4'),cacheDir:path.join(process.env.REMOTION_APP_DIR,'.remotion-bundle')}))
const child = spawn(process.execPath,[path.join(process.env.REMOTION_APP_DIR,'render/render-reel.mjs'),job],{detached:true,stdio:'ignore'})
fs.writeFileSync(path.join(process.env.FREEFORM_EVIDENCE_DIR,'detached-render-pid.json'),JSON.stringify({pid:child.pid}))
console.log('START detached real renderer',child.pid)
setInterval(()=>{},1000)
