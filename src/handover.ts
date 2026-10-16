/** Guarded Git checkpoint for a Chief-confirmed idle project. Does not stop running agents itself. */
import {existsSync,readFileSync,mkdirSync,writeFileSync,statSync} from 'node:fs';
import {join,basename,isAbsolute} from 'node:path';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {assertNoInternalSymlinks,sameLocation} from './paths.ts';

function git(root:string,args:string[],allowed=[0],raw=false):{status:number;stdout:string;stderr:string} {
  const r=spawnSync('git',args,{cwd:root,encoding:'utf8',timeout:120000,shell:false});
  const status=r.status??-1;
  if(!allowed.includes(status))throw Error(`Git ${args.slice(0,2).join(' ')} failed (${status}): ${(r.stderr||r.error?.message||'').slice(0,300)}`);
  return {status,stdout:raw?(r.stdout||''):(r.stdout||'').trim(),stderr:(r.stderr||'').trim()};
}
function prohibitedBranch(name:string):boolean {return /^(main|master|production|prod|release|stable|develop)(?:$|[\/._-])/i.test(name);}
function normalizeRemote(remote:string):string {
  const trimmed=remote.trim().replace(/\.git$/i,'');
  const ssh=trimmed.match(/^git@([^:]+):(.+)$/);
  if(ssh)return `${ssh[1].toLowerCase()}/${ssh[2]}`;
  try {const url=new URL(trimmed);return `${url.hostname.toLowerCase()}${url.pathname}`.replace(/\/$/,'');} catch {return trimmed.replaceAll('\\','/');}
}
function safeFileName(name:string):boolean {
  const normalized=name.replaceAll('\\','/');const leaf=basename(normalized).toLowerCase();
  if(/(^|\/)\.env($|[.\/])|(^|\/)\.local(\/|$)|(^|\/)node_modules(\/|$)|(^|\/)\.git(\/|$)/i.test(normalized))return false;
  if(/^(\.npmrc|\.pypirc|id_rsa|id_ed25519|credentials\.json|service-account\.json|secrets?\.ya?ml|\.netrc)$/i.test(leaf))return false;
  if(/\.(pem|p12|pfx|key|keystore|db|sqlite3?)$/i.test(leaf))return false;
  return true;
}
function validateContent(name:string,data:Buffer):void {
  if(data.length>10*1024*1024)throw Error(`File exceeds 10 MiB Git checkpoint guard: ${name}. Store large media separately.`);
  if(data.includes(0))return;
  const content=data.toString('utf8');
  const signatures=[/-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----/,/github_pat_[A-Za-z0-9_]{15,}/,/ghp_[A-Za-z0-9]{20,}/,/npm_[A-Za-z0-9]{20,}/,/sk-[A-Za-z0-9_-]{24,}/,/AKIA[0-9A-Z]{16}/];
  if(signatures.some(re=>re.test(content)))throw Error(`Potential credential pattern in ${name}. Not safe to push automatically.`);
}
function validatePotentialFiles(root:string,files:string[]):void {
  for(const f of files) {
    if(!safeFileName(f))throw Error(`Possible secret or excluded path: ${f}. Exclude it before handover.`);
    const path=join(root,f);
    if(!existsSync(path)||!statSync(path).isFile())continue;
    validateContent(f,readFileSync(path));
  }
}
function candidates(root:string):string[] {
  const commands=[['ls-files','-m','-z'],['ls-files','-o','--exclude-standard','-z'],['diff','--cached','--name-only','-z']];
  const names=new Set<string>();
  for(const argv of commands)for(const p of git(root,argv,[0],true).stdout.split('\0'))if(p)names.add(p);
  return [...names];
}
function validateOutgoingCommits(root:string,remoteHead:string|null,head:string):void {
  const range=remoteHead?`${remoteHead}..${head}`:head;
  const commits=git(root,['rev-list','--reverse',range]).stdout.split('\n').filter(Boolean);
  for(const commit of commits) {
    const names=git(root,['diff-tree','--root','--no-commit-id','--name-only','-r','-z',commit],[0],true).stdout.split('\0').filter(Boolean);
    for(const name of names) {
      if(!safeFileName(name))throw Error(`Possible secret or excluded path in outgoing history: ${name}. Rewrite or remove it before handover.`);
      const entry=git(root,['ls-tree','-z',commit,'--',name],[0],true).stdout.split('\0').find(Boolean);
      if(!entry)continue;
      const tab=entry.indexOf('\t');const metadata=tab>=0?entry.slice(0,tab):'';
      const oid=metadata.split(/\s+/)[2];if(!oid)throw Error(`Could not inspect outgoing Git object for ${name}.`);
      const size=Number(git(root,['cat-file','-s',oid]).stdout);
      if(size>10*1024*1024)throw Error(`File exceeds 10 MiB Git checkpoint guard in outgoing history: ${name}.`);
      const blob=spawnSync('git',['cat-file','blob',oid],{cwd:root,encoding:null,timeout:120000,maxBuffer:11*1024*1024,shell:false});
      if(blob.status!==0||!blob.stdout)throw Error(`Could not read outgoing Git object for ${name}.`);
      validateContent(name,blob.stdout);
    }
  }
}
export type HandoverOptions = {root:string;projectId:string;expectedRemote:string;summary:string;push:boolean;agentsIdle:boolean};
export function prepareHandover({root,projectId,expectedRemote,summary,push,agentsIdle}:HandoverOptions):string {
  if(!agentsIdle)throw Error('Refusing checkpoint while agent activity is unverified. Chief must pause/finish active workers before passing --agents-idle.');
  if(!summary.trim())throw Error('A human-readable summary is required.');
  if(!push)throw Error('This checkpoint command requires explicit --push authorization.');
  const branch=git(root,['symbolic-ref','--quiet','--short','HEAD'],[0,1]).stdout;
  if(!branch)throw Error('Detached HEAD is not eligible for automatic handover push.');
  if(prohibitedBranch(branch))throw Error(`Refusing automatic handover push to protected-looking branch '${branch}'. Use a working branch or request a separate protected action approval.`);
  const remote=git(root,['remote','get-url','origin'],[0,2]);
  const pushRemote=git(root,['remote','get-url','--push','origin'],[0,2]);
  if(remote.status!==0||!remote.stdout||pushRemote.status!==0||!pushRemote.stdout)throw Error('Remote origin is missing.');
  if(!expectedRemote||normalizeRemote(remote.stdout)!==normalizeRemote(expectedRemote)||normalizeRemote(pushRemote.stdout)!==normalizeRemote(expectedRemote))throw Error('Current origin fetch/push destination differs from the registered remote. Re-attach explicitly before publishing.');
  const path=git(root,['rev-parse','--show-toplevel']).stdout;
  if(!sameLocation(path,root))throw Error('Registered directory is not the Git repository root.');
  assertNoInternalSymlinks(root,['.agents','.agents/state','.agents/state/CURRENT.md','.agents/handover','.agents/handover/CURRENT.md','.agents/handover/history']);
  for(const operation of ['MERGE_HEAD','rebase-merge','rebase-apply','CHERRY_PICK_HEAD']) {
    const opPath=git(root,['rev-parse','--git-path',operation]).stdout;
    if(opPath&&existsSync(isAbsolute(opPath)?opPath:join(root,opPath)))throw Error(`Unfinished Git operation (${operation}). Resolve it before handover.`);
  }
  const previousHead=git(root,['rev-parse','HEAD']).stdout;
  const remoteResult=git(root,['ls-remote','--exit-code','origin',`refs/heads/${branch}`],[0,2]);
  const remoteHead=remoteResult.status===0?remoteResult.stdout.split(/\s+/)[0]:null;
  if(remoteHead) {
    git(root,['fetch','--quiet','origin',branch]);
    const ancestor=git(root,['merge-base','--is-ancestor',remoteHead,previousHead],[0,1]);
    if(ancestor.status!==0)throw Error('Remote has commits absent locally. Fetch/reconcile first; no force-push or implicit overwrite.');
  }
  validateOutgoingCommits(root,remoteHead,previousHead);
  const dirty=git(root,['status','--porcelain']).stdout;
  const existing=join(root,'.agents','handover','CURRENT.md');
  if(!dirty&&existsSync(existing)&&remoteHead===previousHead)return `Existing verified Git checkpoint remains current at ${previousHead}; no new handover needed.`;
  if(!dirty&&existsSync(existing)&&remoteHead!==previousHead) {
    const old=readFileSync(existing,'utf8');
    if(old.includes(`- Branch: \`${branch}\``) && old.includes('- Status: checkpoint prepared;')) {
      git(root,['push','origin',`HEAD:refs/heads/${branch}`]);
      const receipt=git(root,['ls-remote','--exit-code','origin',`refs/heads/${branch}`],[0,2]);
      if(receipt.status===0&&receipt.stdout.split(/\s+/)[0]===previousHead)return `Existing checkpoint push recovered and verified: ${previousHead}.`;
      throw Error('Recovered handover push could not be verified.');
    }
  }
  validatePotentialFiles(root,candidates(root));
  const id=randomUUID();const createdAt=new Date().toISOString();
  const dir=join(root,'.agents','handover');mkdirSync(join(dir,'history'),{recursive:true});
  const currentState=join(root,'.agents','state','CURRENT.md');
  const fullState=existsSync(currentState)?readFileSync(currentState,'utf8'):'';
  const state=fullState?(fullState.length>6000?fullState.slice(0,6000)+'\n\n[Excerpt only. Full .agents/state/CURRENT.md is authoritative.]':fullState):'No current project state file; audit/recovery needed.';
  const content=`# Project handover\n\n- Handover ID: \`${id}\`\n- Project: \`${projectId}\`\n- Created: ${createdAt}\n- Branch: \`${branch}\`\n- Pre-checkpoint HEAD: \`${previousHead}\`\n- Status: checkpoint prepared; verify remote push receipt before claiming success\n- Active worker state: confirmed idle by authorized Chief/caller\n\n## Summary of changes and remaining work\n\n${summary.trim()}\n\n## Latest recorded project status\n\n${state}\n\n## Resume instructions\n\n1. Identify the local checkout and check its origin and branch.\n2. Fetch/pull safely; do not overwrite local uncommitted work.\n3. Read this handover, .agents/state/CURRENT.md, active tasks and accepted decisions.\n4. Verify the actual Git HEAD and externally consequential action receipts.\n5. Continue unfinished tasks; never replay already completed work.\n\n> This record does not authorize protected merges, NPM publishing or production deployment.\n`;
  validatePotentialFiles(root,candidates(root)); // do not bypass checks by writing first
  const history=join(dir,'history',`${createdAt.replace(/[:.]/g,'-')}-${id}.md`);
  writeFileSync(history,content,{flag:'wx'});
  writeFileSync(existing,content);
  validatePotentialFiles(root,candidates(root));
  git(root,['add','-A','--','.']);
  // Check staged names too, including paths staged before command invocation.
  const staged=git(root,['diff','--cached','--name-only','-z'],[0],true).stdout.split('\0').filter(Boolean);
  validatePotentialFiles(root,staged);
  git(root,['diff','--cached','--check']);
  git(root,['commit','-m',`chore(agents): verified handover ${id.slice(0,8)}`]);
  const head=git(root,['rev-parse','HEAD']).stdout;
  validateOutgoingCommits(root,remoteHead,head);
  git(root,['push','origin',`HEAD:refs/heads/${branch}`]);
  const verification=git(root,['ls-remote','--exit-code','origin',`refs/heads/${branch}`],[0,2]);
  const published=verification.stdout.split(/\s+/)[0];
  if(verification.status!==0||published!==head)throw Error(`Push verification failed: local ${head}, remote ${published||'(missing)'}. Handover remains uncertain.`);
  return `Handover pushed and verified. Project=${projectId}; branch=${branch}; checkpoint=${id}; commit=${head}; remote HEAD=${published}.`;
}
