import {resolve} from "node:path";
import {closeSync,openSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {openDatabase} from "../packages/db/index.ts";

export function createWakeFixture(path:string,dueAt:string){
 const due=Date.parse(dueAt);
 if(!Number.isFinite(due)||due<=Date.now()) throw Error("A future due time is required");
 closeSync(openSync(path,"wx",0o600));
 const db=openDatabase(path);
 try {
 db.exec(`BEGIN IMMEDIATE;
 INSERT INTO users(id,email,password_hash) VALUES('probe','trial@example.invalid','disabled');
 INSERT INTO purchases(id,user_id,record) VALUES('p','probe','{}');
 INSERT INTO protection_observations VALUES('o','probe','p','{}',CURRENT_TIMESTAMP);
 UPDATE recovery_jobs SET completed_at=CURRENT_TIMESTAMP WHERE observation_id='o';
 INSERT INTO recovery_cases(observation_id,opened_at,reason) VALUES('o',CURRENT_TIMESTAMP,'synthetic follow-up');
 INSERT INTO recovery_drafts(case_id,version,recipient,body,content_hash,created_at) VALUES('o',1,'trial','synthetic','fixture',CURRENT_TIMESTAMP);
 INSERT INTO recovery_approvals VALUES('a','o',1,'fixture',CURRENT_TIMESTAMP,NULL,CURRENT_TIMESTAMP);
 CREATE TABLE trial_notifications(stamp TEXT NOT NULL);
 CREATE TRIGGER observe_trial AFTER UPDATE OF notified_at ON recovery_exports WHEN NEW.notified_at IS NOT OLD.notified_at BEGIN INSERT INTO trial_notifications VALUES(NEW.notified_at); END;`);
 db.prepare("INSERT INTO recovery_exports VALUES('a',CURRENT_TIMESTAMP,?,NULL)").run(new Date(due).toISOString());
 db.exec("COMMIT");
 return {path:resolve(path),...db.prepare("SELECT follow_up_at,notified_at FROM recovery_exports WHERE approval_id='a'").get()};
 }finally{db.close();}
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [, ,path,due]=process.argv;if(!path||!due)throw Error("Usage: node scripts/wake-fixture.ts NEW_DATABASE UTC_DUE_TIME");
 console.log(createWakeFixture(path,due));
}
