import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,cpSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

function call(cmd,args,cwd) {
  const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:20000,env:{...process.env,NODE_NO_WARNINGS:'1'}});
  return {status:r.status,out:(r.stdout||'')+(r.stderr||'')};
}
function project(dir){
  mkdirSync(dir,{recursive:true});
  for(const args of [['init','-q'],['config','user.email','test@example.invalid'],['config','user.name','Test'],['remote','add','origin','https://github.com/example/ecommerce.git']]){
    const r=call('git',args,dir);assert.equal(r.status,0,r.out);
  }
  writeFileSync(join(dir,'README.md'),'Existing app\n');
  for(const args of [['add','.'],['commit','-qm','initial']]){const r=call('git',args,dir);assert.equal(r.status,0,r.out);}
}

test('CLI registers, audits, bootstraps and safely rebinds arbitrary project roots',()=>{
  const work=mkdtempSync(join(tmpdir(),'ai-org-e2e-'));
  try{
    const org=join(work,'my organization');
    mkdirSync(org);for(const d of ['src','agents','teams','templates'])cpSync(resolve(d),join(org,d),{recursive:true});
    const a=join(work,'Mac Documents','ecommerce');const b=join(work,'Windows E drive','client project');
    project(a);project(b);
    const cli=(...args)=>call(process.execPath,['--experimental-strip-types',join(org,'src','cli.ts'),...args],org);
    let r=cli('init','--root',org);assert.equal(r.status,0,r.out);
    r=cli('project','attach','--path',a);assert.equal(r.status,0,r.out);assert.match(r.out,/Audit-first onboarding required: yes/);
    r=cli('project','audit','--id','github.com/example/ecommerce','--save');assert.equal(r.status,0,r.out);
    r=cli('project','bootstrap','--id','github.com/example/ecommerce');assert.equal(r.status,0,r.out);
    assert.ok(existsSync(join(a,'.agents','project.yaml')));
    r=cli('project','status','--id','github.com/example/ecommerce');assert.equal(r.status,0,r.out);
    r=cli('project','attach','--path',b);assert.notEqual(r.status,0,'must not silently change registered path');
    r=cli('project','attach','--path',b,'--rebind');assert.equal(r.status,0,r.out);
    r=cli('project','list');assert.match(r.out,/Windows E drive/);
    const local=JSON.parse(readFileSync(join(org,'.local','machine.json'),'utf8'));
    assert.equal(local.projects.length,1);
    assert.equal(local.projects[0].local_path,b);
  }finally{rmSync(work,{force:true,recursive:true});}
});
