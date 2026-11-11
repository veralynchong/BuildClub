"""Fake-only provider callbacks and temporary parent/child ledgers; no inherited keys/network."""
import base64
import copy
import fcntl
import json
import os
from pathlib import Path
import tempfile
import unittest
from images import PLAN,PINS,SHOTS,SEED,HAILUO,ImageEngine,ProviderTransport,Blocked,bootstrap,prove_parents,export_image,sha,digest,encoded

PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWioAAAAASUVORK5CYII=')


class Tests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();root=Path(self.tmp.name).resolve();self.p=copy.deepcopy(PLAN);self.pins=copy.deepcopy(PINS)
        self.p['newState']=str(root/'child');self.parent_bytes=[]
        for i,parent in enumerate(self.p['parentLedgers']):
            state=root/('s','r','v','w')[i];(state/'engine').mkdir(parents=True);(state/'engine/runtime.lock').write_bytes(b'')
            freeze='frozen-plan.json' if i<2 else 'plan.json';frozen=encoded(dict(fakeParent=i));(state/freeze).write_bytes(frozen)
            shots=([('image','s'+str(n)) for n in range(1,22)]+[('video','s'+str(n)) for n in range(1,11)]) if i==0 else [('image',s) for s in ('s2','s13','s16')] if i==1 else [('video','s2' if i==2 else 's8')]
            rows=[dict(fingerprint=digest([i,kind,shot]),providerRequestId='parent-'+str(i)+'-'+kind+'-'+shot,provider='fal',kind=kind,shot=shot,model=SEED if kind=='image' else HAILUO,state='done',offlineSimulation=False,reservationUsd='0.04' if kind=='image' else '0.20') for kind,shot in shots]
            d=dict(mode='live',caps={'fal':'4.00','openrouter':'3.00'},halted=i==0,qualityHolds=[dict(newPosts=0)] if i==0 else [],requests=rows,reserved={'fal':('2.84','0.12','0.20','0.20')[i],'openrouter':'0.00'},assets={'unbilled-parent-reference':{'kind':'image','nonBilledParentReference':True}},funding=[dict(ancestorRequests=self.p['parentLedgers'][0]['requests'])] if i>1 else [])
            raw=encoded(d);(state/'engine/runtime-ledger.json').write_bytes(raw);self.parent_bytes.append(raw)
            parent.update(state=str(state),ledgerSha256=sha(raw),frozenFile=freeze,frozenSha256=sha(frozen),requests=rows,reserved=d['reserved'],mustRemainHalted=i==0)
        self.posts=0;self.calls=[];self.unknown=False
        def http(method,url,headers,blob):
            for parent in self.p['parentLedgers']:
                fd=os.open(Path(parent['state'])/'engine/runtime.lock',os.O_RDONLY)
                try:fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
                finally:os.close(fd)
            self.calls.append((method,url))
            if method=='POST':
                self.posts+=1;body=json.loads(blob)
                self.assertEqual(set(body),{'prompt','num_images','max_images','image_size','enable_safety_checker'})
                self.assertEqual(body['num_images'],1);self.assertEqual(body['max_images'],1);self.assertEqual(body['image_size'],'portrait_16_9');self.assertIs(body['enable_safety_checker'],True)
                self.assertIn(body['prompt'],[x['prompt'] for x in self.p['approval']['newTextOnlyImages']])
                rid='fake-image-'+str(self.posts)
                return 200,{},json.dumps(dict(request_id=rid,status_url='https://queue.fal.run/fal-ai/bytedance/requests/'+rid+'/status',response_url='https://queue.fal.run/fal-ai/bytedance/requests/'+rid)).encode()
            if url.endswith('/status'):return 200,{},json.dumps(dict(status='IN_PROGRESS' if self.unknown else 'COMPLETED')).encode()
            if '/requests/fake-image-' in url:return 200,{},b'{"images":[{"url":"https://v3.fal.media/fixture.png"}]}'
            self.assertEqual(url,'https://v3.fal.media/fixture.png');return 200,{},PNG
        self.transport=ProviderTransport(http=http,key=lambda name:'fake-only-not-inherited',sleep=lambda _:None,poll_limit=1)
        bootstrap(self.p,self.pins);self.e=ImageEngine(Path(self.p['newState'])/'engine',self.transport,proposal=self.p,pins=self.pins)
    def tearDown(self):
        for parent,raw in zip(self.p['parentLedgers'],self.parent_bytes):self.assertEqual((Path(parent['state'])/'engine/runtime-ledger.json').read_bytes(),raw)
        self.tmp.cleanup()
    def run_shot(self,shot):return self.e.run('fal','image',shot,self.e.body(shot))
    def test_four_one_at_a_time_posts_exact_funding_and_done_reuse(self):
        for i,shot in enumerate(SHOTS,1):
            fp=self.run_shot(shot);d=self.e.read();self.assertEqual(self.posts,i);self.assertEqual(len(d['requests']),i)
            self.assertEqual((self.e.root/d['assets'][fp]['path']).read_bytes(),PNG)
            report=export_image(self.e,shot,False);self.assertIsNone(report['actualUsd']);self.assertTrue(report['textOnly']);self.assertEqual(report['imageInputs'],[])
            self.assertEqual(report['payload'],self.e.body(shot));self.assertEqual(report['sha256'],sha(PNG));self.assertEqual(report['rawSha256'],sha(PNG))
        d=self.e.read();self.assertEqual(d['reserved'],{'fal':'0.16','openrouter':'0.00'})
        self.assertEqual(d['funding'][-1]['combinedFalReservation'],'3.52');self.assertEqual(d['funding'][-1]['combinedImages'],28)
        self.assertTrue(export_image(self.e,'s8',True)['reused']);self.assertTrue(export_image(self.e,'s8',True)['reused']);self.assertEqual(self.posts,4)
        for shot in SHOTS:
            with self.assertRaises(Blocked):self.run_shot(shot)
        self.assertEqual(self.posts,4)
    def test_dedup_only_paid_parent_requests_not_nested_ancestors_or_reference_assets(self):
        p=prove_parents(self.p);self.assertEqual(len(p['parentUniqueIds']),36);self.assertEqual((p['images'],p['hailuo'],p['reservedFal']),(24,12,'3.36'))
        self.assertEqual(self.e.read()['requests'],[]);self.assertEqual(self.e.read()['assets'],{})
    def test_unknown_preserved_blocks_all_next_targets_no_refund_or_repost(self):
        self.run_shot('s8');self.unknown=True
        with self.assertRaises(Blocked):self.run_shot('s11')
        d=self.e.read();self.assertTrue(d['halted']);self.assertEqual(d['requests'][-1]['state'],'unknown');self.assertEqual(d['requests'][-1]['providerRequestId'],'fake-image-2');self.assertEqual(d['reserved']['fal'],'0.08')
        with self.assertRaises(Blocked):self.run_shot('s11')
        with self.assertRaises(Blocked):self.run_shot('s12')
        self.assertEqual(self.posts,2)
    def test_other_shot_provider_kind_model_prompt_count_and_source_rejected(self):
        body=self.e.body('s8')
        for provider,kind,shot,patch in [('openrouter','image','s8',{}),('fal','video','s8',{}),('fal','image','s4',{}),('fal','image','s8',{'prompt':'changed'}),('fal','image','s8',{'model':'edit-model'}),('fal','image','s8',{'num_images':2}),('fal','image','s8',{'max_images':2}),('fal','image','s8',{'image_size':'square'}),('fal','image','s8',{'enable_safety_checker':False}),('fal','image','s8',{'image_url':'old-frame'}),('fal','image','s8',{'references':['old-frame']}),('fal','image','s8',{'kit':{}})]:
            with self.assertRaises(ValueError):self.e.run(provider,kind,shot,{**body,**patch})
        self.assertEqual(self.posts,0)
    def test_parent_hash_qualityhold_pending_duplicateid_and_active_lock_reject(self):
        parent=self.p['parentLedgers'][3];path=Path(parent['state'])/'engine/runtime-ledger.json';original=path.read_bytes();path.write_bytes(original+b' ')
        try:
            with self.assertRaises(ValueError):self.run_shot('s8')
        finally:path.write_bytes(original)
        for mutation in ['duplicate','unknown','unhalt']:
            p=copy.deepcopy(self.p);i=0 if mutation=='unhalt' else 3;pa=p['parentLedgers'][i];file=Path(pa['state'])/'engine/runtime-ledger.json';before=file.read_bytes();d=json.loads(before)
            if mutation=='unhalt':d['halted']=False;pa['mustRemainHalted']=False
            elif mutation=='duplicate':d['requests'][0]['providerRequestId']=p['parentLedgers'][0]['requests'][0]['providerRequestId']
            else:d['requests'][0]['state']='unknown'
            raw=encoded(d);file.write_bytes(raw);pa['ledgerSha256']=sha(raw);pa['requests']=d['requests']
            try:
                with self.assertRaises(ValueError):prove_parents(p)
            finally:file.write_bytes(before)
        fd=os.open(Path(parent['state'])/'engine/runtime.lock',os.O_RDONLY)
        try:
            fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError):self.run_shot('s8')
        finally:os.close(fd)
        self.assertEqual(self.posts,0)
    def test_aggregate_caps_quota_and_foreign_state_or_reset_reject(self):
        with self.assertRaises((ValueError,FileNotFoundError)):ImageEngine(Path(self.p['parentLedgers'][0]['state'])/'engine',self.transport,proposal=self.p,pins=self.pins)
        with self.e.lock():
            self.e._proof['reservedFal']='3.99'
            with self.assertRaises(ValueError):self.e._reservation(self.e.read(),'fal','image')
        with self.e.lock():
            self.e._proof['images']=28
            with self.assertRaises(ValueError):self.e._reservation(self.e.read(),'fal','image')
        self.assertEqual(self.posts,0);self.run_shot('s8')
        with self.e.lock():
            d=self.e.read();d['requests']=[];d['funding']=[];d['assets']={};d['reserved']['fal']='0.00'
            with self.assertRaises(ValueError):self.e.write(d)
        self.assertEqual(self.posts,1)
    def test_done_requires_provider_receipt_and_payload_evidence(self):
        self.run_shot('s8')
        with self.e.lock():
            d=self.e.read();del d['requests'][0]['providerReceipt']
            with self.assertRaises(ValueError):self.e.check_child(d)
        self.assertEqual(self.posts,1)

    def test_exact_frozen_prompt_set_and_local_allowance_does_not_change_core_caps(self):
        self.assertEqual(list(SHOTS),[x['shot'] for x in PLAN['approval']['newTextOnlyImages']])
        self.assertEqual(self.e.caps,{'fal':'4.00','openrouter':'3.00'})
        self.assertEqual(PLAN['approval']['requestedScopeChanges']['imageCallMaximum'],28)
        for shot in SHOTS:self.assertEqual(self.e.body(shot)['prompt'],next(x['prompt'] for x in PLAN['approval']['newTextOnlyImages'] if x['shot']==shot))


if __name__=='__main__':unittest.main(verbosity=2)
