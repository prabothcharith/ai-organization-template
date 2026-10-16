import {existsSync,lstatSync,realpathSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';

function normalizedRealPath(path:string):string {
  const native=(realpathSync as typeof realpathSync & {native?:(p:string)=>string}).native;
  let value=(native?native(path):realpathSync(path)).replaceAll('\\','/').replace(/^\/\/?\?\//,'');
  value=value.replace(/\/$/,'');
  return process.platform==='win32'?value.toLowerCase():value;
}

/** Compare filesystem identity, tolerating Windows case, separator and short/long-path spelling. */
export function sameLocation(a:string,b:string):boolean {
  try {
    const left=statSync(a),right=statSync(b);
    if(left.dev===right.dev&&left.ino!==0&&left.ino===right.ino)return true;
  } catch { return false; }
  try {return normalizedRealPath(a)===normalizedRealPath(b);} catch {return false;}
}

/** Reject symlinks in fixed internal metadata paths before reading or writing through them. */
export function assertNoInternalSymlinks(root:string,relativePaths:string[]):void {
  const base=resolve(root);
  for(const rel of relativePaths) {
    let current=base;
    for(const part of rel.replaceAll('\\','/').split('/').filter(Boolean)) {
      current=join(current,part);
      if(!existsSync(current))break;
      if(lstatSync(current).isSymbolicLink())throw Error(`Unsafe symlink in project metadata path: ${rel}`);
    }
  }
}
