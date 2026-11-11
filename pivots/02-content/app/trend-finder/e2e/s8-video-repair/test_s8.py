"""All writes are temporary; HTTP/key callbacks are fake; no live generation."""
import base64
import copy
import fcntl
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import unittest
from s8_video import PLAN, PINS, SEED, HAILUO, SingleEngine, ProviderTransport, bootstrap, prove_parents, export_result, sha, digest, encoded, Blocked

PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWioAAAAASUVORK5CYII=')


class Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.video=subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-f','lavfi','-i','color=c=blue:s=16x16:d=6','-c:v','libx264','-movflags','frag_keyframe+empty_moov','-f','mp4','pipe:1'],check=True,capture_output=True).stdout
        cls.source_video=subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-f','lavfi','-i','testsrc2=s=64x64:r=24:d=6','-c:v','libx264','-movflags','frag_keyframe+empty_moov','-f','mp4','pipe:1'],check=True,capture_output=True).stdout
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'source.mp4';path.write_bytes(cls.source_video)
            cls.frame=subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-i',str(path),'-vf','select=eq(n\\,48)','-fps_mode','passthrough','-frames:v','1','-c:v','png','-f','image2pipe','pipe:1'],check=True,capture_output=True).stdout
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();root=Path(self.tmp.name).resolve();self.p=copy.deepcopy(PLAN);self.pins=copy.deepcopy(PINS)
        self.p['newState']=str(root/'child');parents=[]
        for index in range(3):
            state=root/('original','images','s2-video')[index];(state/'engine/media').mkdir(parents=True);(state/'engine/runtime.lock').write_bytes(b'')
            frozen={'shots':[dict(shotId='s3',imagePrompt='pure text S3 fixture',imageInputs=[],videoPrompt='egg enters tofu fixture')]}
            frozen_bytes=encoded(frozen);freeze='plan.json' if index==2 else 'frozen-plan.json';(state/freeze).write_bytes(frozen_bytes)
            shots=([('image','s'+str(i)) for i in range(1,22)]+[('video','s'+str(i)) for i in range(1,11)]) if index==0 else [('image',s) for s in ('s2','s13','s16')] if index==1 else [('video','s2')]
            rows=[dict(asset=digest([index,kind,shot]),fingerprint=digest([index,kind,shot]),providerRequestId='fixture-parent-'+str(index)+'-'+kind+'-'+shot,kind=kind,shot=shot,provider='fal',model=SEED if kind=='image' else HAILUO,state='done',offlineSimulation=False,reservationUsd='0.04' if kind=='image' else '0.20',actualUsd=None) for kind,shot in shots]
            d=dict(mode='live',caps={'fal':'4.00','openrouter':'3.00'},halted=index==0,requests=rows,assets={},reserved={'fal':('2.84','0.12','0.20')[index],'openrouter':'0.00'})
            parent=dict(state=str(state),ledgerSha256='',frozenFile=freeze,frozenPlanSha256=sha(frozen_bytes),requests=rows,reserved=d['reserved'],mustRemainHalted=index==0)
            parents.append((parent,d))
        state=Path(parents[0][0]['state']);frozen=json.loads((state/'frozen-plan.json').read_bytes());f=frozen['shots'][0]
        ibody=dict(model=SEED,prompt=f['imagePrompt'],num_images=1,max_images=1,image_size='portrait_16_9',enable_safety_checker=True)
        ia=digest(['fal','image',ibody]);irid='fixture-source-text-s3';igid='fixture-source-image-s3';inode='fixture-image-node-s3'
        norm=dict(operation='unchanged',rawSha256=sha(PNG),outputSha256=sha(PNG),providerRequestId=irid,rawPath='provider-originals/'+ia+'.bin')
        ir=dict(asset=ia,fingerprint=ia,providerRequestId=irid,providerReceipt=dict(providerRequestId=irid,model=SEED),kind='image',shot='s3',model=SEED,provider='fal',state='done',offlineSimulation=False,textOnly=True,imageInput=None,outputSha256=sha(PNG),reservationUsd='0.04',actualUsd=None,normalization=norm)
        va_body=dict(model=HAILUO,prompt=f['videoPrompt'],firstImage=ia,duration='6',prompt_optimizer=False,enable_safety_checker=True)
        va=digest(['fal','video',va_body]);vrid='fixture-source-video-s3';vgid='fixture-source-video-gen-s3';vnode='fixture-video-node-s3'
        vr=dict(asset=va,fingerprint=va,providerRequestId=vrid,providerReceipt=dict(providerRequestId=vrid,model=HAILUO),kind='video',shot='s3',model=HAILUO,provider='fal',state='done',offlineSimulation=False,textOnly=False,imageInput=dict(asset=ia,sha256=sha(PNG),parentRequestId=irid),outputSha256=sha(self.source_video),reservationUsd='0.20',actualUsd=None)
        d=parents[0][1]
        for row in (ir,vr):
            at=next(i for i,r in enumerate(d['requests']) if r['kind']==row['kind'] and r['shot']=='s3');d['requests'][at]=row
            d['assets'][row['asset']]=dict(kind=row['kind'],shot='s3',model=row['model'],textOnly=row['textOnly'],offlineSimulation=False,providerRequestId=row['providerRequestId'],requestFingerprint=row['asset'],sha256=row['outputSha256'],path='media/'+row['asset']+('.png' if row['kind']=='image' else '.mp4'),**({'normalization':norm} if row['kind']=='image' else {}))
        (state/'engine/media'/(ia+'.png')).write_bytes(PNG);(state/'engine/media'/(va+'.mp4')).write_bytes(self.source_video)
        (state/'engine/provider-originals').mkdir();(state/'engine/provider-originals'/(ia+'.bin')).write_bytes(PNG)
        scope=digest([frozen,str(state/'engine'),str(state/'media')]);nodes=[]
        with sqlite3.connect(state/'data.db') as conn:
            for kind,gid,nid,asset,body,inputs in [('image',igid,inode,ia,ibody,dict(prompt=f['imagePrompt'],sentPrompt=f['imagePrompt'],references=[],kitStamp={},count=1,aspectRatio='9:16',duration=None,startFrame=None)),('video',vgid,vnode,va,va_body,dict(prompt=f['videoPrompt'],sentPrompt=f['videoPrompt'],references=[],kitStamp={},count=1,aspectRatio='9:16',duration=6,startFrame=igid))]:
                alias='seedream-4.5' if kind=='image' else 'hailuo-2.3-fast';ext='.png' if kind=='image' else '.mp4';data=PNG if kind=='image' else self.source_video
                g=dict(id=gid,idea_id='fixture-own-round',node_id=nid,kind=kind,model=alias,inputs=json.dumps(inputs),status='done',file=gid+ext,source_url=None,provider_request_id=asset)
                b=dict(gid=gid,node_id=nid,shot='s3',kind=kind,model=alias,asset=asset,outputHash=sha(data),inputHash=digest(body),identityHash=digest([g['idea_id'],nid,kind,alias,inputs,'s3']),scope=scope)
                self.pins[kind+'_generationsSha256']=digest(g);self.pins[kind+'_batch_bindingsSha256']=digest(b)
                for table,row in [('generations',g),('batch_bindings',b)]:
                    conn.execute('CREATE TABLE IF NOT EXISTS '+table+' ('+','.join('"'+k+'" TEXT' for k in row)+')');conn.execute('INSERT INTO '+table+' VALUES ('+','.join('?' for _ in row)+')',list(row.values()))
                native=state/'media'/g['idea_id']/'gen';native.mkdir(parents=True,exist_ok=True);(native/g['file']).write_bytes(data)
                nodes.append(dict(id=nid,shotId='s3',data=dict(selected=gid)))
            conn.execute('CREATE TABLE canvases (idea_id TEXT, doc TEXT)');conn.execute('INSERT INTO canvases VALUES (?,?)',('fixture-own-round',json.dumps(dict(nodes=nodes))))
        self.p['parentLedgers']=[x[0] for x in parents];self.parent_bytes=[]
        for parent,d in parents:
            raw=encoded(d);parent['ledgerSha256']=sha(raw);(Path(parent['state'])/'engine/runtime-ledger.json').write_bytes(raw);self.parent_bytes.append(raw)
        frame_path=root/'derived/frame.png';frame_path.parent.mkdir();frame_path.write_bytes(self.frame)
        ref=digest(['derived-own-ai-video-frame',sha(self.source_video),48,sha(self.frame)])
        source=self.p['source'];source.update(state=str(state),asset=ref,path=str(frame_path),sha256=sha(self.frame),providerRequestId=vrid,nativeGenerationId=vgid,videoAsset=va,videoPath=str(state/'engine/media'/(va+'.mp4')),videoSha256=sha(self.source_video),ancestorImageAsset=ia,ancestorImageRequestId=irid,ancestorImageSha256=sha(PNG),ancestorImageGenerationId=igid)
        frame_lineage=dict(originalLedgerSha256=self.p['parentLedgers'][0]['ledgerSha256'],sourceVideoSha256=source['videoSha256'],frameSha256=source['sha256'],sourceVideoGenerationId=vgid,sourceVideoRequestId=vrid,sourceVideoPath=source['videoPath'],framePath=source['path'],frameIndex=48,nativeFps='24/1',nominalTimeSeconds=2,separatelyPaidImageGeneration=False,paidRequestsForExtraction=0,ancestorTextOnlyImageAsset=ia,ancestorImageRequestId=irid,ancestorImageSha256=sha(PNG))
        lineage=root/'derived/lineage.json';lineage.write_bytes(encoded(frame_lineage));source.update(lineagePath=str(lineage),lineageSha256=sha(lineage.read_bytes()))
        self.posts=0;self.http_calls=[];self.unknown=False
        def http(method,url,headers,blob):
            self.http_calls.append((method,url))
            for parent in self.p['parentLedgers']:
                fd=os.open(Path(parent['state'])/'engine/runtime.lock',os.O_RDONLY)
                try:fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
                finally:os.close(fd)
            if method=='POST':
                self.posts+=1;self.assertEqual(self.posts,1);payload=json.loads(blob)
                self.assertEqual(base64.b64decode(payload['image_url'].split(',')[1]),self.frame);self.assertEqual(payload['duration'],'6');self.assertFalse(payload['prompt_optimizer'])
                return 200,{},json.dumps(dict(request_id='fixture-video-1',status_url='https://queue.fal.run/fal-ai/minimax/requests/fixture-video-1/status',response_url='https://queue.fal.run/fal-ai/minimax/requests/fixture-video-1')).encode()
            if url.endswith('/status'):return 200,{},json.dumps(dict(status='IN_PROGRESS' if self.unknown else 'COMPLETED')).encode()
            if url.endswith('/fixture-video-1'):return 200,{},b'{"video":{"url":"https://v3.fal.media/fixture.mp4"}}'
            self.assertEqual(url,'https://v3.fal.media/fixture.mp4');return 200,{},self.video
        self.transport=ProviderTransport(http=http,key=lambda name:'fake-only-not-inherited',sleep=lambda _:None,poll_limit=1)
        bootstrap(self.p,self.pins);self.e=SingleEngine(Path(self.p['newState'])/'engine',self.transport,proposal=self.p,pins=self.pins)
    def tearDown(self):
        for parent,raw in zip(self.p['parentLedgers'],self.parent_bytes):self.assertEqual((Path(parent['state'])/'engine/runtime-ledger.json').read_bytes(),raw)
        self.tmp.cleanup()
    def run_video(self):return self.e.run('fal','video','s8',self.e.body())
    def test_one_post_raw_mp4_funding_and_nonbilled_reference(self):
        before=self.e.read();self.assertEqual(len(before['requests']),0);self.assertEqual(len(before['assets']),1)
        self.assertTrue(before['assets'][self.p['source']['asset']]['nonBilledParentReference'])
        asset=self.run_video();d=self.e.read();self.assertEqual(len(d['requests']),1);self.assertEqual(d['reserved']['fal'],'0.20');self.assertEqual(d['requests'][0]['actualUsd'],None)
        self.assertEqual(d['funding'][0]['combinedFalReservation'],'3.36');self.assertEqual(d['funding'][0]['combinedHailuo'],12)
        self.assertEqual((self.e.root/d['assets'][asset]['path']).read_bytes(),self.video)
        report=export_result(self.e,False);self.assertEqual(report['sha256'],sha(self.video));self.assertEqual(report['fullDecode'],'PASS')
        self.assertTrue(export_result(self.e,True)['reused']);self.assertTrue(export_result(self.e,True)['reused']);self.assertEqual(self.posts,1)
        with self.assertRaises(Blocked):self.run_video()
        self.assertEqual(self.posts,1)
    def test_unknown_preserves_reservation_and_never_reposts(self):
        self.unknown=True
        with self.assertRaises(Blocked):self.run_video()
        d=self.e.read();self.assertTrue(d['halted']);self.assertEqual(d['requests'][0]['state'],'unknown');self.assertEqual(d['requests'][0]['providerRequestId'],'fixture-video-1');self.assertEqual(d['reserved']['fal'],'0.20')
        with self.assertRaises(Blocked):self.run_video()
        self.assertEqual(self.posts,1)
    def test_no_other_provider_kind_shot_model_duration_prompt_or_source(self):
        for provider,kind,shot,patch in [('openrouter','video','s8',{}),('fal','image','s8',{}),('fal','video','s4',{}),('fal','video','s8',{'duration':'10'}),('fal','video','s8',{'prompt':'foreign'}),('fal','video','s8',{'model':'veo'}),('fal','video','s8',{'firstImage':'old-source'})]:
            with self.assertRaises(ValueError):self.e.run(provider,kind,shot,{**self.e.body(),**patch})
        self.assertEqual(self.posts,0)
    def test_foreign_state_tamper_and_active_parent_fail_before_post(self):
        with self.assertRaises((ValueError,FileNotFoundError)):SingleEngine(Path(self.p['parentLedgers'][0]['state'])/'engine',self.transport,proposal=self.p,pins=self.pins)
        parent=self.p['parentLedgers'][0];path=Path(parent['state'])/'engine/runtime-ledger.json';original=path.read_bytes();path.write_bytes(original+b' ')
        try:
            with self.assertRaises(ValueError):self.run_video()
        finally:path.write_bytes(original)
        fd=os.open(Path(parent['state'])/'engine/runtime.lock',os.O_RDONLY)
        try:
            fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError):self.run_video()
        finally:os.close(fd)
        self.assertEqual(self.posts,0)
    def test_source_bytes_and_native_lineage_changes_reject(self):
        path=Path(self.p['source']['path']);raw=path.read_bytes();path.write_bytes(b'old reel frame')
        try:
            with self.assertRaises(ValueError):self.run_video()
        finally:path.write_bytes(raw)
        state=Path(self.p['source']['state'])
        with sqlite3.connect(state/'data.db') as conn:conn.execute("UPDATE generations SET source_url='https://old.example/frame' WHERE kind='image'")
        with self.assertRaises(ValueError):prove_parents(self.p,self.pins)
        self.assertEqual(self.posts,0)
    def test_frame_index_video_and_ancestry_are_semantic_boundaries(self):
        for delta in [{'frameIndex':49},{'nativeFps':'25/1'},{'nominalTimeSeconds':1},{'separatelyPaidImageGeneration':True}]:
            altered=copy.deepcopy(self.p);altered['source'].update(delta)
            with self.assertRaises(ValueError):prove_parents(altered,self.pins)
        source=self.p['source'];mp4=Path(source['videoPath']);original=mp4.read_bytes();mp4.write_bytes(self.video)
        try:
            with self.assertRaises(ValueError):prove_parents(self.p,self.pins)
        finally:mp4.write_bytes(original)
        parent=self.p['parentLedgers'][0];path=Path(parent['state'])/'engine/runtime-ledger.json';original=path.read_bytes()
        for delta in [{'textOnly':False},{'offlineSimulation':True},{'imageInput':{'asset':'old-frame'}}]:
            changed=copy.deepcopy(self.p);d=json.loads(original);r=next(r for r in d['requests'] if r['asset']==source['ancestorImageAsset']);r.update(delta)
            raw=encoded(d);path.write_bytes(raw);changed['parentLedgers'][0]['ledgerSha256']=sha(raw);changed['parentLedgers'][0]['requests']=d['requests']
            lineage_path=Path(source['lineagePath']);lineage_original=lineage_path.read_bytes();l=json.loads(lineage_original);l['originalLedgerSha256']=sha(raw);lineage_path.write_bytes(encoded(l));changed['source']['lineageSha256']=sha(lineage_path.read_bytes())
            try:
                with self.assertRaises(ValueError):prove_parents(changed,self.pins)
            finally:path.write_bytes(original);lineage_path.write_bytes(lineage_original)
        self.assertEqual(self.posts,0)
    def test_aggregate_price_quantity_and_no_reset(self):
        with self.e.lock():
            self.e._proof['parentReservation']='3.99'
            with self.assertRaises(ValueError):self.e._reservation(self.e.read(),'fal','video')
        self.assertEqual(self.posts,0)
        with self.e.lock():
            self.e._proof['counts']['hailuo']=15
            with self.assertRaises(ValueError):self.e._reservation(self.e.read(),'fal','video')
        self.run_video()
        with self.e.lock():
            d=self.e.read();d['requests']=[];d['funding']=[];d['reserved']['fal']='0.00'
            with self.assertRaises(ValueError):self.e.write(d)
        self.assertEqual(self.posts,1)


if __name__=='__main__':unittest.main(verbosity=2)
