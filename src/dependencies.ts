/** Carefully allowlisted cross-platform dependency installer. No curl|sh or arbitrary commands. */
import { spawnSync } from 'node:child_process';

type Platform = 'darwin' | 'win32' | 'linux' | string;
export type SetupProfile = 'core' | 'development' | 'media' | 'all';
export type DependencyId = 'git' | 'node' | 'openmausbot' | 'codex' | 'gh' | 'ffmpeg';
export type Probe = { present: boolean; version?: string; detail?: string };
export type PlannedStep = { id: DependencyId; action: string; command: string; args: string[]; reason: string; restartShell?: boolean };
export type PlanningResult = { steps: PlannedStep[]; blocked: string[]; satisfied: DependencyId[] };

export const requirements: Record<SetupProfile, DependencyId[]> = {
  core: ['git', 'node', 'openmausbot', 'codex'],
  development: ['git', 'node', 'openmausbot', 'codex', 'gh'],
  media: ['git', 'node', 'openmausbot', 'codex', 'ffmpeg'],
  all: ['git', 'node', 'openmausbot', 'codex', 'gh', 'ffmpeg'],
};

/** Returns major.minor.patch where possible; npm prerelease suffixes ignored for constraint checks. */
export function versionFromText(t: string): number[] | null {
  const m=t.match(/(?:^|\s|v)(\d+)\.(\d+)(?:\.(\d+))?/i);
  return m ? [Number(m[1]),Number(m[2]),Number(m[3]||0)] : null;
}
export function meetsNode24(version: string): boolean { const v=versionFromText(version);return !!v && v[0] >= 24; }

/** Resolve npm-installed Windows command shims without enabling a general shell. */
export function portableInvocation(command:string,argv:string[],platform:Platform=process.platform):{program:string;args:string[]} {
  if(platform!=='win32'||!['openmausbot','codex'].includes(command))return {program:command,args:argv};
  const quote=(value:string)=>`'${value.replaceAll("'","''")}'`;
  const script=`& ${quote(command+'.cmd')} ${argv.map(quote).join(' ')}; exit $LASTEXITCODE`;
  return {program:'powershell.exe',args:['-NoProfile','-NonInteractive','-Command',script]};
}

/** The CLI is intentionally inspect-only for existing programs; it never auto-upgrades codex/mausbot. */
export function planSetup(platform: Platform, hasManager: boolean, detected: Record<DependencyId, Probe>, profile: SetupProfile): PlanningResult {
  const steps: PlannedStep[]=[];const blocked: string[]=[];const satisfied:DependencyId[]=[];
  const missing=(id:DependencyId)=> !detected[id]?.present || (id==='node'&&!meetsNode24(detected.node.version||''));
  for(const id of requirements[profile]) {
    if(!missing(id)){satisfied.push(id);continue;}
    if(platform==='linux') { blocked.push(`${id}: automatic packages are currently supported on macOS (Homebrew) and Windows (winget); use your distro's signed package manager.`);continue; }
    if((id==='node'||id==='git'||id==='gh'||id==='ffmpeg'||(id==='codex'&&platform==='darwin'))&&!hasManager){
      blocked.push(`${id}: ${platform==='darwin'?'Homebrew':'winget'} not detected. Install/repair that official package manager first; no remote installer scripts will be executed.`);continue;
    }
    if(id==='openmausbot') {
      if(!detected.node.present || !meetsNode24(detected.node.version||'')) {blocked.push('openmausbot: Node 24+ must be available in a new terminal before global CLI install; re-run setup afterward.');continue;}
      steps.push({id,action:'Install official npm CLI',command:'npm',args:['install','--global','openmausbot'],reason:'Native declarative team apply is needed'});continue;
    }
    if(id==='codex' && platform==='win32') {
      if(!detected.node.present || !meetsNode24(detected.node.version||'')){blocked.push('codex: restart terminal with Node 24+ and re-run setup.');continue;}
      steps.push({id,action:'Install official Codex CLI',command:'npm',args:['install','--global','@openai/codex'],reason:'Codex agent engine'});continue;
    }
    if(platform==='darwin') {
      const packages:Record<DependencyId,string>={git:'git',node:'node@24',openmausbot:'',codex:'codex',gh:'gh',ffmpeg:'ffmpeg'};
      steps.push({id,action:'Install via Homebrew',command:'brew',args:['install',...(id==='codex'?['--cask']:[]),packages[id]],reason:id==='node'?'Node 24+ required for OpenMausBot':`Missing ${id}`,restartShell:id==='node'});
    } else if(platform==='win32') {
      const ids:Record<DependencyId,string>={git:'Git.Git',node:'OpenJS.NodeJS.LTS',openmausbot:'',codex:'',gh:'GitHub.cli',ffmpeg:'Gyan.FFmpeg'};
      steps.push({id,action:'Install via winget',command:'winget',args:['install','--exact','--id',ids[id],'--accept-package-agreements','--accept-source-agreements','--disable-interactivity'],reason:id==='node'?'Node 24+ needed (check installed version after install)':`Missing ${id}`,restartShell:true});
    }
  }
  return {steps,blocked,satisfied};
}

/** spawn uses no shell except the fixed npm.cmd command on Windows. */
export function execAllowed(command: string, argv: string[], opts: {cwd?:string; quiet?:boolean}={}) {
  const safe = new Set(['git','node','openmausbot','codex','gh','ffmpeg','brew','winget','npm']);
  if(!safe.has(command))throw Error(`Non-allowlisted installer command: ${command}`);
  let program=command;let args=argv;
  if(process.platform==='win32' && command==='npm') {
    // Only two predefined npm installation commands are allowed. Avoid shell injection.
    const pkg=argv.at(-1);
    if(argv.length!==3||argv[0]!=='install'||argv[1]!=='--global'||!['openmausbot','@openai/codex'].includes(pkg||''))throw Error('Disallowed Windows npm invocation');
    program='cmd.exe';args=['/d','/s','/c',`npm install --global ${pkg}`];
  }
  return spawnSync(program,args,{cwd:opts.cwd,encoding:'utf8',timeout:180000,shell:false,stdio:opts.quiet?'pipe':'inherit'});
}

export function probeDependencies():Record<DependencyId,Probe> {
  function probe(cmd:string,args:string[],versionCheck?:(s:string)=>boolean):Probe {
    const invocation=portableInvocation(cmd,args);
    const r=spawnSync(invocation.program,invocation.args,{encoding:'utf8',timeout:10000,shell:false});
    const output=((r.stdout||'')+'\n'+(r.stderr||'')).trim();
    return {present:r.status===0 && (!versionCheck||versionCheck(output)),version:output.split('\n')[0]?.slice(0,140),detail:r.error?.message};
  }
  const checks:Record<DependencyId,Probe>={
    git:probe('git',['--version']),
    node:probe('node',['--version']),
    openmausbot:probe('openmausbot',['--help']),
    codex:probe('codex',['--version']),
    gh:probe('gh',['--version']),
    ffmpeg:probe('ffmpeg',['-version']),
  };
  return checks;
}

/** Refresh PATH after package-manager installers without running arbitrary installer scripts. */
function refreshInstalledPath(platform:string) {
  if(platform==='darwin') {
    const r=spawnSync('brew',['--prefix','node@24'],{encoding:'utf8',timeout:10000});
    if(r.status===0 && r.stdout?.trim())process.env.PATH=`${r.stdout.trim()}/bin:${process.env.PATH||''}`;
  } else if(platform==='win32') {
    const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"],{encoding:'utf8',timeout:10000});
    if(r.status===0&&r.stdout?.trim())process.env.PATH=`${r.stdout.trim()};${process.env.PATH||''}`;
  }
}

export async function setupDependencies(profile:SetupProfile,dryRun:boolean):Promise<number> {
  const manager=process.platform==='darwin'?'brew':process.platform==='win32'?'winget':'';
  const managerPresent=!!manager&&spawnSync(manager,['--version'],{encoding:'utf8',timeout:8000}).status===0;
  console.log(`Platform: ${process.platform} ${process.arch}; profile: ${profile}`);
  const initial=probeDependencies();
  console.log('Current dependencies:');
  for(const id of requirements[profile])console.log(`  ${id}: ${initial[id].present?(id==='node'&&!meetsNode24(initial[id].version||'')?'present but below Node 24':initial[id].version||'present'):'not detected'}`);
  const plan=planSetup(process.platform,managerPresent,initial,profile);
  if(!plan.steps.length&&!plan.blocked.length){console.log('All requested tools detected. Authenticate providers and check MausBot connectivity separately.');return 0;}
  for(const s of plan.steps)console.log(`${dryRun?'WOULD INSTALL':'INSTALL'} ${s.id}: ${s.command} ${s.args.join(' ')}`);
  for(const line of plan.blocked)console.log(`PENDING: ${line}`);
  if(dryRun) {console.log('Dry run: no changes made.');return plan.blocked.length?2:0;}
  const attempted=new Set<DependencyId>();let failures=0;
  // Second planning pass picks up npm CLI installers after Node 24 becomes available.
  for(let pass=0;pass<3;pass++) {
    const current=probeDependencies();
    const round=planSetup(process.platform,managerPresent,current,profile);
    const next=round.steps.filter(s=>!attempted.has(s.id));
    if(!next.length)break;
    for(const s of next) {
      attempted.add(s.id);
      if(s.command==='npm'&&!meetsNode24(probeDependencies().node.version||'')) {
        console.log(`DEFERRED ${s.id}: Node 24+ not yet on PATH. Open a new terminal and re-run setup.`);failures++;continue;
      }
      console.log(`Installing ${s.id} via ${s.action}...`);
      const result=execAllowed(s.command,s.args);
      if(result.error||result.status!==0){console.error(`FAILED ${s.id}: ${result.error?.message||`exit ${result.status}`}`);failures++;}
      else {console.log(`Installer completed for ${s.id}.`);if(s.restartShell)refreshInstalledPath(process.platform);}
    }
  }
  const after=probeDependencies();
  for(const id of requirements[profile]) if(!after[id].present || (id==='node'&&!meetsNode24(after.node.version||''))) {
    console.log(`UNVERIFIED ${id}: check installation or open a new terminal and re-run setup.`);
    failures++;
  }
  console.log('Provider authentication is separate. No credentials were requested or stored by ai-org setup.');
  return failures?2:0;
}
