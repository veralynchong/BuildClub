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
from s2_video import PLAN, PINS, SEED, HAILUO, SingleEngine, ProviderTransport, bootstrap, prove_parents, export_result, sha, digest, encoded, Blocked

PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWioAAAAASUVORK5CYII=')


class Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.video=subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-f','lavfi','-i','color=c=blue:s=16x16:d=6','-c:v','libx264','-movflags','frag_keyframe+empty_moov','-f','mp4','pipe:1'],check=True,capture_output=True).stdout
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();root=Path(self.tmp.name).resolve();self.p=copy.deepcopy(PLAN);self.pins=copy.deepcopy(PINS)
        self.p['newState']=str(root/'child');parents=[]
        for index in range(2):
            state=root/('original' if index==0 else 'images');(state/'engine/media').mkdir(parents=True);(state/'engine/runtime.lock').write_bytes(b'')
            frozen={'shots':[dict(shotId='s2',imagePrompt='text only new tofu fixture',imageInputs=[])]};frozen_bytes=encoded(frozen)
            (state/'frozen-plan.json').write_bytes(frozen_bytes)
            rows=[]
            shots=[('image','s'+str(i)) for i in range(1,22)]+[('video','s'+str(i)) for i in range(1,11)] if index==0 else [('image',s) for s in ('s2','s13','s16')]
            for kind,shot in shots:
                aid=digest([index,kind,shot]);rid='fixture-parent-'+str(index)+'-'+kind+'-'+shot
                rows.append(dict(asset=aid,fingerprint=aid,providerRequestId=rid,kind=kind,shot=shot,provider='fal',model=SEED if kind=='image' else HAILUO,state='done',offlineSimulation=False,reservationUsd='0.04' if kind=='image' else '0.20',actualUsd=None))
            d=dict(mode='live',caps={'fal':'4.00','openrouter':'3.00'},halted=index==0,requests=rows,assets={},reserved={'fal':'2.84' if index==0 else '0.12','openrouter':'0.00'})
            parent=dict(state=str(state),ledgerSha256='',frozenPlanSha256=sha(frozen_bytes),requests=rows,reserved=d['reserved'],mustRemainHalted=index==0)
            parents.append((parent,d))
        state=Path(parents[1][0]['state']);body=dict(model=SEED,prompt='text only new tofu fixture',num_images=1,max_images=1,image_size='portrait_16_9',enable_safety_checker=True)
        aid=digest(['fal','image',body]);rid='fixture-new-text-s2';gid='fixture-gid-s2';node='fixture-node-s2'
        norm=dict(operation='unchanged',rawSha256=sha(PNG),outputSha256=sha(PNG),providerRequestId=rid,rawPath='provider-originals/'+aid+'.bin')
        r=dict(asset=aid,fingerprint=aid,providerRequestId=rid,providerReceipt=dict(providerRequestId=rid,model=SEED),kind='image',shot='s2',model=SEED,provider='fal',state='done',offlineSimulation=False,textOnly=True,imageInput=None,outputSha256=sha(PNG),reservationUsd='0.04',actualUsd=None,normalization=norm)
        parents[1][1]['requests'][0]=r
        a=dict(kind='image',shot='s2',model=SEED,textOnly=True,offlineSimulation=False,providerRequestId=rid,requestFingerprint=aid,sha256=sha(PNG),path='media/'+aid+'.png',normalization=norm)
        parents[1][1]['assets'][aid]=a
        (state/'engine/media'/(aid+'.png')).write_bytes(PNG);(state/'engine/provider-originals').mkdir();(state/'engine/provider-originals'/(aid+'.bin')).write_bytes(PNG)
        self.p['source'].update(state=str(state),asset=aid,path=str(state/'engine/media'/(aid+'.png')),sha256=sha(PNG),providerRequestId=rid,nativeGenerationId=gid)
        inputs=dict(prompt=body['prompt'],sentPrompt=body['prompt'],references=[],kitStamp={},count=1,aspectRatio='9:16',duration=None,startFrame=None)
        g=dict(id=gid,idea_id='fixture-own-repair',node_id=node,kind='image',model='seedream-4.5',inputs=json.dumps(inputs),status='done',file=gid+'.png',source_url=None,provider_request_id=aid)
        frozen=json.loads((state/'frozen-plan.json').read_bytes())
        b=dict(gid=gid,node_id=node,shot='s2',kind='image',model='seedream-4.5',asset=aid,outputHash=sha(PNG),inputHash=digest(body),identityHash=digest([g['idea_id'],node,'image','seedream-4.5',inputs,'s2']),scope=digest([frozen,str(state/'engine'),str(state/'media')]))
        self.pins['generationsSha256']=digest(g);self.pins['batch_bindingsSha256']=digest(b)
        with sqlite3.connect(state/'data.db') as conn:
            for table,row in [('generations',g),('batch_bindings',b)]:
                conn.execute('CREATE TABLE '+table+' ('+','.join('"'+k+'" TEXT' for k in row)+')')
                conn.execute('INSERT INTO '+table+' VALUES ('+','.join('?' for _ in row)+')',list(row.values()))
            conn.execute('CREATE TABLE canvases (idea_id TEXT, doc TEXT)');conn.execute('INSERT INTO canvases VALUES (?,?)',(g['idea_id'],json.dumps(dict(nodes=[dict(id=node,shotId='s2',data=dict(selected=gid))]))))
        native=state/'media'/g['idea_id']/'gen';native.mkdir(parents=True);(native/g['file']).write_bytes(PNG)
        self.p['parentLedgers']=[x[0] for x in parents]
        self.parent_bytes=[]
        for parent,d in parents:
            raw=encoded(d);parent['ledgerSha256']=sha(raw);(Path(parent['state'])/'engine/runtime-ledger.json').write_bytes(raw);self.parent_bytes.append(raw)
        self.posts=0;self.http_calls=[];self.unknown=False
        def http(method,url,headers,blob):
            self.http_calls.append((method,url))
            for parent in self.p['parentLedgers']:
                fd=os.open(Path(parent['state'])/'engine/runtime.lock',os.O_RDONLY)
                try: fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
                finally: os.close(fd)
            if method=='POST':
                self.posts+=1;self.assertEqual(self.posts,1);payload=json.loads(blob)
                self.assertEqual(base64.b64decode(payload['image_url'].split(',')[1]),PNG);self.assertEqual(payload['duration'],'6');self.assertFalse(payload['prompt_optimizer'])
                return 200,{},json.dumps(dict(request_id='fixture-video-1',status_url='https://queue.fal.run/fal-ai/minimax/requests/fixture-video-1/status',response_url='https://queue.fal.run/fal-ai/minimax/requests/fixture-video-1')).encode()
            if url.endswith('/status'):return 200,{},json.dumps(dict(status='IN_PROGRESS' if self.unknown else 'COMPLETED')).encode()
            if url.endswith('/fixture-video-1'):return 200,{},b'{"video":{"url":"https://v3.fal.media/fixture.mp4"}}'
            self.assertEqual(url,'https://v3.fal.media/fixture.mp4');return 200,{},self.video
        self.transport=ProviderTransport(http=http,key=lambda name:'fake-only-not-inherited',sleep=lambda _:None,poll_limit=1)
        bootstrap(self.p,self.pins)
        self.e=SingleEngine(Path(self.p['newState'])/'engine',self.transport,proposal=self.p,pins=self.pins)
    def tearDown(self):
        for parent,raw in zip(self.p['parentLedgers'],self.parent_bytes):self.assertEqual((Path(parent['state'])/'engine/runtime-ledger.json').read_bytes(),raw)
        self.tmp.cleanup()
    def run_video(self):return self.e.run('fal','video','s2',self.e.body())
    def test_one_post_raw_mp4_funding_and_nonbilled_reference(self):
        before=self.e.read();self.assertEqual(len(before['requests']),0);self.assertEqual(len(before['assets']),1)
        self.assertTrue(before['assets'][self.p['source']['asset']]['nonBilledParentReference'])
        asset=self.run_video();d=self.e.read();self.assertEqual(len(d['requests']),1);self.assertEqual(d['reserved']['fal'],'0.20');self.assertEqual(d['requests'][0]['actualUsd'],None)
        self.assertEqual(d['funding'][0]['combinedFalReservation'],'3.16');self.assertEqual(d['funding'][0]['combinedHailuo'],11)
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
        for provider,kind,shot,patch in [('openrouter','video','s2',{}),('fal','image','s2',{}),('fal','video','s4',{}),('fal','video','s2',{'duration':'10'}),('fal','video','s2',{'prompt':'foreign'}),('fal','video','s2',{'model':'veo'}),('fal','video','s2',{'firstImage':'old-source'})]:
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
        path=Path(self.p['source']['path']);raw=path.read_bytes();path.write_bytes(b'old source frame')
        try:
            with self.assertRaises(ValueError):self.run_video()
        finally:path.write_bytes(raw)
        state=Path(self.p['source']['state'])
        with sqlite3.connect(state/'data.db') as conn:conn.execute("UPDATE generations SET source_url='https://old.example/frame'")
        with self.assertRaises(ValueError):prove_parents(self.p,self.pins)
        self.assertEqual(self.posts,0)
    def test_parent_provider_ids_and_source_purity_are_independent_semantic_gates(self):
        parent=self.p['parentLedgers'][1];path=Path(parent['state'])/'engine/runtime-ledger.json';original=path.read_bytes()
        for delta in [{'textOnly':False},{'offlineSimulation':True},{'imageInput':{'asset':'old-frame'}},
                      {'providerRequestId':self.p['parentLedgers'][0]['requests'][0]['providerRequestId']}]:
            altered=copy.deepcopy(self.p);d=json.loads(original);d['requests'][0].update(delta)
            raw=encoded(d);path.write_bytes(raw);altered['parentLedgers'][1]['ledgerSha256']=sha(raw);altered['parentLedgers'][1]['requests']=d['requests']
            try:
                with self.assertRaises(ValueError):prove_parents(altered,self.pins)
            finally:path.write_bytes(original)
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
