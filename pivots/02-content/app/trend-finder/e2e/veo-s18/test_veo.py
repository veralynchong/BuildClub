"""Local fixtures only: no real server import, credentials, HTTP or provider."""
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
from contextlib import closing
import veo as v
from launch_or import prepare_environment

PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWioAAAAASUVORK5CYII=')

class Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.video=subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-f','lavfi','-i','color=c=black:s=1080x1920:r=24:d=4','-c:v','libx264','-preset','ultrafast','-f','mp4','-movflags','frag_keyframe+empty_moov','pipe:1'],capture_output=True,check=True,env=v.ENV).stdout
        cls.frame=subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-xerror','-i','pipe:0','-map','0:v:0','-vf','select=eq(n\\,84)','-fps_mode','passthrough','-frames:v','1','-c:v','png','-f','image2pipe','pipe:1'],input=cls.video,capture_output=True,check=True,env=v.ENV).stdout
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();root=Path(self.tmp.name).resolve();self.p=copy.deepcopy(v.PLAN);self.pins=copy.deepcopy(v.PINS);self.p['newState']=str(root/'child');self.before=[];self.posts=0;self.calls=[];self.unknown=False;self.bad_receipt=False;self.cost=None;self.invalid=False;self.response_model=v.VEO
        ledgers={};oldroots={}
        for i,pa in enumerate(self.p['parentLedgers']):
            old=Path(pa['state']);new=root/str(i);(new/'engine/media').mkdir(parents=True);(new/'engine/provider-originals').mkdir();(new/'engine/runtime.lock').write_bytes(b'')
            (new/pa['frozenFile']).write_bytes((old/pa['frozenFile']).read_bytes());ledgers[str(new)]=json.loads((old/'engine/runtime-ledger.json').read_bytes());oldroots[str(old)]=str(new);pa['state']=str(new)
        for s in self.p['ancestors']:
            s['sourceState']=oldroots[s['sourceState']];r=s['request'];a=s['assetRow'];fp=s['asset'];root=Path(s['sourceState']);s['sourcePath']=str(root/'engine/media'/(fp+'.png'));s['sourceSha256']=v.sha(PNG)
            normalized,n=v.normalize_image(PNG);n.update(providerRequestId=r['providerRequestId'],rawPath='provider-originals/'+fp+'.bin');r.update(normalization=n,outputSha256=v.sha(PNG));a.update(normalization=n,sha256=v.sha(PNG))
            d=ledgers[str(root)];d['requests']=[r if x.get('asset')==fp else x for x in d['requests']];d['assets'][fp]=a
            (root/'engine/media'/(fp+'.png')).write_bytes(PNG);(root/'engine/provider-originals'/(fp+'.bin')).write_bytes(PNG)
            if s['native']:
                g=s['native']['generation'];b=s['native']['binding'];b['outputHash']=v.sha(PNG)
                with closing(sqlite3.connect(root/'data.db')) as c, c:
                    for table,row in [('generations',g),('batch_bindings',b)]:
                        c.execute('CREATE TABLE IF NOT EXISTS '+table+' ('+','.join('"'+k+'"' for k in row)+')')
                        c.execute('INSERT INTO '+table+' VALUES ('+','.join('?' for _ in row)+')',list(row.values()))
                    c.execute('CREATE TABLE IF NOT EXISTS canvases (idea_id,doc)')
                    existing=c.execute('SELECT doc FROM canvases WHERE idea_id=?',(g['idea_id'],)).fetchone();nodes=json.loads(existing[0])['nodes'] if existing else [];nodes.append(dict(id=g['node_id'],shotId=s['sourceShot'],data=dict(selected=g['id'])))
                    c.execute('DELETE FROM canvases WHERE idea_id=?',(g['idea_id'],));c.execute('INSERT INTO canvases VALUES (?,?)',(g['idea_id'],json.dumps(dict(nodes=nodes))))
                native=root/'media'/g['idea_id']/'gen'/g['file'];native.parent.mkdir(parents=True,exist_ok=True);native.write_bytes(PNG)
        source=self.p['previousSource'];source['sourceState']=self.p['parentLedgers'][6]['state'];cr=Path(source['sourceState']);ar=self.p['ancestors'][0];l=self.p['previousDerivedLineage'];r=source['videoRequest'];a=source['videoAsset'];fp=r['fingerprint']
        freeze=json.loads((cr/'plan.json').read_bytes());freeze['sources']=[ar if x['targetShot']=='s16' else x for x in freeze['sources']];fraw=v.encoded(freeze);(cr/'plan.json').write_bytes(fraw);self.p['parentLedgers'][6]['frozenSha256']=v.sha(fraw)
        body=dict(model=v.VEO,prompt=freeze['prompts']['s16'],duration=4,resolution='1080p',aspect_ratio='9:16',generate_audio=False,frame_images=[dict(type='image_url',image_url=dict(url='data:image/png;base64,'+base64.b64encode(PNG).decode()),frame_type='first_frame')])
        # Match insertion order used by the reviewed Engine outgoing payload.
        body={k:body[k] for k in ('model','prompt','duration','resolution','aspect_ratio','generate_audio','frame_images')}
        r.update(outputSha256=v.sha(self.video),payloadSha256=v.sha(json.dumps(body,sort_keys=True).encode()),imageInput=dict(asset=ar['asset'],sha256=v.sha(PNG),parentRequestId=ar['providerRequestId']));r['providerReceipt']['requestPayloadSha256']=v.sha(json.dumps(body,separators=(',',':')).encode());a['sha256']=v.sha(self.video)
        d=ledgers[str(cr)];d['requests']=[r if x['shot']=='s16' else x for x in d['requests']];d['assets'][fp]=a
        (cr/'engine/media'/(fp+'.mp4')).write_bytes(self.video);(cr/'engine/provider-originals'/(fp+'.bin')).write_bytes(self.video);(cr/'engine/provider-originals'/(fp+'.json')).write_bytes(v.encoded(dict(sha256=v.sha(self.video),receipt=r['providerReceipt'],providerRequestId=r['providerRequestId'],actualUsd=r['actualUsd'])))
        result=dict(status='TECHNICAL_PASS',shot='s16',file=str(cr/'engine/media'/(fp+'.mp4')),sha256=v.sha(self.video),rawVideoSha256=v.sha(self.video),providerRequestId=r['providerRequestId'],providerReceipt=r['providerReceipt'],source=ar,actualUsd=r['actualUsd'],fullDecode='PASS');(cr/'results').mkdir();result_raw=v.encoded(result);(cr/'results/s16.json').write_bytes(result_raw)
        frame=Path(self.tmp.name).resolve()/'frame.png';frame.write_bytes(self.frame);source.update(sourcePath=str(frame),sourceSha256=v.sha(self.frame),asset=v.digest(['derived-own-ai-video-frame',v.sha(self.video),84,v.sha(self.frame)]),lineagePath=str(frame.with_suffix('.json')))
        l.update(framePath=str(frame),frameSha256=v.sha(self.frame),sourceVideoPath=result['file'],sourceVideoSha256=v.sha(self.video),sourceVideoResultPath=str(cr/'results/s16.json'),sourceVideoResultSha256=v.sha(result_raw),sourceLedgerPath=str(cr/'engine/runtime-ledger.json'),ancestorImageState=ar['sourceState'],ancestorImageSha256=v.sha(PNG))
        l['sourceLedgerSha256']=v.sha(v.encoded(ledgers[str(cr)]));raw=v.encoded(l);Path(source['lineagePath']).write_bytes(raw);self.pins['previousLineageSha256']=v.sha(raw)
        previous=source;source=self.p['sources'][0];source['sourceState']=self.p['parentLedgers'][7]['state'];tr=Path(source['sourceState']);l=self.p['derivedLineage'];r=source['videoRequest'];a=source['videoAsset'];oldfp=r['fingerprint']
        freeze=json.loads((tr/'plan.json').read_bytes());freeze.update(sources=[previous],ancestors=self.p['ancestors'],derivedLineage=self.p['previousDerivedLineage']);raw=v.encoded(freeze);(tr/'plan.json').write_bytes(raw);self.p['parentLedgers'][7]['frozenSha256']=v.sha(raw)
        body=dict(model=v.VEO,prompt=freeze['prompts']['s17'],firstImage=previous['asset'],duration=4,resolution='1080p',aspect_ratio='9:16',generate_audio=False);fp=v.digest(['openrouter','video',body]);outgoing={k:x for k,x in body.items() if k!='firstImage'};outgoing['frame_images']=[dict(type='image_url',image_url=dict(url='data:image/png;base64,'+base64.b64encode(self.frame).decode()),frame_type='first_frame')]
        r.update(fingerprint=fp,asset=fp,outputSha256=v.sha(self.video),payloadSha256=v.sha(json.dumps(outgoing,sort_keys=True).encode()),imageInput=dict(asset=previous['asset'],sha256=previous['sourceSha256'],parentRequestId=previous['providerRequestId']));r['providerReceipt']['requestPayloadSha256']=v.sha(json.dumps(outgoing,separators=(',',':')).encode());a.update(path='media/'+fp+'.mp4',requestFingerprint=fp,sha256=v.sha(self.video));d=ledgers[str(tr)];d['requests']=[r];d['assets'].pop(oldfp,None);d['assets'][fp]=a
        (tr/'engine/media'/(fp+'.mp4')).write_bytes(self.video);(tr/'engine/provider-originals'/(fp+'.bin')).write_bytes(self.video);(tr/'engine/provider-originals'/(fp+'.json')).write_bytes(v.encoded(dict(sha256=v.sha(self.video),receipt=r['providerReceipt'],providerRequestId=r['providerRequestId'],actualUsd=r['actualUsd'])))
        result=dict(status='TECHNICAL_PASS',shot='s17',file=str(tr/'engine/media'/(fp+'.mp4')),sha256=v.sha(self.video),rawVideoSha256=v.sha(self.video),providerRequestId=r['providerRequestId'],providerReceipt=r['providerReceipt'],source=previous,actualUsd=r['actualUsd'],fullDecode='PASS');(tr/'results').mkdir();result_raw=v.encoded(result);(tr/'results/s17.json').write_bytes(result_raw)
        frame=Path(self.tmp.name).resolve()/'frame90.png';frame.write_bytes(self.frame);source.update(sourcePath=str(frame),sourceSha256=v.sha(self.frame),asset=v.digest(['derived-own-ai-video-frame',v.sha(self.video),90,v.sha(self.frame)]),lineagePath=str(frame.with_suffix('.json')),independentQaPath=str(frame.with_suffix('.qa.json')))
        l.update(framePath=str(frame),frameSha256=v.sha(self.frame),sourceVideoPath=result['file'],sourceVideoSha256=v.sha(self.video),sourceVideoResultPath=str(tr/'results/s17.json'),sourceVideoResultSha256=v.sha(result_raw),sourceLedgerPath=str(tr/'engine/runtime-ledger.json'),ancestorImageState=ar['sourceState'],ancestorImageSha256=v.sha(PNG),previousDerivedReference=previous['lineagePath'])
        qa=dict(sourceShot='s17',sourceState=str(tr),sourceVideoPath=result['file'],sourceVideoSha256=v.sha(self.video),rawVideoSha256=v.sha(self.video),providerRequestId=r['providerRequestId'],nativeFrameIndexZeroBased=90,nativeFrameRate='24/1',sourceTimeSeconds='3.75',outputSha256=v.sha(self.frame),parentSource=dict(sourceShot='s16',sourceSha256=previous['sourceSha256'],lineagePath=previous['lineagePath']));raw=v.encoded(qa);Path(source['independentQaPath']).write_bytes(raw);l['independentQALineageSha256']=self.pins['independentQaSha256']=v.sha(raw)
        for pa in self.p['parentLedgers']:
            root=Path(pa['state']);d=ledgers[str(root)];raw=v.encoded(d);(root/'engine/runtime-ledger.json').write_bytes(raw);pa.update(ledgerSha256=v.sha(raw),requests=d['requests']);self.before.append(raw)
        l['sourceLedgerSha256']=self.p['parentLedgers'][7]['ledgerSha256'];raw=v.encoded(l);Path(source['lineagePath']).write_bytes(raw);self.pins['lineageSha256']=v.sha(raw)
        gate=Path(self.tmp.name).resolve()/'acceptance.json';self.p['acceptancePath']=str(gate);raw=v.encoded(dict(status='ROOT_ACCEPTED_SOURCE_REFERENCE_ONLY_NOT_VIDEO_APPROVAL',scope=['s18'],source=l));gate.write_bytes(raw);self.pins['acceptanceSha256']=v.sha(raw)
        def http(method,url,headers,blob):
            self.calls.append((method,url))
            for pa in self.p['parentLedgers']:
                fd=os.open(Path(pa['state'])/'engine/runtime.lock',os.O_RDONLY)
                try:fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
                finally:os.close(fd)
            d=self.e.read()
            if method=='POST':
                self.posts+=1;self.assertEqual(url,'https://openrouter.ai/api/v1/videos');body=json.loads(blob);self.assertEqual(body['model'],v.VEO);self.assertEqual((body['duration'],body['resolution'],body['aspect_ratio'],body['generate_audio']),(4,'1080p','9:16',False));self.assertEqual(body['frame_images'],[dict(type='image_url',image_url=dict(url='data:image/png;base64,'+base64.b64encode(self.frame).decode()),frame_type='first_frame')]);self.assertEqual(len(d['funding']),self.posts);self.assertEqual(d['requests'][-1]['state'],'reserved')
                rid=d['lineage']['parentLedgerHashes'][0][:10] if self.bad_receipt else 'fake-veo-'+str(self.posts)
                if self.bad_receipt:rid=self.p['parentLedgers'][0]['requests'][0]['providerRequestId']
                return 200,{},json.dumps(dict(id=rid,model=self.response_model)).encode()
            self.assertTrue(d['requests'][-1].get('providerReceipt'),'receipt durable before first GET')
            if '/content?' in url:return 200,{},b'not-mp4' if self.invalid else self.video
            return 200,{},json.dumps(dict(status='pending' if self.unknown else 'completed',usage=dict(cost=self.cost),model=self.response_model)).encode()
        self.transport=v.RetainingTransport(Path(self.p['newState'])/'engine',http=http,key=lambda _: 'fake-test',sleep=lambda _:None,poll_limit=1)
        v.bootstrap(self.p,self.pins);self.e=v.VeoEngine(Path(self.p['newState'])/'engine',self.transport,proposal=self.p,pins=self.pins)
    def tearDown(self):
        for pa,raw in zip(self.p['parentLedgers'],self.before):self.assertEqual((Path(pa['state'])/'engine/runtime-ledger.json').read_bytes(),raw)
        self.tmp.cleanup()
    def run_shot(self,shot):return self.e.run('openrouter','video',shot,self.e.body(shot))
    def test_one_post_only_funding_durable_receipt_output_and_reuse(self):
        for i,s in enumerate(v.SHOTS,1):
            fp=self.run_shot(s);d=self.e.read();self.assertEqual(self.posts,i);self.assertEqual((self.e.root/d['assets'][fp]['path']).read_bytes(),self.video);self.assertIsNone(d['requests'][-1]['actualUsd'])
        self.assertEqual(d['reserved'],dict(fal='0.00',openrouter='0.20'));self.assertEqual(len(d['requests']),1);self.assertEqual(d['funding'][-1]['combinedImages'],28);self.assertEqual(d['funding'][-1]['combinedOpenRouterReservation'],'1.60');self.assertEqual(d['funding'][-1]['combinedVeo'],8)
        report=v.export_result(self.e,'s18',True);self.assertTrue(report['reused']);self.assertEqual(report['source']['sourceShot'],'s17');self.assertEqual(report['rawVideoSha256'],v.sha(self.video));self.assertEqual(report['visualQA'],'pending')
        for s in v.SHOTS:
            with self.assertRaises(v.Blocked):self.run_shot(s)
        self.assertEqual(self.posts,1)
    def test_usage_cost_retained_not_fallback(self):
        self.cost=.18;self.run_shot('s18');self.assertEqual(self.e.read()['requests'][0]['actualUsd'],.18)
    def test_unknown_blocks_next_target_without_refund_or_retry(self):
        self.unknown=True
        with self.assertRaises(v.Blocked):self.run_shot('s18')
        d=self.e.read();self.assertTrue(d['halted']);self.assertEqual(d['reserved']['openrouter'],'0.20');self.assertEqual(d['requests'][0]['state'],'unknown');self.assertIn('errorType',d['requests'][0])
        for s in ('s18',):
            with self.assertRaises(v.Blocked):self.run_shot(s)
        self.assertEqual(self.posts,1)
    def test_duplicate_provider_receipt_stops_before_get_and_preserves_unknown(self):
        self.bad_receipt=True
        with self.assertRaises(v.Blocked):self.run_shot('s18')
        self.assertEqual(len(self.calls),1);self.assertEqual(self.e.read()['requests'][0]['state'],'unknown');self.assertEqual(self.posts,1)
    def test_invalid_media_and_over_cost_keep_original_output_no_retry(self):
        self.invalid=True
        with self.assertRaises(v.Blocked):self.run_shot('s18')
        r=self.e.read()['requests'][0];self.assertEqual((self.e.root/'provider-originals'/(r['fingerprint']+'.bin')).read_bytes(),b'not-mp4');self.assertEqual(r['state'],'unknown');self.assertIsNone(r['actualUsd'])
        with self.assertRaises(v.Blocked):self.run_shot('s18')
        self.assertEqual(self.posts,1)
    def test_over_cost_preserved_unknown_no_refund(self):
        self.cost=.21
        with self.assertRaises(v.Blocked):self.run_shot('s18')
        r=self.e.read()['requests'][0];self.assertEqual(r['actualUsd'],.21);self.assertEqual(r['reservationUsd'],'0.20');self.assertEqual(r['state'],'unknown');self.assertEqual((self.e.root/'provider-originals'/(r['fingerprint']+'.bin')).read_bytes(),self.video)
    def test_foreign_response_model_unknown_with_durable_receipt_no_get(self):
        self.response_model='unapproved-model'
        with self.assertRaises(v.Blocked):self.run_shot('s18')
        r=self.e.read()['requests'][0];self.assertEqual(r['state'],'unknown');self.assertTrue(r['providerReceipt']);self.assertEqual(len(self.calls),1)
    def test_bad_scope_model_input_settings_no_posts(self):
        body=self.e.body('s18')
        for provider,kind,shot,patch in [('fal','video','s18',{}),('openrouter','image','s18',{}),('openrouter','video','s8',{}),('openrouter','video','s18',{'model':'other'}),('openrouter','video','s18',{'duration':8}),('openrouter','video','s18',{'generate_audio':True}),('openrouter','video','s18',{'prompt':'changed'}),('openrouter','video','s18',{'firstImage':'oldframe'})]:
            with self.assertRaises(ValueError):self.e.run(provider,kind,shot,{**body,**patch})
        self.assertEqual(self.posts,0)
    def test_acceptance_hash_source_mapping_permissions_fail_closed(self):
        path=Path(self.p['acceptancePath']);raw=path.read_bytes();path.write_bytes(raw+b' ')
        try:
            with self.assertRaises(ValueError):self.run_shot('s18')
        finally:path.write_bytes(raw)
        path.chmod(0o666)
        try:
            with self.assertRaises(ValueError):self.run_shot('s18')
        finally:path.chmod(0o600)
        held=path.with_suffix('.held');path.rename(held)
        try:
            with self.assertRaises(FileNotFoundError):self.run_shot('s18')
        finally:held.rename(path)
        p=copy.deepcopy(self.p);p['derivedLineage']['sourceShot']='s1'
        with self.assertRaises(ValueError):v.acceptance(p,self.pins)
        self.assertEqual(self.posts,0)
    def test_parent_tamper_active_hold_duplicate_and_pending(self):
        pa=self.p['parentLedgers'][0];path=Path(pa['state'])/'engine/runtime-ledger.json';original=path.read_bytes();path.write_bytes(original+b' ')
        try:
            with self.assertRaises(ValueError):self.run_shot('s18')
        finally:path.write_bytes(original)
        for mutation in ('unknown','unhalt','duplicate'):
            p=copy.deepcopy(self.p);d=json.loads(original)
            if mutation=='unknown':d['requests'][0]['state']='unknown'
            if mutation=='unhalt':d['halted']=False;p['parentLedgers'][0]['mustRemainHalted']=False
            if mutation=='duplicate':d['requests'][0]['providerRequestId']=d['requests'][1]['providerRequestId']
            raw=v.encoded(d);path.write_bytes(raw);p['parentLedgers'][0].update(ledgerSha256=v.sha(raw),requests=d['requests'])
            try:
                with self.assertRaises(ValueError):v.prove_parents(p,self.pins)
            finally:path.write_bytes(original)
        fd=os.open(Path(pa['state'])/'engine/runtime.lock',os.O_RDONLY)
        try:
            fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError):self.run_shot('s18')
        finally:os.close(fd)
        self.assertEqual(self.posts,0)
    def test_parent_or_actuals_and_source_parent_fail_closed(self):
        p=copy.deepcopy(self.p);pa=p['parentLedgers'][5];path=Path(pa['state'])/'engine/runtime-ledger.json';before=path.read_bytes();d=json.loads(before);d['requests'][0]['actualUsd']=.19;raw=v.encoded(d);path.write_bytes(raw);pa.update(ledgerSha256=v.sha(raw),requests=d['requests'])
        try:
            with self.assertRaises(ValueError):v.prove_parents(p,self.pins)
        finally:path.write_bytes(before)
        p=copy.deepcopy(self.p);p['sources'][0]['sourceState']=p['parentLedgers'][0]['state']
        with self.assertRaises(ValueError):v.prove_parents(p,self.pins)
        self.assertEqual(self.posts,0)
    def test_ancestor_and_derived_raw_frame_result_tamper_and_dedup(self):
        proof=v.prove_parents(self.p,self.pins);self.assertEqual(len(proof['parentIds']),47);self.assertEqual(proof['reservedOpenRouter'],'1.40');self.assertEqual(proof['veo'],7);self.assertEqual(len(self.e.read()['assets']),1);self.assertEqual(self.e.read()['requests'],[])
        ar=self.p['ancestors'][0];l=self.p['derivedLineage']
        for path in [Path(ar['sourcePath']),Path(ar['sourceState'])/'engine'/ar['request']['normalization']['rawPath'],Path(l['framePath']),Path(l['sourceVideoPath']),Path(l['sourceVideoResultPath']),Path(self.p['sources'][0]['lineagePath'])]:
            before=path.read_bytes();path.write_bytes(b'foreign-old-frame')
            try:
                with self.assertRaises((ValueError,subprocess.CalledProcessError)):self.run_shot('s18')
            finally:path.write_bytes(before)
        with closing(sqlite3.connect(Path(ar['sourceState'])/'data.db')) as c, c:c.execute("UPDATE generations SET source_url='old-original'")
        with self.assertRaises(ValueError):self.run_shot('s18')
        self.assertEqual(self.posts,0)
    def test_frame_index_fps_ancestor_and_nonbilled_claim_fail_closed(self):
        for key,value in [('frameIndex',89),('nativeFps','30/1'),('ancestorImageRequestId','foreign'),('ancestorTextOnlyImage',False),('separatelyPaidImageGeneration',True)]:
            p=copy.deepcopy(self.p);pins=copy.deepcopy(self.pins);p['derivedLineage'][key]=value;path=Path(p['sources'][0]['lineagePath']);before=path.read_bytes();raw=v.encoded(p['derivedLineage']);path.write_bytes(raw);pins['lineageSha256']=v.sha(raw)
            try:
                with self.assertRaises(ValueError):v.prove_parents(p,pins)
            finally:path.write_bytes(before)
        self.assertIsNone(self.e.read()['assets'][self.p['sources'][0]['asset']]['nativeGenerationId']);self.assertFalse(self.e.read()['assets'][self.p['sources'][0]['asset']]['textOnly']);self.assertEqual(self.p['ancestors'][0]['pilotVisualQA'],'LIMITED');self.assertEqual(self.posts,0)
    def test_previous_c16_chain_and_independent_qa_tamper_fail_closed(self):
        prev=self.p['previousSource'];lineage=self.p['previousDerivedLineage']
        for path in [Path(prev['sourcePath']),Path(lineage['sourceVideoPath']),Path(lineage['sourceVideoResultPath']),Path(prev['lineagePath']),Path(self.p['sources'][0]['independentQaPath'])]:
            before=path.read_bytes();path.write_bytes(b'foreign-source-or-qa')
            try:
                with self.assertRaises(ValueError):self.run_shot('s18')
            finally:path.write_bytes(before)
        self.assertEqual(self.posts,0)
    def test_repin_foreign_frame_cannot_replace_exact_native_frame90(self):
        p=copy.deepcopy(self.p);pins=copy.deepcopy(self.pins);source=p['sources'][0];path=Path(source['sourcePath']);manifest=Path(source['lineagePath']);before=path.read_bytes();before_manifest=manifest.read_bytes();path.write_bytes(PNG);source['sourceSha256']=p['derivedLineage']['frameSha256']=v.sha(PNG);raw=v.encoded(p['derivedLineage']);manifest.write_bytes(raw);pins['lineageSha256']=v.sha(raw)
        try:
            with self.assertRaisesRegex(ValueError,'exact frame90 extraction'):v.prove_parents(p,pins)
        finally:path.write_bytes(before);manifest.write_bytes(before_manifest)
        self.assertEqual(self.posts,0)
    def test_aggregate_quota_reset_foreign_state(self):
        for key,value in [('images',29),('hailuo',16),('veo',12),('reservedOpenRouter','2.41'),('reservedFal','4.01')]:
            with self.e.lock():
                self.e._proof[key]=value
                with self.assertRaises(ValueError):self.e._reservation(self.e.read(),'openrouter','video')
        self.run_shot('s18')
        with self.e.lock():
            d=self.e.read();d['requests']=[];d['funding']=[];d['reserved']['openrouter']='0.00';d['categories']['video']='0.00'
            with self.assertRaises(ValueError):self.e.write(d)
        with self.assertRaises((ValueError,FileNotFoundError)):v.VeoEngine(Path(self.p['parentLedgers'][0]['state'])/'engine',self.transport,proposal=self.p,pins=self.pins)
        self.assertEqual(self.posts,1)
    def test_launcher_normal_loader_then_strip_no_fal_and_offline_reject(self):
        env={'HOME':'fake-home','PATH':'fake-path','FAL_KEY':'fake-fal','OTHER':'fake'};calls=[]
        def loader():calls.append('normal-import');env['OPENROUTER_API_KEY']='fake-or'
        prepare_environment(env,loader);self.assertEqual(calls,['normal-import']);self.assertEqual(set(env),{'HOME','PATH','OPENROUTER_API_KEY'})
        with self.assertRaises(ValueError):prepare_environment({},lambda:None)
        with self.assertRaises(ValueError):prepare_environment({'BUILDCLUB_OFFLINE_VERIFY':'1'},lambda:self.fail('must not import'))

if __name__=='__main__':unittest.main(verbosity=2)
