import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,existsSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {prepareHandover} from '../src/handover.ts';
function run(cwd,...args){
  const r=spawnSync('git',args,{cwd,encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr);return r.stdout.trim();
}
function makeRepo(branch='feature/auth'){
  const dir=mkdtempSync(join(tmpdir(),'ai-org-handover-'));const root=join(dir,'project'),remote=join(dir,'origin.git');
  mkdirSync(root);run(dir,'init','--bare','-q',remote);run(root,'init','-q');run(root,'config','user.name','Agent Test');run(root,'config','user.email','test@example.invalid');
  writeFileSync(join(root,'README.md'),'Project\n');run(root,'add','.');run(root,'commit','-qm','initial');run(root,'checkout','-B',branch);
  run(root,'remote','add','origin',remote);run(root,'push','-q','origin',branch);
  return {dir,root,remote,branch};
}
test('handover commits, pushes, verifies remote and is idempotent when unchanged',()=>{
  const p=makeRepo();try{
    writeFileSync(join(p.root,'feature.ts'),'export const ready = true;\n');
    const res=prepareHandover({root:p.root,projectId:'sample',expectedRemote:p.remote,summary:'Implemented feature. Next: verify tests.',push:true,agentsIdle:true});
    assert.match(res,/pushed and verified/);
    const local=run(p.root,'rev-parse','HEAD');const remote=run(p.root,'ls-remote','origin',`refs/heads/${p.branch}`).split(/\s+/)[0];assert.equal(local,remote);
    assert.ok(existsSync(join(p.root,'.agents','handover','CURRENT.md')));
    assert.match(readFileSync(join(p.root,'.agents','handover','CURRENT.md'),'utf8'),/Implemented feature/);
    const unchanged=prepareHandover({root:p.root,projectId:'sample',expectedRemote:p.remote,summary:'No additional changes.',push:true,agentsIdle:true});
    assert.match(unchanged,/no new handover needed/);
    assert.equal(run(p.root,'rev-parse','HEAD'),local);
  }finally{rmSync(p.dir,{recursive:true,force:true});}
});
test('handover blocks secret-like files before committing or pushing',()=>{
  const p=makeRepo();try{
    writeFileSync(join(p.root,'.env.local'),'PASSWORD=top-secret');const before=run(p.root,'rev-parse','HEAD');
    assert.throws(()=>prepareHandover({root:p.root,projectId:'sample',expectedRemote:p.remote,summary:'Working',push:true,agentsIdle:true}),/secret or excluded/i);
    assert.equal(run(p.root,'rev-parse','HEAD'),before);
  }finally{rmSync(p.dir,{recursive:true,force:true});}
});
test('handover requires idle workers and refuses protected branches',()=>{
  const p=makeRepo('main');try{
    assert.throws(()=>prepareHandover({root:p.root,projectId:'sample',expectedRemote:p.remote,summary:'Summary',push:true,agentsIdle:false}),/agent activity is unverified/);
    assert.throws(()=>prepareHandover({root:p.root,projectId:'sample',expectedRemote:p.remote,summary:'Summary',push:true,agentsIdle:true}),/protected-looking branch/);
  }finally{rmSync(p.dir,{recursive:true,force:true});}
});
test('handover preserves whitespace in filenames while scanning credentials',()=>{
  const p=makeRepo();try{
    writeFileSync(join(p.root,' token.txt'),'github_'+'pat_SYNTHETIC_TOKEN_1234567890');
    assert.throws(()=>prepareHandover({root:p.root,projectId:'sample',expectedRemote:p.remote,summary:'Working',push:true,agentsIdle:true}),/credential pattern/i);
  }finally{rmSync(p.dir,{recursive:true,force:true});}
});
test('handover scans committed outgoing history before recovery push',()=>{
  const p=makeRepo();try{
    writeFileSync(join(p.root,'feature.ts'),'export const ready = true;\n');
    prepareHandover({root:p.root,projectId:'sample',expectedRemote:p.remote,summary:'First checkpoint',push:true,agentsIdle:true});
    writeFileSync(join(p.root,'.env'),'github_'+'pat_SYNTHETIC_TOKEN_1234567890');run(p.root,'add','.env');run(p.root,'commit','-qm','unsafe local commit');
    assert.throws(()=>prepareHandover({root:p.root,projectId:'sample',expectedRemote:p.remote,summary:'Recover',push:true,agentsIdle:true}),/secret or excluded|credential pattern/i);
    assert.notEqual(run(p.root,'rev-parse','HEAD'),run(p.root,'ls-remote','origin',`refs/heads/${p.branch}`).split(/\s+/)[0]);
  }finally{rmSync(p.dir,{recursive:true,force:true});}
});
test('handover rejects metadata symlinks and remote drift',()=>{
  const linked=makeRepo();try{
    const external=join(linked.dir,'external-agents');mkdirSync(external);symlinkSync(external,join(linked.root,'.agents'));
    writeFileSync(join(linked.root,'feature.ts'),'export const ready = true;\n');
    assert.throws(()=>prepareHandover({root:linked.root,projectId:'sample',expectedRemote:linked.remote,summary:'Working',push:true,agentsIdle:true}),/unsafe symlink/i);
  }finally{rmSync(linked.dir,{recursive:true,force:true});}
  const drift=makeRepo();try{
    const other=join(drift.dir,'other.git');run(drift.dir,'init','--bare','-q',other);run(drift.root,'remote','set-url','origin',other);
    assert.throws(()=>prepareHandover({root:drift.root,projectId:'sample',expectedRemote:drift.remote,summary:'Working',push:true,agentsIdle:true}),/registered remote/i);
  }finally{rmSync(drift.dir,{recursive:true,force:true});}
});
test('handover refuses protected branch namespaces',()=>{
  const p=makeRepo('release/1.0');try{
    assert.throws(()=>prepareHandover({root:p.root,projectId:'sample',expectedRemote:p.remote,summary:'Summary',push:true,agentsIdle:true}),/protected-looking branch/);
  }finally{rmSync(p.dir,{recursive:true,force:true});}
});
