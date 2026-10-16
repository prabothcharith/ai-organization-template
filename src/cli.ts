#!/usr/bin/env -S node --experimental-strip-types
/** Portable ai-org foundation CLI. No runtime dependencies beyond Node.js. */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, realpathSync } from 'node:fs';
import { resolve, dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { setupDependencies, probeDependencies, meetsNode24, portableInvocation, type SetupProfile } from './dependencies.ts';
import { auditReport, saveAudit, initializeProject } from './projects.ts';
import { prepareHandover } from './handover.ts';
import { sameLocation } from './paths.ts';
import { validateAgentManifest } from './manifests.ts';
import { stdin as input, stdout as output } from 'node:process';

const repoRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const runtime = join(repoRoot, '.local');
const machineFile = join(runtime, 'machine.json');
const args = process.argv.slice(2);
type Registration = { id: string; local_path: string; remote: string; attached_at: string; audit_required: boolean };
type Registry = { schema_version: 1; organization_root: string; platform: string; created_at: string; projects: Registration[] };

function error(message: string): never { console.error('Error: ' + message); process.exit(1); }
function param(flag: string): string | undefined {
  const i=args.indexOf(flag);
  return i>=0?args[i+1]:undefined;
}
function has(flag:string): boolean { return args.includes(flag); }
function formatErr(e:unknown):string { return e instanceof Error?e.message:String(e); }
function run(command: string, argv: string[], cwd?: string, allowFailure = false) {
  const invocation=portableInvocation(command,argv);
  const result=spawnSync(invocation.program,invocation.args,{cwd,encoding:'utf8',shell:false});
  if (result.error && !allowFailure) error(`${command} unavailable: ${result.error.message}`);
  if (!allowFailure && result.status!==0) error(`${command} failed (${result.status??'unknown'}): ${(result.stderr||result.stdout||'').trim()}`);
  return result;
}
function git(argv:string[],cwd:string,allowFailure=false):string { return (run('git',argv,cwd,allowFailure).stdout||'').trim(); }
function load():Registry {
  if(!existsSync(machineFile)) error('Not initialized. Run: ai-org init');
  const state=JSON.parse(readFileSync(machineFile,'utf8')) as Registry;
  if(state.schema_version!==1 || !Array.isArray(state.projects))error('Invalid local machine registry');
  return state;
}
function save(state:Registry){ mkdirSync(runtime,{recursive:true});writeFileSync(machineFile,JSON.stringify(state,null,2)+'\n',{mode:0o600}); }
function normalizeRemote(remote:string):string {
  const trimmed=remote.trim().replace(/\.git$/i,'');
  const ssh=trimmed.match(/^git@([^:]+):(.+)$/);
  if(ssh)return `${ssh[1].toLowerCase()}/${ssh[2]}`;
  try { const u=new URL(trimmed); return `${u.hostname.toLowerCase()}${u.pathname}`.replace(/\/$/,''); } catch {return trimmed;}
}
function projectIdFromYaml(root:string):string|undefined {
  const f=join(root,'.agents','project.yaml');if(!existsSync(f))return undefined;
  return readFileSync(f,'utf8').match(/^project_id:\s*["']?([^\s"'#]+)["']?/m)?.[1];
}
async function ask(question:string, defaultValue=''):Promise<string>{
  const rl=createInterface({input,output});
  try {const ans=await rl.question(question+(defaultValue?` [${defaultValue}]`:'')+': ');return (ans.trim()||defaultValue).trim();}
  finally {rl.close();}
}
function help(){
  console.log(`ai-org cross-platform CLI (foundation v0.2.0)\n\nCommands:\n  init [--root PATH]           Configure local organization clone (chosen directory)\n  setup [--profile core|development|media|all] [--dry-run]  Install compatible dependencies using trusted package managers\n  doctor                       Check tools and all 22 agent manifests\n  project attach --path PATH [--id ID]   Register a Git checkout at any OS path\n  project list                 List local project registry\n  project audit --id ID [--save]       Inventory existing project; --save writes initial audit only\n  project bootstrap --id ID           Initialize missing .agents files after saved audit (never overwrite)\n  project attach --path PATH --rebind  Re-register a project moved to a different local path\n  project status --id ID       Show Git state and latest handover summary\n  project handover --id ID --summary TEXT --push --agents-idle   Guarded commit, push and remote verification\n  mausbot plan                 Native OpenMausBot team apply --dry-run for core 6\n  mausbot apply                Apply core 6 after interactive confirmation\n  help                         Show this help\n\nHandover command requires a Chief-confirmed idle project. Autonomous agent suspension, ownership leases, FTS5 indexing and encrypted backups are not yet implemented.\n`);
}
async function init(){
  const selected=resolve(param('--root')||await ask('Where is your cloned ai-organization directory?',repoRoot));
  if(!existsSync(selected))error(`Organization directory does not exist: ${selected}`);
  const chosen=realpathSync(selected);
  if(!existsSync(join(chosen,'agents')) || !existsSync(join(chosen,'teams')))error(`Not an ai-organization checkout: ${chosen}. Clone the repo there before running init.`);
  if(chosen!==repoRoot)error(`This CLI is running from ${repoRoot}. Run the CLI in your chosen organization clone (${chosen}) to avoid storing state in the wrong checkout.`);
  const state:Registry=existsSync(machineFile)?load():{schema_version:1,organization_root:repoRoot,platform:process.platform,created_at:new Date().toISOString(),projects:[]};
  state.organization_root=repoRoot;state.platform=process.platform;save(state);
  console.log(`Organization location: ${repoRoot}\nLocal registry: ${machineFile}\nProject folders remain anywhere you choose; no central projects folder is created.`);
}
function doctor(){
  console.log('Environment:',process.platform,process.arch,'Node',process.version);
  const gv=run('git',['--version'],undefined,true);
  console.log('Git:',gv.status===0?gv.stdout.trim():'not available');
  const nodeStatus=meetsNode24(process.version);
  console.log('OpenMausBot Node requirement:',nodeStatus?'met':'Node 24+ recommended; run setup');
  const ov=run('openmausbot',['--help'],undefined,true);
  console.log('Native OpenMausBot CLI:',ov.status===0?'available':'not detected or incompatible (install separately)');
  const ids=readdirSync(join(repoRoot,'agents'),{withFileTypes:true}).filter(x=>x.isDirectory()&&existsSync(join(repoRoot,'agents',x.name,'agent.json'))).map(x=>x.name);
  const invalid:string[]=[];
  for(const id of ids) {
    try {
      const manifest=JSON.parse(readFileSync(join(repoRoot,'agents',id,'agent.json'),'utf8'));
      const errors=validateAgentManifest(manifest,id);
      if(!existsSync(join(repoRoot,'agents',id,'SOUL.md')))errors.push('SOUL.md is missing');
      if(errors.length)invalid.push(`${id}: ${errors.join('; ')}`);
    } catch(e) {invalid.push(`${id}: ${formatErr(e)}`);}
  }
  const validCount=ids.length-invalid.length;
  console.log(`Agent definitions: ${validCount}/22 schema-valid`);
  for(const finding of invalid)console.log('  INVALID '+finding);
  console.log('Local registry:',existsSync(machineFile)?'initialized':'not initialized');
  console.log('MausBot integration: native team apply requires running authenticated instance and a compatible version');
  if(validCount!==22 || ids.length!==22 || gv.status!==0 || !nodeStatus || ov.status!==0)process.exitCode=1;
}
function attach(){
  const value=param('--path'); if(!value)error('Provide --path to an existing project repository');
  const dir=resolve(value);if(!existsSync(dir))error('Directory does not exist: '+dir);
  const discoveredRoot=git(['rev-parse','--show-toplevel'],dir);if(!discoveredRoot)error('Not inside a Git repository');
  // Preserve the user's machine-local path spelling (for example /var vs /private/var)
  // when it already names the repository root, while comparing canonical locations safely.
  const root=sameLocation(dir,discoveredRoot)?dir:discoveredRoot;
  const remote=git(['remote','get-url','origin'],root,true);
  const normalized=remote?normalizeRemote(remote):'';
  const declared=projectIdFromYaml(root);
  const provided=param('--id');
  if(declared&&declared!=='REPLACE_WITH_STABLE_ID' && provided && provided!==declared)error('Explicit project ID disagrees with .agents/project.yaml. Refusing to attach.');
  const id=declared&&declared!=='REPLACE_WITH_STABLE_ID'?declared:provided||normalized;
  if(!id)error('No .agents/project.yaml identity or Git origin; provide --id and later establish an authoritative remote');
  if(!/^[a-zA-Z0-9][a-zA-Z0-9._\/-]{0,199}$/.test(id))error('Invalid project ID: use alphanumerics, dots, slashes, underscores or hyphens');
  const state=load();const reg:Registration={id,local_path:root,remote:normalized,attached_at:new Date().toISOString(),audit_required:!existsSync(join(root,'.agents','README.md'))};
  const match=state.projects.findIndex(p=>p.id===id);
  if(match>=0 && state.projects[match].remote && normalized!==state.projects[match].remote)error(`Remote identity changed: ${state.projects[match].remote} vs ${normalized}. Refusing update.`);
  if(match>=0 && state.projects[match].local_path!==root) {
    if(!has('--rebind'))error(`Project ${id} is already registered at ${state.projects[match].local_path}. Pass --rebind after verifying the new local path.`);
    const prior=state.projects[match];
    if(prior.remote && normalized!==prior.remote)error(`Remote mismatch: ${prior.remote} vs ${normalized}. Refusing rebind.`);
    if(!normalized)error('Cannot rebind a repository that lacks an origin remote.');
  }
  if(match>=0)state.projects[match]=reg;else state.projects.push(reg);
  save(state);
  console.log(`Attached ${id}\nLocal path: ${root}\nRemote: ${normalized||'(none)'}\nAudit-first onboarding required: ${reg.audit_required?'yes':'no (validate existing records)'}`);
  console.log('No project files modified.');
}
function registeredProject():Registration {
  const id=param('--id');if(!id)error('Provide --id (see project list)');
  const p=load().projects.find(x=>x.id===id);if(!p)error('Unknown project: '+id);
  if(!existsSync(p.local_path))error('Registered path unavailable: '+p.local_path);
  return p;
}
function audit(){
  const p=registeredProject();
  const report=auditReport(p.local_path,p.id,p.remote);
  if(has('--save'))console.log('Saved audit report to '+saveAudit(p.local_path,report));
  else console.log(report);
  console.log(has('--save')?'Review the report, then run project bootstrap --id ID.':'Read-only audit. Use --save to create .agents/audit/initial-audit.md.');
}
function bootstrapProject(){
  const p=registeredProject();
  const created=initializeProject(p.local_path,join(repoRoot,'templates','project'),p.id,p.remote);
  const state=load(),i=state.projects.findIndex(x=>x.id===p.id);
  state.projects[i].audit_required=false;save(state);
  console.log('Created (existing files left untouched):\n'+(created.map(x=>'  '+x).join('\n')||'  (nothing new)'));
  console.log('Audit-first documentation initialization is complete; detailed source/feature verification is still required.');
}
function handover(){
  const p=registeredProject();
  const summary=param('--summary');if(!summary)error('Provide a summary of completed, incomplete and next steps using --summary');
  const result=prepareHandover({root:p.local_path,projectId:p.id,expectedRemote:p.remote,summary,push:has('--push'),agentsIdle:has('--agents-idle')});
  console.log(result);
}
function list(){
  const state=load();if(!state.projects.length)return console.log('No projects registered.');
  for(const p of state.projects)console.log(`${p.id}\n  ${p.local_path}\n  remote: ${p.remote||'(none)'} | audit needed: ${p.audit_required?'yes':'no'}`);
}
function status(){
  const id=param('--id'); if(!id)error('Provide --id (see project list)');
  const p=load().projects.find(x=>x.id===id);if(!p)error('Unknown project: '+id);
  if(!existsSync(p.local_path))error('Registered path unavailable on this computer: '+p.local_path);
  console.log(`Project: ${id}\nPath: ${p.local_path}\nBranch: ${git(['branch','--show-current'],p.local_path)}\nHEAD: ${git(['rev-parse','HEAD'],p.local_path)}`);
  const dirty=git(['status','--porcelain'],p.local_path);console.log('Uncommitted changes:',dirty?'yes':'no');
  if(dirty)console.log(dirty.split('\n').slice(0,12).join('\n'));
  const handover=join(p.local_path,'.agents','handover','CURRENT.md');
  if(existsSync(handover)) console.log('\nLatest handover:\n'+readFileSync(handover,'utf8').slice(0,3000));
  else console.log('\nNo .agents/handover/CURRENT.md. Audit/initialization required.');
  console.log('Remote changes not fetched by this read-only command; use Git fetch and check upstream before resumption.');
}
async function mausbot(action:string){
  const team=join(repoRoot,'teams','core.yaml');
  const argv=['team','apply',team];
  if(action==='plan')argv.push('--dry-run');
  if(action==='apply'){
    console.log('This may create or update the six core bots in your currently running MausBot workspace.');
    console.log('Inspect `ai-org mausbot plan` and existing permissions first. No prune flag is used.');
    const confirmation=await ask('Type APPLY to continue');
    if(confirmation!=='APPLY'){console.log('Cancelled.');return;}
  }
  const result=run('openmausbot',argv,undefined,true);
  if(result.stdout)process.stdout.write(result.stdout);
  if(result.stderr)process.stderr.write(result.stderr);
  if(result.error)error('OpenMausBot CLI not available: '+result.error.message);
  if(result.status!==0)process.exitCode=result.status??1;
}
const command=args[0]||'help';
try{
  switch(command){
    case 'help':case '--help':help();break;
    case 'init':await init();break;
    case 'doctor':doctor();break;
    case 'setup':{
      const p=(param('--profile')||'core') as SetupProfile;
      if(!['core','development','media','all'].includes(p))error('Invalid profile. Use core, development, media or all.');
      process.exitCode=await setupDependencies(p,has('--dry-run'));break;
    }
    case 'project':
      switch(args[1]){case 'attach':attach();break;case 'list':list();break;case 'status':status();break;case 'audit':audit();break;case 'bootstrap':bootstrapProject();break;case 'handover':handover();break;default:error('Unknown project subcommand. Use help.');}break;
    case 'mausbot':
      if(args[1]==='plan'||args[1]==='apply')await mausbot(args[1]);
      else error('Use mausbot plan or mausbot apply');
      break;
    default:error('Unknown command. Use help.');
  }
}catch(e){error(formatErr(e));}
