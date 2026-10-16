import test from 'node:test';
import assert from 'node:assert/strict';
import {planSetup,meetsNode24,portableInvocation,requirements} from '../src/dependencies.ts';

const withAll=(over={})=>Object.assign({git:{present:true,version:'git version 2.47.0'},node:{present:true,version:'v24.2.0'},openmausbot:{present:true,version:'openmausbot'},codex:{present:true,version:'codex 1.0'},gh:{present:true,version:'gh version 2.0'},ffmpeg:{present:true,version:'ffmpeg version 7'}},over);

test('Node version detection respects minimum required by MausBot',()=>{
  assert.equal(meetsNode24('v22.16.0'),false);
  assert.equal(meetsNode24('v24.0.0'),true);
  assert.equal(meetsNode24('v25.0.1'),true);
  assert.equal(meetsNode24('not found'),false);
});
test('no work if dependencies are already installed',()=>{
  const plan=planSetup('darwin',true,withAll(),'all');
  assert.equal(plan.steps.length,0);assert.equal(plan.blocked.length,0);assert.equal(plan.satisfied.length,6);
});
test('macOS uses allowlisted Homebrew packages and defers npm until Node 24',()=>{
  const p=planSetup('darwin',true,withAll({node:{present:true,version:'v22.16.0'},git:{present:false},openmausbot:{present:false},codex:{present:false}}),'core');
  assert.deepEqual(p.steps.map(s=>s.command),['brew','brew','brew']);
  assert.equal(p.steps[1].args.at(-1),'node@24');
  assert.match(p.blocked.join(' '),/openmausbot.*Node 24/);
});
test('Windows uses winget for missing dev tools and npm for CLI',()=>{
  const p=planSetup('win32',true,withAll({git:{present:false},openmausbot:{present:false},codex:{present:false},gh:{present:false}}),'development');
  assert.equal(p.steps.filter(s=>s.command==='winget').length,2);
  assert.equal(p.steps.filter(s=>s.command==='npm').length,2);
  assert.ok(p.steps.every(s=>!s.args.includes('https://malicious.test')));
});
test('unavailable manager never falls back to arbitrary install scripts',()=>{
  const p=planSetup('darwin',false,withAll({node:{present:false},git:{present:false}}),'core');
  assert.equal(p.steps.length,0);
  assert.ok(p.blocked.length>=2);
});
test('profiles are complete and stable',()=>{
  assert.equal(requirements.core.length,4);
  assert.equal(requirements.all.length,6);
});
test('Windows npm command shims use a fixed PowerShell invocation',()=>{
  const invocation=portableInvocation('openmausbot',['team','apply','path with spaces/core.yaml','--dry-run'],'win32');
  assert.equal(invocation.program,'powershell.exe');
  assert.deepEqual(invocation.args.slice(0,3),['-NoProfile','-NonInteractive','-Command']);
  assert.match(invocation.args[3],/openmausbot\.cmd/);
  assert.match(invocation.args[3],/'path with spaces\/core\.yaml'/);
  assert.equal(portableInvocation('git',['--version'],'win32').program,'git');
});
