"""Offline fixtures and fake HTTP/key callbacks only; no real server/network."""
import copy
import fcntl
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
import veo as v
from launch_or import prepare_environment

class Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.video=subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-f','lavfi','-i','color=c=black:s=1080x1920:r=24:d=4','-c:v','libx264','-preset','ultrafast','-f','mp4','-movflags','frag_keyframe+empty_moov','pipe:1'],capture_output=True,check=True,env=v.ENV).stdout
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();root=Path(self.tmp.name).resolve();self.p=copy.deepcopy(v.PLAN);self.pins=copy.deepcopy(v.PINS);self.p['newState']=str(root/'child');self.before=[];self.calls=[];self.posts=0;self.polls=0;self.mode='ok';self.cost=None
        for i,pa in enumerate(self.p['parentLedgers']):
            old=Path(pa['state']);new=root/str(i);(new/'engine').mkdir(parents=True);(new/'engine/runtime.lock').write_bytes(b'');raw=(old/'engine/runtime-ledger.json').read_bytes();(new/'engine/runtime-ledger.json').write_bytes(raw);(new/pa['frozenFile']).write_bytes((old/pa['frozenFile']).read_bytes());pa['state']=str(new);self.before.append(raw)
        proposal=root/'proposal.json';proposal.write_bytes(Path(self.p['proposalPath']).read_bytes());self.p['proposalPath']=str(proposal);self.p['approval']['proposalPath']=str(proposal)
        ap=root/'approval.json';raw=v.encoded(self.p['approval']);ap.write_bytes(raw);self.p['approvalPath']=str(ap);self.pins['approvalSha256']=v.sha(raw)
        def http(method,url,headers,blob):
            self.calls.append((method,url,dict(headers)))
            for pa in self.p['parentLedgers']:
                fd=os.open(Path(pa['state'])/'engine/runtime.lock',os.O_RDONLY)
                try:fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
                finally:os.close(fd)
            d=self.e.read()
            if method=='POST':
                self.posts+=1;body=json.loads(blob);self.assertEqual(url,v.ENDPOINT);self.assertEqual(set(body),v.FIELDS);self.assertEqual(body,self.e.body(d['requests'][-1]['shot']));self.assertIsNone(d['requests'][-1]['imageInput']);self.assertTrue(d['requests'][-1]['textOnlyVideo']);self.assertEqual(len(d['funding']),self.posts);self.assertEqual(d['requests'][-1]['state'],'reserved');self.assertEqual(headers['Authorization'],'Bearer fake-only')
                rid=self.p['parentLedgers'][0]['requests'][0]['providerRequestId'] if self.mode=='duplicate' else 'fake-t2v-'+str(self.posts)
                result=dict(id=rid,model='foreign-model' if self.mode=='foreign_model' else v.VEO)
                if self.mode=='bad_poll':result['polling_url']='https://evil.example/poll'
                return 200,{},json.dumps(result).encode()
            self.assertTrue(d['requests'][-1].get('providerReceipt'),'durable receipt before GET')
            if url=='https://storage.googleapis.com/test.mp4':self.assertNotIn('Authorization',headers);return 200,{},self.video
            if '/content?' in url:
                if self.mode=='redirect_auth':return 302,{'Location':'https://storage.googleapis.com/test.mp4'},b''
                if self.mode=='redirect_evil':return 302,{'Location':'https://evil.example/test.mp4'},b''
                return 200,{},b'invalid-video' if self.mode=='invalid' else self.video
            self.polls+=1
            if self.mode=='poll_redirect':return 302,{'Location':'https://evil.example/poll'},b''
            if self.mode=='get_retry' and self.polls==1:return 500,{},b'{}'
            return 200,{},json.dumps(dict(status='pending' if self.mode=='pending' else 'failed' if self.mode=='failed' else 'completed',model=v.VEO,usage=dict(cost=self.cost))).encode()
        self.transport=v.TextTransport(Path(self.p['newState'])/'engine',proposal=self.p,http=http,key=lambda _: 'fake-only',sleep=lambda _:None,poll_limit=2)
        v.bootstrap(self.p,self.pins);self.e=v.TextEngine(Path(self.p['newState'])/'engine',self.transport,proposal=self.p,pins=self.pins)
    def tearDown(self):
        for pa,raw in zip(self.p['parentLedgers'],self.before):self.assertEqual((Path(pa['state'])/'engine/runtime-ledger.json').read_bytes(),raw)
        self.tmp.cleanup()
    def run_shot(self,shot='s8'):return self.e.run('openrouter','video',shot,self.e.body(shot))
    def test_four_exact_posts_funding_final_no_retakes(self):
        for i,shot in enumerate(v.SHOTS,1):
            fp=self.run_shot(shot);self.assertEqual(self.posts,i);d=self.e.read();self.assertEqual((self.e.root/d['assets'][fp]['path']).read_bytes(),self.video);self.assertIsNone(d['requests'][-1]['actualUsd'])
        self.assertEqual(d['reserved'],dict(fal='0.00',openrouter='0.80'));self.assertEqual(d['funding'][-1]['combinedOpenRouterReservation'],'2.40');self.assertEqual(d['funding'][-1]['combinedVeo'],12);self.assertEqual(d['funding'][-1]['combinedImages'],28);self.assertEqual(len(d['requests']),4);self.assertEqual(len(d['assets']),4)
        for shot in v.SHOTS:
            with self.assertRaises(ValueError):self.run_shot(shot)
        with self.assertRaises(ValueError):self.e.run('openrouter','video','s9',self.e.body('s8'))
        self.assertEqual(self.posts,4)
    def test_frame0_nonbilled_poster_done_reuse(self):
        self.run_shot();report=v.export_result(self.e,'s8',True);p=report['poster'];self.assertTrue(report['reused']);self.assertEqual(report['requiredUsedWindowFramesAt30'],20);self.assertEqual(report['visualQA'],'pending');self.assertTrue(p['textOnlyVideo']);self.assertFalse(p['separatelyPaidImageGeneration']);self.assertIsNone(p['nativeGenerationId']);self.assertEqual(p['frameIndex'],0);self.assertEqual(p['nativeFps'],'24/1');self.assertEqual(p['sourceVideoSha256'],v.sha(self.video));self.assertEqual(v.sha(Path(p['file']).read_bytes()),p['sha256']);self.assertEqual(len(self.e.read()['requests']),1);self.assertEqual(v.export_result(self.e,'s8',True),report);self.assertEqual(self.posts,1)
    def test_unknown_blocks_all_targets_no_retry_refund(self):
        self.mode='pending'
        with self.assertRaises(v.Blocked):self.run_shot()
        d=self.e.read();self.assertTrue(d['halted']);self.assertEqual(d['requests'][0]['state'],'unknown');self.assertEqual(d['reserved']['openrouter'],'0.20');self.assertEqual(self.polls,2)
        for shot in v.SHOTS:
            with self.assertRaises(ValueError):self.run_shot(shot)
        self.assertEqual(self.posts,1)
    def test_failed_poll_unknown(self):
        self.mode='failed'
        with self.assertRaises(v.Blocked):self.run_shot()
        self.assertEqual(self.e.read()['requests'][0]['state'],'unknown');self.assertEqual(self.posts,1)
    def test_invalid_media_retains_original(self):
        self.mode='invalid'
        with self.assertRaises(v.Blocked):self.run_shot()
        r=self.e.read()['requests'][0];self.assertEqual((self.e.root/'provider-originals'/(r['fingerprint']+'.bin')).read_bytes(),b'invalid-video');self.assertEqual(r['state'],'unknown');self.assertIsNone(r['actualUsd'])
    def test_overcost_preserved_unknown_no_refund(self):
        self.cost=.21
        with self.assertRaises(v.Blocked):self.run_shot()
        d=self.e.read();r=d['requests'][0];self.assertEqual(r['actualUsd'],.21);self.assertEqual(d['reserved']['openrouter'],'0.20');self.assertEqual((self.e.root/'provider-originals'/(r['fingerprint']+'.bin')).read_bytes(),self.video)
    def test_actual_cost_not_estimate(self):
        self.cost=.18;self.run_shot();r=self.e.read()['requests'][0];self.assertEqual(r['actualUsd'],.18);self.assertEqual(r['billingEstimateUsd'],.20)
    def test_duplicate_receipt_before_get(self):
        self.mode='duplicate'
        with self.assertRaises(v.Blocked):self.run_shot()
        r=self.e.read()['requests'][0];self.assertEqual(r['state'],'unknown');self.assertTrue(r['providerReceipt']);self.assertEqual(len(self.calls),1)
    def test_foreign_response_model_with_durable_receipt(self):
        self.mode='foreign_model'
        with self.assertRaises(v.Blocked):self.run_shot()
        self.assertEqual(self.e.read()['requests'][0]['state'],'unknown');self.assertTrue(self.e.read()['requests'][0]['providerReceipt']);self.assertEqual(len(self.calls),1)
    def test_six_fields_and_all_reference_injection_rejected(self):
        body=self.e.body('s8')
        for name in ('frame_images','input_references','previous_job_id','firstImage','image_url','references','kit'):
            with self.assertRaises(ValueError):self.e.run('openrouter','video','s8',{**body,name:'old-image'})
        for patch in ({'model':'other'},{'duration':8},{'duration':4.0},{'generate_audio':0},{'generate_audio':True},{'prompt':'changed'},{'resolution':'720p'}):
            with self.assertRaises(ValueError):self.e.run('openrouter','video','s8',{**body,**patch})
        for provider,kind,shot in [('fal','video','s8'),('openrouter','image','s8'),('openrouter','video','s18')]:
            with self.assertRaises(ValueError):self.e.run(provider,kind,shot,body)
        self.assertEqual(self.posts,0)
    def test_transport_itself_rejects_any_reference_or_first_bytes(self):
        body=self.e.body('s8')
        for patch in ({'frame_images':[]},{'input_references':[]},{'previous_job_id':'foreign'}):
            with self.assertRaises(ValueError):self.transport('video',{**body,**patch},None,checkpoint=lambda _:self.fail('no checkpoint'))
        with self.assertRaises(ValueError):self.transport('video',body,b'fake-input',checkpoint=lambda _:self.fail('no checkpoint'))
        self.assertEqual(self.posts,0);self.assertEqual(self.calls,[])
    def test_approval_missing_tamper_pending_proposal_changed(self):
        for field in ('approvalPath','proposalPath'):
            path=Path(self.p[field]);before=path.read_bytes();path.write_bytes(before+b' ')
            try:
                with self.assertRaises(ValueError):self.run_shot()
            finally:path.write_bytes(before)
            held=path.with_suffix('.held');path.rename(held)
            try:
                with self.assertRaises(FileNotFoundError):self.run_shot()
            finally:held.rename(path)
        p=copy.deepcopy(self.p);pins=copy.deepcopy(self.pins);p['approval']['status']='PENDING';path=Path(p['approvalPath']);before=path.read_bytes();raw=v.encoded(p['approval']);path.write_bytes(raw);pins['approvalSha256']=v.sha(raw)
        try:
            with self.assertRaises(ValueError):v.approval(p,pins)
        finally:path.write_bytes(before)
        self.assertEqual(self.posts,0)
    def test_parent48_hash_pending_duplicate_qualityhold_active_dedup(self):
        proof=v.prove_parents(self.p);self.assertEqual(len(proof['parentIds']),48);self.assertEqual(proof['reservedOpenRouter'],'1.60');self.assertEqual(proof['veo'],8);self.assertEqual(self.e.read()['requests'],[]);self.assertEqual(self.e.read()['assets'],{})
        pa=self.p['parentLedgers'][0];path=Path(pa['state'])/'engine/runtime-ledger.json';before=path.read_bytes();path.write_bytes(before+b' ')
        try:
            with self.assertRaises(ValueError):self.run_shot()
        finally:path.write_bytes(before)
        for kind in ('pending','duplicate','unhalt'):
            p=copy.deepcopy(self.p);d=json.loads(before)
            if kind=='pending':d['requests'][0]['state']='unknown'
            if kind=='duplicate':d['requests'][0]['providerRequestId']=d['requests'][1]['providerRequestId']
            if kind=='unhalt':d['halted']=False;p['parentLedgers'][0]['mustRemainHalted']=False
            raw=v.encoded(d);path.write_bytes(raw);p['parentLedgers'][0].update(ledgerSha256=v.sha(raw),requests=d['requests'])
            try:
                with self.assertRaises(ValueError):v.prove_parents(p)
            finally:path.write_bytes(before)
        fd=os.open(Path(pa['state'])/'engine/runtime.lock',os.O_RDONLY)
        try:
            fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError):self.run_shot()
        finally:os.close(fd)
        self.assertEqual(self.posts,0)
    def test_aggregate_future_quota_caps_reset_foreign_state(self):
        for key,value in [('images',29),('hailuo',16),('veo',12),('reservedOpenRouter','2.40'),('reservedFal','4.01')]:
            with self.e.lock():
                self.e._proof[key]=value
                with self.assertRaises(ValueError):self.e._reservation(self.e.read(),'openrouter','video')
        self.run_shot()
        with self.e.lock():
            d=self.e.read();d['requests']=[];d['assets']={};d['funding']=[];d['reserved']['openrouter']='0.00';d['categories']['video']='0.00'
            with self.assertRaises(ValueError):self.e.write(d)
        with self.assertRaises((ValueError,FileNotFoundError)):v.TextEngine(Path(self.p['parentLedgers'][0]['state'])/'engine',self.transport,proposal=self.p,pins=self.pins)
    def test_poll_url_reject_after_durable_id(self):
        self.mode='bad_poll'
        with self.assertRaises(v.Blocked):self.run_shot()
        self.assertEqual(self.posts,1);self.assertEqual(self.polls,0);self.assertTrue(self.e.read()['requests'][0]['providerReceipt'])
    def test_poll_redirect_not_followed(self):
        self.mode='poll_redirect'
        with self.assertRaises(v.Blocked):self.run_shot()
        self.assertEqual(len(self.calls),2);self.assertEqual(self.posts,1)
    def test_cdn_redirect_strips_auth(self):
        self.mode='redirect_auth';self.run_shot();self.assertEqual(self.posts,1);self.assertEqual(self.calls[-1][1],'https://storage.googleapis.com/test.mp4');self.assertNotIn('Authorization',self.calls[-1][2])
    def test_foreign_content_redirect_no_offdomain_get(self):
        self.mode='redirect_evil'
        with self.assertRaises(v.Blocked):self.run_shot()
        self.assertTrue(all('evil.example' not in url for _,url,_ in self.calls));self.assertEqual(self.posts,1)
    def test_poll_retry_get_only(self):
        self.mode='get_retry';self.run_shot();self.assertEqual(self.posts,1);self.assertEqual(self.polls,2)
    def test_normal_loader_isolation(self):
        env={'HOME':'fake','PATH':'fake','FAL_KEY':'fake','OTHER':'fake'};called=[]
        def loader():called.append(True);env['OPENROUTER_API_KEY']='fake'
        prepare_environment(env,loader);self.assertEqual(called,[True]);self.assertEqual(set(env),{'PATH','HOME','OPENROUTER_API_KEY'})
        with self.assertRaises(ValueError):prepare_environment({},lambda:None)
        with self.assertRaises(ValueError):prepare_environment({'BUILDCLUB_OFFLINE_VERIFY':'1'},lambda:self.fail('must not load server'))

if __name__=='__main__':unittest.main(verbosity=2)
