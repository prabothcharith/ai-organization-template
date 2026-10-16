import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {validateAgentManifest} from '../src/manifests.ts';

test('all 22 manifests satisfy the portable manifest contract',()=>{
  const ids=readdirSync('agents',{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
  assert.equal(ids.length,22);
  for(const id of ids) {
    const value=JSON.parse(readFileSync(join('agents',id,'agent.json'),'utf8'));
    assert.deepEqual(validateAgentManifest(value,id),[],id);
  }
});

test('manifest validation rejects unsafe organization invariants',()=>{
  const value=JSON.parse(readFileSync('agents/engineering.backend/agent.json','utf8'));
  value.organization_concurrency_limit=999;value.permission_profile='';value.definition_ref='../catalog.yaml#other';
  const errors=validateAgentManifest(value,'engineering.backend').join(' ');
  assert.match(errors,/concurrency/);assert.match(errors,/permission_profile/);assert.match(errors,/definition_ref/);
});
