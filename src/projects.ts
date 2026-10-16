/** Safe, non-destructive project audit and .agents initialization. */
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync} from 'node:fs';
import {join,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {assertNoInternalSymlinks} from './paths.ts';

function git(root:string,args:string[]):string {
  const r=spawnSync('git',args,{cwd:root,encoding:'utf8',timeout:12000,shell:false});
  return r.status===0?(r.stdout||'').trim():'';
}
function readPackage(root:string):Record<string,unknown>|undefined {
  try {return JSON.parse(readFileSync(join(root,'package.json'),'utf8'));}catch{return undefined;}
}
function fileExists(root:string,p:string):boolean {return existsSync(join(root,p));}
function now(){return new Date().toISOString();}
function quoteYaml(v:string):string {return JSON.stringify(v);}
export function auditReport(root:string, projectId:string, remote:string):string {
  const branch=git(root,['branch','--show-current'])||'(detached)';
  const head=git(root,['rev-parse','HEAD'])||'(unknown)';
  const dirty=git(root,['status','--porcelain','--untracked-files=normal']);
  const recent=git(root,['log','-8','--date=short','--format=%h %ad %s']);
  const p=readPackage(root);
  const top=readdirSync(root,{withFileTypes:true}).filter(d=>!d.name.startsWith('.')&&d.name!=='node_modules').map(d=>d.name+(d.isDirectory()?'/':''));
  const existing=['AGENTS.md','.agents/README.md','.agents/project.yaml','README.md','docs/','Dockerfile','.github/workflows/','pom.xml','build.gradle','package.json','pnpm-lock.yaml','yarn.lock','package-lock.json'].filter(s=>fileExists(root,s));
  const lang:string[]=[];
  if(p)lang.push('Node.js / JavaScript or TypeScript (package.json detected)');
  if(fileExists(root,'pom.xml'))lang.push('Java / Maven');
  if(fileExists(root,'build.gradle'))lang.push('Gradle');
  if(fileExists(root,'requirements.txt')||fileExists(root,'pyproject.toml'))lang.push('Python');
  const status=dirty?'Has uncommitted changes (inspect before writes)':'Clean';
  return `# Existing project onboarding audit\n\n- Generated: ${now()}\n- Project ID: \`${projectId.replaceAll('`','')}\`\n- Repository: \`${remote.replaceAll('`','')}\`\n- Local root: intentionally omitted (machine-specific)\n- Branch: \`${branch}\`\n- Git HEAD: \`${head}\`\n- Working tree: ${status}\n\n## Detected technology signals\n${lang.length?lang.map(x=>`- ${x}`).join('\n'):'- No recognized top-level package manager metadata; deeper review required.'}\n\n## Top-level inventory\n${top.slice(0,80).map(s=>`- \`${s.replaceAll('`','')}\``).join('\n')||'- (empty)'}\n\n## Existing context and automation\n${existing.map(x=>`- \`${x}\``).join('\n')||'- No standard project instruction files detected.'}\n\n## Recent Git history (not proof of feature completion)\n\`\`\`text\n${recent||'(none)'}\n\`\`\`\n\n## Status of verified features\n\nNot determined by this static scan. The Architect or QA must inspect source, run tests, review relevant issues and record verified outcomes before declaring features complete.\n\n## Required audit-first follow-ups\n\n1. Review existing instructions, architecture and recent Git changes.\n2. Inspect and validate claimed completed features; document evidence.\n3. Identify unfinished, blocked and planned work without guessing.\n4. Review open issues/PRs when GitHub is accessible.\n5. Initialize missing portable ".agents" files without replacing existing files.\n6. Confirm project identity before assigning agents.\n\n> Generated automatically by ai-org. Findings are inventory signals, not a full AI code review.\n`;
}
export function saveAudit(root:string,report:string):string {
  assertNoInternalSymlinks(root,['.agents','.agents/audit','.agents/audit/initial-audit.md']);
  const dir=join(root,'.agents','audit');mkdirSync(dir,{recursive:true});
  const f=join(dir,'initial-audit.md');
  if(existsSync(f))throw Error('An initial audit already exists. Review it before updating manually; no overwrite was performed.');
  writeFileSync(f,report,{flag:'wx'});return f;
}
/** Only writes missing files, requires a saved initial audit, never overwrites existing AGENTS.md. */
export function initializeProject(root:string,templateRoot:string,id:string,remote:string):string[] {
  assertNoInternalSymlinks(root,['.agents','.agents/audit','.agents/audit/initial-audit.md','.agents/project.yaml','.agents/state','.agents/handover']);
  if(!existsSync(join(root,'.agents','audit','initial-audit.md')))throw Error('Audit-first policy: run project audit --id ID --save and review the report before project bootstrap.');
  const f=join(root,'.agents','project.yaml');
  if(existsSync(f)) {
    const existing=readFileSync(f,'utf8');
    if(!existing.includes(id))throw Error('Existing .agents/project.yaml differs from registered project ID. No files changed.');
  }
  const created:string[]=[];
  for(const rel of ['AGENTS.md','.agents/README.md']) {
    const dest=join(root,rel);if(existsSync(dest))continue;
    mkdirSync(join(dest,'..'),{recursive:true});copyFileSync(join(templateRoot,rel),dest);created.push(rel);
  }
  if(!existsSync(f)) {
    mkdirSync(join(root,'.agents'),{recursive:true});
    writeFileSync(f,`schema_version: 1\nproject_id: ${quoteYaml(id)}\nname: ${quoteYaml(basename(root))}\nrepository: ${quoteYaml(remote)}\n`);created.push('.agents/project.yaml');
  }
  for(const dir of ['state','tasks','decisions','handover/history','research','reports','context'])mkdirSync(join(root,'.agents',dir),{recursive:true});
  const current=join(root,'.agents','state','CURRENT.md');
  if(!existsSync(current)){writeFileSync(current,`# Current project state\n\n- Initialized: ${now()}\n- Status: audit pending human/agent verification\n- Git: inspect current HEAD and branch before work\n- Next: review onboarding audit, accepted decisions and open tasks\n`);created.push('.agents/state/CURRENT.md');}
  const handover=join(root,'.agents','handover','CURRENT.md');
  if(!existsSync(handover)){writeFileSync(handover,`# Current handover\n\nNo verified handover has been prepared yet. Read the initial audit and Git state before resuming work.\n`);created.push('.agents/handover/CURRENT.md');}
  return created;
}
