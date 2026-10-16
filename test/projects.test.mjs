import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {auditReport,saveAudit,initializeProject} from '../src/projects.ts';

const root=resolve('templates/project');
function tempRepo(){
  const p=mkdtempSync(join(tmpdir(),'ai-org-test-'));
  for(const args of [['init','-q'],['config','user.email','test@example.invalid'],['config','user.name','Test']]){
    const r=spawnSync('git',args,{cwd:p,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  }
  writeFileSync(join(p,'README.md'),'Existing docs\n');
  writeFileSync(join(p,'AGENTS.md'),'Existing project rules\n');
  writeFileSync(join(p,'package.json'),'\u007b"name":"sample","version":"0.1.0"\u007d\n');
  spawnSync('git',['add','.'],{cwd:p});spawnSync('git',['commit','-qm','Initial'],{cwd:p});
  return p;
}
test('audit is honest inventory and excludes machine path',()=>{
  const dir=tempRepo();try{
    const result=auditReport(dir,'project-1','github.com/example/project');
    assert.match(result,/Node.js/);
    assert.match(result,/not proof of feature completion/);
    assert.ok(!result.includes(dir));
  }finally{rmSync(dir,{force:true,recursive:true});}
});
test('bootstrap is audit gated and cannot overwrite user AGENTS.md',()=>{
  const dir=tempRepo();try{
    assert.throws(()=>initializeProject(dir,root,'project-1','github.com/example/project'),/Audit-first/);
    const report=auditReport(dir,'project-1','github.com/example/project');saveAudit(dir,report);
    assert.throws(()=>saveAudit(dir,report),/already exists/);
    const created=initializeProject(dir,root,'project-1','github.com/example/project');
    assert.ok(created.includes('.agents/project.yaml'));
    assert.equal(readFileSync(join(dir,'AGENTS.md'),'utf8'),'Existing project rules\n');
    assert.ok(existsSync(join(dir,'.agents','state','CURRENT.md')));
    assert.ok(existsSync(join(dir,'.agents','handover','CURRENT.md')));
    assert.deepEqual(initializeProject(dir,root,'project-1','github.com/example/project'),[]);
    assert.throws(()=>initializeProject(dir,root,'other-project','github.com/example/project'),/differs/);
  }finally{rmSync(dir,{force:true,recursive:true});}
});
test('bootstrap rejects .agents symlinks before writing outside the repository',()=>{
  const dir=tempRepo();const external=mkdtempSync(join(tmpdir(),'ai-org-external-'));
  try{
    symlinkSync(external,join(dir,'.agents'));
    assert.throws(()=>saveAudit(dir,'synthetic audit'),/unsafe symlink/i);
    assert.deepEqual(existsSync(join(external,'audit')),false);
  }finally{rmSync(dir,{force:true,recursive:true});rmSync(external,{force:true,recursive:true});}
});
